// ============================================
// routes/payment.js - Integrado com Alauda API
// ============================================
const express = require('express');
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
              'Authorization': `ApiKey ${ALAUDA_API_KEY}`,
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
              'Authorization': `ApiKey ${ALAUDA_API_KEY}`,
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
          notification_url: `${process.env.BACKEND_URL || 'https://api.mozhost.topaziocoin.online'}/api/payment/webhook/mercadopago`
        };

        console.log(`📤 Enviando para Alauda MercadoPago:`, mpData);

        alaudaResponse = await axios.post(
          `${ALAUDA_API_URL}/mercadopago`,
          mpData,
          {
            headers: {
              'Authorization': `ApiKey ${ALAUDA_API_KEY}`,
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
                    'Authorization': `ApiKey ${ALAUDA_API_KEY}`
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

module.exports = router;
