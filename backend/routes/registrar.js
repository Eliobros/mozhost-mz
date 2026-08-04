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

// ===== HELPERS DE PREÇO =====
// Extrai os vários preços do campo Price da Dynadot. Formato típico:
//   "Registration Price: $12.99, Renewal Price: $15.99, Transfer Price: $14.99"
//   "Premium Registration Price: $99.00"
function parseDynadotPrice(priceStr) {
  const get = (label) => {
    const m = priceStr && priceStr.match(new RegExp(`${label}\\s*:\\s*\\$?([\\d.]+)`));
    return m ? parseFloat(m[1]) : null;
  };

  // Extrair e remover o preço premium primeiro: 'Registration Price' é substring
  // de 'Premium Registration Price' — sem isso, o registro pegava o valor premium.
  const premiumMatch = priceStr && priceStr.match(/Premium Registration Price\s*:\s*\$?([\d.]+)/);
  const premiumReg = premiumMatch ? parseFloat(premiumMatch[1]) : null;
  const remaining = priceStr && premiumMatch ? priceStr.replace(/Premium Registration Price[^,]*/g, '') : priceStr;

  const regMatch = remaining && remaining.match(/Registration Price\s*:\s*\$?([\d.]+)/);
  const regPrice = regMatch ? parseFloat(regMatch[1]) : null;
  const promo = get('Promo Price');
  const renewal = get('Renewal Price');
  const transfer = get('Transfer Price');

  const premium = premiumReg != null;
  const regular = premium ? premiumReg : regPrice;
  const effective = premium ? premiumReg : (promo != null ? promo : regPrice);

  return {
    price: effective,
    regular_price: regular,
    renewal_price: renewal,
    transfer_price: transfer,
    premium,
    first_year_promo: promo != null && promo < (regPrice != null ? regPrice : promo)
  };
}

// ===== DOMÍNIOS =====

