// routes/domains.js
const express = require('express');
const router = express.Router();
const db = require('../models/database');
const dnsMonitor = require('../services/dnsMonitor');
const auth = require('../middleware/auth'); // Se tiver auth

const SERVER_IP = process.env.SERVER_IP || '45.76.123.45';

// Função auxiliar de validação
function isValidDomain(domain) {
  const regex = /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;
  return regex.test(domain);
}

// POST /api/domains - Adicionar domínio
router.post('/', auth, async (req, res) => { // auth se você tiver middleware
  try {
    const { containerId, domain } = req.body;
    
    // Validar domínio
    if (!isValidDomain(domain)) {
      return res.status(400).json({ error: 'Domínio inválido' });
    }
    
    const cleanDomain = domain.toLowerCase().trim();
    
    // Verificar se container existe e pertence ao usuário
    const containers = await db.query(
      'SELECT * FROM containers WHERE id = ? AND user_id = ?',
      [containerId, req.user?.id || req.userId]
    );
    
    if (containers.length === 0) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }
    
    // Verificar plano (opcional)
    // const user = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
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
    
    // Inserir no banco
    const result = await db.query(
      'INSERT INTO custom_domains (container_id, domain, status, server_ip) VALUES (?, ?, ?, ?)',
      [containerId, cleanDomain, 'pending', SERVER_IP]
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
    const domains = await db.query(`
      SELECT 
        cd.*,
        c.name as container_name,
        c.type as container_type
      FROM custom_domains cd
      JOIN containers c ON cd.container_id = c.id
      WHERE c.user_id = ?
      ORDER BY cd.created_at DESC
    `, [req.user?.id || req.userId]);
    
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
    // Verificar se é dono
    const domain = await db.query(`
      SELECT cd.* FROM custom_domains cd
      JOIN containers c ON cd.container_id = c.id
      WHERE cd.id = ? AND c.user_id = ?
    `, [req.params.id, req.user?.id || req.userId]);
    
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

module.exports = router;
