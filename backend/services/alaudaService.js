// services/alaudaService.js
// Proxy da Alauda API para containers MozHost
// Opção A: usuário autentica com token MozHost, backend injeta key interna

const axios = require('axios');
const database = require('../models/database');

const ALAUDA_API_URL = process.env.ALAUDA_API_URL || 'http://208.110.72.191:3000';
const ALAUDA_API_KEY = process.env.ALAUDA_API_KEY;

// 👑 Dono da plataforma — acesso total, sem débito e sem verificação de plano
const OWNER_ID = Number(process.env.OWNER_USER_ID || 6);
const OWNER_INFINITE_BALANCE = 999999999;

function isOwner(userId) {
  return Number(userId) === OWNER_ID;
}

// Custos por endpoint (em requests). Ajusta conforme quiseres cobrar mais nos pesados.
const COSTS = {
  'youtube.search': 1,
  'youtube.download': 2,
  'youtube.info': 1,
  'tiktok.download': 2,
  'tiktok.info': 1,
  'instagram.download': 2,
  'facebook.download': 2,
  'spotify.search': 1,
  'spotify.download': 3,
  'shazam.identify': 2,
  'lyrics.search': 1,
  'weather.current': 1,
  'currency.convert': 1,
};

// Endpoints permitidos (whitelist). xvideos e payment FICAM FORA por decisão de negócio.
const ALLOWED_SERVICES = [
  'youtube', 'tiktok', 'instagram', 'facebook', 'spotify',
  'shazam', 'lyrics', 'weather', 'currency', 'whatsapp', 'photos', 'vocalremove', 'remove'
];

// Planos com acesso (acima do Starter)
const PLAN_RANK = { free: 0, starter: 1, basic: 2, pro: 3, business: 4 };
const MIN_PLAN_RANK = 2; // basic, pro, business

// Cota mensal inclusa por plano
const MONTHLY_QUOTA = {
  basic: 500,
  pro: 1500,
  business: 5000,
};

async function ensureTables() {
  try {
    // Saldo de requests de API do usuário
    await database.query(`
      CREATE TABLE IF NOT EXISTS api_balances (
        user_id INT PRIMARY KEY,
        requests_remaining INT NOT NULL DEFAULT 0,
        monthly_quota INT NOT NULL DEFAULT 0,
        quota_reset_at TIMESTAMP NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Log de uso da API
    await database.query(`
      CREATE TABLE IF NOT EXISTS api_usage_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        service VARCHAR(50) NOT NULL,
        endpoint VARCHAR(100) NOT NULL,
        cost INT NOT NULL DEFAULT 0,
        status ENUM('success', 'error') DEFAULT 'success',
        container_id VARCHAR(36) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_apiusage_user (user_id, created_at)
      )
    `);
    console.log('✅ Alauda tables initialized');
  } catch (error) {
    console.error('Erro ao criar tabelas Alauda:', error.message);
  }
}

// Garante que o usuário tem linha de saldo; aplica cota mensal se expirou
async function ensureBalance(userId, plan) {
  await ensureTables();

  // 👑 Dono: saldo infinito, nunca debita nem renova
  if (isOwner(userId)) {
    const existing = await database.query('SELECT user_id FROM api_balances WHERE user_id = ?', [userId]);
    if (!existing.length) {
      await database.query(
        'INSERT INTO api_balances (user_id, requests_remaining, monthly_quota, quota_reset_at) VALUES (?, ?, 0, NULL)',
        [userId, OWNER_INFINITE_BALANCE]
      );
    }
    return { requests_remaining: OWNER_INFINITE_BALANCE, monthly_quota: 0, is_owner: true };
  }

  const rows = await database.query('SELECT * FROM api_balances WHERE user_id = ?', [userId]);

  if (!rows.length) {
    const quota = MONTHLY_QUOTA[plan] || 0;
    await database.query(
      'INSERT INTO api_balances (user_id, requests_remaining, monthly_quota, quota_reset_at) VALUES (?, ?, ?, ?)',
      [userId, quota, quota, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
    );
    return { requests_remaining: quota, monthly_quota: quota };
  }

  let balance = rows[0];

  // Renova cota mensal se expirou
  if (balance.quota_reset_at && new Date(balance.quota_reset_at) <= new Date()) {
    const quota = MONTHLY_QUOTA[plan] || 0;
    await database.query(
      'UPDATE api_balances SET requests_remaining = ?, monthly_quota = ?, quota_reset_at = ? WHERE user_id = ?',
      [quota, quota, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), userId]
    );
    balance = { ...balance, requests_remaining: quota, monthly_quota: quota };
  }

  return balance;
}

async function getBalance(userId, plan) {
  await ensureTables();

  // 👑 Dono: mostra saldo infinito sem tocar na DB
  if (isOwner(userId)) {
    return { requests_remaining: OWNER_INFINITE_BALANCE, monthly_quota: 0, quota_reset_at: null, plan: 'owner', is_owner: true };
  }

  const rows = await database.query('SELECT * FROM api_balances WHERE user_id = ?', [userId]);
  if (rows.length) {
    const b = rows[0];
    return {
      requests_remaining: b.requests_remaining,
      monthly_quota: b.monthly_quota,
      quota_reset_at: b.quota_reset_at,
      plan
    };
  }
  return { requests_remaining: 0, monthly_quota: 0, quota_reset_at: null, plan };
}

// Debita requests. Retorna false se não tem saldo.
async function consume(userId, cost) {
  // 👑 Dono: nunca debita
  if (isOwner(userId)) return true;

  const result = await database.query(
    'UPDATE api_balances SET requests_remaining = requests_remaining - ? WHERE user_id = ? AND requests_remaining >= ?',
    [cost, userId, cost]
  );
  return result.affectedRows > 0;
}

async function addRequests(userId, amount) {
  await ensureTables();
  await database.query(
    `INSERT INTO api_balances (user_id, requests_remaining, monthly_quota, quota_reset_at)
     VALUES (?, ?, 0, NULL)
     ON DUPLICATE KEY UPDATE requests_remaining = requests_remaining + ?`,
    [userId, amount, amount]
  );
}

async function logUsage(userId, service, endpoint, cost, status = 'success') {
  try {
    await database.query(
      'INSERT INTO api_usage_logs (user_id, service, endpoint, cost, status) VALUES (?, ?, ?, ?, ?)',
      [userId, service, endpoint, cost, status]
    );
  } catch (e) {
    console.error('Erro ao logar uso da API:', e.message);
  }
}

async function getUsage(userId, limit = 50) {
  await ensureTables();
  return database.query(
    'SELECT service, endpoint, cost, status, created_at FROM api_usage_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, String(limit)]
  );
}

// Chama a Alauda API real
async function callAlauda(method, path, body = null, params = null) {
  const response = await axios({
    method,
    url: `${ALAUDA_API_URL}/api${path}`,
    data: body,
    params,
    headers: {
      'X-API-Key': ALAUDA_API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 60000
  });
  return response.data;
}

// Verifica se usuário tem plano suficiente
function hasPlanAccess(plan) {
  return (PLAN_RANK[plan] || 0) >= MIN_PLAN_RANK;
}

module.exports = {
  ALAUDA_API_URL,
  OWNER_ID,
  isOwner,
  COSTS,
  ALLOWED_SERVICES,
  MIN_PLAN_RANK,
  MONTHLY_QUOTA,
  ensureTables,
  ensureBalance,
  getBalance,
  consume,
  addRequests,
  logUsage,
  getUsage,
  callAlauda,
  hasPlanAccess,
};
