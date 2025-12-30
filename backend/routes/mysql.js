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

    // Buscar porta do phpMyAdmin
    const containerInfo = await db.query(
      'SELECT pma_port FROM containers WHERE user_id = ? AND type = "php" LIMIT 1',
      [userId]
    );

    let pmaUrl = null;
    if (containerInfo.length > 0 && containerInfo[0].pma_port) {
      // Sempre usar porta ao invés de domínio
      pmaUrl = `http://api.mozhost.topaziocoin.online:${containerInfo[0].pma_port}`;
    }

    res.json({
      message: 'Database criado com sucesso!',
      credentials: dbCredentials,
      phpmyadmin: pmaUrl
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

    // Buscar porta do phpMyAdmin
    const containerInfo = await db.query(
      'SELECT pma_port FROM containers WHERE user_id = ? AND type = "php" LIMIT 1',
      [userId]
    );

    let pmaUrl = null;
    if (containerInfo.length > 0 && containerInfo[0].pma_port) {
      // Sempre usar porta ao invés de domínio
      pmaUrl = `http://api.mozhost.topaziocoin.online:${containerInfo[0].pma_port}`;
    }

    console.log('🔍 Debug phpMyAdmin:');
    console.log('  - User ID:', userId);
    console.log('  - Container Info:', containerInfo);
    console.log('  - PMA URL:', pmaUrl);

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
      phpmyadmin: pmaUrl
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


// Teste de Banco de dwdos
router.get('/test', authMiddleware, async (req, res) => {
  try {
    // Tenta conectar no MySQL do usuário
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: req.user.dbUser,
      password: req.user.dbPassword,
      database: req.user.dbName
    });
    
    await connection.ping();
    await connection.end();
    
    res.json({ success: true, message: 'Conexão OK!' });
  } catch (error) {
    res.json({ success: false, message: 'Falha na conexão' });
  }
});

module.exports = router;
