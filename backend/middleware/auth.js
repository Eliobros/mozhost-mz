// middleware/auth.js
const jwt = require('jsonwebtoken');
const database = require('../models/database');

const authMiddleware = async (req, res, next) => {
  try {
    // Extrair token do header Authorization OU query string (para WebSocket)
    let token = null;

    // Verificar se req.headers existe (proteção para WebSocket)
    if (req.headers && req.headers.authorization) {
      // Formato esperado: "Bearer TOKEN"
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      // Para WebSocket: ?token=XXX
      token = req.query.token;
    }

    if (!token) {
      // Para WebSocket, res pode não existir
      if (res && res.status) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'No token provided'
        });
      }
      // Se não tiver res (WebSocket), pula para o próximo
      return next();
    }

    // Verificar e decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar se usuário ainda existe e está ativo
    const user = await database.query(
      'SELECT id, username, email, plan, is_active FROM users WHERE id = ? AND is_active = true',
      [decoded.userId]
    );

    if (user.length === 0) {
      if (res && res.status) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'User not found or inactive'
        });
      }
      return next();
    }

    // Adicionar informações do usuário ao request
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      plan: decoded.plan || user[0].plan
    };

    console.log(`[Auth] User authenticated: ${req.user.username} (ID: ${req.user.id})`);
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);

    // Para WebSocket, res pode não existir
    if (!res || !res.status) {
      return next(error);
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token expired'
      });
    }

    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware específico para WebSocket
 * Só valida token, não tenta enviar respostas HTTP
 */
const authWebSocket = async (req, res, next) => {
  try {
    // Token deve vir na query string
    const token = req.query?.token;

    if (!token) {
      console.error('[Auth WS] Token não fornecido');
      const error = new Error('No token provided');
      error.status = 401;
      return next(error);
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar usuário
    const user = await database.query(
      'SELECT id, username, email, plan, is_active FROM users WHERE id = ? AND is_active = true',
      [decoded.userId]
    );

    if (user.length === 0) {
      console.error('[Auth WS] Usuário não encontrado ou inativo');
      const error = new Error('User not found or inactive');
      error.status = 401;
      return next(error);
    }

    // Adicionar ao request
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      plan: decoded.plan || user[0].plan
    };

    console.log(`[Auth WS] Authenticated: ${req.user.username} (ID: ${req.user.id})`);
    next();

  } catch (error) {
    console.error('[Auth WS] Error:', error.message);
    error.status = 401;
    next(error);
  }
};

/**
 * Middleware opcional - só passa se autenticado, senão continua
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await database.query(
      'SELECT id, username, email, plan FROM users WHERE id = ? AND is_active = true',
      [decoded.userId]
    );

    if (user.length > 0) {
      req.user = {
        id: decoded.userId,
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        plan: decoded.plan || user[0].plan
      };
    }

    next();

  } catch (error) {
    // Em caso de erro, continua sem usuário
    next();
  }
};

/**
 * Middleware para rotas admin
 * Verifica se o usuário é admin (ID 1 ou flag is_admin)
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    // Extrair token
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Verificar e decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar se usuário existe e está ativo
    const user = await database.query(
      'SELECT id, username, email, plan, is_active FROM users WHERE id = ? AND is_active = true',
      [decoded.userId]
    );

    if (user.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'User not found or inactive'
      });
    }

    // Verificar se é admin
    // OPÇÃO 1: Usuário com ID 1 é sempre admin (você)
    // OPÇÃO 2: Verifica coluna is_admin na tabela users (se tiver)
    const isAdmin = decoded.userId === 6; // Ajuste conforme necessário
    // OU: const isAdmin = user[0].is_admin === 1;

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Acesso restrito a administradores'
      });
    }

    // Adicionar informações do usuário ao request
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      plan: decoded.plan || user[0].plan,
      isAdmin: true
    };

    console.log(`[Auth Admin] Admin authenticated: ${req.user.username} (ID: ${req.user.id})`);
    next();

  } catch (error) {
    console.error('Admin auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
};

// Exportar todos os middlewares
module.exports = authMiddleware;
module.exports.authWebSocket = authWebSocket;
module.exports.optionalAuth = optionalAuth;
module.exports.authenticateAdmin = authenticateAdmin;
