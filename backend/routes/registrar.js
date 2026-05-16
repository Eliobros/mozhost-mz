// routes/registrar.js
// Gestão de domínios via Dynadot API

const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const database = require('../models/database');

const ALAUDA_API_URL = process.env.ALAUDA_API_URL || 'https://alauda-api.mozhost.shop/api/payment';
const ALAUDA_API_KEY = process.env.ALAUDA_API_KEY || 'sua_api_key_aqui';

// ===== CONFIGURAÇÕES DYNADOT =====
const DY_API_URL = 'https://api.dynadot.com/api3.json';
const DY_API_KEY = process.env.DYNADOT_API_KEY;

// ===== FUNÇÃO AUXILIAR DYNADOT =====
async function dynadotRequest(command, params = {}) {
  const queryParams = new URLSearchParams({
    key: DY_API_KEY,
    command,
    ...params
  });

  const response = await fetch(`${DY_API_URL}?${queryParams.toString()}`);
  const data = await response.json();

  // Dynadot retorna ResponseCode "0" para sucesso
  const responseKey = Object.keys(data)[0];
  const result = data[responseKey];

  if (result?.ResponseCode !== undefined && String(result.ResponseCode) !== '0') {
    throw new Error(result.Error || result.Message || 'Erro Dynadot');
  }

  return result;
}

// ===== FUNÇÃO CENTRAL: executar ação após pagamento =====
async function executeDomainAction(payment) {
  if (payment.action === 'buy') {
    await dynadotRequest('register', {
      domain: payment.domain,
      duration: String(payment.years || 1),
      registrant_first_name: payment.first_name,
      registrant_last_name: payment.last_name,
      registrant_email: payment.email_contact,
      registrant_phone_num: payment.phone_contact,
      registrant_address1: payment.address,
      registrant_city: payment.city,
      registrant_state: payment.state || 'Maputo',
      registrant_zip_code: payment.zip || '0000',
      registrant_country: payment.country || 'MZ',
    });

  } else if (payment.action === 'renew') {
    await dynadotRequest('renew', {
      domain: payment.domain,
      duration: String(payment.years || 1)
    });
  } else if (payment.action === 'transfer') {
  await dynadotRequest('transfer', {
    domain: payment.domain,
    auth_code: payment.auth_code,
    duration: String(payment.years || 1),
    registrant_first_name: payment.first_name,
    registrant_last_name: payment.last_name,
    registrant_email: payment.email_contact,
    registrant_phone_num: payment.phone_contact,
    registrant_address1: payment.address,
    registrant_city: payment.city,
    registrant_state: payment.state || 'Maputo',
    registrant_zip_code: payment.zip || '0000',
    registrant_country: payment.country || 'MZ',
  });
}
}

// ===== DOMÍNIOS =====

