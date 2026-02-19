// routes/registrar.js
// Gestão de domínios via Porkbun API
// Suporta: Busca, Lista, Compra, Renovação, DNS, Nameservers

const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const database = require('../models/database');

const ALAUDA_API_URL = process.env.ALAUDA_API_URL || 'https://alauda-api.duckdns.org/api/payment';
const ALAUDA_API_KEY = process.env.ALAUDA_API_KEY || 'sua_api_key_aqui';

// ===== CONFIGURAÇÕES PORKBUN =====
const PORKBUN_API_URL = 'https://api.porkbun.com/api/json/v3';
const PORKBUN_KEYS = {
  secretapikey: process.env.PORKBUN_SECRET_KEY,
  apikey: process.env.PORKBUN_API_KEY
};

// ===== FUNÇÃO AUXILIAR =====
async function porkbunRequest(endpoint, body = {}) {
  const response = await fetch(`${PORKBUN_API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...PORKBUN_KEYS, ...body })
  });

  const data = await response.json();

  if (data.status !== 'SUCCESS') {
    throw new Error(data.message || 'Erro na API Porkbun');
  }

  return data;
}

// ===== DOMÍNIOS =====

// GET /api/registrar/check/:domain - Verificar disponibilidade
router.get('/check/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;

    const data = await porkbunRequest(`/domain/checkDomain/${domain}`);

    res.json({
      success: true,
      domain,
      available: data.response.avail === 'yes',
      price: data.response.price,
      regular_price: data.response.regularPrice,
      first_year_promo: data.response.firstYearPromo === 'yes',
      premium: data.response.premium === 'yes',
      renewal_price: data.response.additional?.renewal?.price,
      transfer_price: data.response.additional?.transfer?.price,
      min_duration: data.response.minDuration
    });

  } catch (error) {
    console.error('Erro ao verificar domínio:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/registrar/list - Listar domínios da conta
router.get('/list', auth, async (req, res) => {
  try {
    const { start = 0 } = req.query;

    const data = await porkbunRequest('/domain/listAll', {
      start: String(start),
      includeLabels: 'yes'
    });

    res.json({
      success: true,
      domains: data.domains
    });

  } catch (error) {
    console.error('Erro ao listar domínios:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/registrar/buy - Comprar domínio
router.post('/buy', auth, async (req, res) => {
  try {
    const { domain, cost } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domínio é obrigatório' });
    }
    if (!cost || cost <= 0) {
      return res.status(400).json({ error: 'Custo inválido' });
    }

    const data = await porkbunRequest(`/domain/create/${domain}`, {
      cost: parseInt(cost),
      agreeToTerms: 'yes'
    });

    res.status(201).json({
      success: true,
      domain: data.domain,
      cost: data.cost,
      order_id: data.orderId,
      balance_remaining: data.balance
    });

  } catch (error) {
    console.error('Erro ao comprar domínio:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/registrar/renew/:domain - Renovar domínio
router.post('/renew/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const { years = 1 } = req.body;

    const data = await porkbunRequest(`/domain/renew/${domain}`, {
      years: parseInt(years)
    });

    res.json({
      success: true,
      domain,
      years,
      order_id: data.orderId,
      balance_remaining: data.balance
    });

  } catch (error) {
    console.error('Erro ao renovar domínio:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== NAMESERVERS =====

// GET /api/registrar/ns/:domain - Buscar nameservers
router.get('/ns/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;

    const data = await porkbunRequest(`/domain/getNs/${domain}`);

    res.json({
      success: true,
      domain,
      nameservers: data.ns
    });

  } catch (error) {
    console.error('Erro ao buscar nameservers:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/registrar/ns/:domain - Atualizar nameservers
router.put('/ns/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const { nameservers } = req.body;

    if (!nameservers || !Array.isArray(nameservers) || nameservers.length === 0) {
      return res.status(400).json({ error: 'Nameservers inválidos. Envie um array com ao menos 1 nameserver.' });
    }

    await porkbunRequest(`/domain/updateNs/${domain}`, {
      ns: nameservers
    });

    res.json({
      success: true,
      domain,
      nameservers
    });

  } catch (error) {
    console.error('Erro ao atualizar nameservers:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== DNS =====

// GET /api/registrar/dns/:domain - Listar registros DNS
router.get('/dns/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;

    const data = await porkbunRequest(`/dns/retrieve/${domain}`);

    res.json({
      success: true,
      domain,
      records: data.records
    });

  } catch (error) {
    console.error('Erro ao listar DNS:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/registrar/dns/:domain - Criar registro DNS
router.post('/dns/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const { name, type, content, ttl = 600, prio, notes } = req.body;

    const validTypes = ['A', 'MX', 'CNAME', 'ALIAS', 'TXT', 'NS', 'AAAA', 'SRV', 'TLSA', 'CAA', 'HTTPS', 'SVCB', 'SSHFP'];

    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: `Tipo inválido. Use: ${validTypes.join(', ')}` });
    }
    if (!content) {
      return res.status(400).json({ error: 'Content é obrigatório' });
    }

    const data = await porkbunRequest(`/dns/create/${domain}`, {
      name,
      type,
      content,
      ttl: String(ttl),
      prio,
      notes
    });

    res.status(201).json({
      success: true,
      domain,
      record_id: data.id
    });

  } catch (error) {
    console.error('Erro ao criar registro DNS:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/registrar/dns/:domain/:id - Editar registro DNS
router.put('/dns/:domain/:id', auth, async (req, res) => {
  try {
    const { domain, id } = req.params;
    const { name, type, content, ttl = 600, prio, notes } = req.body;

    if (!type || !content) {
      return res.status(400).json({ error: 'Type e content são obrigatórios' });
    }

    await porkbunRequest(`/dns/edit/${domain}/${id}`, {
      name,
      type,
      content,
      ttl: String(ttl),
      prio,
      notes
    });

    res.json({
      success: true,
      domain,
      record_id: id
    });

  } catch (error) {
    console.error('Erro ao editar registro DNS:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/registrar/dns/:domain/:id - Deletar registro DNS
router.delete('/dns/:domain/:id', auth, async (req, res) => {
  try {
    const { domain, id } = req.params;

    await porkbunRequest(`/dns/delete/${domain}/${id}`);

    res.json({
      success: true,
      domain,
      record_id: id,
      message: 'Registro DNS removido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar registro DNS:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/registrar/info - Info dos endpoints disponíveis
router.get('/info', (req, res) => {
  res.json({
    success: true,
    service: 'MozHost Domain Registrar',
    powered_by: 'Porkbun API v3',
    endpoints: {
      check: 'GET /api/registrar/check/:domain',
      list: 'GET /api/registrar/list',
      buy: 'POST /api/registrar/buy',
      renew: 'POST /api/registrar/renew/:domain',
      nameservers: {
        get: 'GET /api/registrar/ns/:domain',
        update: 'PUT /api/registrar/ns/:domain'
      },
      dns: {
        list: 'GET /api/registrar/dns/:domain',
        create: 'POST /api/registrar/dns/:domain',
        edit: 'PUT /api/registrar/dns/:domain/:id',
        delete: 'DELETE /api/registrar/dns/:domain/:id'
      }
    }
  });
});

// ===== PAGAMENTOS DE DOMÍNIOS =====

// POST /api/registrar/pay - Iniciar pagamento para domínio (compra ou renovação)
router.post('/pay', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { domain, action, cost, method, phone, years } = req.body;
    // action: 'buy' ou 'renew'

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

    // Converter preço USD para MT (taxa aproximada)
    const USD_TO_MT = parseFloat(process.env.USD_TO_MT_RATE) || 63;
    const priceUsd = parseFloat(cost);
    const priceMt = Math.ceil(priceUsd * USD_TO_MT);
    const amount = method === 'mercadopago' ? Math.ceil(priceUsd * 5.5) : priceMt; // BRL ou MT
    const currency = method === 'mercadopago' ? 'BRL' : 'MZN';

    const users = await database.query('SELECT id, email FROM users WHERE id = ?', [userId]);
    if (!users.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const referenceCode = `DOM${timestamp}${random}`;

    // Salvar pagamento pendente
    await database.query(
      `INSERT INTO domain_payments (user_id, domain, action, price_usd, amount, currency, method, phone, years, reference_code, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [userId, domain, action, priceUsd, amount, currency, method, phone || null, years || 1, referenceCode]
    );

    const paymentId = (await database.query('SELECT LAST_INSERT_ID() as id'))[0].id;

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
            `Valor: ${amount} ${currency === 'MZN' ? 'MT' : 'R$'}`,
            `Referência: ${referenceCode}`
          ]
        };

        if (alaudaData.payment?.transaction_id) {
          await database.query(
            'UPDATE domain_payments SET transaction_id = ?, status = "processing" WHERE id = ?',
            [alaudaData.payment.transaction_id, paymentId]
          );
        }

      } else if (method === 'mercadopago') {
        const desc = action === 'buy' ? `Registro de domínio: ${domain}` : `Renovação de domínio: ${domain}`;
        const alaudaRes = await axios.post(
          `${ALAUDA_API_URL}/mercadopago`,
          {
            email: users[0].email,
            amount: parseFloat(amount),
            description: desc,
            usuario_id: userId.toString(),
            back_urls: {
              success: `${process.env.FRONTEND_URL || 'https://mozhost.topaziocoin.online'}/domains?payment=success&ref=${referenceCode}`,
              failure: `${process.env.FRONTEND_URL || 'https://mozhost.topaziocoin.online'}/domains?payment=failure`,
              pending: `${process.env.FRONTEND_URL || 'https://mozhost.topaziocoin.online'}/domains?payment=pending`
            },
            notification_url: `${process.env.BACKEND_URL || 'https://api.mozhost.topaziocoin.online'}/api/registrar/webhook/mercadopago`
          },
          { headers: { 'Authorization': `ApiKey ${ALAUDA_API_KEY}`, 'Content-Type': 'application/json' } }
        );

        const alaudaData = alaudaRes.data.data || alaudaRes.data;
        paymentUrl = alaudaData.payment?.init_point || alaudaData.payment?.sandbox_init_point;

        paymentDetails = { provider: 'Mercado Pago', url: paymentUrl, preference_id: alaudaData.payment?.id };

        if (alaudaData.payment?.id) {
          await database.query('UPDATE domain_payments SET transaction_id = ? WHERE id = ?', [alaudaData.payment.id, paymentId]);
        }
      }
    } catch (alaudaError) {
      console.error('❌ Erro Alauda (domain pay):', alaudaError.response?.data || alaudaError.message);

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

// GET /api/registrar/pay/:id/status - Verificar status do pagamento
router.get('/pay/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const payments = await database.query(
      'SELECT id, domain, action, price_usd, amount, currency, method, status, reference_code, created_at, completed_at FROM domain_payments WHERE id = ?',
      [id]
    );
    if (!payments.length) return res.status(404).json({ error: 'Pagamento não encontrado' });
    res.json({ success: true, payment: payments[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// POST /api/registrar/webhook/:method - Webhook para pagamentos de domínio
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
          } catch (e) { console.error('Erro status MP domain:', e.message); }
        }
      }
    } else if (method === 'paymoz') {
      const { transaction_id, status: paymentStatus } = req.body;
      if (transaction_id && paymentStatus === 'completed') {
        const payments = await database.query(
          'SELECT * FROM domain_payments WHERE transaction_id = ? AND status IN ("pending", "processing")',
          [transaction_id]
        );
        if (payments.length > 0) payment = payments[0];
      }
    }

    // Se pagamento confirmado, executar a ação no Porkbun
    if (payment) {
      try {
        if (payment.action === 'buy') {
          await porkbunRequest(`/domain/create/${payment.domain}`, {
            cost: parseInt(payment.price_usd),
            agreeToTerms: 'yes'
          });
        } else if (payment.action === 'renew') {
          await porkbunRequest(`/domain/renew/${payment.domain}`, {
            years: parseInt(payment.years) || 1
          });
        }

        await database.query(
          'UPDATE domain_payments SET status = "completed", completed_at = NOW() WHERE id = ?',
          [payment.id]
        );

        console.log(`✅ Domain ${payment.action} completed: ${payment.domain}`);
      } catch (porkbunError) {
        console.error(`❌ Erro Porkbun após pagamento: ${porkbunError.message}`);
        await database.query(
          'UPDATE domain_payments SET status = "failed", error_message = ? WHERE id = ?',
          [porkbunError.message, payment.id]
        );
      }
    }

    res.json({ success: true, received: true });
  } catch (error) {
    console.error('Erro webhook domain:', error);
    res.status(500).json({ error: 'Erro no webhook' });
  }
});

module.exports = router;

