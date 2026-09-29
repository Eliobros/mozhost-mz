// routes/agents.js
// CRUD de agentes de suporte (tabela support_agents) para o painel admin.
// A tabela é criada em models/database.js:
//   id INT PK AI, phone VARCHAR(20) NOT NULL UNIQUE, agent_name VARCHAR(100) NOT NULL,
//   active BOOLEAN DEFAULT TRUE, created_at, updated_at
//
// Autenticação: ?password=... ou header x-admin-password (padrão dos outros endpoints admin).
// Após qualquer mutação, invalida o cache de agentes do supportBridge.
const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');

const router = express.Router();

// ─── Auth admin (padrão do projeto: senha via query ou header) ───────────────
function requireAdmin(req, res, next) {
  const password =
    req.headers['x-admin-password'] ||
    req.query.password ||
    (req.body && req.body.password);
  if (!password || password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
    return res.status(401).json({ error: 'Senha de administrador inválida' });
  }
  // Não deixar a senha vazar para o handler em POST/PUT via body
  if (req.body && typeof req.body === 'object') delete req.body.password;
  next();
}
router.use(requireAdmin);

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Aceita formatos comuns e devolve apenas dígitos com DDI (258...).
// Ex.: "+258 84 1234567" → "258841234567"; "0841234567" → "258841234567"
function normalizeAgentPhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('258')) return digits;
  if (digits.length === 9 && digits.startsWith('8')) return '258' + digits; // 84/85/86/87...
  if (digits.length === 12 && !digits.startsWith('258')) return digits; // já tem DDI de 3 dígitos
  return digits;
}

function agentRowToApi(row) {
  return {
    id: row.id,
    name: row.agent_name,
    number: row.phone,
    active: Boolean(row.active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ─── Rotas ────────────────────────────────────────────────────────────────────

// GET /api/agents — lista todos (inclui inativos)
router.get('/', async (req, res) => {
  try {
    const rows = await database.query(
      'SELECT id, phone, agent_name, active, created_at, updated_at FROM support_agents ORDER BY agent_name ASC'
    );
    res.json({ agents: rows.map(agentRowToApi) });
  } catch (err) {
    console.error('❌ Erro ao listar agentes:', err.message);
    res.status(500).json({ error: 'Erro ao listar agentes' });
  }
});

// POST /api/agents — criar agente
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nome deve ter 2-100 caracteres'),
    body('number').trim().notEmpty().withMessage('Número é obrigatório'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const name = req.body.name.trim();
      const number = normalizeAgentPhone(req.body.number);
      if (!/^\d{9,15}$/.test(number)) {
        return res.status(400).json({ error: 'Número inválido (use formato internacional, ex: 258841234567)' });
      }

      // Unicidade tolerante: compara por dígitos normalizados
      const existing = await database.query(
        'SELECT id FROM support_agents WHERE phone = ? LIMIT 1',
        [number]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: `Já existe um agente com o número ${number}` });
      }

      const result = await database.query(
        'INSERT INTO support_agents (phone, agent_name, active) VALUES (?, ?, TRUE)',
        [number, name]
      );

      invalidateBridgeCache();
      console.log(`🎧 Agente criado: ${name} (${number})`);

      const created = await database.query(
        'SELECT id, phone, agent_name, active, created_at, updated_at FROM support_agents WHERE id = ?',
        [result.insertId]
      );
      res.status(201).json({ agent: agentRowToApi(created[0]) });
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Já existe um agente com este número' });
      }
      console.error('❌ Erro ao criar agente:', err.message);
      res.status(500).json({ error: 'Erro ao criar agente' });
    }
  }
);

// PUT /api/agents/:id — editar (nome, número e/ou active)
router.put(
  '/:id',
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Nome deve ter 2-100 caracteres'),
    body('number').optional().trim().notEmpty().withMessage('Número não pode ficar vazio'),
    body('active').optional().isBoolean().withMessage('active deve ser boolean'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const current = await database.query(
        'SELECT id, phone FROM support_agents WHERE id = ?',
        [id]
      );
      if (current.length === 0) {
        return res.status(404).json({ error: 'Agente não encontrado' });
      }

      const updates = [];
      const params = [];

      if (req.body.number !== undefined) {
        const number = normalizeAgentPhone(req.body.number);
        if (!/^\d{9,15}$/.test(number)) {
          return res.status(400).json({ error: 'Número inválido (use formato internacional, ex: 258841234567)' });
        }
        const dup = await database.query(
          'SELECT id FROM support_agents WHERE phone = ? AND id <> ? LIMIT 1',
          [number, id]
        );
        if (dup.length > 0) {
          return res.status(409).json({ error: `Já existe outro agente com o número ${number}` });
        }
        updates.push('phone = ?');
        params.push(number);
      }

      if (req.body.name !== undefined) {
        updates.push('agent_name = ?');
        params.push(req.body.name.trim());
      }

      if (req.body.active !== undefined) {
        updates.push('active = ?');
        params.push(req.body.active === true || req.body.active === 'true' ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nada para atualizar (envie name, number e/ou active)' });
      }

      await database.query(
        `UPDATE support_agents SET ${updates.join(', ')} WHERE id = ?`,
        [...params, id]
      );

      invalidateBridgeCache();

      const updated = await database.query(
        'SELECT id, phone, agent_name, active, created_at, updated_at FROM support_agents WHERE id = ?',
        [id]
      );
      res.json({ agent: agentRowToApi(updated[0]) });
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Já existe outro agente com este número' });
      }
      console.error('❌ Erro ao atualizar agente:', err.message);
      res.status(500).json({ error: 'Erro ao atualizar agente' });
    }
  }
);

// DELETE /api/agents/:id — deletar agente
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const result = await database.query('DELETE FROM support_agents WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }

    invalidateBridgeCache();
    console.log(`🗑️ Agente removido (id ${id})`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erro ao deletar agente:', err.message);
    res.status(500).json({ error: 'Erro ao deletar agente' });
  }
});

// ─── Util ─────────────────────────────────────────────────────────────────────
function invalidateBridgeCache() {
  try {
    require('../services/supportBridge').invalidateAgentCache();
  } catch (err) {
    console.warn('⚠️ Não foi possível invalidar cache de agentes:', err.message);
  }
}

module.exports = router;
