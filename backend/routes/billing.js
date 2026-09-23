// routes/billing.js - Pagamentos diretos com dinheiro real
// Integrado com Alauda API (M-Pesa, e-Mola, MercadoPago)
const express = require('express');
const router = express.Router();
const axios = require('axios');
const PDFDocument = require('pdfkit');
const database = require('../models/database');
const dockerManager = require('../utils/docker-manager');
const authenticateToken = require('../middleware/auth');
const { sendPlanActivatedEmail } = require('../utils/email');

// Dispara o email de plano ativado/renovado sem quebrar o fluxo de ativação
// se o envio falhar (ex: Resend fora do ar).
async function notifyPlanActivated(user, plan, { currency, amount, isScheduled, expiresAt }) {
  try {
    if (!user?.email) return;
    await sendPlanActivatedEmail({
      toEmail: user.email,
      toName: user.username,
      planName: plan.name,
      amount: parseFloat(amount).toFixed(2),
      currency: currency === 'BRL' ? 'R$' : 'MT',
      isRenewal: !isScheduled,
      isScheduled,
      expiresAt,
      pendingPlanName: isScheduled ? plan.name : null
    });
    console.log(`📧 Email de plano ${isScheduled ? 'agendado' : 'ativado'} enviado para ${user.email}`);
  } catch (e) {
    console.error('Erro ao enviar email de plano ativado:', e.message);
  }
}

// A env correta é ALAUDA_API_URL (aponta pra https://alauda-api.mozhost.shop/api/payment).
// O antigo ALAUDA_API_URL_PAYMENT/duckdns.org era da VPS anterior — causa de cobranças
// indo pro servidor velho e a tela ficar travada em "aguardando pagamento".
const ALAUDA_API_URL = process.env.ALAUDA_API_URL || 'https://alauda-api.mozhost.shop/api/payment';
const ALAUDA_API_KEY = process.env.ALAUDA_API_KEY || 'sua_api_key_aqui';

// ===== PLANOS =====
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price_mt: 150,
    price_brl: 15,
    period: 'month',
    max_containers: 3,
    max_ram_mb: 512,
    max_storage_mb: 2048,
    features: ['3 containers', '512MB RAM', '2GB Storage', 'Subdomínio grátis', 'Terminal Web']
  },
  {
    id: 'basic',
    name: 'Basic',
    price_mt: 350,
    price_brl: 35,
    period: 'month',
    max_containers: 5,
    max_ram_mb: 1024,
    max_storage_mb: 5120,
    features: ['5 containers', '1GB RAM', '5GB Storage', 'Domínio customizado', 'Suporte prioritário'],
    popular: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price_mt: 700,
    price_brl: 70,
    period: 'month',
    max_containers: 10,
    max_ram_mb: 2048,
    max_storage_mb: 10240,
    features: ['10 containers', '2GB RAM', '10GB Storage', 'SSL grátis', 'Suporte VIP', 'Backups diários']
  },
  {
    id: 'business',
    name: 'Business',
    price_mt: 1500,
    price_brl: 150,
    period: 'month',
    max_containers: 25,
    max_ram_mb: 4096,
    max_storage_mb: 25600,
    features: ['25 containers', '4GB RAM', '25GB Storage', 'SSL grátis', 'Suporte 24/7', 'Backups diários', 'IP dedicado']
  }
];

const PLAN_RANK = { starter: 1, basic: 2, pro: 3, business: 4 };

// ===== GET /api/billing/plans =====
router.get('/plans', (req, res) => {
  res.json({ success: true, plans: PLANS });
});

// ===== GET /api/billing/current =====
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const accountService = require('../services/accountService');
    const accountStatus = await accountService.getAccountStatus(userId);
    if (!accountStatus.found) return res.status(404).json({ error: 'Usuário não encontrado' });

    const users = await database.query(
      'SELECT plan, pending_plan, max_containers, max_ram_mb, max_storage_mb, coins, free_trial_ends FROM users WHERE id = ?',
      [userId]
    );

    if (!users.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    const user = users[0];

    // Buscar última billing ativa
    const activeBilling = await database.query(
      `SELECT * FROM billing 
       WHERE user_id = ? AND status = 'active' AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`,
      [userId]
    );

    // Contar containers ativos
    const containerCount = await database.query(
      'SELECT COUNT(*) as count FROM containers WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      current: {
        plan: user.plan,
        pending_plan: user.pending_plan,
        max_containers: user.max_containers,
        max_ram_mb: user.max_ram_mb,
        max_storage_mb: user.max_storage_mb,
        containers_used: containerCount[0].count,
        free_trial_ends: user.free_trial_ends,
        active_subscription: activeBilling[0] || null,
        // Status da conta para a página de bloqueio
        suspended: accountStatus.suspended,
        suspended_at: accountStatus.suspendedAt,
        suspension_reason: accountStatus.reason
      }
    });
  } catch (error) {
    console.error('Erro ao buscar plano atual:', error);
    res.status(500).json({ error: 'Erro ao buscar informações do plano' });
  }
});

