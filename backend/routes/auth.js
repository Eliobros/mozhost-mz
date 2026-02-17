// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const { sendEmail, generateCode } = require('../utils/email');
const { sendWhatsAppMessage, formatVerificationMessage, checkWhatsAppConnection } = require('../utils/whatsapp');
const { sendSMS, formatSMSVerificationMessage } = require('../utils/sms');

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
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .optional()
    .isLength({ min: 8, max: 15 })
    .matches(/^[0-9]+$/)
    .withMessage('Phone number must contain only numbers (8-15 digits)'),
  body('countryCode')
    .optional()
    .isLength({ min: 1, max: 5 })
    .withMessage('Valid country code is required'),
  body('preferredVerificationMethod')
    .optional()
    .isIn(['email', 'whatsapp', 'sms'])
    .withMessage('Verification method must be email, whatsapp or sms')
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

    const { username, email, password, phone, countryCode, preferredVerificationMethod } = req.body;

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
    // Free tier: 2 containers max, mas 0 RAM/Storage grátis - precisa comprar com coins
    // 250 coins de boas-vindas (não suficiente para 1 container que custa 500)
    // Após verificar email/whatsapp/sms: +350 coins = 600 total (suficiente para 1 container)
    const result = await database.query(
      `INSERT INTO users (username, email, password_hash, phone, country_code, preferred_verification_method, plan, max_containers, max_ram_mb, max_storage_mb, coins, free_trial_ends)
       VALUES (?, ?, ?, ?, ?, ?, 'free', 2, 0, 0, 250, DATE_ADD(NOW(), INTERVAL 30 DAY))`,
      [username, email, passwordHash, phone || null, countryCode || null, preferredVerificationMethod || 'email']
    );

    const userId = result.insertId;

    // Gerar e enviar código de verificação
    try {
      const code = generateCode(6);
      const expiresAt = new Date(Date.now() + (Number(process.env.EMAIL_CODE_TTL_MIN) || 15) * 60 * 1000);

      const verificationMethod = preferredVerificationMethod || 'email';

      if (verificationMethod === 'whatsapp' && phone && countryCode) {
        // Verificação via WhatsApp
        await database.query(
          'UPDATE users SET whatsapp_verification_code = ?, whatsapp_verification_expires = ? WHERE id = ?',
          [code, expiresAt, userId]
        );

        const fullPhone = countryCode + phone;
        const message = formatVerificationMessage(code);
        await sendWhatsAppMessage({
          phone: fullPhone,
          message: message
        });
        console.log(`📱 Código de verificação WhatsApp enviado para: ${fullPhone}`);

      } else if (verificationMethod === 'sms' && phone && countryCode) {
        // Verificação via SMS
        await database.query(
          'UPDATE users SET sms_verification_code = ?, sms_verification_expires = ? WHERE id = ?',
          [code, expiresAt, userId]
        );

        const fullPhone = countryCode + phone;
        const message = formatSMSVerificationMessage(code);
        await sendSMS({
          phone: fullPhone,
          message: message
        });
        console.log(`📨 Código de verificação SMS enviado para: ${fullPhone}`);

      } else {
        // Verificação via Email (padrão)
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
        console.log(`📧 Código de verificação email enviado para: ${email}`);
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
        phone: phone || null,
        countryCode: countryCode || null,
        plan: 'free',
        maxContainers: 2,
        coins: 250,
        emailVerified: false,
        whatsappVerified: false,
        smsVerified: false,
        preferredVerificationMethod: preferredVerificationMethod || 'email'
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

    // Verificar se pelo menos um método está verificado
    const hasEmailVerified = user.email_verified;
    const hasWhatsAppVerified = user.whatsapp_verified;
    const hasSMSVerified = user.sms_verified;
    const preferredMethod = user.preferred_verification_method || 'email';

    if (!hasEmailVerified && !hasWhatsAppVerified && !hasSMSVerified) {
      const method = preferredMethod === 'whatsapp' && user.phone ? 'WhatsApp' : 
                     preferredMethod === 'sms' && user.phone ? 'SMS' : 'email';
      return res.status(403).json({
        error: 'Account not verified',
        message: `Verifique sua conta via ${method} para acessar.`,
        preferredMethod: preferredMethod
      });
    }

    // Se tem método preferido mas não verificado, sugerir verificação
    if (preferredMethod === 'whatsapp' && user.phone && !hasWhatsAppVerified && (hasEmailVerified || hasSMSVerified)) {
      console.log(`ℹ️ User ${user.username} logged in but has unverified WhatsApp`);
    }
    if (preferredMethod === 'sms' && user.phone && !hasSMSVerified && (hasEmailVerified || hasWhatsAppVerified)) {
      console.log(`ℹ️ User ${user.username} logged in but has unverified SMS`);
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
        maxStorageMb: user.max_storage_mb,
        freeTrialEnds: user.free_trial_ends,
        createdAt: user.created_at
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
      'SELECT id, username, email, phone, country_code, plan, max_containers, max_ram_mb, max_storage_mb, coins, email_verified, whatsapp_verified, sms_verified, preferred_verification_method, free_trial_ends, created_at FROM users WHERE id = ?',
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
        phone: user[0].phone,
        countryCode: user[0].country_code,
        plan: user[0].plan,
        maxContainers: user[0].max_containers,
        maxRamMb: user[0].max_ram_mb,
        maxStorageMb: user[0].max_storage_mb,
        coins: user[0].coins,
        emailVerified: !!user[0].email_verified,
        whatsappVerified: !!user[0].whatsapp_verified,
        smsVerified: !!user[0].sms_verified,
        preferredVerificationMethod: user[0].preferred_verification_method,
        freeTrialEnds: user[0].free_trial_ends,
        createdAt: user[0].created_at
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

// WhatsApp verification endpoints
router.post('/verify-whatsapp', [
  body('code').isLength({ min: 4, max: 10 }).withMessage('Código inválido')
], authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const users = await database.query('SELECT id, username, phone, country_code, coins, whatsapp_verification_code, whatsapp_verification_expires, whatsapp_verified, verification_bonus_awarded FROM users WHERE id = ?', [req.user.userId]);
    if (!users.length) return res.status(404).json({ error: 'User not found' });
    const row = users[0];

    if (!row.whatsapp_verification_code || !row.whatsapp_verification_expires) {
      return res.status(400).json({ error: 'No WhatsApp verification pending' });
    }
    if (new Date(row.whatsapp_verification_expires) < new Date()) {
      return res.status(410).json({ error: 'Code expired' });
    }
    if (String(row.whatsapp_verification_code) !== String(code)) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Marcar WhatsApp verificado
    await database.query('UPDATE users SET whatsapp_verified = true, whatsapp_verification_code = NULL, whatsapp_verification_expires = NULL WHERE id = ?', [req.user.userId]);

    // Bônus de 350 coins uma única vez
    let bonusGranted = false;
    if (!row.verification_bonus_awarded) {
      await database.query('UPDATE users SET coins = coins + 350, verification_bonus_awarded = true WHERE id = ?', [req.user.userId]);
      bonusGranted = true;
    }
    const updated = await database.query('SELECT coins FROM users WHERE id = ?', [req.user.userId]);
    res.json({ message: 'WhatsApp verified successfully', bonusGranted, coins: updated[0].coins });
  } catch (e) {
    console.error('verify-whatsapp error:', e);
    res.status(500).json({ error: 'Failed to verify WhatsApp' });
  }
});

// SMS verification endpoint
router.post('/verify-sms', [
  body('code').isLength({ min: 4, max: 10 }).withMessage('Código inválido')
], authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const users = await database.query(
      'SELECT id, username, phone, country_code, coins, sms_verification_code, sms_verification_expires, sms_verified, verification_bonus_awarded FROM users WHERE id = ?', 
      [req.user.userId]
    );
    
    if (!users.length) return res.status(404).json({ error: 'User not found' });
    const row = users[0];

    if (!row.sms_verification_code || !row.sms_verification_expires) {
      return res.status(400).json({ error: 'No SMS verification pending' });
    }
    if (new Date(row.sms_verification_expires) < new Date()) {
      return res.status(410).json({ error: 'Code expired' });
    }
    if (String(row.sms_verification_code) !== String(code)) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Marcar SMS verificado
    await database.query(
      'UPDATE users SET sms_verified = true, sms_verification_code = NULL, sms_verification_expires = NULL WHERE id = ?', 
      [req.user.userId]
    );

    // Bônus de 350 coins uma única vez
    let bonusGranted = false;
    if (!row.verification_bonus_awarded) {
      await database.query(
        'UPDATE users SET coins = coins + 350, verification_bonus_awarded = true WHERE id = ?', 
        [req.user.userId]
      );
      bonusGranted = true;
    }
    
    const updated = await database.query('SELECT coins FROM users WHERE id = ?', [req.user.userId]);
    res.json({ message: 'SMS verified successfully', bonusGranted, coins: updated[0].coins });
  } catch (e) {
    console.error('verify-sms error:', e);
    res.status(500).json({ error: 'Failed to verify SMS' });
  }
});

