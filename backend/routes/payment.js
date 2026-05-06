// ============================================
// routes/payment.js - Integrado com Alauda API
// ============================================
const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const axios = require('axios');
const database = require('../models/database');
const authenticateToken = require('../middleware/auth');

// Configurações da Alauda API
const ALAUDA_API_URL = process.env.ALAUDA_API_URL || 'https://alauda-api.duckdns.org/api/payment';
const ALAUDA_API_KEY = process.env.ALAUDA_API_KEY || 'sua_api_key_aqui';

// ============================================
// GET /api/payment/packages - Listar pacotes disponíveis
// ============================================
router.get('/packages', (req, res) => {
  const packages = [
    {
      id: 1,
      coins: 500,
      price: 50,
      description: '1GB RAM + 1GB Storage',
      recommended: false
    },
    {
      id: 2,
      coins: 1000,
      price: 95,
      description: '2GB RAM + 2GB Storage',
      discount: '5% OFF',
      recommended: true
    },
    {
      id: 3,
      coins: 2000,
      price: 180,
      description: '4GB RAM + 4GB Storage',
      discount: '10% OFF',
      recommended: false
    },
    {
      id: 4,
      coins: 5000,
      price: 400,
      description: '8GB RAM + 8GB Storage',
      discount: '20% OFF',
      recommended: false
    },
    {
      id: 5,
      coins: 10000,
      price: 750,
      description: '16GB RAM + 16GB Storage',
      discount: '25% OFF',
      recommended: false
    }
  ];

  res.json({ 
    success: true, 
    packages,
    currency: 'MT'
  });
});

