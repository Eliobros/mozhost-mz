// routes/domains.js
const express = require('express');
const router = express.Router();
const db = require('../models/database');
const dnsMonitor = require('../services/dnsMonitor');
const auth = require('../middleware/auth');

const SERVER_IP = process.env.SERVER_IP || '45.76.123.45';

// Função auxiliar de validação
function isValidDomain(domain) {
  const regex = /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;
  return regex.test(domain);
}

// POST /api/domains - Adicionar domínio
router.post('/', auth, async (req, res) => {
  try {
    const { containerId, domain } = req.body;

    // Validar domínio
    if (!isValidDomain(domain)) {
      return res.status(400).json({ error: 'Domínio inválido' });
    }

    const cleanDomain = domain.toLowerCase().trim();

    // Pegar userId com fallback para diferentes estruturas de auth
    const userId = req.user?.userId || req.user?.id || req.userId;

    // Verificar se container existe e pertence ao usuário
    const containers = await db.query(
      'SELECT * FROM containers WHERE id = ? AND user_id = ?',
      [containerId, userId]
    );

    if (containers.length === 0) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }

    // Verificar plano (opcional)
    // const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    // if (user[0].plan === 'free') {
    //   return res.status(403).json({ 
    //     error: 'Upgrade para Pro/Business para usar domínios customizados' 
    //   });
    // }

    // Verificar se domínio já existe
    const existing = await db.query(
      'SELECT * FROM custom_domains WHERE domain = ?',
      [cleanDomain]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Domínio já cadastrado' });
    }

    // Inserir no banco COM user_id
    const result = await db.query(
      'INSERT INTO custom_domains (user_id, container_id, domain, status, server_ip) VALUES (?, ?, ?, ?, ?)',
      [userId, containerId, cleanDomain, 'pending', SERVER_IP]
    );

    // Iniciar monitoramento DNS
    dnsMonitor.startMonitoring(cleanDomain, containerId);

    res.status(201).json({
      success: true,
      id: result.insertId,
      domain: cleanDomain,
      instructions: {
        ip: SERVER_IP,
        steps: [
          'Acesse o painel do seu registrador',
          'Adicione um registro tipo A',
          `Aponte para: ${SERVER_IP}`,
          'Aguarde 5-30 minutos'
        ]
      }
    });

  } catch (error) {
    console.error('Error adding domain:', error);
    res.status(500).json({ error: 'Erro ao adicionar domínio' });
  }
});

// GET /api/domains - Listar todos os domínios do usuário
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.userId;

    const domains = await db.query(`
      SELECT 
        cd.*,
        c.name as container_name,
        c.type as container_type
      FROM custom_domains cd
      JOIN containers c ON cd.container_id = c.id
      WHERE c.user_id = ?
      ORDER BY cd.created_at DESC
    `, [userId]);

    res.json(domains);
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({ error: 'Erro ao buscar domínios' });
  }
});

// GET /api/domains/container/:containerId - Domínios de um container
router.get('/container/:containerId', auth, async (req, res) => {
  try {
    const domains = await db.query(
      'SELECT * FROM custom_domains WHERE container_id = ?',
      [req.params.containerId]
    );

    res.json(domains);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Erro ao buscar domínios' });
  }
});

// DELETE /api/domains/:id - Remover domínio
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.userId;

    // Verificar se é dono
    const domain = await db.query(`
      SELECT cd.* FROM custom_domains cd
      JOIN containers c ON cd.container_id = c.id
      WHERE cd.id = ? AND c.user_id = ?
    `, [req.params.id, userId]);

    if (domain.length === 0) {
      return res.status(404).json({ error: 'Domínio não encontrado' });
    }

    // Parar monitoramento
    dnsMonitor.stopMonitoring(domain[0].domain);

    // Deletar
    await db.query('DELETE FROM custom_domains WHERE id = ?', [req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Erro ao remover domínio' });
  }
});

// POST /api/domains/:id/verify - Forçar verificação
router.post('/:id/verify', auth, async (req, res) => {
  try {
    const domain = await db.query(
      'SELECT * FROM custom_domains WHERE id = ?',
      [req.params.id]
    );

    if (domain.length === 0) {
      return res.status(404).json({ error: 'Domínio não encontrado' });
    }

    const result = await dnsMonitor.checkDNS(domain[0].domain);

    res.json({
      success: true,
      configured: result.configured,
      ip: result.ip
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Erro ao verificar' });
  }
});

// GET /api/domains/verify/:domain - Verificar domínio por nome
router.get('/verify/:domain', auth, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.userId;
    const cleanDomain = req.params.domain.toLowerCase().trim();

    // Validar formato do domínio
    if (!isValidDomain(cleanDomain)) {
      return res.status(400).json({ error: 'Formato de domínio inválido' });
    }

    // Buscar domínio pelo nome + verificar ownership
    const domains = await db.query(`
      SELECT 
        cd.*,
        c.name as container_name,
        c.user_id
      FROM custom_domains cd
      JOIN containers c ON cd.container_id = c.id
      WHERE cd.domain = ? AND c.user_id = ?
    `, [cleanDomain, userId]);

    if (domains.length === 0) {
      return res.status(404).json({ 
        error: 'Domínio não encontrado ou não pertence a você' 
      });
    }

    const domainData = domains[0];
    
    // Verificar DNS usando o monitor
    const dnsResult = await dnsMonitor.checkDNS(domainData.domain);

    // Atualizar status no banco se DNS foi configurado
    if (dnsResult.configured && domainData.status !== 'active') {
      await db.query(
        'UPDATE custom_domains SET status = ?, verified_at = NOW(), last_checked_at = NOW() WHERE id = ?',
        ['active', domainData.id]
      );
    } else {
      // Apenas atualizar timestamp de última verificação
      await db.query(
        'UPDATE custom_domains SET last_checked_at = NOW() WHERE id = ?',
        [domainData.id]
      );
    }

    // Resposta completa para a CLI
    res.json({
      success: true,
      domain: domainData.domain,
      container: domainData.container_name,
      container_id: domainData.container_id,
      dns_valid: dnsResult.configured,
      current_ip: dnsResult.ip || null,
      expected_ip: SERVER_IP,
      ssl_active: domainData.ssl_status === 'active',
      ssl_expires: domainData.ssl_expires_at,
      status: dnsResult.configured ? 'active' : 'pending',
      created_at: domainData.created_at,
      verified_at: domainData.verified_at,
      last_checked: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error verifying domain:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar domínio',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