router.post('/resend-code', [
  body('method').optional().isIn(['email', 'whatsapp', 'sms']).withMessage('Method must be email, whatsapp or sms')
], authMiddleware, async (req, res) => {
  try {
    const { method } = req.body;
    const info = await database.query('SELECT username, email, phone, country_code, email_verified, whatsapp_verified, sms_verified, preferred_verification_method FROM users WHERE id = ?', [req.user.userId]);
    if (!info.length) return res.status(404).json({ error: 'User not found' });

    const verificationMethod = method || info[0].preferred_verification_method || 'email';

    if (verificationMethod === 'sms') {
      if (!info[0].phone || !info[0].country_code) {
        return res.status(400).json({ error: 'Phone number not configured' });
      }
      if (info[0].sms_verified) {
        return res.status(400).json({ error: 'SMS already verified' });
      }

      const code = generateCode(6);
      const expiresAt = new Date(Date.now() + (Number(process.env.EMAIL_CODE_TTL_MIN) || 15) * 60 * 1000);
      await database.query(
        'UPDATE users SET sms_verification_code = ?, sms_verification_expires = ? WHERE id = ?', 
        [code, expiresAt, req.user.userId]
      );

      const fullPhone = info[0].country_code + info[0].phone;
      const message = formatSMSVerificationMessage(code);
      await sendSMS({
        phone: fullPhone,
        message: message
      });

      res.json({ message: 'SMS verification code sent' });
      
    } else if (verificationMethod === 'whatsapp') {
      if (!info[0].phone || !info[0].country_code) {
        return res.status(400).json({ error: 'Phone number not configured' });
      }
      if (info[0].whatsapp_verified) {
        return res.status(400).json({ error: 'WhatsApp already verified' });
      }

      const code = generateCode(6);
      const expiresAt = new Date(Date.now() + (Number(process.env.EMAIL_CODE_TTL_MIN) || 15) * 60 * 1000);
      await database.query('UPDATE users SET whatsapp_verification_code = ?, whatsapp_verification_expires = ? WHERE id = ?', [code, expiresAt, req.user.userId]);

      const fullPhone = info[0].country_code + info[0].phone;
      const message = formatVerificationMessage(code);
      await sendWhatsAppMessage({
        phone: fullPhone,
        message: message
      });

      res.json({ message: 'WhatsApp verification code sent' });
    } else {
      // Email (padrão)
      if (info[0].email_verified) return res.status(400).json({ error: 'Email already verified' });

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

      res.json({ message: 'Email verification code sent' });
    }
  } catch (e) {
    console.error('resend-code error:', e);
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

// Atualizar dados de telefone/método de verificação
router.post('/update-verification-method', [
  body('phone').optional().isLength({ min: 8, max: 15 }).matches(/^[0-9]+$/).withMessage('Phone number must contain only numbers (8-15 digits)'),
  body('countryCode').optional().isLength({ min: 1, max: 5 }).withMessage('Valid country code required'),
  body('preferredMethod').isIn(['email', 'whatsapp', 'sms']).withMessage('Method must be email, whatsapp or sms')
], authMiddleware, async (req, res) => {
  try {
    const { phone, countryCode, preferredMethod } = req.body;

    // Se escolheu WhatsApp ou SMS, telefone é obrigatório
    if ((preferredMethod === 'whatsapp' || preferredMethod === 'sms') && (!phone || !countryCode)) {
      return res.status(400).json({ error: 'Phone and country code required for WhatsApp/SMS verification' });
    }

    // Atualizar dados do usuário
    if (preferredMethod === 'whatsapp' || preferredMethod === 'sms') {
      await database.query(
        'UPDATE users SET phone = ?, country_code = ?, preferred_verification_method = ? WHERE id = ?',
        [phone, countryCode, preferredMethod, req.user.userId]
      );
    } else {
      await database.query(
        'UPDATE users SET preferred_verification_method = ? WHERE id = ?',
        [preferredMethod, req.user.userId]
      );
    }

    res.json({ message: 'Verification method updated successfully' });
  } catch (e) {
    console.error('update-verification-method error:', e);
    res.status(500).json({ error: 'Failed to update verification method' });
  }
});

// Status da conexão WhatsApp (para admin)
router.get('/whatsapp-status', authMiddleware, async (req, res) => {
  try {
    const isConnected = checkWhatsAppConnection();
    res.json({ 
      connected: isConnected,
      message: isConnected ? 'WhatsApp connected' : 'WhatsApp not connected'
    });
  } catch (e) {
    console.error('whatsapp-status error:', e);
    res.status(500).json({ error: 'Failed to check WhatsApp status' });
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

// ========================================
// ADMIN ENDPOINTS - Adicionar antes da rota /reset
// ========================================

// Middleware de autenticação admin (validação simples)
const adminAuth = async (req, res, next) => {
  try {
    const { password } = req.body || req.query;
    if (!password || password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
      return res.status(401).json({ error: 'Senha de administrador inválida' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro na autenticação admin' });
  }
};

// GET /api/admin/stats - Dashboard stats
adminRouter.get('/stats', async (req, res) => {
  try {
    const { password } = req.query;
    if (!password || password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
      return res.status(401).json({ error: 'Senha de administrador inválida' });
    }

    // Total de usuários
    const totalUsers = await database.query('SELECT COUNT(*) as count FROM users');
    
    // Total de coins no sistema
    const totalCoins = await database.query('SELECT SUM(coins) as total FROM users');
    
    // Usuários ativos
    const activeUsers = await database.query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    
    // Total de containers
    const totalContainers = await database.query('SELECT COUNT(*) as count FROM containers');
    
    // Containers por status
    const containersByStatus = await database.query(
      'SELECT status, COUNT(*) as count FROM containers GROUP BY status'
    );
    
    // Containers rodando
    const runningContainers = await database.query(
      'SELECT COUNT(*) as count FROM containers WHERE status = "running"'
    );
    
    // Usuários por plano
    const usersByPlan = await database.query(
      'SELECT plan, COUNT(*) as count FROM users GROUP BY plan'
    );
    
    // Usuários verificados
    const verifiedUsers = await database.query(
      'SELECT COUNT(*) as count FROM users WHERE email_verified = 1 OR whatsapp_verified = 1 OR sms_verified = 1'
    );

    // Recursos em uso
    const resourceUsage = await database.query(
      'SELECT SUM(cpu_limit) as totalCpu, SUM(memory_limit_mb) as totalRam, SUM(storage_used_mb) as totalStorage FROM containers WHERE status = "running"'
    );

    res.json({
      users: {
        total: totalUsers[0].count,
        active: activeUsers[0].count,
        verified: verifiedUsers[0].count,
        byPlan: usersByPlan
      },
      containers: {
        total: totalContainers[0].count,
        running: runningContainers[0].count,
        byStatus: containersByStatus
      },
      coins: {
        total: parseFloat(totalCoins[0].total || 0)
      },
      resources: {
        cpu: parseFloat(resourceUsage[0].totalCpu || 0),
        ram: parseInt(resourceUsage[0].totalRam || 0),
        storage: parseInt(resourceUsage[0].totalStorage || 0)
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Falha ao buscar estatísticas' });
  }
});

// GET /api/admin/users - Lista todos os usuários
adminRouter.get('/users', async (req, res) => {
  try {
    const { password, search, plan, verified } = req.query;
    
    if (!password || password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
      return res.status(401).json({ error: 'Senha de administrador inválida' });
    }

    let query = `
      SELECT 
        u.id, u.username, u.email, u.phone, u.country_code,
        u.plan, u.coins, u.max_containers, u.max_ram_mb, u.max_storage_mb,
        u.is_active, u.email_verified, u.whatsapp_verified, u.sms_verified,
        u.created_at, u.updated_at,
        COUNT(c.id) as container_count
      FROM users u
      LEFT JOIN containers c ON c.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];

    // Filtro de busca
    if (search) {
      query += ' AND (u.username LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Filtro por plano
    if (plan && ['free', 'basic', 'pro'].includes(plan)) {
      query += ' AND u.plan = ?';
      params.push(plan);
    }

    // Filtro por verificação
    if (verified === 'true') {
      query += ' AND (u.email_verified = 1 OR u.whatsapp_verified = 1 OR u.sms_verified = 1)';
    } else if (verified === 'false') {
      query += ' AND u.email_verified = 0 AND u.whatsapp_verified = 0 AND u.sms_verified = 0';
    }

    query += ' GROUP BY u.id ORDER BY u.created_at DESC';

    const users = await database.query(query, params);

    res.json({
      total: users.length,
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        phone: u.phone,
        countryCode: u.country_code,
        plan: u.plan,
        coins: parseFloat(u.coins),
        maxContainers: u.max_containers,
        maxRamMb: u.max_ram_mb,
        maxStorageMb: u.max_storage_mb,
        isActive: !!u.is_active,
        emailVerified: !!u.email_verified,
        whatsappVerified: !!u.whatsapp_verified,
        smsVerified: !!u.sms_verified,
        containerCount: u.container_count,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }))
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ error: 'Falha ao listar usuários' });
  }
});

// GET /api/admin/users/:id - Buscar usuário específico
adminRouter.get('/users/:id', async (req, res) => {
  try {
    const { password } = req.query;
    const { id } = req.params;
    
    if (!password || password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
      return res.status(401).json({ error: 'Senha de administrador inválida' });
    }

    const users = await database.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!users.length) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const containers = await database.query(
      'SELECT id, name, type, status, cpu_limit, memory_limit_mb, storage_used_mb, domain, created_at FROM containers WHERE user_id = ?',
      [id]
    );

    const user = users[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      countryCode: user.country_code,
      plan: user.plan,
      coins: parseFloat(user.coins),
      maxContainers: user.max_containers,
      maxRamMb: user.max_ram_mb,
      maxStorageMb: user.max_storage_mb,
      isActive: !!user.is_active,
      emailVerified: !!user.email_verified,
      whatsappVerified: !!user.whatsapp_verified,
      smsVerified: !!user.sms_verified,
      verificationBonusAwarded: !!user.verification_bonus_awarded,
      preferredVerificationMethod: user.preferred_verification_method,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      containers: containers
    });
  } catch (error) {
    console.error('Admin user detail error:', error);
    res.status(500).json({ error: 'Falha ao buscar usuário' });
  }
});

// GET /api/admin/containers - Lista todos os containers
adminRouter.get('/containers', async (req, res) => {
  try {
    const { password, status, type, userId } = req.query;
    
    if (!password || password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
      return res.status(401).json({ error: 'Senha de administrador inválida' });
    }

    let query = `
      SELECT 
        c.*,
        u.username, u.email, u.plan
      FROM containers c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];

    // Filtro por status
    if (status && ['stopped', 'running', 'error', 'building'].includes(status)) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    // Filtro por tipo
    if (type && ['nodejs', 'python'].includes(type)) {
      query += ' AND c.type = ?';
      params.push(type);
    }

    // Filtro por usuário
    if (userId) {
      query += ' AND c.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY c.created_at DESC';

    const containers = await database.query(query, params);

    res.json({
      total: containers.length,
      containers: containers.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        dockerContainerId: c.docker_container_id,
        port: c.port,
        domain: c.domain,
        cpuLimit: parseFloat(c.cpu_limit),
        memoryLimitMb: c.memory_limit_mb,
        storageUsedMb: c.storage_used_mb,
        autoRestart: !!c.auto_restart,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        user: {
          id: c.user_id,
          username: c.username,
          email: c.email,
          plan: c.plan
        }
      }))
    });
  } catch (error) {
    console.error('Admin containers list error:', error);
    res.status(500).json({ error: 'Falha ao listar containers' });
  }
});

// PATCH /api/admin/users/:id/plan - Atualizar plano do usuário
adminRouter.patch('/users/:id/plan', async (req, res) => {
  try {
    const { password, plan } = req.body;
    const { id } = req.params;
    
    if (!password || password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
      return res.status(401).json({ error: 'Senha de administrador inválida' });
    }

    if (!plan || !['free', 'basic', 'pro'].includes(plan)) {
      return res.status(400).json({ error: 'Plano inválido. Use: free, basic ou pro' });
    }

    const users = await database.query('SELECT id FROM users WHERE id = ?', [id]);
    if (!users.length) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Define limites por plano
    const planLimits = {
      free: { maxContainers: 2, maxRamMb: 512, maxStorageMb: 1024 },
      basic: { maxContainers: 5, maxRamMb: 1024, maxStorageMb: 5120 },
      pro: { maxContainers: 10, maxRamMb: 2048, maxStorageMb: 10240 }
    };

    const limits = planLimits[plan];

    await database.query(
      'UPDATE users SET plan = ?, max_containers = ?, max_ram_mb = ?, max_storage_mb = ? WHERE id = ?',
      [plan, limits.maxContainers, limits.maxRamMb, limits.maxStorageMb, id]
    );

    const updated = await database.query(
      'SELECT id, username, email, plan, max_containers, max_ram_mb, max_storage_mb FROM users WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Plano atualizado com sucesso',
      user: updated[0]
    });
  } catch (error) {
    console.error('Admin update plan error:', error);
    res.status(500).json({ error: 'Falha ao atualizar plano' });
  }
});

// PATCH /api/admin/users/:id/status - Ativar/desativar usuário
adminRouter.patch('/users/:id/status', async (req, res) => {
  try {
    const { password, isActive } = req.body;
    const { id } = req.params;
    
    if (!password || password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
      return res.status(401).json({ error: 'Senha de administrador inválida' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive deve ser true ou false' });
    }

    const users = await database.query('SELECT id FROM users WHERE id = ?', [id]);
    if (!users.length) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await database.query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );

    const updated = await database.query(
      'SELECT id, username, email, is_active FROM users WHERE id = ?',
      [id]
    );

    res.json({
      message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso`,
      user: updated[0]
    });
  } catch (error) {
    console.error('Admin update status error:', error);
    res.status(500).json({ error: 'Falha ao atualizar status' });
  }
});

// POST /api/admin/coins/remove - Remover coins
adminRouter.post('/coins/remove', async (req, res) => {
  try {
    const { username, amount, password } = req.body;
    
    if (!username || !amount || !password) {
      return res.status(400).json({ error: 'username, amount e password são obrigatórios' });
    }
    
    if (password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
      return res.status(401).json({ error: 'Senha de administrador inválida' });
    }

    const users = await database.query('SELECT id, coins FROM users WHERE username = ?', [username]);
    if (!users.length) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const amt = Number(amount) || 0;
    const currentCoins = parseFloat(users[0].coins);
    
    if (currentCoins < amt) {
      return res.status(400).json({ 
        error: 'Coins insuficientes',
        message: `Usuário possui apenas ${currentCoins} coins`
      });
    }

    await database.query(
      'UPDATE users SET coins = coins - ? WHERE id = ?',
      [amt, users[0].id]
    );

    const updated = await database.query(
      'SELECT id, username, coins FROM users WHERE id = ?',
      [users[0].id]
    );

    res.json({
      message: 'Coins removidas com sucesso',
      user: updated[0]
    });
  } catch (error) {
    console.error('Admin remove coins error:', error);
    res.status(500).json({ error: 'Falha ao remover coins' });
  }
});

// DELETE /api/admin/users/:id - Deletar usuário (cuidado!)
adminRouter.delete('/users/:id', async (req, res) => {
  try {
    const { password } = req.body;
    const { id } = req.params;
    
    if (!password || password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
      return res.status(401).json({ error: 'Senha de administrador inválida' });
    }

    const users = await database.query('SELECT id, username FROM users WHERE id = ?', [id]);
    if (!users.length) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Deletar containers primeiro (cascade)
    await database.query('DELETE FROM containers WHERE user_id = ?', [id]);
    
    // Deletar usuário
    await database.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      message: 'Usuário deletado com sucesso',
      username: users[0].username
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Falha ao deletar usuário' });
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

// Gerar token temporário para WhatsApp Bot
router.post('/whatsapp-token', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    
    const users = await database.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!users.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token expira em 1 hora
    );
    
    res.json({ token });
    
  } catch (error) {
    console.error('WhatsApp token error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});


// ============================================
// STARTUP COMMANDS - Comandos personalizados
// ============================================

// GET /api/auth/startup-commands - Obter comandos atuais
router.get('/startup-commands', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const users = await database.query(
      'SELECT startup_command_nodejs, startup_command_python FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      nodejs: users[0].startup_command_nodejs || 'npm install && npm start',
      python: users[0].startup_command_python || 'pip install -r requirements.txt && python main.py'
    });

  } catch (error) {
    console.error('Erro ao buscar comandos de inicialização:', error);
    res.status(500).json({ error: 'Erro ao buscar comandos' });
  }
});

// PUT /api/auth/startup-commands - Atualizar comandos
router.put('/startup-commands', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { nodejs, python } = req.body;

    // Validação básica
    if (!nodejs || !python) {
      return res.status(400).json({ 
        error: 'Comandos para Node.js e Python são obrigatórios' 
      });
    }

    // Validação de tamanho (evitar comandos gigantes)
    if (nodejs.length > 1000 || python.length > 1000) {
      return res.status(400).json({ 
        error: 'Comandos muito longos (máximo 1000 caracteres cada)' 
      });
    }

    // Atualizar no banco
    await database.query(
      'UPDATE users SET startup_command_nodejs = ?, startup_command_python = ? WHERE id = ?',
      [nodejs.trim(), python.trim(), userId]
    );

    console.log(`✅ Comandos de inicialização atualizados para usuário ${userId}`);

    res.json({ 
      message: 'Comandos atualizados com sucesso',
      nodejs: nodejs.trim(),
      python: python.trim()
    });

  } catch (error) {
    console.error('Erro ao atualizar comandos de inicialização:', error);
    res.status(500).json({ error: 'Erro ao atualizar comandos' });
  }
});

// POST /api/auth/upgrade-plan - Upgrade do plano do usuário
router.post('/upgrade-plan', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { plan } = req.body;

    const validPlans = {
      basic: { cost: 2000, maxContainers: 5, maxRamMb: 1024, maxStorageMb: 2048 },
      pro: { cost: 5000, maxContainers: 10, maxRamMb: 2048, maxStorageMb: 5120 }
    };

    if (!validPlans[plan]) {
      return res.status(400).json({ error: 'Plano inválido', message: 'Escolha basic ou pro' });
    }

    const planConfig = validPlans[plan];

    // Verificar coins do usuário
    const users = await database.query('SELECT coins, plan FROM users WHERE id = ?', [userId]);
    if (!users.length) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const currentCoins = users[0].coins || 0;
    const currentPlan = users[0].plan;

    // Não permitir downgrade
    const planOrder = { free: 0, basic: 1, pro: 2 };
    if ((planOrder[plan] || 0) <= (planOrder[currentPlan] || 0)) {
      return res.status(400).json({ 
        error: 'Plano inválido', 
        message: `Você já está no plano ${currentPlan.toUpperCase()} ou superior` 
      });
    }

    if (currentCoins < planConfig.cost) {
      return res.status(402).json({
        error: 'Coins insuficientes',
        message: `Você precisa de ${planConfig.cost} coins. Tem ${currentCoins}.`,
        needed: planConfig.cost,
        have: currentCoins
      });
    }

    // Aplicar upgrade
    await database.query(
      'UPDATE users SET plan = ?, coins = coins - ?, max_containers = ?, max_ram_mb = ?, max_storage_mb = ? WHERE id = ?',
      [plan, planConfig.cost, planConfig.maxContainers, planConfig.maxRamMb, planConfig.maxStorageMb, userId]
    );

    const updated = await database.query('SELECT coins, plan, max_containers, max_ram_mb, max_storage_mb FROM users WHERE id = ?', [userId]);

    res.json({
      message: `Upgrade para ${plan.toUpperCase()} realizado com sucesso!`,
      plan: updated[0].plan,
      coins: updated[0].coins,
      maxContainers: updated[0].max_containers,
      maxRamMb: updated[0].max_ram_mb,
      maxStorageMb: updated[0].max_storage_mb
    });

  } catch (error) {
    console.error('Erro ao fazer upgrade:', error);
    res.status(500).json({ error: 'Erro ao processar upgrade' });
  }
});

module.exports = router;
