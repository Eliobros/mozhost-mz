// routes/billing.js - Pagamentos diretos com dinheiro real
// Integrado com Alauda API (M-Pesa, e-Mola, MercadoPago)
const express = require('express');
const router = express.Router();
const axios = require('axios');
const database = require('../models/database');
const authenticateToken = require('../middleware/auth');

const ALAUDA_API_URL = process.env.ALAUDA_API_URL || 'https://alauda-api.duckdns.org/api/payment';
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
      'SELECT plan, max_containers, max_ram_mb, max_storage_mb, coins, free_trial_ends FROM users WHERE id = ?',
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
    const { planId, method, phone } = req.body;

    if (!planId || !method) {
      return res.status(400).json({ error: 'Plano e método de pagamento são obrigatórios' });
    }

    if (!['mpesa', 'emola', 'mercadopago'].includes(method)) {
      return res.status(400).json({ error: 'Método de pagamento inválido. Use: mpesa, emola ou mercadopago' });
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
              'Authorization': `ApiKey ${ALAUDA_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const alaudaData = alaudaRes.data.data || alaudaRes.data;

        paymentDetails = {
          provider: method === 'mpesa' ? 'M-Pesa (Vodacom)' : 'E-Mola (Movitel)',
          phone: phoneClean,
          reference: referenceCode,
          transaction_id: alaudaData.payment?.transaction_id,
          instructions: [
            'Aguarde a notificação no seu celular',
            `Digite seu PIN ${method === 'mpesa' ? 'M-Pesa' : 'E-Mola'} para confirmar`,
            `Valor: ${amount} ${currency === 'MZN' ? 'MT' : 'R$'}`,
            `Referência: ${referenceCode}`
          ]
        };

        if (alaudaData.payment?.transaction_id) {
          await database.query(
            'UPDATE billing SET transaction_id = ?, status = "processing" WHERE id = ?',
            [alaudaData.payment.transaction_id, billingId]
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
              'Authorization': `ApiKey ${ALAUDA_API_KEY}`,
              'Content-Type': 'application/json'
            }
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
      }
    } catch (alaudaError) {
      console.error('❌ Erro na Alauda API (billing):', alaudaError.response?.data || alaudaError.message);

      if (method === 'mpesa' || method === 'emola') {
        const fallbackPhone = process.env[`${method.toUpperCase()}_PHONE`] || '258840000000';
        paymentDetails = {
          provider: method === 'mpesa' ? 'M-Pesa (Vodacom)' : 'E-Mola (Movitel)',
          phone: fallbackPhone,
          reference: referenceCode,
          manual: true,
          instructions: [
            `Abra o app ${method === 'mpesa' ? 'M-Pesa' : 'E-Mola'}`,
            'Escolha "Enviar Dinheiro"',
            `Para o número: ${fallbackPhone}`,
            `Valor: ${amount} ${currency === 'MZN' ? 'MT' : 'R$'}`,
            `Referência: ${referenceCode}`
          ]
        };
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
              { headers: { 'Authorization': `ApiKey ${ALAUDA_API_KEY}` } }
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
      const { transaction_id, status: paymentStatus } = req.body;
      if (transaction_id && paymentStatus === 'completed') {
        const billings = await database.query(
          'SELECT id, user_id, plan_id FROM billing WHERE transaction_id = ? AND status IN ("pending", "processing")',
          [transaction_id]
        );
        if (billings.length > 0) {
          await activatePlan(billings[0]);
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

    res.json({ success: true, billing: billings[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar status' });
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

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Atualizar billing
    await database.query(
      `UPDATE billing SET status = 'active', activated_at = NOW(), expires_at = ? WHERE id = ?`,
      [expiresAt, billing.id]
    );

    // Atualizar plano do usuário e reativar conta (limpa suspensão)
    await database.query(
      `UPDATE users SET plan = ?, max_containers = ?, max_ram_mb = ?, max_storage_mb = ?, suspended_at = NULL, free_trial_ends = ? WHERE id = ?`,
      [plan.id, plan.max_containers, plan.max_ram_mb, plan.max_storage_mb, expiresAt, billing.user_id]
    );

    console.log(`✅ Plano ${plan.name} ativado para usuário ${billing.user_id} até ${expiresAt.toISOString()}`);

    // Notificar
    try {
      const notificationManager = require('../utils/notification-manager');
      await notificationManager.createNotification(billing.user_id, {
        type: 'success',
        category: 'billing',
        title: `Plano ${plan.name} ativado! 🎉`,
        message: `Seu plano foi ativado com sucesso e expira em ${expiresAt.toLocaleDateString('pt-BR')}.`
      });
    } catch (e) { console.error('Erro notificação billing:', e.message); }

  } catch (error) {
    console.error('Erro ao ativar plano:', error);
    throw error;
  }
}

module.exports = router;
