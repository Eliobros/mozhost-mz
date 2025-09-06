// middleware/auth.js
const jwt = require('jsonwebtoken');
const database = require('../models/database');

const authMiddleware = async (req, res, next) => {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Formato esperado: "Bearer TOKEN"
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token format'
      });
    }

    // Verificar e decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar se usuário ainda existe e está ativo
    const user = await database.query(
      'SELECT id, username, email, plan, is_active FROM users WHERE id = ? AND is_active = true',
      [decoded.userId]
    );

    if (user.length === 0) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found or inactive'
      });
    }

    // Adicionar informações do usuário ao request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      plan: decoded.plan || user[0].plan
    };

    next();

  } catch (error) {
    console.error('Auth middleware error:', error);

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

// Middleware opcional - só passa se autenticado, senão continua
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

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;