// GET /api/registrar/check/:domain
// Retorna disponibilidade + todos os preços reais (registro, promo, renovação, transferência)
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

    const prices = parseDynadotPrice(result?.Price);

    // Taxa USD→MZN para o app mostrar o preço em moeda local
    const usdToMt = parseFloat(process.env.USD_TO_MT_RATE) || 63;

    res.json({
      success: true,
      domain,
      available,
      usd_to_mt: usdToMt,
      ...prices
    });

  } catch (error) {
    console.error('Erro ao verificar domínio:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== DOMÍNIOS DO USUÁRIO =====

// Helper: retorna os domínios da conta Dynadot que pertencem ao usuário
// (baseado nos pagamentos completados de buy/transfer na MozHost).
// Evita o vazamento da lista inteira da conta Dynadot para qualquer usuário.
async function getOwnedDomains(userId) {
  const rows = await database.query(
    `SELECT DISTINCT domain FROM domain_payments
     WHERE user_id = ? AND status = 'completed' AND action IN ('buy', 'transfer')`,
    [userId]
  );
  const owned = new Set(rows.map(r => String(r.domain).toLowerCase()));

  let dynadot = [];
  try {
    const data = await dynadotRequest('list_domain');
    dynadot = data.DomainInfoList || [];
  } catch (e) {
    console.error('⚠️ list_domain Dynadot:', e.message);
  }

  return dynadot
    .filter(d => owned.has(String(d.Domain?.Name || '').toLowerCase()))
    .map(d => ({
      name: d.Domain?.Name,
      domain: d.Domain?.Name,
      expires: d.Domain?.Expiration,
      expire_date: d.Domain?.Expiration,
      auto_renew: d.Domain?.RenewOption === 'auto',
      locked: d.Domain?.Locked === 'yes',
    }));
}

// GET /api/registrar/list — só os domínios do usuário logado
router.get('/list', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const domains = await getOwnedDomains(userId);
    res.json({ success: true, domains });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/registrar/my-domains — usado pelo app mobile
router.get('/my-domains', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const domains = await getOwnedDomains(userId);
    res.json({ success: true, domains });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/registrar/my-payments — histórico de pagamentos do usuário
router.get('/my-payments', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const payments = await database.query(
      `SELECT id, domain, action, price_usd, amount, currency, method, status,
              created_at, completed_at, error_message
       FROM domain_payments
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );
    res.json({ success: true, payments });
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

// Helper: busca registros DNS atuais (normalizados). id = índice na lista.
async function getDnsRecords(domain) {
  const data = await dynadotRequest('get_dns', { domain });
  const raw = data.GetDnsResponse?.RecordList || [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .filter(r => r && (r.Value || r.value))
    .map((r, i) => {
      const type = r.RecordType || r.type;
      const rawContent = r.Value || r.content;
      let content = rawContent;
      let prio = '';
      // MX: separar a prioridade do valor ("10 mail.exemplo.com" → prio 10, content mail.exemplo.com)
      // para a UI exibir/editar em campos próprios (evita "10 10 mail.x.com" no round-trip).
      if (type === 'MX') {
        const prioMatch = String(rawContent || '').match(/^(\d+)\s+(.*)$/);
        if (prioMatch) {
          prio = prioMatch[1];
          content = prioMatch[2];
        } else if (r.Priority != null) {
          prio = String(r.Priority);
        }
      }
      return {
        id: i,
        name: r.Subdomain || r.subdomain || '@',
        type,
        content,
        ttl: parseInt(r.Ttl || r.ttl, 10) || 1800,
        prio,
        // Mantém os campos originais da Dynadot p/ compatibilidade
        Subdomain: r.Subdomain,
        RecordType: r.RecordType,
        Value: r.Value,
        Ttl: r.Ttl
      };
    });
}

// Helper: monta o valor do registro. Para MX, a prioridade vai no início do valor
// ("10 mail.exemplo.com"). Evita duplicar prioridade quando o conteúdo já a contém
// (round-trip GET → editar → PUT): "10 10 mail.exemplo.com" nunca deve acontecer.
function buildDnsContent(type, content, prio) {
  if (type !== 'MX') return content;
  const contentHasPrio = /^\d+\s+/.test(String(content));
  if (prio) return `${prio} ${String(content).replace(/^\d+\s+/, '')}`;
  return contentHasPrio ? String(content) : content;
}

// Helper: substitui TODOS os registros DNS (set_dns2 recebe a lista completa).
// Usado para adicionar/editar/remover sem perder os registros existentes
// (o POST antigo com set_dns2 de um único registro apagava o resto).
async function setDnsRecords(domain, records) {
  const params = { domain };
  records.forEach((r, i) => {
    params[`main_record_type${i}`] = r.type;
    params[`main_record${i}`] = r.content;
    params[`main_subdomain${i}`] = r.name || '@';
    params[`main_ttl${i}`] = String(r.ttl || 1800);
  });
  return dynadotRequest('set_dns2', params);
}

// GET /api/registrar/dns/:domain
router.get('/dns/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const records = await getDnsRecords(domain);
    res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/registrar/dns/:domain — adiciona UM registro (anexa aos existentes)
router.post('/dns/:domain', auth, async (req, res) => {
  try {
    const { domain } = req.params;
    const { name, type, content, ttl = 1800, prio } = req.body;
    if (!type || !content) return res.status(400).json({ error: 'type e content são obrigatórios' });

    const records = await getDnsRecords(domain);
    records.push({
      name: name || '@',
      type,
      content: buildDnsContent(type, content, prio),
      ttl: parseInt(ttl, 10) || 1800
    });
    await setDnsRecords(domain, records);

    res.status(201).json({ success: true, domain, records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/registrar/dns/:domain/:id — atualiza o registro no índice :id
router.put('/dns/:domain/:id', auth, async (req, res) => {
  try {
    const { domain, id } = req.params;
    const index = parseInt(id, 10);
    const { name, type, content, ttl = 1800, prio } = req.body;
    if (!type || !content) return res.status(400).json({ error: 'type e content são obrigatórios' });

    const records = await getDnsRecords(domain);
    if (!records[index]) return res.status(404).json({ error: 'Registro não encontrado' });

    records[index] = {
      name: name || '@',
      type,
      content: buildDnsContent(type, content, prio),
      ttl: parseInt(ttl, 10) || 1800
    };
    await setDnsRecords(domain, records);

    res.json({ success: true, domain, records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/registrar/dns/:domain/:id — remove o registro no índice :id
router.delete('/dns/:domain/:id', auth, async (req, res) => {
  try {
    const { domain, id } = req.params;
    const index = parseInt(id, 10);

    const records = await getDnsRecords(domain);
    if (!records[index]) return res.status(404).json({ error: 'Registro não encontrado' });

    records.splice(index, 1);
    await setDnsRecords(domain, records);

    res.json({ success: true, domain, records });
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
    const userId = req.user.userId || req.user.id;

    // SELECT * para incluir campos de contato necessários no executeDomainAction
    // Restringe ao dono do pagamento (evita que qualquer usuário veja/ative pagamentos alheios)
    const payments = await database.query(
      'SELECT * FROM domain_payments WHERE id = ? AND user_id = ?',
      [id, userId]
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
      // NUNCA confiar no corpo do webhook: verificar o status real na Alauda antes de executar.
      if (transaction_id && paymentStatus === 'completed') {
        try {
          const statusRes = await axios.get(
            `${ALAUDA_API_URL}/status/${transaction_id}`,
            { headers: { 'Authorization': `ApiKey ${ALAUDA_API_KEY}` } }
          );
          const alaudaStatus = statusRes.data?.data?.status || statusRes.data?.status;
          if (['completed', 'approved'].includes(alaudaStatus)) {
            const payments = await database.query(
              'SELECT * FROM domain_payments WHERE transaction_id = ? AND status IN ("pending", "processing")',
              [transaction_id]
            );
            if (payments.length > 0) payment = payments[0];
          } else {
            console.warn(`⚠️ Webhook ${method}: status Alauda real = ${alaudaStatus} (ignorado)`);
          }
        } catch (e) {
          console.error(`Erro ao validar status Alauda no webhook ${method}:`, e.message);
        }
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

// POST /api/registrar/transfer/check
// Verifica disponibilidade e preço de transferência para o app mobile.
// Usado pelo mozhost-app TransferModal (step 1 → step 2).
router.post('/transfer/check', auth, async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'domain é obrigatório' });

    const data = await dynadotRequest('search', {
      domain0: domain,
      show_price: '1',
      currency: 'USD'
    });

    const result = data.SearchResults?.[0];
    if (!result) {
      return res.status(404).json({ error: 'Domínio não retornou resultado da Dynadot' });
    }

    const available = result?.Available === 'yes';
    const prices = parseDynadotPrice(result?.Price);
    const transferPrice = prices.transfer_price;
    const registrationPrice = prices.regular_price;

    // Se nem preço de transferência nem de registro vierem da Dynadot,
    // NÃO adivinhar — retornar erro para a UI explicar (não repetir o bug do cost=10).
    if (transferPrice == null && registrationPrice == null) {
      return res.status(404).json({
        success: false,
        error: `Não foi possível obter o preço para ${domain}. Tente novamente ou verifique o domínio.`,
        domain,
        available
      });
    }

    res.json({
      success: true,
      domain,
      available,
      // Só é transferível se não estiver disponível para registro novo
      can_transfer: !available,
      transfer_price: transferPrice || registrationPrice,
      registration_price: registrationPrice,
      renewal_price: prices.renewal_price,
      // Taxa USD→MZN para o app mostrar o preço em moeda local
      usd_to_mt: parseFloat(process.env.USD_TO_MT_RATE) || 63
    });
  } catch (error) {
    console.error('Erro transfer check:', error);
    res.status(500).json({ error: error.message });
  }
});

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