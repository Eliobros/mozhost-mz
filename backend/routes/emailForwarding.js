
// routes/emailForwarding.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const db = require('../models/database');

const IMPROVMX_API = 'https://api.improvmx.com/v3';
const IMPROVMX_TOKEN = process.env.IMPROVMX_API_TOKEN;

const PORKBUN_API_URL = 'https://api.porkbun.com/api/json/v3';
const PORKBUN_KEYS = {
  secretapikey: process.env.PORKBUN_SECRET_KEY,
  apikey: process.env.PORKBUN_API_KEY
};

async function porkbunRequest(endpoint, body = {}) {
  const response = await fetch(`${PORKBUN_API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...PORKBUN_KEYS, ...body })
  });
  const data = await response.json();
  if (data.status !== 'SUCCESS') throw new Error(data.message || 'Erro na API Porkbun');
  return data;
}

const improvmxHeaders = {
  'Authorization': `Basic api:${IMPROVMX_TOKEN}`,
  'Content-Type': 'application/json'
};

// Adiciona MX records do ImprovMX no domínio via Porkbun
async function setupMXRecords(domain) {
  // Verifica se já existem MX records do ImprovMX
  const dns = await porkbunRequest(`/dns/retrieve/${domain}`);
  const existing = dns.records?.filter(r => r.type === 'MX' && r.content.includes('improvmx'));
  if (existing?.length > 0) return; // já configurado

  await porkbunRequest(`/dns/create/${domain}`, {
    type: 'MX', name: '', content: 'mx1.improvmx.com', prio: '10', ttl: '600'
  });
  await porkbunRequest(`/dns/create/${domain}`, {
    type: 'MX', name: '', content: 'mx2.improvmx.com', prio: '20', ttl: '600'
  });
}

// POST /api/email-forwarding - Criar forward
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { domain, alias, destination } = req.body;

    if (!domain || !alias || !destination) {
      return res.status(400).json({ error: 'domain, alias e destination são obrigatórios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(destination)) {
      return res.status(400).json({ error: 'Email de destino inválido' });
    }

    // Verificar se domínio pertence ao utilizador
    const domains = await db.query(
      'SELECT * FROM domain_payments WHERE domain = ? AND user_id = ? AND status = "completed"',
      [domain, userId]
    );
    if (domains.length === 0) {
      return res.status(403).json({ error: 'Domínio não encontrado ou não pertence a você' });
    }

    // Verificar se alias já existe
    const existing = await db.query(
      'SELECT * FROM email_forwards WHERE domain = ? AND alias = ? AND user_id = ?',
      [domain, alias, userId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Alias já existe neste domínio' });
    }

    // 1. Adicionar domínio no ImprovMX (ignora se já existe)
    await axios.post(
      `${IMPROVMX_API}/domains/`,
      { domain },
      { headers: improvmxHeaders }
    ).catch(() => {}); // ignora erro se domínio já existe

    // 2. Criar o alias no ImprovMX
    const improvRes = await axios.post(
      `${IMPROVMX_API}/domains/${domain}/aliases/`,
      { alias, forward: destination },
      { headers: improvmxHeaders }
    );

    if (!improvRes.data.success) {
      return res.status(500).json({ error: 'Erro no ImprovMX', details: improvRes.data });
    }

    // 3. Adicionar MX records no Porkbun
    await setupMXRecords(domain);

    // 4. Salvar no banco
    await db.query(
      'INSERT INTO email_forwards (user_id, domain, alias, destination, created_at) VALUES (?, ?, ?, ?, NOW())',
      [userId, domain, alias, destination]
    );

    res.status(201).json({
      success: true,
      email: `${alias}@${domain}`,
      destination,
      message: `Emails para ${alias}@${domain} serão redirecionados para ${destination}`
    });

  } catch (error) {
    console.error('[EmailForward] Erro:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao criar email forward' });
  }
});

// GET /api/email-forwarding/:domain - Listar forwards de um domínio
router.get('/:domain', auth, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { domain } = req.params;

    const forwards = await db.query(
      'SELECT * FROM email_forwards WHERE domain = ? AND user_id = ? ORDER BY created_at DESC',
      [domain, userId]
    );

    res.json({ success: true, domain, data: forwards });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar forwards' });
  }
});

// DELETE /api/email-forwarding/:id - Remover forward
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    const forward = await db.query(
      'SELECT * FROM email_forwards WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (forward.length === 0) {
      return res.status(404).json({ error: 'Forward não encontrado' });
    }

    const { domain, alias } = forward[0];

    // Deletar no ImprovMX
    await axios.delete(
      `${IMPROVMX_API}/domains/${domain}/aliases/${alias}`,
      { headers: improvmxHeaders }
    );

    // Deletar no banco
    await db.query('DELETE FROM email_forwards WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: 'Forward removido com sucesso' });
  } catch (error) {
    console.error('[EmailForward] Erro ao deletar:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao remover forward' });
  }
});

module.exports = router;