// ===== POST /api/billing/subscribe =====
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { planId, method, phone, email } = req.body;

    if (!planId || !method) {
      return res.status(400).json({ error: 'Plano e método de pagamento são obrigatórios' });
    }

    if (!['mpesa', 'emola', 'mercadopago', 'visa_mastercard'].includes(method)) {
      return res.status(400).json({ error: 'Método de pagamento inválido. Use: mpesa, emola, mercadopago ou visa_mastercard' });
    }

    const plan = PLANS.find(p => p.id === planId);
    if (!plan) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    if ((method === 'mpesa' || method === 'emola') && !phone) {
      return res.status(400).json({ error: 'Número de telefone é obrigatório para pagamento móvel' });
    }

    // Buscar dados do usuário
    const users = await database.query('SELECT id, email, plan FROM users WHERE id = ?', [userId]);
    if (!users.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    const user = users[0];
    const amount = method === 'mercadopago' ? plan.price_brl : plan.price_mt;
    const currency = method === 'mercadopago' ? 'BRL' : 'MZN';

    // Gerar referência
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const referenceCode = `BIL${timestamp}${random}`;

    // Inserir billing pendente
    await database.query(
      `INSERT INTO billing (user_id, plan_id, amount, currency, method, reference_code, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [userId, planId, amount, currency, method, referenceCode]
    );

    const billingId = (await database.query('SELECT LAST_INSERT_ID() as id'))[0].id;

    // Chamar Alauda API
    let paymentDetails = {};
    let paymentUrl = null;

    try {
      if (method === 'mpesa' || method === 'emola') {
        const phoneClean = phone.replace(/^258/, '');
        const endpoint = method === 'mpesa' ? '/mpesa' : '/emola';

        const alaudaRes = await axios.post(
          `${ALAUDA_API_URL}${endpoint}`,
          {
            valor: amount.toString(),
            numero_celular: phoneClean,
            usuario_id: userId.toString()
          },
          {
            headers: {
              'X-API-Key': ALAUDA_API_KEY,
              'Content-Type': 'application/json'
            },
            // A Alauda segura a conexão até o push ser confirmado/expirar.
            // Cortar antes do gateway (Cloudflare ~100s) derrubar a request.
            timeout: 90000
          }
        );

        const alaudaData = alaudaRes.data.data || alaudaRes.data;

        paymentDetails = {
          provider: method === 'mpesa' ? 'M-Pesa (Vodacom)' : 'E-Mola (Movitel)',
          phone: phoneClean,
          reference: referenceCode,
          transaction_id: alaudaData.payment?.transaction_id || alaudaData.payment?.payment_id,
          zp_reference: alaudaData.payment?.reference || alaudaData.payment?.payment_id,
          push_status: alaudaData.payment?.status,
          instructions: [
            'Aguarde a notificação no seu celular',
            `Digite seu PIN ${method === 'mpesa' ? 'M-Pesa' : 'E-Mola'} para confirmar`,
            `Valor: ${amount} ${currency === 'MZN' ? 'MT' : 'R$'}`
          ]
        };

        if (alaudaData.payment?.transaction_id || alaudaData.payment?.payment_id) {
          await database.query(
            'UPDATE billing SET transaction_id = ?, status = "processing" WHERE id = ?',
            [alaudaData.payment.transaction_id || alaudaData.payment.payment_id, billingId]
          );
        }

      } else if (method === 'visa_mastercard') {
        // Checkout ZumboPay (via Alauda) — mesmo payload de /api/payment/create.
        const cardData = {
          valor: amount.toString(),
          customer_email: email || user.email,
          customer_name: user.username || (email || user.email),
          usuario_id: userId.toString(),
          return_url: `${process.env.FRONTEND_URL || 'https://mozhost.shop'}/billing?status=success`
        };

        const alaudaRes = await axios.post(
          `${ALAUDA_API_URL}/visa_mastercard`,
          cardData,
          {
            headers: {
              'X-API-Key': ALAUDA_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        const alaudaData = alaudaRes.data.data || alaudaRes.data;
        paymentUrl = alaudaData.payment?.checkout_url;

        if (!paymentUrl) {
          throw new Error('ZumboPay não retornou checkout_url');
        }

        paymentDetails = {
          provider: 'Visa/Mastercard (ZumboPay)',
          url: paymentUrl
        };

        if (alaudaData.payment?.payment_id || alaudaData.payment?.transaction_id) {
          // O webhook paymoz/zumbopay confirma pelo transaction_id guardado aqui.
          await database.query(
            'UPDATE billing SET transaction_id = ?, status = "processing" WHERE id = ?',
            [alaudaData.payment.payment_id || alaudaData.payment.transaction_id, billingId]
          );
        }

      } else if (method === 'mercadopago') {
        const alaudaRes = await axios.post(
          `${ALAUDA_API_URL}/mercadopago`,
          {
            email: user.email,
            amount: parseFloat(amount),
            description: `MozHost - Plano ${plan.name} (mensal)`,
            usuario_id: userId.toString(),
            back_urls: {
              success: `${process.env.FRONTEND_URL || 'https://mozhost.shop'}/billing?status=success`,
              failure: `${process.env.FRONTEND_URL || 'https://mozhost.shop'}/billing?status=failure`,
              pending: `${process.env.FRONTEND_URL || 'https://mozhost.shop'}/billing?status=pending`
            },
            notification_url: `${process.env.BACKEND_URL || 'https://api.mozhost.shop'}/api/billing/webhook/mercadopago`
          },
          {
            headers: {
              'X-API-Key': ALAUDA_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        const alaudaData = alaudaRes.data.data || alaudaRes.data;
        paymentUrl = alaudaData.payment?.init_point || alaudaData.payment?.sandbox_init_point;

        paymentDetails = {
          provider: 'Mercado Pago',
          url: paymentUrl,
          preference_id: alaudaData.payment?.id
        };

        if (alaudaData.payment?.id) {
          await database.query(
            'UPDATE billing SET transaction_id = ? WHERE id = ?',
            [alaudaData.payment.id, billingId]
          );
        }
      }    } catch (alaudaError) {
      console.error('❌ Erro na Alauda API (billing):', alaudaError.response?.data || alaudaError.message);

      if (method === 'mpesa' || method === 'emola') {
        // Timeout do nosso axios, 5xx do gateway ou erro de rede: o push
        // provavelmente foi criado e o cliente ainda pode confirmar no
        // celular. O webhook/cron confirma depois — segue o fluxo automático.
        const pushPossivel = alaudaError.code === 'ECONNABORTED' ||
          !alaudaError.response ||
          alaudaError.response.status >= 500;

        if (pushPossivel) {
          await database.query('UPDATE billing SET status = "processing" WHERE id = ?', [billingId]);
          paymentDetails = {
            provider: method === 'mpesa' ? 'M-Pesa (Vodacom)' : 'E-Mola (Movitel)',
            phone: phone.replace(/^258/, ''),
            reference: referenceCode,
            manual: false,
            instructions: [
              'Aguarde a notificação no seu celular',
              `Digite seu PIN ${method === 'mpesa' ? 'M-Pesa' : 'E-Mola'} para confirmar`,
              `Valor: ${amount} MT`,
              'Assim que você confirmar, o plano é ativado automaticamente'
            ]
          };
        } else {
          // Erro definitivo da API (validação, número inválido, API key, saldo
          // insuficiente etc.): o pagamento NEM COMEÇOU. Nada de pagamento
          // manual — devolve o erro real pro usuário tentar de novo.
          await database.query('UPDATE billing SET status = "failed" WHERE id = ?', [billingId]);
          const apiMsg = alaudaError.response?.data?.error || alaudaError.response?.data?.message || alaudaError.message;
          return res.status(502).json({
            error: 'Não foi possível enviar o pedido de pagamento.',
            message: apiMsg,
            detail: 'Verifica o número e tenta novamente. Se o problema persistir, contacta o suporte.'
          });
        }
      } else {
        // Cartão/MercadoPago: se o checkout não foi criado, marca o billing
        // como failed e devolve erro em vez de deixar cobrança órfã pendente.
        await database.query('UPDATE billing SET status = "failed" WHERE id = ?', [billingId]);
        return res.status(502).json({ error: 'Erro ao iniciar pagamento no provedor. Tenta novamente.' });
      }
    }

    console.log(`💳 Billing criado: ID ${billingId} | Plano ${planId} | ${amount} ${currency} | ${method}`);

    res.json({
      success: true,
      billing_id: billingId,
      reference_code: referenceCode,
      plan: plan.name,
      amount,
      currency,
      payment_details: paymentDetails,
      payment_url: paymentUrl,
      status: 'pending'
    });

  } catch (error) {
    console.error('Erro ao criar billing:', error);
    res.status(500).json({ error: 'Falha ao processar pagamento' });
  }
});

// ===== POST /api/billing/webhook/:method =====
router.post('/webhook/:method', async (req, res) => {
  try {
    const { method } = req.params;
    console.log(`📥 Billing webhook [${method}]:`, req.body);

    if (method === 'mercadopago') {
      const { type, data } = req.body;
      if (type === 'payment' && data?.id) {
        const billings = await database.query(
          'SELECT id, user_id, plan_id FROM billing WHERE transaction_id = ? AND status IN ("pending", "processing")',
          [data.id]
        );
        if (billings.length > 0) {
          try {
            const statusRes = await axios.get(
              `${ALAUDA_API_URL}/mercadopago/status/${data.id}`,
              { headers: { 'X-API-Key': ALAUDA_API_KEY } }
            );
            const mpStatus = statusRes.data.data?.payment?.status;
            if (mpStatus === 'approved') {
              await activatePlan(billings[0]);
            } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
              await database.query('UPDATE billing SET status = "failed" WHERE id = ?', [billings[0].id]);
            }
          } catch (e) { console.error('Erro status MP billing:', e.message); }
        }
      }
    } else if (method === 'paymoz') {
      const { transaction_id, status: paymentStatus, usuario_id } = req.body;
      let billings = [];
      if (transaction_id) {
        billings = await database.query(
          'SELECT id, user_id, plan_id FROM billing WHERE transaction_id = ? AND status IN ("pending", "processing")',
          [transaction_id]
        );
        // Fallback: se o push demorou e o backend perdeu a resposta original
        // (timeout), o billing pode ter ficado sem transaction_id. Casa pelo
        // usuario_id devolvido pela Alauda no billing pendente mais recente.
        if (billings.length === 0 && usuario_id) {
          billings = await database.query(
            `SELECT id, user_id, plan_id FROM billing
             WHERE user_id = ? AND method IN ('mpesa', 'emola')
               AND status IN ('pending', 'processing')
               AND created_at > NOW() - INTERVAL 30 MINUTE
             ORDER BY created_at DESC LIMIT 1`,
            [usuario_id]
          );
          if (billings.length > 0) {
            await database.query('UPDATE billing SET transaction_id = ? WHERE id = ?', [transaction_id, billings[0].id]);
            console.log(`🔗 Billing ${billings[0].id} casado por usuario_id (resposta do push perdida por timeout)`);
          }
        }
      }
      if (billings.length > 0) {
        if (paymentStatus === 'completed') {
          await activatePlan(billings[0]);
        } else if (['failed', 'cancelled', 'expired', 'rejected'].includes(paymentStatus)) {
          // Falhou (ex: saldo insuficiente) — não deixa o billing preso pra sempre.
          await database.query('UPDATE billing SET status = "failed" WHERE id = ?', [billings[0].id]);
          console.log(`❌ Billing ${billings[0].id} marcado como failed (paymoz: ${paymentStatus})`);
        }
      }
    }

    res.json({ success: true, received: true });
  } catch (error) {
    console.error('Erro webhook billing:', error);
    res.status(500).json({ error: 'Erro no webhook' });
  }
});

// ===== GET /api/billing/:id/status =====
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const billings = await database.query(
      'SELECT id, plan_id, amount, currency, method, status, reference_code, transaction_id, created_at, activated_at, expires_at FROM billing WHERE id = ?',
      [id]
    );

    if (!billings.length) return res.status(404).json({ error: 'Billing não encontrado' });
    const billing = billings[0];

    // Ainda aguardando? Consulta a Alauda/ZumboPay ativamente pra não depender
    // só do webhook (que pode não chegar). Sucesso e falha (ex: saldo
    // insuficiente) são detectados aqui.
    if (['pending', 'processing'].includes(billing.status) && billing.transaction_id) {
      try {
        const statusRes = await axios.get(
          `${ALAUDA_API_URL}/zumbopay/status/${billing.transaction_id}`,
          // Nota: a rota real na Alauda é /api/payment/zumbopay/status/:id e a
          // ALAUDA_API_URL já inclui /api/payment, então este path relativo casa.
          { headers: { 'X-API-Key': ALAUDA_API_KEY }, timeout: 5000 }
        );
        const payStatus = statusRes.data?.data?.payment?.status;
        if (payStatus === 'completed') {
          await activatePlan(billing);
          billing.status = 'active';
        } else if (['failed', 'expired', 'cancelled', 'rejected'].includes(payStatus)) {
          await database.query('UPDATE billing SET status = "failed" WHERE id = ?', [billing.id]);
          billing.status = 'failed';
        }
      } catch (e) {
        // Alauda indisponível ou status não encontrado — mantém o status local.
      }
    }

    res.json({ success: true, billing });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// ===== GET /api/billing/receipt/:billingId — Recibo PDF do pagamento do plano =====
// Modelo de assinatura: o recibo cobre a compra inicial do plano e também as
// renovações (toda ativação de billing gera linha nesta tabela).
router.get('/receipt/:billingId', authenticateToken, async (req, res) => {
  try {
    const { billingId } = req.params;
    const userId = req.user.userId || req.user.id;

    const billings = await database.query(
      `SELECT b.*, u.username, u.email
       FROM billing b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = ? AND b.user_id = ?`,
      [billingId, userId]
    );

    if (!billings.length) return res.status(404).json({ error: 'Pagamento não encontrado' });
    const billing = billings[0];

    if (!['active', 'scheduled', 'expired'].includes(billing.status)) {
      return res.status(400).json({ error: 'Só é possível emitir recibo de pagamentos confirmados' });
    }

    const plan = PLANS.find(p => p.id === billing.plan_id);
    const planName = plan?.name || billing.plan_id;
    const isRenewal = ['active', 'expired'].includes(billing.status) &&
      billing.activated_at &&
      new Date(billing.created_at).getTime() !== new Date(billing.activated_at).getTime();

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const filename = `recibo_plano_${billingId}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // === HEADER ===
    doc
      .fontSize(28)
      .fillColor('#1e40af')
      .text('MOZHOST', 50, 50, { align: 'center' })
      .fontSize(10)
      .fillColor('#6b7280')
      .text('Hospedagem de Bots & APIs', { align: 'center' })
      .moveDown(0.5)
      .text('mozhost.shop', { align: 'center' });

    doc.moveTo(50, 120).lineTo(545, 120).stroke('#e5e7eb');

    // === STATUS ===
    doc
      .fontSize(20)
      .fillColor('#16a34a')
      .text('✓ PAGO', 50, 140, { align: 'center' })
      .moveDown(1);

    doc
      .fontSize(16)
      .fillColor('#111827')
      .text(isRenewal ? 'RECIBO DE RENOVAÇÃO DE PLANO' : 'RECIBO DE ASSINATURA DE PLANO', { align: 'center' })
      .moveDown(2);

    // === DADOS ===
    const startY = 220;
    const lineHeight = 25;

    const info = [
      { label: 'Nº do Recibo:', value: `BIL-${billing.id}` },
      { label: 'Referência:', value: billing.reference_code || 'N/A' },
      { label: 'ID da Transação:', value: billing.transaction_id || 'N/A' },
      { label: 'Nome:', value: billing.username || 'N/A' },
      { label: 'Email:', value: billing.email || 'N/A' },
      { label: 'Plano:', value: `${planName} (mensal)` },
      { label: 'Valor Pago:', value: `${billing.currency === 'BRL' ? 'R$' : 'MT'} ${parseFloat(billing.amount).toFixed(2)}` },
      { label: 'Método:', value: (billing.method || '').toUpperCase() },
      { label: 'Data do Pagamento:', value: new Date(billing.activated_at || billing.created_at).toLocaleString('pt-BR') },
      { label: 'Status:', value: 'Confirmado' }
    ];

    info.forEach((item, index) => {
      const y = startY + (index * lineHeight);
      doc
        .fontSize(11)
        .fillColor('#6b7280')
        .text(item.label, 80, y, { width: 160, align: 'left' })
        .fontSize(12)
        .fillColor('#111827')
        .text(item.value, 250, y, { width: 250, align: 'left' });
    });

    // === BOX DE VIGÊNCIA ===
    const boxY = startY + (info.length * lineHeight) + 30;

    doc
      .rect(50, boxY, 495, 60)
      .fillAndStroke('#f3f4f6', '#e5e7eb');

    doc
      .fontSize(10)
      .fillColor('#374151')
      .text('Vigência do Plano:', 60, boxY + 15)
      .fontSize(12)
      .fillColor('#1e40af')
      .text(
        billing.activated_at && billing.expires_at
          ? `${new Date(billing.activated_at).toLocaleDateString('pt-BR')} até ${new Date(billing.expires_at).toLocaleDateString('pt-BR')}`
          : '30 dias a partir da data do pagamento',
        60,
        boxY + 32
      );

    // === RODAPÉ ===
    doc
      .moveTo(50, 740)
      .lineTo(545, 740)
      .stroke('#e5e7eb');

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
      .fontSize(7)
      .fillColor('#d1d5db')
      .text(
        `Gerado em: ${new Date().toLocaleString('pt-BR')} | MozHost © ${new Date().getFullYear()}`,
        50,
        770,
        { align: 'center' }
      );

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar recibo do plano:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Erro ao gerar recibo' });
  }
});

