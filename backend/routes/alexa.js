// routes/alexa.js
const express = require('express');
const database = require('../models/database');

const router = express.Router();

// ⚠️ IMPORTANTE: Middleware de autenticação para Alexa
const alexaAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const expectedToken = process.env.ALEXA_API_KEY || 'sua-chave-secreta-aqui-12345';
  
  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Token de autenticação inválido' 
    });
  }
  
  next();
};

// 🎤 Endpoint para Alexa: Usuários inativos
router.get('/usuarios-inativos', alexaAuth, async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 30;
    const userId = req.query.user_id; // ID do usuário que está usando a Alexa

    if (!userId) {
      return res.status(400).json({ 
        error: 'user_id é obrigatório' 
      });
    }

    // Query para contar usuários inativos
    // Assumindo que você tem um campo 'last_login' ou 'updated_at' na tabela users
    const result = await database.query(`
      SELECT COUNT(*) as total 
      FROM users 
      WHERE DATEDIFF(NOW(), updated_at) >= ?
      AND id != ?
    `, [dias, userId]);

    const quantidade = result[0]?.total || 0;

    res.json({
      success: true,
      quantidade: quantidade,
      dias: dias,
      mensagem: `${quantidade} usuários inativos há ${dias} dias`
    });

  } catch (error) {
    console.error('Erro ao buscar usuários inativos:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar dados',
      message: error.message 
    });
  }
});

// 🎤 Endpoint para Alexa: Total de containers
router.get('/total-containers', alexaAuth, async (req, res) => {
  try {
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({ 
        error: 'user_id é obrigatório' 
      });
    }

    const result = await database.query(`
      SELECT COUNT(*) as total 
      FROM containers 
      WHERE user_id = ?
    `, [userId]);

    const total = result[0]?.total || 0;

    res.json({
      success: true,
      total: total,
      mensagem: `Você tem ${total} containers`
    });

  } catch (error) {
    console.error('Erro ao buscar containers:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar dados',
      message: error.message 
    });
  }
});

// 🎤 Endpoint para Alexa: Containers rodando
router.get('/containers-rodando', alexaAuth, async (req, res) => {
  try {
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({ 
        error: 'user_id é obrigatório' 
      });
    }

    const result = await database.query(`
      SELECT COUNT(*) as total 
      FROM containers 
      WHERE user_id = ? AND status = 'running'
    `, [userId]);

    const total = result[0]?.total || 0;

    res.json({
      success: true,
      total: total,
      mensagem: `Você tem ${total} containers rodando`
    });

  } catch (error) {
    console.error('Erro ao buscar containers:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar dados',
      message: error.message 
    });
  }
});

// 🎤 Endpoint para Alexa: Saldo de coins
router.get('/saldo-coins', alexaAuth, async (req, res) => {
  try {
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({ 
        error: 'user_id é obrigatório' 
      });
    }

    const result = await database.query(`
      SELECT coins 
      FROM users 
      WHERE id = ?
    `, [userId]);

    const coins = result[0]?.coins || 0;

    res.json({
      success: true,
      coins: coins,
      mensagem: `Você tem ${coins} coins`
    });

  } catch (error) {
    console.error('Erro ao buscar coins:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar dados',
      message: error.message 
    });
  }
});

// 🎤 Endpoint para TINA: Status geral (admin)
router.get('/status-geral', alexaAuth, async (req, res) => {
  try {
    // Total de usuários
    const totalUsers = await database.query('SELECT COUNT(*) as total FROM users');
    
    // Total de containers
    const totalContainers = await database.query('SELECT COUNT(*) as total FROM containers');
    
    // Containers rodando
    const runningContainers = await database.query("SELECT COUNT(*) as total FROM containers WHERE status = 'running'");
    
    // Usuários inativos (30 dias)
    const inactiveUsers = await database.query('SELECT COUNT(*) as total FROM users WHERE DATEDIFF(NOW(), updated_at) >= 30');

    res.json({
      success: true,
      platform: 'MozHost',
      status: 'online',
      stats: {
        total_users: totalUsers[0]?.total || 0,
        total_containers: totalContainers[0]?.total || 0,
        running_containers: runningContainers[0]?.total || 0,
        inactive_users: inactiveUsers[0]?.total || 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao buscar status geral:', error);
    res.status(500).json({
      error: 'Erro ao buscar dados',
      message: error.message
    });
  }
});

module.exports = router;
