// routes/containers.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const database = require('../models/database');
const dockerManager = require('../utils/docker-manager');
const subscriptionService = require('../services/subscriptionService');

// ✨ NOVO: Importar NotificationManager
const notificationManager = require('../utils/notification-manager');

const router = express.Router();

router.use(authMiddleware);

// Listar containers do usuário
router.get('/', async (req, res) => {
  try {
    const containers = await database.query(`
      SELECT * FROM containers
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [req.user.userId]);

    const containersWithSubs = await Promise.all(containers.map(async (container) => {
      const subStatus = await subscriptionService.getSubscriptionStatus(container.id);
      return {
        ...container,
        subscription: subStatus
      };
    }));

    const userInfo = await database.query(
      `SELECT u.max_storage_mb, u.coins, u.suspended_at, u.free_trial_ends,
              (SELECT b.expires_at FROM billing b
               WHERE b.user_id = u.id AND b.status = 'active' AND b.expires_at > NOW()
               ORDER BY b.expires_at DESC LIMIT 1) AS billing_expires
       FROM users u WHERE u.id = ?`,
      [req.user.userId]
    );
    const accountHasAccess = userInfo.length > 0 && !userInfo[0].suspended_at &&
      (userInfo[0].billing_expires || (userInfo[0].free_trial_ends && new Date(userInfo[0].free_trial_ends) > new Date()));
    const maxMB = userInfo.length ? userInfo[0].max_storage_mb : 1024;
    const storageAlerts = containers
      .filter(c => (c.storage_used_mb || 0) >= Math.floor(maxMB * 0.9))
      .map(c => ({ id: c.id, name: c.name, usedMB: c.storage_used_mb, maxMB }));

    res.json({
      containers: containersWithSubs,
      total: containersWithSubs.length,
      storageAlerts,
      coins: userInfo.length ? userInfo[0].coins : 0
    });

  } catch (error) {
    console.error('Error listing containers:', error);
    res.status(500).json({
      error: 'Failed to list containers'
    });
  }
});

// Obter stats de todos os containers running
router.get('/stats/all', async (req, res) => {
  try {
    const containers = await database.query(
      `SELECT id, name, type FROM containers 
       WHERE user_id = ? AND status = 'running'`,
      [req.user.userId]
    );

    const statsPromises = containers.map(async (container) => {
      try {
        const stats = await dockerManager.getContainerStats(container.id);
        return {
          id: container.id,
          name: container.name,
          type: container.type,
          stats
        };
      } catch {
        return {
          id: container.id,
          name: container.name,
          type: container.type,
          stats: null
        };
      }
    });

    const results = await Promise.all(statsPromises);

    res.json({ stats: results });

  } catch (error) {
    console.error('Error getting all stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});


// Upgrade de armazenamento usando coins
router.post('/:id/upgrade-storage', [
  body('addMb').isInt({ min: 100, max: 10240 }).withMessage('addMb deve ser entre 100 e 10240')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { id } = req.params;
    const { addMb } = req.body;

    const containers = await database.query(
      'SELECT id, name FROM containers WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );
    if (!containers.length) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const account = await database.query(
      `SELECT suspended_at, free_trial_ends,
              (SELECT b.expires_at FROM billing b
               WHERE b.user_id = users.id AND b.status = 'active' AND b.expires_at > NOW()
               ORDER BY b.expires_at DESC LIMIT 1) AS billing_expires
       FROM users WHERE id = ?`,
      [req.user.userId]
    );
    const accountHasAccess = account.length > 0 && !account[0].suspended_at &&
      (account[0].billing_expires || (account[0].free_trial_ends && new Date(account[0].free_trial_ends) > new Date()));
    if (!accountHasAccess) {
      return res.status(402).json({
        error: 'Account suspended',
        message: 'Renove o plano da conta para alterar o armazenamento.',
        suspended: true
      });
    }

    const priceCoins = Number(addMb);
    const users = await database.query('SELECT coins FROM users WHERE id = ?', [req.user.userId]);
    const coins = users.length ? users[0].coins : 0;
    if (coins < priceCoins) {
      return res.status(402).json({ error: 'Insufficient coins', needed: priceCoins, have: coins });
    }

    await database.query('UPDATE users SET coins = coins - ?, max_storage_mb = max_storage_mb + ? WHERE id = ?', [priceCoins, addMb, req.user.userId]);

    const updated = await database.query('SELECT max_storage_mb, coins FROM users WHERE id = ?', [req.user.userId]);

    // ✨ NOVO: Notificar upgrade de storage
    await notificationManager.notify(req.user.userId, {
      type: 'success',
      category: 'container',
      title: '📦 Storage Atualizado',
      message: `${addMb}MB adicionados ao container "${containers[0].name}". Total: ${updated[0].max_storage_mb}MB`
    });

    res.json({
      message: 'Armazenamento atualizado com sucesso',
      maxStorageMb: updated[0].max_storage_mb,
      coins: updated[0].coins
    });
  } catch (error) {
    console.error('Upgrade storage error:', error);
    res.status(500).json({ error: 'Failed to upgrade storage' });
  }
});

// Obter detalhes de um container específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const containers = await database.query(
      'SELECT * FROM containers WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (containers.length === 0) {
      return res.status(404).json({
        error: 'Container not found'
      });
    }

    const container = containers[0];

    let stats = null;
    if (container.status === 'running') {
      try {
        stats = await dockerManager.getContainerStats(id);
      } catch (statsError) {
        console.log('Could not get container stats:', statsError.message);
      }
    }

    res.json({
      container,
      stats
    });

  } catch (error) {
    console.error('Error getting container details:', error);
    res.status(500).json({
      error: 'Failed to get container details'
    });
  }
});

// Criar novo container
router.post('/', [
  body('name')
    .isLength({ min: 3, max: 100 })
    .matches(/^[a-zA-Z0-9_-\s]+$/)
    .withMessage('Name must be 3-100 characters and contain only letters, numbers, spaces, _ or -'),
  body('type')
  .isIn(['nodejs', 'python', 'php', 'api', 'bot-baileys', 'bot-wwebjs', 'bot-telegram', 'bot-discord', 'static'])
  .withMessage('Type must be nodejs, python, php, api, bot-baileys, bot-wwebjs, bot-telegram, bot-discord, or static'),  body('template')
    .optional()
    .isIn([
      'api', 'bot-baileys', 'bot-wwebjs', 'bot-telegram', 'bot-discord', 'static',
      'nodejs', 'python', 'php'
    ])
    .withMessage('Template must be api, bot-baileys, bot-wwebjs, bot-telegram, bot-discord, static, nodejs, python or php'),
  body('environment')
    .optional()
    .isObject()
    .withMessage('Environment must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, type, environment, template } = req.body;
    const templateType = template || (type === 'nodejs' ? 'api' : type);

    const userContainers = await database.query(
      'SELECT COUNT(*) as count FROM containers WHERE user_id = ?',
      [req.user.userId]
    );

    const userInfo = await database.query(
      `SELECT u.max_containers, u.coins, u.plan, u.suspended_at, u.free_trial_ends,
              (SELECT b.expires_at FROM billing b
               WHERE b.user_id = u.id AND b.status = 'active' AND b.expires_at > NOW()
               ORDER BY b.expires_at DESC LIMIT 1) AS billing_expires
       FROM users u WHERE u.id = ?`,
      [req.user.userId]
    );

    // O billing/trial da conta é a única autoridade para criar containers.
    const accountHasAccess = userInfo.length > 0 && !userInfo[0].suspended_at &&
      (userInfo[0].billing_expires || (userInfo[0].free_trial_ends && new Date(userInfo[0].free_trial_ends) > new Date()));
    if (!accountHasAccess) {
      return res.status(402).json({
        error: 'Account suspended',
        message: 'Sua conta está suspensa. Renove seu plano para criar containers.',
        suspended: true
      });
    }

    if (userContainers[0].count >= userInfo[0].max_containers) {
      return res.status(403).json({
        error: 'Container limit reached',
        message: `Seu plano ${userInfo[0].plan} permite no máximo ${userInfo[0].max_containers} container(s).`
      });
    }

    const existingContainer = await database.query(
      'SELECT id FROM containers WHERE user_id = ? AND name = ?',
      [req.user.userId, name]
    );

    if (existingContainer.length > 0) {
      return res.status(409).json({
        error: 'Container name already exists'
      });
    }

    // A criação agora é limitada pelo plano (max_containers), não por coins.
    // Coins continuam sendo usados para extras (databases, upgrade de storage).
    const containerData = await dockerManager.createUserContainer(req.user.userId, {
  name,
  type: templateType, // Usar o template selecionado
  environment: environment || {}
});

    const subscription = await subscriptionService.getSubscriptionStatus(containerData.id);

    const responseData = {
      message: 'Container created successfully',
      container: {
        id: containerData.id,
        name,
        type,
        status: 'stopped',
        port: containerData.port,
        domain: containerData.domain,
        dockerId: containerData.dockerId
      },
      subscription: {
        scope: 'account',
        expiresAt: subscription.expiresAt,
        daysLeft: subscription.daysLeft,
        expired: subscription.expired
      }
    };

    console.log('📤 Resposta da API de criação:', responseData);
    res.status(201).json(responseData);

  } catch (error) {
    console.error('Error creating container:', error);
    res.status(500).json({
      error: 'Failed to create container',
      message: error.message
    });
  }
});

// Iniciar container
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;

    const containers = await database.query(
      'SELECT id, name, status, plan_blocked FROM containers WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (containers.length === 0) {
      return res.status(404).json({
        error: 'Container not found'
      });
    }

    const container = containers[0];

    // Conta suspensa (trial free expirado ou plano pago sem renovação) → não inicia containers
    const users = await database.query(
      `SELECT u.suspended_at, u.plan, u.free_trial_ends,
              (SELECT b.expires_at FROM billing b
               WHERE b.user_id = u.id AND b.status = 'active' AND b.expires_at > NOW()
               ORDER BY b.expires_at DESC LIMIT 1) as billing_expires
       FROM users u WHERE u.id = ?`,
      [req.user.userId]
    );
    const acc = users.length ? users[0] : null;
    const accountHasAccess = acc && !acc.suspended_at &&
      (acc.billing_expires || (acc.free_trial_ends && new Date(acc.free_trial_ends) > new Date()));

    if (!accountHasAccess) {
      return res.status(402).json({
        error: 'Account suspended',
        message: 'Sua conta está suspensa. Renove o plano para reativar seus containers.',
        suspended: true
      });
    }
    if (container.plan_blocked) {
      return res.status(403).json({
        error: 'Container blocked by plan',
        message: 'Este container foi preservado, mas excede o limite do plano atual. Faça upgrade para iniciá-lo.',
        planBlocked: true
      });
    }

    if (container.status === 'running') {
      return res.status(400).json({
        error: 'Container is already running'
      });
    }

    await dockerManager.startContainer(id);

    res.json({
      message: 'Container started successfully',
      container: {
        id: container.id,
        name: container.name,
        status: 'running'
      }
    });

  } catch (error) {
    console.error('Error starting container:', error);
    res.status(500).json({
      error: 'Failed to start container',
      message: error.message
    });
  }
});

// Parar container
router.post('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;

    const containers = await database.query(
      'SELECT id, name, status, plan_blocked FROM containers WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (containers.length === 0) {
      return res.status(404).json({
        error: 'Container not found'
      });
    }

    const container = containers[0];

    if (container.status === 'stopped') {
      return res.status(400).json({
        error: 'Container is already stopped'
      });
    }

    await dockerManager.stopContainer(id);

    res.json({
      message: 'Container stopped successfully',
      container: {
        id: container.id,
        name: container.name,
        status: 'stopped'
      }
    });

  } catch (error) {
    console.error('Error stopping container:', error);
    res.status(500).json({
      error: 'Failed to stop container',
      message: error.message
    });
  }
});

// Reiniciar container
router.post('/:id/restart', async (req, res) => {
  try {
    const { id } = req.params;

    const containers = await database.query(
      'SELECT id, name, plan_blocked FROM containers WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (containers.length === 0) {
      return res.status(404).json({
        error: 'Container not found'
      });
    }

    const container = containers[0];

    const accountAccess = await database.query(
      `SELECT u.suspended_at, u.free_trial_ends,
              (SELECT b.expires_at FROM billing b
               WHERE b.user_id = u.id AND b.status = 'active' AND b.expires_at > NOW()
               ORDER BY b.expires_at DESC LIMIT 1) AS billing_expires
       FROM users u WHERE u.id = ?`,
      [req.user.userId]
    );
    const accountHasAccess = accountAccess.length > 0 && !accountAccess[0].suspended_at &&
      (accountAccess[0].billing_expires || (accountAccess[0].free_trial_ends && new Date(accountAccess[0].free_trial_ends) > new Date()));
    if (!accountHasAccess) {
      return res.status(402).json({
        error: 'Account suspended',
        message: 'Sua conta está suspensa. Renove o plano para reativar seus containers.',
        suspended: true
      });
    }
    if (container.plan_blocked) {
      return res.status(403).json({
        error: 'Container blocked by plan',
        message: 'Este container excede o limite do plano atual. Faça upgrade para iniciá-lo.',
        planBlocked: true
      });
    }

    // Verificar se container Docker existe
    const containerData = await database.query(
      'SELECT docker_container_id, type FROM containers WHERE id = ?',
      [id]
    );

    if (containerData.length && containerData[0].docker_container_id) {
      try {
        const dockerContainer = dockerManager.docker.getContainer(containerData[0].docker_container_id);
        await dockerContainer.inspect();
      } catch (inspectError) {
        return res.status(500).json({
          error: 'Container Docker não encontrado',
          message: `O container Docker "${containerData[0].docker_container_id}" não existe mais. Pode ser necessário recriar o container.`
        });
      }
    }

    try {
      await dockerManager.stopContainer(id);
    } catch (stopError) {
      // Container já estava parado
    }

    await dockerManager.startContainer(id);

    // ✨ NOVO: Notificar restart
    await notificationManager.notify(req.user.userId, {
      type: 'info',
      category: 'container',
      title: '🔄 Container Reiniciado',
      message: `Container "${container.name}" foi reiniciado com sucesso.`
    });

    res.json({
      message: 'Container restarted successfully',
      container: {
        id: container.id,
        name: container.name,
        status: 'running'
      }
    });

  } catch (error) {
    console.error('Error restarting container:', error);
    res.status(500).json({
      error: 'Failed to restart container',
      message: error.message
    });
  }
});

// Obter logs do container
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { tail = 100 } = req.query;

    const containers = await database.query(
      'SELECT id FROM containers WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (containers.length === 0) {
      return res.status(404).json({
        error: 'Container not found'
      });
    }

    const logs = await dockerManager.getContainerLogs(id, parseInt(tail));

    res.json({
      logs: logs.split('\n').filter(line => line.trim()).slice(-parseInt(tail))
    });

  } catch (error) {
    console.error('Error getting container logs:', error);
    res.status(500).json({
      error: 'Failed to get container logs',
      message: error.message
    });
  }
});

// Deletar container
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const containers = await database.query(
      'SELECT id, name FROM containers WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (containers.length === 0) {
      return res.status(404).json({
        error: 'Container not found'
      });
    }

    await dockerManager.deleteContainer(id);

    res.json({
      message: 'Container deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting container:', error);
    res.status(500).json({
      error: 'Failed to delete container',
      message: error.message
    });
  }
});

// Atualizar configurações do container
router.patch('/:id', [
  body('name')
    .optional()
    .isLength({ min: 3, max: 100 })
    .matches(/^[a-zA-Z0-9_-\s]+$/),
  body('environment')
    .optional()
    .isObject(),
  body('auto_restart')
    .optional()
    .isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { name, environment, auto_restart } = req.body;

    const containers = await database.query(
      'SELECT id FROM containers WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (containers.length === 0) {
      return res.status(404).json({
        error: 'Container not found'
      });
    }

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }

    if (environment) {
      updates.push('environment = ?');
      values.push(JSON.stringify(environment));
    }

    if (typeof auto_restart !== 'undefined') {
      updates.push('auto_restart = ?');
      values.push(auto_restart);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    await database.query(
      `UPDATE containers SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // ✨ NOVO: Auto-aplicar env vars (Vercel-like): recria container se necessário
    if (environment !== undefined) {
      try {
        await dockerManager.applyEnvironmentVariables(id, environment);
      } catch (error) {
        console.error(`⚠️ Configurações salvas, mas falhou ao reaplicar vars:`, error.message);
        return res.status(500).json({
          error: 'Configurações salvas no banco, mas falhou ao reaplicar no container',
          details: error.message
        });
      }
    }

    res.json({
      message: 'Container updated successfully'
    });

  } catch (error) {
    console.error('Error updating container:', error);
    res.status(500).json({
      error: 'Failed to update container'
    });
  }
});

// A renovação é feita no plano da conta (/api/billing), nunca em um container.
router.post('/:id/renew', (req, res) => {
    return res.status(410).json({
      error: 'Container renewal removed',
      message: 'Containers não possuem renovação individual. Renove o plano da conta em /billing.'
    });
});

module.exports = router;
