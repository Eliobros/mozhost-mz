// middleware/auth-ws.js
const jwt = require('jsonwebtoken');
const db = require('../models/database');

const authenticateWs = async (ws, req, next) => {
  try {
    const token = req.query.token;

    if (!token) {
      console.error('[Auth-WS] Token não fornecido');
      ws.send(JSON.stringify({ type: 'error', message: 'Token não fornecido' }));
      ws.close();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const rows = await db.query(
      "SELECT id, email, username FROM users WHERE email = ? LIMIT 1",
      [decoded.email]
    );

    if (rows.length === 0) {
      console.error('[Auth-WS] Usuário não encontrado');
      ws.send(JSON.stringify({ type: 'error', message: 'Usuário inválido' }));
      ws.close();
      return;
    }

    req.user = rows[0];

    console.log(`[Auth-WS] Usuário autenticado: ${req.user.id} (${req.user.email})`);

    next();

  } catch (err) {
    console.error('[Auth-WS] Erro:', err.message);
    ws.send(JSON.stringify({ type: 'error', message: 'Token inválido' }));
    ws.close();
  }
};

module.exports = authenticateWs;