// ============================================
// POST /api/payment/create - Criar novo pagamento via Alauda API
// ============================================
router.post('/create', async (req, res) => {
  try {
    const { userId, packageId, method, coins, amount, whatsappNumber, email } = req.body;

    // Validações
    if (!userId && !whatsappNumber) {
      return res.status(400).json({ error: 'userId ou whatsappNumber é obrigatório' });
    }

    if (!packageId || !method || !coins || !amount) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    if (!['mpesa', 'emola', 'mercadopago'].includes(method)) {
      return res.status(400).json({ error: 'Método de pagamento inválido' });
    }

    let finalUserId = userId;

    // Se vier whatsappNumber, buscar userId
    if (whatsappNumber && !userId) {
      const links = await database.query(
        'SELECT user_id FROM whatsapp_links WHERE whatsapp_number = ? AND status = "active"',
        [whatsappNumber]
      );

      if (links.length === 0) {
        return res.status(404).json({ error: 'WhatsApp não vinculado' });
      }

      finalUserId = links[0].user_id;
    }

    // Buscar dados do usuário
    const users = await database.query(
      'SELECT id, email FROM users WHERE id = ?',
      [finalUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userEmail = email || users[0].email;

    // Gerar código de referência único
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const referenceCode = `MZ${timestamp}${random}`;

    // Inserir pagamento no banco como pending
    const result = await database.query(
      `INSERT INTO payments (user_id, package_id, method, coins, amount, reference_code, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [finalUserId, packageId, method, coins, amount, referenceCode]
    );

    const paymentId = result.insertId;

    // ===== INTEGRAÇÃO COM ALAUDA API =====
    let alaudaResponse;
    let paymentDetails = {};
    let paymentUrl = null;

    try {
      if (method === 'mpesa') {
        // Chamar endpoint M-Pesa da Alauda
        const mpesaData = {
          valor: amount.toString(),
          numero_celular: whatsappNumber ? whatsappNumber.replace('258', '') : '840000000',
          usuario_id: finalUserId.toString()
        };

        console.log(`📤 Enviando para Alauda M-Pesa:`, mpesaData);

        alaudaResponse = await axios.post(
          `${ALAUDA_API_URL}/mpesa`,
          mpesaData,
          {
            headers: {
              'X-API-key': ` ${ALAUDA_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`📥 Resposta Alauda M-Pesa:`, alaudaResponse.data);

        const alaudaData = alaudaResponse.data.data || alaudaResponse.data;

        paymentDetails = {
          provider: 'M-Pesa (Vodacom)',
          phoneNumber: alaudaData.payment?.numero_celular || mpesaData.numero_celular,
          reference: referenceCode,
          transaction_id: alaudaData.payment?.transaction_id,
          instructions: [
            'Aguarde a notificação no seu celular',
            'Digite seu PIN M-Pesa para confirmar',
            `Valor: ${amount} MT`,
            `Referência: ${referenceCode}`
          ]
        };

        // Salvar transaction_id no banco
        if (alaudaData.payment?.transaction_id) {
          await database.query(
            'UPDATE payments SET transaction_id = ?, status = "processing" WHERE id = ?',
            [alaudaData.payment.transaction_id, paymentId]
          );
        }

      } else if (method === 'emola') {
        // Chamar endpoint E-Mola da Alauda
        const emolaData = {
          valor: amount.toString(),
          numero_celular: whatsappNumber ? whatsappNumber.replace('258', '') : '860000000',
          usuario_id: finalUserId.toString()
        };

        console.log(`📤 Enviando para Alauda E-Mola:`, emolaData);

        alaudaResponse = await axios.post(
          `${ALAUDA_API_URL}/emola`,
          emolaData,
          {
            headers: {
              'X-API-Key': `${ALAUDA_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`📥 Resposta Alauda E-Mola:`, alaudaResponse.data);

        const alaudaData = alaudaResponse.data.data || alaudaResponse.data;

        paymentDetails = {
          provider: 'E-Mola (Movitel)',
          phoneNumber: alaudaData.payment?.numero_celular || emolaData.numero_celular,
          reference: referenceCode,
          transaction_id: alaudaData.payment?.transaction_id,
          instructions: [
            'Aguarde a notificação no seu celular',
            'Digite seu PIN E-Mola para confirmar',
            `Valor: ${amount} MT`,
            `Referência: ${referenceCode}`
          ]
        };

        // Salvar transaction_id no banco
        if (alaudaData.payment?.transaction_id) {
          await database.query(
            'UPDATE payments SET transaction_id = ?, status = "processing" WHERE id = ?',
            [alaudaData.payment.transaction_id, paymentId]
          );
        }

      } else if (method === 'mercadopago') {
        // Chamar endpoint MercadoPago da Alauda
        const mpData = {
          email: userEmail,
          amount: parseFloat(amount),
          description: `MozHost - ${coins} coins`,
          usuario_id: finalUserId.toString(),
          back_urls: {
            success: `${process.env.FRONTEND_URL || 'https://mozhost.topaziocoin.online'}/payment/success`,
            failure: `${process.env.FRONTEND_URL || 'https://mozhost.topaziocoin.online'}/payment/failure`,
            pending: `${process.env.FRONTEND_URL || 'https://mozhost.topaziocoin.online'}/payment/pending`
          },
          notification_url: `${process.env.BACKEND_URL || 'https://api.mozhost.shop'}/api/payment/webhook/mercadopago`
        };

        console.log(`📤 Enviando para Alauda MercadoPago:`, mpData);

        alaudaResponse = await axios.post(
          `${ALAUDA_API_URL}/mercadopago`,
          mpData,
          {
            headers: {
              'X-API-Key': ` ${ALAUDA_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`📥 Resposta Alauda MercadoPago:`, alaudaResponse.data);

        const alaudaData = alaudaResponse.data.data || alaudaResponse.data;

        paymentUrl = alaudaData.payment?.init_point || alaudaData.payment?.sandbox_init_point;

        paymentDetails = {
          provider: 'Mercado Pago',
          url: paymentUrl,
          preference_id: alaudaData.payment?.id
        };

        // Salvar preference_id no banco
        if (alaudaData.payment?.id) {
          await database.query(
            'UPDATE payments SET transaction_id = ? WHERE id = ?',
            [alaudaData.payment.id, paymentId]
          );
        }
      }

    } catch (alaudaError) {
      console.error('❌ Erro na Alauda API:', alaudaError.response?.data || alaudaError.message);
      
      // Mesmo com erro, retornar instruções manuais
      if (method === 'mpesa' || method === 'emola') {
        const phoneNumber = process.env[`${method.toUpperCase()}_PHONE`] || '258840000000';
        paymentDetails = {
          provider: method === 'mpesa' ? 'M-Pesa (Vodacom)' : 'E-Mola (Movitel)',
          phoneNumber: phoneNumber,
          reference: referenceCode,
          manual: true,
          instructions: [
            `Abra o app ${method === 'mpesa' ? 'M-Pesa' : 'E-Mola'}`,
            'Escolha "Enviar Dinheiro"',
            `Para o número: ${phoneNumber}`,
            `Valor: ${amount} MT`,
            `Referência: ${referenceCode}`
          ]
        };
      }
    }

    console.log(`💳 Pagamento criado: ID ${paymentId} | ${coins} coins | ${amount} MT | ${method}`);

    res.json({
      success: true,
      id: paymentId,
      referenceCode,
      paymentDetails,
      paymentUrl,
      status: 'pending',
      expiresIn: 600 // 10 minutos
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Falha ao criar pagamento' });
  }
});

// ============================================
// GET /api/payment/:id/status - Verificar status
// ============================================
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    const payments = await database.query(
      'SELECT id, status, coins, amount, method, reference_code, transaction_id, created_at, completed_at FROM payments WHERE id = ?',
      [id]
    );

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const payment = payments[0];

    res.json({
      success: true,
      id: payment.id,
      status: payment.status,
      coins: payment.coins,
      amount: payment.amount,
      method: payment.method,
      referenceCode: payment.reference_code,
      transactionId: payment.transaction_id,
      createdAt: payment.created_at,
      completedAt: payment.completed_at
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// ============================================
// POST /api/payment/webhook/:method - Webhook da Alauda
// ============================================
router.post('/webhook/:method', async (req, res) => {
  try {
    const { method } = req.params;
    
    console.log(`📥 Webhook recebido [${method}]:`, req.body);

    // A Alauda envia os webhooks do MercadoPago e PayMoz
    // Vamos processar baseado no corpo da requisição
    
    let referenceCode = null;
    let status = null;
    let transactionId = null;

    if (method === 'mercadopago') {
      // Webhook do MercadoPago via Alauda
      const { type, data } = req.body;
      
      if (type === 'payment') {
        const paymentId = data?.id;
        
        if (paymentId) {
          // Buscar pagamento pelo transaction_id (preference_id do MP)
          const payments = await database.query(
            'SELECT id, user_id, coins, reference_code FROM payments WHERE transaction_id = ? AND status IN ("pending", "processing")',
            [paymentId]
          );

          if (payments.length > 0) {
            const payment = payments[0];
            
            // Consultar status na Alauda
            try {
              const statusResponse = await axios.get(
                `${ALAUDA_API_URL}/mercadopago/status/${paymentId}`,
                {
                  headers: {
                    'X-API-Key': ` ${ALAUDA_API_KEY}`
                  }
                }
              );

              const mpStatus = statusResponse.data.data?.payment?.status;
              
              if (mpStatus === 'approved') {
                await processPaymentApproval(payment);
              } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
                await database.query(
                  'UPDATE payments SET status = "failed" WHERE id = ?',
                  [payment.id]
                );
              }
            } catch (statusError) {
              console.error('Erro ao consultar status MP:', statusError.message);
            }
          }
        }
      }
      
    } else if (method === 'paymoz') {
      // Webhook do PayMoz (M-Pesa/E-Mola) via Alauda
      const { transaction_id, status: paymentStatus, reference } = req.body;
      
      if (transaction_id && paymentStatus === 'completed') {
        // Buscar pelo transaction_id
        const payments = await database.query(
          'SELECT id, user_id, coins, reference_code FROM payments WHERE transaction_id = ? AND status IN ("pending", "processing")',
          [transaction_id]
        );

        if (payments.length > 0) {
          await processPaymentApproval(payments[0]);
        }
      }
    }

    res.json({ success: true, received: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

// ============================================
// Função auxiliar para processar aprovação
// ============================================
async function processPaymentApproval(payment) {
  try {
    // Atualizar status do pagamento
    await database.query(
      'UPDATE payments SET status = "completed", completed_at = NOW() WHERE id = ?',
      [payment.id]
    );

    // Adicionar coins ao usuário
    await database.query(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [payment.coins, payment.user_id]
    );

    console.log(`✅ Pagamento ${payment.id} confirmado! ${payment.coins} coins adicionados ao usuário ${payment.user_id}`);

    // TODO: Enviar notificação ao usuário via WhatsApp

  } catch (error) {
    console.error('Erro ao processar aprovação:', error);
    throw error;
  }
}

// ============================================
// POST /api/payment/manual-confirm - Confirmação manual
// ============================================
router.post('/manual-confirm', authenticateToken, async (req, res) => {
  try {
    const { referenceCode, transactionId } = req.body;

    const payments = await database.query(
      'SELECT id, user_id, coins FROM payments WHERE reference_code = ? AND status = "pending"',
      [referenceCode]
    );

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    await processPaymentApproval(payments[0]);

    if (transactionId) {
      await database.query(
        'UPDATE payments SET transaction_id = ? WHERE id = ?',
        [transactionId, payments[0].id]
      );
    }

    res.json({ 
      success: true, 
      message: 'Pagamento confirmado',
      coinsAdded: payments[0].coins
    });

  } catch (error) {
    console.error('Error in manual confirmation:', error);
    res.status(500).json({ error: 'Erro na confirmação manual' });
  }
});

// ============================================
// GET /api/payment/history - Histórico
// ============================================
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await database.query(
      `SELECT id, coins, amount, method, status, reference_code, transaction_id, created_at, completed_at 
       FROM payments 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

router.get('/check-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await database.query(
      `SELECT id, status, coins, amount, payment_method, currency, created_at, completed_at
       FROM payments 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (payments.length === 0) {
      return res.json({
        status: 'not_found',
        message: 'Nenhum pagamento encontrado'
      });
    }

    const payment = payments[0];

    res.json({
      status: payment.status,
      payment_id: payment.id,
      coins: payment.coins,
      amount: payment.amount,
      payment_method: payment.payment_method,
      currency: payment.currency,
      coinsAdded: payment.status === 'completed' ? payment.coins : 0
    });

  } catch (error) {
    console.error('Erro check-status:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// Endpoint para gerar recibo
router.get('/receipt/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    // Busca dados do pagamento no banco
    const [payment] = await db.query(
      `SELECT p.*, u.username, u.email, c.name as container_name
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN containers c ON p.container_id = c.id
       WHERE p.id = ? AND p.user_id = ?`,
      [paymentId, userId]
    );

    if (!payment) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    // Cria o PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Define o nome do arquivo
    const filename = `recibo_${paymentId}_${Date.now()}.pdf`;
    
    // Headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe o PDF direto pra resposta
    doc.pipe(res);

    // === HEADER COM LOGO ===
    doc
      .fontSize(28)
      .fillColor('#1e40af')
      .text('MOZHOST', 50, 50, { align: 'center' })
      .fontSize(10)
      .fillColor('#6b7280')
      .text('Hospedagem de Bots & APIs', { align: 'center' })
      .moveDown(0.5)
      .text('mozhost.topaziocoin.online', { align: 'center' });

    // Linha divisória
    doc
      .moveTo(50, 120)
      .lineTo(545, 120)
      .stroke('#e5e7eb');

    // === STATUS PAGO ===
    doc
      .fontSize(20)
      .fillColor('#16a34a')
      .text('✓ PAGO', 50, 140, { align: 'center' })
      .moveDown(1);

    // === TÍTULO ===
    doc
      .fontSize(16)
      .fillColor('#111827')
      .text('RECIBO DE PAGAMENTO', { align: 'center' })
      .moveDown(2);

    // === INFORMAÇÕES DO PAGAMENTO ===
    const startY = 220;
    const lineHeight = 25;

    const info = [
      { label: 'ID da Transação:', value: `#${payment.id}` },
      { label: 'Nome:', value: payment.username },
      { label: 'Email:', value: payment.email },
      { label: 'Valor Pago:', value: `${payment.currency === 'MZN' ? 'MT' : 'R$'} ${parseFloat(payment.amount).toFixed(2)}` },
      { label: 'Coins Creditados:', value: `${payment.coins} coins` },
      { label: 'Método:', value: payment.payment_method.toUpperCase() },
      { label: 'Container:', value: payment.container_name || 'N/A' },
      { label: 'Data:', value: new Date(payment.created_at).toLocaleString('pt-BR') },
      { label: 'Status:', value: 'Confirmado' }
    ];

    info.forEach((item, index) => {
      const y = startY + (index * lineHeight);
      
      doc
        .fontSize(11)
        .fillColor('#6b7280')
        .text(item.label, 80, y, { width: 150, align: 'left' })
        .fontSize(12)
        .fillColor('#111827')
        .text(item.value, 240, y, { width: 250, align: 'left' });
    });

    // === BOX DE VALIDADE ===
    const boxY = startY + (info.length * lineHeight) + 30;
    
    doc
      .rect(50, boxY, 495, 60)
      .fillAndStroke('#f3f4f6', '#e5e7eb');

    doc
      .fontSize(10)
      .fillColor('#374151')
      .text('Validade do Serviço:', 60, boxY + 15)
      .fontSize(12)
      .fillColor('#1e40af')
      .text('30 dias a partir da data do pagamento', 60, boxY + 32);

    // === RODAPÉ ===
    doc
      .fontSize(8)
      .fillColor('#9ca3af')
      .text(
        'Este documento é um comprovante válido de pagamento.\nGuarde-o para controle e referência futura.',
        50,
        750,
        { align: 'center', width: 495 }
      );

    doc
      .moveTo(50, 740)
      .lineTo(545, 740)
      .stroke('#e5e7eb');

    doc
      .fontSize(7)
      .fillColor('#d1d5db')
      .text(
        `Gerado em: ${new Date().toLocaleString('pt-BR')} | MozHost © ${new Date().getFullYear()}`,
        50,
        770,
        { align: 'center' }
      );

    // Finaliza o PDF
    doc.end();

  } catch (error) {
    console.error('Erro ao gerar recibo:', error);
    res.status(500).json({ error: 'Erro ao gerar recibo' });
  }
});

// ============================================
// POST /api/payment/internal/credit-coins - Crédito interno via Alauda
// ============================================
router.post('/internal/credit-coins', async (req, res) => {
  try {
    const key = req.headers['x-internal-key']
    
    if (!key || key !== process.env.INTERNAL_SECRET_KEY) {
      return res.status(401).json({ error: 'Não autorizado' })
    }

    const { userId, coins } = req.body

    if (!userId || !coins) {
      return res.status(400).json({ error: 'userId e coins são obrigatórios' })
    }

    // Credita coins ao utilizador
    await database.query(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [coins, userId]
    )

    // Regista o pagamento como completed
    await database.query(
      `UPDATE payments SET status = 'completed', completed_at = NOW() 
       WHERE user_id = ? AND status = 'pending' 
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    )

    console.log(`✅ ${coins} coins creditados ao utilizador ${userId} via Alauda`)

    res.json({ success: true, userId, coins })

  } catch (error) {
    console.error('❌ Erro ao creditar coins:', error)
    res.status(500).json({ error: 'Erro ao creditar coins' })
  }
})

module.exports = router;
