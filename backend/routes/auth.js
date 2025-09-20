// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const { sendEmail, generateCode } = require('../utils/email');

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
      `INSERT INTO users (username, email, password_hash, plan, max_containers, max_ram_mb, max_storage_mb, coins)
       VALUES (?, ?, ?, 'free', 2, 512, 1024, 250)`,
      [username, email, passwordHash]
    );

    const userId = result.insertId;

    // Gerar e enviar código de verificação
    try {
      const code = generateCode(6);
      const expiresAt = new Date(Date.now() + (Number(process.env.EMAIL_CODE_TTL_MIN) || 15) * 60 * 1000);
      await database.query(
        'UPDATE users SET email_verification_code = ?, email_verification_expires = ? WHERE id = ?',
        [code, expiresAt, userId]
      );
      if (process.env.BREVO_API_KEY) {
        await sendEmail({
          toEmail: email,
          toName: username,
          subject: 'MozHost - Código de verificação de email',
          htmlContent: `<h2>Seu código</h2><p><strong>${code}</strong></p><p>Válido por 15 minutos.</p>`,
          textContent: `Seu código: ${code} (válido por 15 minutos)`
        });
      }
    } catch (e) {
      console.error('Erro ao enviar código de verificação:', e.message);
    }

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
        maxContainers: 2,
        coins: 250,
        emailVerified: false
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

    // Bloquear se email não verificado
    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Verifique seu email para acessar sua conta.'
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
      'SELECT id, username, email, plan, max_containers, max_ram_mb, max_storage_mb, coins, email_verified FROM users WHERE id = ?',
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
        maxStorageMb: user[0].max_storage_mb,
        coins: user[0].coins,
        emailVerified: !!user[0].email_verified
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
// Admin coin top-up (senha simples, provisório)
const expressAdmin = require('express');
const adminRouter = expressAdmin.Router();

adminRouter.post('/coins/add', async (req, res) => {
  try {
    const { username, amount, password } = req.body;
    if (!username || !amount || !password) {
      return res.status(400).json({ error: 'username, amount e password são obrigatórios' });
    }
    if (password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
      return res.status(401).json({ error: 'Senha de administrador inválida' });
    }
    const users = await database.query('SELECT id FROM users WHERE username = ?', [username]);
    if (!users.length) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const amt = Number(amount) || 0;
    await database.query('UPDATE users SET coins = coins + ? WHERE id = ?', [amt, users[0].id]);
    const updated = await database.query('SELECT id, username, coins FROM users WHERE id = ?', [users[0].id]);
    res.json({ message: 'Coins adicionadas com sucesso', user: updated[0] });
  } catch (error) {
    console.error('Admin add coins error:', error);
    res.status(500).json({ error: 'Falha ao adicionar coins' });
  }
});

module.exports.adminRouter = adminRouter;

// Email verification endpoints
router.post('/verify-email', [
  body('code').isLength({ min: 4, max: 10 }).withMessage('Código inválido')
], authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const users = await database.query('SELECT id, username, email, coins, email_verification_code, email_verification_expires, email_verified, verification_bonus_awarded FROM users WHERE id = ?', [req.user.userId]);
    if (!users.length) return res.status(404).json({ error: 'User not found' });
    const row = users[0];
    if (!row.email_verification_code || !row.email_verification_expires) {
      return res.status(400).json({ error: 'No verification pending' });
    }
    if (new Date(row.email_verification_expires) < new Date()) {
      return res.status(410).json({ error: 'Code expired' });
    }
    if (String(row.email_verification_code) !== String(code)) {
      return res.status(400).json({ error: 'Invalid code' });
    }
    // Marcar verificado
    await database.query('UPDATE users SET email_verified = true, email_verification_code = NULL, email_verification_expires = NULL WHERE id = ?', [req.user.userId]);

    // Bônus de 350 coins uma única vez
    let bonusGranted = false;
    if (!row.verification_bonus_awarded) {
      await database.query('UPDATE users SET coins = coins + 350, verification_bonus_awarded = true WHERE id = ?', [req.user.userId]);
      bonusGranted = true;
    }
    const updated = await database.query('SELECT coins FROM users WHERE id = ?', [req.user.userId]);
    res.json({ message: 'Email verified successfully', bonusGranted, coins: updated[0].coins });
  } catch (e) {
    console.error('verify-email error:', e);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

router.post('/resend-code', authMiddleware, async (req, res) => {
  try {
    const info = await database.query('SELECT username, email, email_verified FROM users WHERE id = ?', [req.user.userId]);
    if (!info.length) return res.status(404).json({ error: 'User not found' });
    if (info[0].email_verified) return res.status(400).json({ error: 'Already verified' });
    const code = generateCode(6);
    const expiresAt = new Date(Date.now() + (Number(process.env.EMAIL_CODE_TTL_MIN) || 15) * 60 * 1000);
    await database.query('UPDATE users SET email_verification_code = ?, email_verification_expires = ? WHERE id = ?', [code, expiresAt, req.user.userId]);
    if (process.env.BREVO_API_KEY) {
      await sendEmail({
        toEmail: info[0].email,
        toName: info[0].username,
        subject: 'MozHost - Novo código de verificação',
        htmlContent: `<p>Seu novo código: <strong>${code}</strong></p>`,
        textContent: `Seu novo código: ${code}`
      });
    }
    res.json({ message: 'Verification code sent' });
  } catch (e) {
    console.error('resend-code error:', e);
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

// Forgot/Reset password
router.post('/forgot', [body('email').isEmail()], async (req, res) => {
  try {
    const { email } = req.body;
    const users = await database.query('SELECT id, username FROM users WHERE email = ?', [email]);
    if (!users.length) {
      return res.json({ message: 'If this email exists, a reset link was sent' });
    }
    const token = require('crypto').randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + (Number(process.env.RESET_TTL_MIN) || 15) * 60 * 1000);
    await database.query('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?', [token, expiresAt, users[0].id]);
    if (process.env.BREVO_API_KEY) {
      const link = `${process.env.FRONTEND_URL || 'https://mozhost.topaziocoin.online'}/#reset?token=${token}`;
      await sendEmail({
        toEmail: email,
        toName: users[0].username,
        subject: 'MozHost - Redefinição de senha',
        htmlContent: `<p>Use este link para redefinir sua senha (válido por 15 minutos): <a href="${link}">${link}</a></p>`,
        textContent: `Link de reset (15min): ${link}`
      });
    }
    res.json({ message: 'If this email exists, a reset link was sent' });
  } catch (e) {
    console.error('forgot error:', e);
    res.status(500).json({ error: 'Failed to process forgot password' });
  }
});

router.post('/reset', [
  body('token').isString(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const users = await database.query('SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()', [token]);
    if (!users.length) return res.status(400).json({ error: 'Invalid or expired token' });
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(newPassword, 12);
    await database.query('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', [hash, users[0].id]);
    res.json({ message: 'Password reset successfully' });
  } catch (e) {
    console.error('reset error:', e);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});
