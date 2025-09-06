// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Registro de usuário
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-50 characters and contain only letters, numbers, _ or -'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    // Validar input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password } = req.body;

    // Verificar se usuário já existe
    const existingUser = await database.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'Username or email already taken'
      });
    }

    // Hash da senha
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Criar usuário
    const result = await database.query(
      `INSERT INTO users (username, email, password_hash, plan, max_containers, max_ram_mb, max_storage_mb)
       VALUES (?, ?, ?, 'free', 2, 512, 1024)`,
      [username, email, passwordHash]
    );

    const userId = result.insertId;

    // Gerar token JWT
    const token = jwt.sign(
      { userId, username, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userId,
        username,
        email,
        plan: 'free',
        maxContainers: 2
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error'
    });
  }
});

// Login de usuário
router.post('/login', [
  body('login').notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { login, password } = req.body;

    // Buscar usuário por username ou email
    const users = await database.query(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = true',
      [login, login]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'User not found or inactive'
      });
    }

    const user = users[0];

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Incorrect password'
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        email: user.email,
        plan: user.plan 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Atualizar último login
    await database.query(
      'UPDATE users SET updated_at = NOW() WHERE id = ?',
      [user.id]
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        plan: user.plan,
        maxContainers: user.max_containers,
        maxRamMb: user.max_ram_mb,
        maxStorageMb: user.max_storage_mb
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error'
    });
  }
});

// Verificar token
router.get('/verify', authMiddleware, async (req, res) => {
  try {
    const user = await database.query(
      'SELECT id, username, email, plan, max_containers, max_ram_mb, max_storage_mb FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      valid: true,
      user: {
        id: user[0].id,
        username: user[0].username,
        email: user[0].email,
        plan: user[0].plan,
        maxContainers: user[0].max_containers,
        maxRamMb: user[0].max_ram_mb,
        maxStorageMb: user[0].max_storage_mb
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      error: 'Token verification failed'
    });
  }
});

// Refresh token
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    // Gerar novo token
    const newToken = jwt.sign(
      { 
        userId: user.userId, 
        username: user.username, 
        email: user.email,
        plan: user.plan 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Token refreshed',
      token: newToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed'
    });
  }
});

// Logout (opcional - principalmente para limpar no frontend)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Em uma implementação mais robusta, você poderia blacklist o token
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed'
    });
  }
});

module.exports = router;