// GET /api/registrar/check/:domain
router.get('/check/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;

    const data = await dynadotRequest('search', {
      domain0: domain,
      show_price: '1',
      currency: 'USD'
    });

    const result = data.SearchResults?.[0];
    const available = result?.Available === 'yes';

    // Extrair preço do campo Price
    let price = null;
    if (result?.Price) {
      const match = result.Price.match(/Registration Price:\s*([\d.]+)/);
      if (match) price = parseFloat(match[1]);
    }

    res.json({
      success: true,
      domain,
      available,
      price
    });

  } catch (error) {
    console.error('Erro ao verificar domínio:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/registrar/list
router.get('/list', auth, async (req, res) => {
  try {
    const data = await dynadotRequest('list_domain');

    const domains = data.DomainInfoList || [];

    res.json({
      success: true,
      domains: domains.map(d => ({
        name: d.Domain?.Name,
        expires: d.Domain?.Expiration,
        auto_renew: d.Domain?.RenewOption === 'auto',
        locked: d.Domain?.Locked === 'yes',
      }))
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== NAMESERVERS =====

// GET /api/registrar/ns/:domain
router.get('/ns/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;

    const data = await dynadotRequest('get_ns', { domain });

    const ns = data.GetNsResponse?.NameServerList || [];
    res.json({ success: true, nameservers: Array.isArray(ns) ? ns : [ns] });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/registrar/ns/:domain
router.put('/ns/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const { nameservers } = req.body;

    if (!nameservers || !Array.isArray(nameservers) || nameservers.length === 0) {
      return res.status(400).json({ error: 'Nameservers inválidos' });
    }

    const nsParams = {};
    nameservers.forEach((ns, i) => {
      nsParams[`ns${i}`] = ns;
    });

    await dynadotRequest('set_ns', { domain, ...nsParams });

    res.json({ success: true, domain, nameservers });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== DNS =====

// GET /api/registrar/dns/:domain
router.get('/dns/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;

    const data = await dynadotRequest('get_dns', { domain });

    const records = data.GetDnsResponse?.RecordList || [];
    res.json({ success: true, records: Array.isArray(records) ? records : [records] });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/registrar/dns/:domain
router.post('/dns/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const { name, type, content, ttl = 1800 } = req.body;

    await dynadotRequest('set_dns2', {
      domain,
      main_record_type0: type,
      main_record0: content,
      main_subdomain0: name || '@',
      main_ttl0: String(ttl)
    });

    res.status(201).json({ success: true, domain });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== PAGAMENTOS =====

// POST /api/registrar/pay
router.post('/pay', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const {
      domain, action, cost, method, phone, years, transaction_id,
      first_name, last_name, organization, email_contact,
      address, city, state, zip, country, phone_contact
    } = req.body;

    if (!domain || !action || !cost || !method) {
      return res.status(400).json({ error: 'domain, action, cost e method são obrigatórios' });
    }
    if (!['buy', 'renew'].includes(action)) {
      return res.status(400).json({ error: 'action deve ser "buy" ou "renew"' });
    }
    if (!['mpesa', 'emola', 'mercadopago'].includes(method)) {
      return res.status(400).json({ error: 'Método inválido. Use: mpesa, emola ou mercadopago' });
    }
    if ((method === 'mpesa' || method === 'emola') && !phone) {
      return res.status(400).json({ error: 'Número de telefone é obrigatório para pagamento móvel' });
    }
    if (action === 'buy' && (!first_name || !last_name || !email_contact || !address || !city || !phone_contact)) {
      return res.status(400).json({ error: 'Dados de contato obrigatórios para registrar domínio' });
    }

    const USD_TO_MT = parseFloat(process.env.USD_TO_MT_RATE) || 63;
    const priceUsd = parseFloat(cost);
    const priceMt = Math.ceil(priceUsd * USD_TO_MT);
    const amount = method === 'mercadopago' ? Math.ceil(priceUsd * 5.5) : priceMt;
    const currency = method === 'mercadopago' ? 'BRL' : 'MZN';

    const users = await database.query('SELECT id, email FROM users WHERE id = ?', [userId]);
    if (!users.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const referenceCode = `DOM${timestamp}${random}`;

    await database.query(
      `INSERT INTO domain_payments 
        (user_id, domain, action, price_usd, amount, currency, method, phone, years,
         reference_code, status,
         first_name, last_name, organization, email_contact,
         address, city, state, zip, country, phone_contact, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId, domain, action, priceUsd, amount, currency, method, phone || null, years || 1,
        referenceCode,
        first_name || null, last_name || null, organization || null, email_contact || null,
        address || null, city || null, state || 'Maputo', zip || '0000', country || 'MZ', phone_contact || null
      ]
    );

    const paymentId = (await database.query('SELECT LAST_INSERT_ID() as id'))[0].id;

    let paymentDetails = {};
    let paymentUrl = null;

    // Se o frontend já chamou Alauda diretamente e enviou transaction_id, só registrar
    if ((method === 'mpesa' || method === 'emola') && transaction_id) {
      await database.query(
        'UPDATE domain_payments SET transaction_id = ?, status = "processing" WHERE id = ?',
        [transaction_id, paymentId]
      );

      const phoneClean = phone.replace(/^258/, '');
      paymentDetails = {
        provider: method === 'mpesa' ? 'M-Pesa (Vodacom)' : 'E-Mola (Movitel)',
        phone: phoneClean,
        reference: referenceCode,
        transaction_id,
        instructions: [
          'Aguarde a notificação no seu celular',
          `Digite seu PIN ${method === 'mpesa' ? 'M-Pesa' : 'E-Mola'} para confirmar`,
          `Valor: ${amount} MT`,
          `Referência: ${referenceCode}`
        ]
      };

    } else if (method === 'mercadopago') {
      try {
        const desc = action === 'buy'
          ? `Registro de domínio: ${domain}`
          : `Renovação de domínio: ${domain}`;

        const alaudaRes = await axios.post(
          `${ALAUDA_API_URL}/mercadopago`,
          {
            email: users[0].email,
            amount: parseFloat(amount),
            description: desc,
            usuario_id: userId.toString(),
            back_urls: {
              success: `${process.env.FRONTEND_URL || 'https://mozhost.shop'}/domains?payment=success&ref=${referenceCode}`,
              failure: `${process.env.FRONTEND_URL || 'https://mozhost.shop'}/domains?payment=failure`,
              pending: `${process.env.FRONTEND_URL || 'https://mozhost.shop'}/domains?payment=pending`
            },
            notification_url: `${process.env.BACKEND_URL || 'https://api.mozhost.shop'}/api/registrar/webhook/mercadopago`
          },
          { headers: { 'Authorization': `ApiKey ${ALAUDA_API_KEY}`, 'Content-Type': 'application/json' } }
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
            'UPDATE domain_payments SET transaction_id = ? WHERE id = ?',
            [alaudaData.payment.id, paymentId]
          );
        }
      } catch (alaudaError) {
        console.error('❌ Erro Alauda MercadoPago (domain):', alaudaError.response?.data || alaudaError.message);
        return res.status(500).json({ error: 'Erro ao criar pagamento MercadoPago' });
      }

    } else {
      // Fallback: M-Pesa/e-Mola sem transaction_id (chamada direta do backend)
      try {
        const phoneClean = phone.replace(/^258/, '');
        const endpoint = method === 'mpesa' ? '/mpesa' : '/emola';

        const alaudaRes = await axios.post(
          `${ALAUDA_API_URL}${endpoint}`,
          {
            valor: amount.toString(),
            numero_celular: phoneClean,
            usuario_id: userId.toString()
          },
          { headers: { 'Authorization': `ApiKey ${ALAUDA_API_KEY}`, 'Content-Type': 'application/json' } }
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
            `Valor: ${amount} MT`,
            `Referência: ${referenceCode}`
          ]
        };

        if (alaudaData.payment?.transaction_id) {
          await database.query(
            'UPDATE domain_payments SET transaction_id = ?, status = "processing" WHERE id = ?',
            [alaudaData.payment.transaction_id, paymentId]
          );
        }
      } catch (alaudaError) {
        console.error('❌ Erro Alauda (domain pay):', alaudaError.response?.data || alaudaError.message);
        return res.status(500).json({ error: 'Erro ao processar pagamento móvel. Tente novamente.' });
      }
    }

    console.log(`💳 Domain payment: ID ${paymentId} | ${action} ${domain} | $${priceUsd} → ${amount} ${currency} | ${method}`);

    res.json({
      success: true,
      payment_id: paymentId,
      reference_code: referenceCode,
      domain,
      action,
      price_usd: priceUsd,
      amount,
      currency,
      payment_details: paymentDetails,
      payment_url: paymentUrl,
      status: 'pending'
    });

  } catch (error) {
    console.error('Erro domain payment:', error);
    res.status(500).json({ error: 'Falha ao processar pagamento' });
  }
});

// GET /api/registrar/pay/:id/status
router.get('/pay/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // SELECT * para incluir campos de contato necessários no executeDomainAction
    const payments = await database.query(
      'SELECT * FROM domain_payments WHERE id = ?',
      [id]
    );
    if (!payments.length) return res.status(404).json({ error: 'Pagamento não encontrado' });

    const payment = payments[0];

    if (['pending', 'processing'].includes(payment.status) && payment.transaction_id) {
      try {
        const statusRes = await axios.get(
          `${ALAUDA_API_URL}/status/${payment.transaction_id}`,
          { headers: { 'Authorization': `ApiKey ${ALAUDA_API_KEY}` } }
        );

        const alaudaStatus = statusRes.data?.data?.status || statusRes.data?.status;

        if (alaudaStatus === 'completed' || alaudaStatus === 'approved') {
          try {
            await executeDomainAction(payment);
            await database.query(
              'UPDATE domain_payments SET status = "completed", completed_at = NOW() WHERE id = ?',
              [payment.id]
            );
            payment.status = 'completed';
            console.log(`✅ Domain ${payment.action} completed via polling: ${payment.domain}`);
          } catch (err) {
            console.error(`❌ Erro No  Dynadot após pagamento: ${err.message}`);
            await database.query(
              'UPDATE domain_payments SET status = "failed", error_message = ? WHERE id = ?',
              [err.message, payment.id]
            );
            payment.status = 'failed';
          }
        } else if (['failed', 'rejected', 'cancelled'].includes(alaudaStatus)) {
          await database.query('UPDATE domain_payments SET status = "failed" WHERE id = ?', [payment.id]);
          payment.status = 'failed';
        }
      } catch (statusError) {
        console.error('Erro ao verificar status Alauda:', statusError.message);
      }
    }

    res.json({ success: true, payment });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// POST /api/registrar/webhook/dynadot
router.post('/webhook/dynadot', async (req, res) => {
  try {
    const webhookKey = process.env.DYNADOT_WEBHOOK_KEY;
    const authHeader = req.headers['authorization'];

    if (authHeader !== `Bearer ${webhookKey}`) {
      console.warn('⚠️ Webhook Dynadot: autorização inválida');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { event, data } = req.body;
    console.log(`📥 Dynadot webhook [${event}]:`, data);

    if (event === 'order_completed') {
      const domainName = data?.DomainName;
      if (domainName) {
        await database.query(
          'UPDATE domain_payments SET status = "completed", completed_at = NOW() WHERE domain = ? AND status IN ("pending", "processing")',
          [domainName]
        );
        console.log(`✅ Domínio completado via webhook: ${domainName}`);
      }
    } else if (event === 'domain_expiring') {
      console.log(`⚠️ Domínio a expirar: ${data?.DomainName}`);
    } else if (event === 'account_balance_reminder') {
      console.log('💰 Saldo Dynadot baixo!');
    }

    res.json({ Status: '200' });

  } catch (error) {
    console.error('Erro webhook Dynadot:', error);
    res.status(500).json({ error: 'Erro no webhook' });
  }
});

// POST /api/registrar/webhook/:method (mpesa, emola, mercadopago)
router.post('/webhook/:method', async (req, res) => {
  try {
    const { method } = req.params;
    console.log(`📥 Domain payment webhook [${method}]:`, req.body);

    let payment = null;

    if (method === 'mercadopago') {
      const { type, data } = req.body;
      if (type === 'payment' && data?.id) {
        const payments = await database.query(
          'SELECT * FROM domain_payments WHERE transaction_id = ? AND status IN ("pending", "processing")',
          [data.id]
        );
        if (payments.length > 0) {
          try {
            const statusRes = await axios.get(
              `${ALAUDA_API_URL}/mercadopago/status/${data.id}`,
              { headers: { 'Authorization': `ApiKey ${ALAUDA_API_KEY}` } }
            );
            if (statusRes.data.data?.payment?.status === 'approved') {
              payment = payments[0];
            } else if (['rejected', 'cancelled'].includes(statusRes.data.data?.payment?.status)) {
              await database.query('UPDATE domain_payments SET status = "failed" WHERE id = ?', [payments[0].id]);
            }
          } catch (e) {
            console.error('Erro status MP domain:', e.message);
          }
        }
      }
    } else if (['mpesa', 'emola', 'paymoz'].includes(method)) {
      const { transaction_id, status: paymentStatus } = req.body;
      if (transaction_id && paymentStatus === 'completed') {
        const payments = await database.query(
          'SELECT * FROM domain_payments WHERE transaction_id = ? AND status IN ("pending", "processing")',
          [transaction_id]
        );
        if (payments.length > 0) payment = payments[0];
      }
    }

    if (payment) {
      try {
        await executeDomainAction(payment);
        await database.query(
          'UPDATE domain_payments SET status = "completed", completed_at = NOW() WHERE id = ?',
          [payment.id]
        );
        console.log(`✅ Domain ${payment.action} completed via webhook: ${payment.domain}`);
      } catch (err) {
        console.error(`❌ Erro Dynadot após webhook: ${err.message}`);
        await database.query(
          'UPDATE domain_payments SET status = "failed", error_message = ? WHERE id = ?',
          [err.message, payment.id]
        );
      }
    }

    res.json({ success: true, received: true });

  } catch (error) {
    console.error('Erro webhook domain:', error);
    res.status(500).json({ error: 'Erro no webhook' });
  }
});

// ===== TRANSFERÊNCIAS =====

// POST /api/registrar/transfer/out/:domain
// Gera EPP/auth code e desbloqueia o domínio para transferência saída (gratuito)
router.post('/transfer/out/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const userId = req.user.userId || req.user.id;

    // Verifica se o domínio pertence ao usuário
    const payments = await database.query(
      `SELECT * FROM domain_payments 
       WHERE domain = ? AND user_id = ? AND status = 'completed' AND action IN ('buy', 'transfer')
       LIMIT 1`,
      [domain, userId]
    );
    if (!payments.length) {
      return res.status(403).json({ error: 'Domínio não encontrado ou não pertence ao usuário' });
    }

    // 1. Desbloquear o domínio na Dynadot
    await dynadotRequest('set_option', {
      domain,
      option: 'locked',
      value: 'no'
    });

    // 2. Obter o auth code (EPP code)
    const data = await dynadotRequest('get_transfer_auth_code', { domain });

    const authCode = data.AuthCode || data.GetTransferAuthCodeResponse?.AuthCode;
    if (!authCode) {
      throw new Error('Não foi possível obter o auth code. Tente novamente em alguns minutos.');
    }

    console.log(`🔓 Transfer out: ${domain} desbloqueado | user ${userId}`);

    res.json({
      success: true,
      domain,
      auth_code: authCode,
      message: 'Domínio desbloqueado. Use o auth code no seu novo registrar para concluir a transferência.',
      warning: 'Após iniciar a transferência no novo registrar, você tem 5 dias para confirmar por email.'
    });

  } catch (error) {
    console.error('Erro transfer out:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/registrar/transfer/in
// Inicia transferência de domínio externo para MozHost (com pagamento)
router.post('/transfer/in', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const {
      domain, auth_code, cost, method, phone, years, transaction_id,
      first_name, last_name, organization, email_contact,
      address, city, state, zip, country, phone_contact
    } = req.body;

    // Validações
    if (!domain || !auth_code || !cost || !method) {
      return res.status(400).json({ error: 'domain, auth_code, cost e method são obrigatórios' });
    }
    if (!['mpesa', 'emola', 'mercadopago'].includes(method)) {
      return res.status(400).json({ error: 'Método inválido. Use: mpesa, emola ou mercadopago' });
    }
    if ((method === 'mpesa' || method === 'emola') && !phone) {
      return res.status(400).json({ error: 'Número de telefone é obrigatório para pagamento móvel' });
    }
    if (!first_name || !last_name || !email_contact || !address || !city || !phone_contact) {
      return res.status(400).json({ error: 'Dados de contato são obrigatórios para transferência' });
    }

    const USD_TO_MT = parseFloat(process.env.USD_TO_MT_RATE) || 63;
    const priceUsd = parseFloat(cost);
    const priceMt = Math.ceil(priceUsd * USD_TO_MT);
    const amount = method === 'mercadopago' ? Math.ceil(priceUsd * 5.5) : priceMt;
    const currency = method === 'mercadopago' ? 'BRL' : 'MZN';

    const users = await database.query('SELECT id, email FROM users WHERE id = ?', [userId]);
    if (!users.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const referenceCode = `TRF${timestamp}${random}`;

    await database.query(
      `INSERT INTO domain_payments 
        (user_id, domain, action, price_usd, amount, currency, method, phone, years,
         reference_code, status, auth_code,
         first_name, last_name, organization, email_contact,
         address, city, state, zip, country, phone_contact, created_at)
       VALUES (?, ?, 'transfer', ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId, domain, priceUsd, amount, currency, method, phone || null, years || 1,
        referenceCode, auth_code,
        first_name, last_name, organization || null, email_contact,
        address, city, state || 'Maputo', zip || '0000', country || 'MZ', phone_contact
      ]
    );

    const paymentId = (await database.query('SELECT LAST_INSERT_ID() as id'))[0].id;

    let paymentDetails = {};
    let paymentUrl = null;

    if ((method === 'mpesa' || method === 'emola') && transaction_id) {
      await database.query(
        'UPDATE domain_payments SET transaction_id = ?, status = "processing" WHERE id = ?',
        [transaction_id, paymentId]
      );
      const phoneClean = phone.replace(/^258/, '');
      paymentDetails = {
        provider: method === 'mpesa' ? 'M-Pesa (Vodacom)' : 'E-Mola (Movitel)',
        phone: phoneClean,
        reference: referenceCode,
        transaction_id,
        instructions: [
          'Aguarde a notificação no seu celular',
          `Digite seu PIN ${method === 'mpesa' ? 'M-Pesa' : 'E-Mola'} para confirmar`,
          `Valor: ${amount} MT`,
          `Referência: ${referenceCode}`
        ]
      };

    } else if (method === 'mercadopago') {
      try {
        const alaudaRes = await axios.post(
          `${ALAUDA_API_URL}/mercadopago`,
          {
            email: users[0].email,
            amount: parseFloat(amount),
            description: `Transferência de domínio: ${domain}`,
            usuario_id: userId.toString(),
            back_urls: {
              success: `${process.env.FRONTEND_URL || 'https://mozhost.shop'}/domains?payment=success&ref=${referenceCode}`,
              failure: `${process.env.FRONTEND_URL || 'https://mozhost.shop'}/domains?payment=failure`,
              pending: `${process.env.FRONTEND_URL || 'https://mozhost.shop'}/domains?payment=pending`
            },
            notification_url: `${process.env.BACKEND_URL || 'https://api.mozhost.shop'}/api/registrar/webhook/mercadopago`
          },
          { headers: { 'Authorization': `ApiKey ${ALAUDA_API_KEY}`, 'Content-Type': 'application/json' } }
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
            'UPDATE domain_payments SET transaction_id = ? WHERE id = ?',
            [alaudaData.payment.id, paymentId]
          );
        }
      } catch (alaudaError) {
        console.error('❌ Erro Alauda MercadoPago (transfer):', alaudaError.response?.data || alaudaError.message);
        return res.status(500).json({ error: 'Erro ao criar pagamento MercadoPago' });
      }

    } else {
      // M-Pesa / E-Mola sem transaction_id (backend chama Alauda diretamente)
      try {
        const phoneClean = phone.replace(/^258/, '');
        const endpoint = method === 'mpesa' ? '/mpesa' : '/emola';

        const alaudaRes = await axios.post(
          `${ALAUDA_API_URL}${endpoint}`,
          {
            valor: amount.toString(),
            numero_celular: phoneClean,
            usuario_id: userId.toString()
          },
          { headers: { 'Authorization': `ApiKey ${ALAUDA_API_KEY}`, 'Content-Type': 'application/json' } }
        );

        const alaudaData = alaudaRes.data.data || alaudaRes.data;
        const phoneCleanFinal = phone.replace(/^258/, '');
        paymentDetails = {
          provider: method === 'mpesa' ? 'M-Pesa (Vodacom)' : 'E-Mola (Movitel)',
          phone: phoneCleanFinal,
          reference: referenceCode,
          transaction_id: alaudaData.payment?.transaction_id,
          instructions: [
            'Aguarde a notificação no seu celular',
            `Digite seu PIN ${method === 'mpesa' ? 'M-Pesa' : 'E-Mola'} para confirmar`,
            `Valor: ${amount} MT`,
            `Referência: ${referenceCode}`
          ]
        };

        if (alaudaData.payment?.transaction_id) {
          await database.query(
            'UPDATE domain_payments SET transaction_id = ?, status = "processing" WHERE id = ?',
            [alaudaData.payment.transaction_id, paymentId]
          );
        }
      } catch (alaudaError) {
        console.error('❌ Erro Alauda (transfer in):', alaudaError.response?.data || alaudaError.message);
        return res.status(500).json({ error: 'Erro ao processar pagamento móvel. Tente novamente.' });
      }
    }

    console.log(`💳 Transfer in: ID ${paymentId} | ${domain} | $${priceUsd} → ${amount} ${currency} | ${method}`);

    res.json({
      success: true,
      payment_id: paymentId,
      reference_code: referenceCode,
      domain,
      action: 'transfer',
      price_usd: priceUsd,
      amount,
      currency,
      payment_details: paymentDetails,
      payment_url: paymentUrl,
      status: 'pending'
    });

  } catch (error) {
    console.error('Erro transfer in:', error);
    res.status(500).json({ error: 'Falha ao processar transferência' });
  }
});

// GET /api/registrar/transfer/status/:domain
// Verifica status de uma transferência em andamento
router.get('/transfer/status/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const userId = req.user.userId || req.user.id;

    const payments = await database.query(
      `SELECT id, domain, status, created_at, completed_at, error_message 
       FROM domain_payments 
       WHERE domain = ? AND user_id = ? AND action = 'transfer' 
       ORDER BY created_at DESC LIMIT 1`,
      [domain, userId]
    );

    if (!payments.length) {
      return res.status(404).json({ error: 'Nenhuma transferência encontrada para este domínio' });
    }

    const payment = payments[0];

    // Se ainda pendente/processing, consulta status na Dynadot também
    let dynadotStatus = null;
    if (['pending', 'processing'].includes(payment.status)) {
      try {
        const data = await dynadotRequest('check_transfer', { domain });
        dynadotStatus = data.TransferStatus || null;
      } catch (_) {
        // silencia — nem sempre disponível
      }
    }

    res.json({
      success: true,
      domain,
      status: payment.status,
      dynadot_status: dynadotStatus,
      created_at: payment.created_at,
      completed_at: payment.completed_at,
      error_message: payment.error_message || null
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar status da transferência' });
  }
});



module.exports = router;