const express = require('express');
const router = express.Router();
const mysqlService = require('../services/mysqlService');
const authMiddleware = require('../middleware/auth');
const db = require('../models/database');

// Criar database para o usuário
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Verificar se usuário já tem database
    const existing = await db.query(
      'SELECT * FROM user_databases WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Você já possui um database' 
      });
    }

    // Criar database no MySQL compartilhado
    const dbCredentials = await mysqlService.createUserDatabase(userId);

    // Salvar credenciais no banco principal
    await db.query(
      `INSERT INTO user_databases (user_id, host, port, database_name, username, password)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        dbCredentials.host,
        dbCredentials.port,
        dbCredentials.database,
        dbCredentials.user,
        dbCredentials.password
      ]
    );

    res.json({
      message: 'Database criado com sucesso!',
      credentials: dbCredentials,
      phpmyadmin: 'https://api.mozhost.topaziocoin.online:8080'
    });

  } catch (error) {
    console.error('Erro ao criar database:', error);
    res.status(500).json({ error: 'Erro ao criar database' });
  }
});

// Obter credenciais do database
router.get('/credentials', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const rows = await db.query(
      'SELECT * FROM user_databases WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'Você ainda não possui um database' 
      });
    }

    const userDb = rows[0];

    // Verificar tamanho usado
    const sizeUsed = await mysqlService.getDatabaseSize(userId);

    res.json({
      credentials: {
        host: userDb.host,
        port: userDb.port,
        database: userDb.database_name,
        user: userDb.username,
        password: userDb.password
      },
      usage: {
        used_mb: sizeUsed || 0,
        limit_mb: 100,
        percentage: ((sizeUsed || 0) / 100) * 100
      },
      phpmyadmin: 'https://api.mozhost.topaziocoin.online:8080'
    });

  } catch (error) {
    console.error('Erro ao buscar credenciais:', error);
    res.status(500).json({ error: 'Erro ao buscar credenciais' });
  }
});

// Deletar database
router.delete('/delete', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const rows = await db.query(
      'SELECT * FROM user_databases WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'Você não possui um database' 
      });
    }

    // Deletar do MySQL compartilhado
    await mysqlService.deleteUserDatabase(userId);

    // Deletar registro do banco principal
    await db.query(
      'DELETE FROM user_databases WHERE user_id = ?',
      [userId]
    );

    res.json({ message: 'Database deletado com sucesso' });

  } catch (error) {
    console.error('Erro ao deletar database:', error);
    res.status(500).json({ error: 'Erro ao deletar database' });
  }
});

module.exports = router;