// ===== GET /api/billing/history =====
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const billings = await database.query(
      `SELECT id, plan_id, amount, currency, method, status, reference_code, 
              created_at, activated_at, expires_at
       FROM billing
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({ success: true, billings });
  } catch (error) {
    console.error('Erro histórico billing:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// ===== POST /api/billing/manual-confirm =====
router.post('/manual-confirm', authenticateToken, async (req, res) => {
  try {
    const { referenceCode, transactionId } = req.body;

    const billings = await database.query(
      'SELECT id, user_id, plan_id FROM billing WHERE reference_code = ? AND status IN ("pending", "processing")',
      [referenceCode]
    );

    if (!billings.length) return res.status(404).json({ error: 'Pagamento não encontrado' });

    await activatePlan(billings[0]);

    if (transactionId) {
      await database.query('UPDATE billing SET transaction_id = ? WHERE id = ?', [transactionId, billings[0].id]);
    }

    const plan = PLANS.find(p => p.id === billings[0].plan_id);
    res.json({ success: true, message: `Plano ${plan?.name || billings[0].plan_id} ativado!` });
  } catch (error) {
    console.error('Erro confirmação manual billing:', error);
    res.status(500).json({ error: 'Erro na confirmação' });
  }
});

// ===== Ativar plano após pagamento =====
async function activatePlan(billing) {
  try {
    const plan = PLANS.find(p => p.id === billing.plan_id);
    if (!plan) throw new Error('Plano não encontrado');

    const users = await database.query(
      'SELECT plan, suspended_at, pending_plan FROM users WHERE id = ?',
      [billing.user_id]
    );
    const user = users[0];
    if (!user) throw new Error('Usuário não encontrado');

    const currentRank = PLAN_RANK[user.plan] || 0;
    const targetRank = PLAN_RANK[plan.id] || 0;
    const isActivePaidPlanChange = user.suspended_at === null &&
      user.plan !== 'free' && user.plan !== plan.id;

    if (isActivePaidPlanChange && targetRank > currentRank) {
      // O pagamento é registrado, mas o upgrade só muda na renovação do ciclo atual.
      const active = await database.query(
        `SELECT expires_at FROM billing WHERE user_id = ? AND status = 'active'
         ORDER BY expires_at DESC LIMIT 1`,
        [billing.user_id]
      );
      const currentExpires = active[0]?.expires_at;
      await database.query(
        `UPDATE billing SET status = 'scheduled', activated_at = NOW(), expires_at = ? WHERE id = ?`,
        [currentExpires || new Date(), billing.id]
      );
      await database.query('UPDATE users SET pending_plan = ? WHERE id = ?', [plan.id, billing.user_id]);

      const notificationManager = require('../utils/notification-manager');
      await notificationManager.notify(billing.user_id, {
        type: 'success',
        category: 'billing',
        title: `Upgrade para ${plan.name} agendado`,
        message: `O pagamento foi confirmado. O plano ${plan.name} será aplicado na renovação do seu ciclo atual.`
      });
      const scheduledExpires = active[0]?.expires_at
        ? new Date(active[0].expires_at).toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR');
      await notifyPlanActivated(user, plan, {
        currency,
        amount: billing.amount,
        isScheduled: true,
        expiresAt: scheduledExpires
      });
      return;
    }

    if (isActivePaidPlanChange && targetRank < currentRank) {
      // Downgrade aplica limites imediatamente, sem apagar containers excedentes.
      const active = await database.query(
        `SELECT expires_at FROM billing WHERE user_id = ? AND status = 'active'
         ORDER BY expires_at DESC LIMIT 1`,
        [billing.user_id]
      );
      const currentExpires = active[0]?.expires_at || new Date();
      await database.query(
        `UPDATE billing SET status = 'expired' WHERE user_id = ? AND status = 'active'`,
        [billing.user_id]
      );
      await database.query(
        `UPDATE billing SET status = 'active', activated_at = NOW(), expires_at = ? WHERE id = ?`,
        [currentExpires, billing.id]
      );
      await database.query(
        `UPDATE users SET plan = ?, max_containers = ?, max_ram_mb = ?, max_storage_mb = ?, pending_plan = NULL WHERE id = ?`,
        [plan.id, plan.max_containers, plan.max_ram_mb, plan.max_storage_mb, billing.user_id]
      );
      await database.query(
        `UPDATE containers SET plan_blocked = CASE
           WHEN id IN (
             SELECT id FROM (
               SELECT id FROM containers WHERE user_id = ? ORDER BY created_at ASC LIMIT ?
             ) AS selected_containers
           ) THEN false ELSE true END
         WHERE user_id = ?`,
        [billing.user_id, plan.max_containers, billing.user_id]
      );
      const blockedRunning = await database.query(
        `SELECT id FROM containers WHERE user_id = ? AND plan_blocked = true AND status = 'running'`,
        [billing.user_id]
      );
      for (const container of blockedRunning) {
        try {
          await dockerManager.stopContainer(container.id);
        } catch (error) {
          console.warn(`⚠️ Não consegui parar container excedente ${container.id}:`, error.message);
        }
      }

      const notificationManager = require('../utils/notification-manager');
      await notificationManager.notify(billing.user_id, {
        type: 'warning',
        category: 'billing',
        title: `Downgrade para ${plan.name} aplicado`,
        message: `Os limites do plano ${plan.name} já estão ativos. Containers excedentes foram preservados, mas não poderão ser iniciados.`
      });
      const downExpires = currentExpires
        ? new Date(currentExpires).toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR');
      await notifyPlanActivated(user, plan, {
        currency: billing.currency,
        amount: billing.amount,
        isScheduled: false,
        expiresAt: downExpires
      });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await database.query(
      `UPDATE billing SET status = 'expired'
       WHERE user_id = ? AND status = 'active' AND id <> ?`,
      [billing.user_id, billing.id]
    );
    await database.query(
      `UPDATE billing SET status = 'active', activated_at = NOW(), expires_at = ? WHERE id = ?`,
      [expiresAt, billing.id]
    );
    await database.query(
      `UPDATE users SET plan = ?, max_containers = ?, max_ram_mb = ?, max_storage_mb = ?,
       pending_plan = NULL, suspended_at = NULL, free_trial_ends = ? WHERE id = ?`,
      [plan.id, plan.max_containers, plan.max_ram_mb, plan.max_storage_mb, expiresAt, billing.user_id]
    );
    await database.query('UPDATE containers SET plan_blocked = false WHERE user_id = ?', [billing.user_id]);
    const accountService = require('../services/accountService');
    await accountService.reactivateUserContainers(billing.user_id);

    console.log(`✅ Plano ${plan.name} ativado para usuário ${billing.user_id} até ${expiresAt.toISOString()}`);

    const notificationManager = require('../utils/notification-manager');
    await notificationManager.notify(billing.user_id, {
      type: 'success',
      category: 'billing',
      title: `Plano ${plan.name} ativado! 🎉`,
      message: `Seu plano foi ativado com sucesso e expira em ${expiresAt.toLocaleDateString('pt-BR')}.`
    });
    await notifyPlanActivated(user, plan, {
      currency: billing.currency,
      amount: billing.amount,
      isScheduled: false,
      expiresAt: expiresAt.toLocaleDateString('pt-BR')
    });
  } catch (error) {
    console.error('Erro ao ativar plano:', error);
    throw error;
  }
}

module.exports = router;
