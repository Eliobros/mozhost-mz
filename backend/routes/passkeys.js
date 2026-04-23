// routes/passkeys.js
// Autenticação com Passkeys (WebAuthn) para MozHost

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const auth = require('../middleware/auth');
const database = require('../models/database');

const RP_NAME = 'MozHost';
const RP_ID = process.env.RP_ID || 'mozhost.shop'; // domínio do frontend
const ORIGIN = process.env.FRONTEND_URL || 'https://mozhost.topaziocoin.online';

// Armazenamento temporário de challenges (em produção pode usar Redis)
const challengeStore = new Map();

// ===== REGISTO =====

// POST /api/passkeys/register/start
// Utilizador autenticado inicia o registo de uma passkey
router.post('/register/start', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    // Buscar dados do utilizador
    const users = await database.query(
      'SELECT id, username, email FROM users WHERE id = ?',
      [userId]
    );
    if (!users.length) return res.status(404).json({ error: 'Utilizador não encontrado' });

    const user = users[0];

    // Buscar passkeys já registadas para excluir dos dispositivos sugeridos
    const existingPasskeys = await database.query(
      'SELECT credential_id FROM passkeys WHERE user_id = ?',
      [userId]
    );

    const excludeCredentials = existingPasskeys.map(p => ({
      id: Buffer.from(p.credential_id, 'base64url'),
      type: 'public-key',
    }));

    // Gerar opções de registo
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: String(userId),
      userName: user.username,
      userDisplayName: user.username,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Guardar challenge temporariamente (expira em 5 minutos)
    challengeStore.set(`reg_${userId}`, {
      challenge: options.challenge,
      expires: Date.now() + 5 * 60 * 1000,
    });

    res.json({ success: true, options });

  } catch (error) {
    console.error('Passkey register start error:', error);
    res.status(500).json({ error: 'Erro ao iniciar registo de passkey' });
  }
});

// POST /api/passkeys/register/finish
// Verificar e guardar a passkey registada
router.post('/register/finish', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { credential, deviceName } = req.body;

    if (!credential) return res.status(400).json({ error: 'Credential é obrigatório' });

    // Buscar challenge guardado
    const stored = challengeStore.get(`reg_${userId}`);
    if (!stored || Date.now() > stored.expires) {
      challengeStore.delete(`reg_${userId}`);
      return res.status(400).json({ error: 'Challenge expirado. Tente novamente.' });
    }

    // Verificar resposta do browser
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: stored.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Verificação falhou' });
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    // Guardar passkey no banco
    await database.query(
      `INSERT INTO passkeys (user_id, credential_id, public_key, counter, device_name, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        Buffer.from(credentialID).toString('base64url'),
        Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        deviceName || 'Dispositivo',
      ]
    );

    // Limpar challenge
    challengeStore.delete(`reg_${userId}`);

    console.log(`✅ Passkey registada: user ${userId} - ${deviceName || 'Dispositivo'}`);

    res.json({ success: true, message: 'Passkey registada com sucesso!' });

  } catch (error) {
    console.error('Passkey register finish error:', error);
    res.status(500).json({ error: 'Erro ao finalizar registo de passkey' });
  }
});

// ===== LOGIN =====

// POST /api/passkeys/login/start
// Iniciar autenticação com passkey (sem precisar de JWT)
router.post('/login/start', async (req, res) => {
  try {
    const { username } = req.body;

    let allowCredentials = [];
    let tempKey = 'anon';

    if (username) {
      // Se forneceu username, buscar as passkeys dele
      const users = await database.query(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, username]
      );

      if (users.length) {
        const passkeys = await database.query(
          'SELECT credential_id FROM passkeys WHERE user_id = ?',
          [users[0].id]
        );

        allowCredentials = passkeys.map(p => ({
          id: Buffer.from(p.credential_id, 'base64url'),
          type: 'public-key',
        }));

        tempKey = `login_${users[0].id}`;
      }
    } else {
      tempKey = `login_anon_${Date.now()}`;
    }

    // Gerar opções de autenticação
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Guardar challenge
    challengeStore.set(tempKey, {
      challenge: options.challenge,
      expires: Date.now() + 5 * 60 * 1000,
    });

    res.json({ success: true, options, tempKey });

  } catch (error) {
    console.error('Passkey login start error:', error);
    res.status(500).json({ error: 'Erro ao iniciar login com passkey' });
  }
});

// POST /api/passkeys/login/finish
// Verificar passkey e devolver JWT
router.post('/login/finish', async (req, res) => {
  try {
    const { credential, tempKey } = req.body;

    if (!credential || !tempKey) {
      return res.status(400).json({ error: 'credential e tempKey são obrigatórios' });
    }

    // Buscar challenge
    const stored = challengeStore.get(tempKey);
    if (!stored || Date.now() > stored.expires) {
      challengeStore.delete(tempKey);
      return res.status(400).json({ error: 'Challenge expirado. Tente novamente.' });
    }

    // Buscar passkey no banco pelo credentialId
    const credentialId = credential.id;
    const passkeys = await database.query(
      `SELECT pk.*, u.id as uid, u.username, u.email, u.plan, u.is_active
       FROM passkeys pk
       JOIN users u ON pk.user_id = u.id
       WHERE pk.credential_id = ?`,
      [credentialId]
    );

    if (!passkeys.length) {
      return res.status(404).json({ error: 'Passkey não encontrada' });
    }

    const passkey = passkeys[0];

    if (!passkey.is_active) {
      return res.status(401).json({ error: 'Conta desativada' });
    }

    // Verificar resposta
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: stored.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(passkey.credential_id, 'base64url'),
        credentialPublicKey: Buffer.from(passkey.public_key, 'base64url'),
        counter: passkey.counter,
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ error: 'Verificação falhou' });
    }

    // Atualizar counter (proteção anti-replay)
    await database.query(
      'UPDATE passkeys SET counter = ?, last_used_at = NOW() WHERE id = ?',
      [verification.authenticationInfo.newCounter, passkey.id]
    );

    // Limpar challenge
    challengeStore.delete(tempKey);

    // Gerar JWT igual ao login normal
    const token = jwt.sign(
      {
        userId: passkey.uid,
        username: passkey.username,
        email: passkey.email,
        plan: passkey.plan,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log(`✅ Login via passkey: ${passkey.username} (ID: ${passkey.uid})`);

    res.json({
      success: true,
      message: 'Login com passkey bem-sucedido!',
      token,
      user: {
        id: passkey.uid,
        username: passkey.username,
        email: passkey.email,
        plan: passkey.plan,
      },
    });

  } catch (error) {
    console.error('Passkey login finish error:', error);
    res.status(500).json({ error: 'Erro ao verificar passkey' });
  }
});

// ===== GESTÃO =====

// GET /api/passkeys - Listar passkeys do utilizador
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const passkeys = await database.query(
      'SELECT id, device_name, created_at, last_used_at FROM passkeys WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json({ success: true, passkeys });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar passkeys' });
  }
});

// DELETE /api/passkeys/:id - Remover uma passkey
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const passkeys = await database.query(
      'SELECT id FROM passkeys WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!passkeys.length) {
      return res.status(404).json({ error: 'Passkey não encontrada' });
    }

    await database.query('DELETE FROM passkeys WHERE id = ?', [id]);

    res.json({ success: true, message: 'Passkey removida com sucesso' });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover passkey' });
  }
});

module.exports = router;
