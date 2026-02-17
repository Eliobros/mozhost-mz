// middleware/auth-ws.js
const jwt = require('jsonwebtoken');
const db = require('../models/database');

const authenticateWs = async (ws, req, next) => {
  try {
    // Extrair token da query string
    const token = req.query.token;

    if (!token) {
      console.error('[Auth-WS] ❌ Token não fornecido');
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Token não fornecido' 
      }));
      ws.close();
      return;
    }

    // Verificar e decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ CORRIGIDO: Buscar por userId ao invés de email
    const rows = await db.query(
      "SELECT id, email, username, plan, is_active FROM users WHERE id = ? AND is_active = true LIMIT 1",
      [decoded.userId] // ← MUDANÇA PRINCIPAL: era decoded.email, agora é decoded.userId
    );

    if (rows.length === 0) {
      console.error('[Auth-WS] ❌ Usuário não encontrado ou inativo');
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Usuário inválido ou inativo' 
      }));
      ws.close();
      return;
    }

    // Adicionar informações do usuário ao request
    req.user = {
      id: rows[0].id,
      userId: rows[0].id,
      email: rows[0].email,
      username: rows[0].username,
      plan: rows[0].plan
    };

    console.log(`[Auth-WS] ✅ Usuário autenticado: ${req.user.username} (ID: ${req.user.id}, Email: ${req.user.email})`);

    // Chamar próximo middleware/handler
    next();

  } catch (err) {
    console.error('[Auth-WS] ❌ Erro:', err.message);
    
    // Mensagens de erro específicas
    let errorMessage = 'Token inválido';
    
    if (err.name === 'JsonWebTokenError') {
      errorMessage = 'Token malformado ou inválido';
    } else if (err.name === 'TokenExpiredError') {
      errorMessage = 'Token expirado. Faça login novamente';
    }
    
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: errorMessage 
    }));
    ws.close();
  }
};

module.exports = authenticateWs;
