// routes/containers.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const database = require('../models/database');
const dockerManager = require('../utils/docker-manager');

const router = express.Router();

// Aplicar middleware de auth para todas as rotas
router.use(authMiddleware);

// Listar containers do usuário
router.get('/', async (req, res) => {
  try {
    const containers = await database.query(`
      SELECT 
        id, name, type, status, port, domain, 
        cpu_limit, memory_limit_mb, storage_used_mb,
        auto_restart, created_at, updated_at
      FROM containers 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [req.user.userId]);

    res.json({
      containers,
      total: containers.length
    });

  } catch (error) {
    console.error('Error listing containers:', error);
    res.status(500).json({
      error: 'Failed to list containers'
    });
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
    
    // Tentar obter estatísticas se container estiver rodando
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
    .isIn(['nodejs', 'python'])
    .withMessage('Type must be nodejs or python'),
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

    const { name, type, environment } = req.body;

    // Verificar limite de containers
    const userContainers = await database.query(
      'SELECT COUNT(*) as count FROM containers WHERE user_id = ?',
      [req.user.userId]
    );

    const userInfo = await database.query(
      'SELECT max_containers FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (userContainers[0].count >= userInfo[0].max_containers) {
      return res.status(403).json({
        error: 'Container limit reached',
        message: `Maximum ${userInfo[0].max_containers} containers allowed for your plan`
      });
    }

    // Verificar se nome já existe para o usuário
    const existingContainer = await database.query(
      'SELECT id FROM containers WHERE user_id = ? AND name = ?',
      [req.user.userId, name]
    );

    if (existingContainer.length > 0) {
      return res.status(409).json({
        error: 'Container name already exists'
      });
    }

    // Criar container
    const containerData = await dockerManager.createUserContainer(req.user.userId, {
      name,
      type,
      environment: environment || {}
    });

    res.status(201).json({
      message: 'Container created successfully',
      container: {
        id: containerData.id,
        name,
        type,
        status: 'stopped',
        port: containerData.port,
        dockerId: containerData.dockerId
      }
    });

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

    // Verificar se container pertence ao usuário
    const containers = await database.query(
      'SELECT id, name, status FROM containers WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (containers.length === 0) {
      return res.status(404).json({
        error: 'Container not found'
      });
    }

    const container = containers[0];

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
      'SELECT id, name, status FROM containers WHERE id = ? AND user_id = ?',
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
      'SELECT id, name FROM containers WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (containers.length === 0) {
      return res.status(404).json({
        error: 'Container not found'
      });
    }

    const container = containers[0];

    // Parar e depois iniciar
    try {
      await dockerManager.stopContainer(id);
    } catch (stopError) {
      // Container já estava parado
    }

    await dockerManager.startContainer(id);

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

    // Construir query de update dinâmica
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

module.exports = router;
