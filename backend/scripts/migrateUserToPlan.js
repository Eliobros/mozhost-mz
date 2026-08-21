#!/usr/bin/env node
/**
 * scripts/migrateUserToPlan.js
 * ============================================================
 * Parte 4 — Conversão de um cliente para um plano pago mensal.
 *
 * Cria um registro de billing ATIVO por 30 dias e aplica os limites
 * do plano no usuário (e reativa a conta se estiver suspensa).
 *
 * Uso:
 *   node scripts/migrateUserToPlan.js <username|email> <starter|basic|pro|business>
 *
 * Exemplo:
 *   node scripts/migrateUserToPlan.js joao starter
 *
 * Depois de rodar, o plano fica ativo por 30 dias. Para renovar, basta
 * rodar de novo (ou o cliente paga pela tela de billing normalmente).
 * ============================================================
 */
require('dotenv').config();
const database = require('../models/database');

const PLANS = {
  starter: { name: 'Starter', max_containers: 3, max_ram_mb: 512,  max_storage_mb: 2048 },
  basic:   { name: 'Basic',   max_containers: 5, max_ram_mb: 1024, max_storage_mb: 5120 },
  pro:     { name: 'Pro',     max_containers: 10, max_ram_mb: 2048, max_storage_mb: 10240 },
  business:{ name: 'Business',max_containers: 25, max_ram_mb: 4096, max_storage_mb: 25600 }
};

async function main() {
  const [identifier, planId] = process.argv.slice(2);

  if (!identifier || !PLANS[planId]) {
    console.log(`
❌ Uso: node scripts/migrateUserToPlan.js <username|email> <plano>
   Planos: ${Object.keys(PLANS).join(', ')}
`);
    process.exit(1);
  }

  const users = await database.query(
    'SELECT id, username, email, plan, suspended_at FROM users WHERE username = ? OR email = ?',
    [identifier, identifier]
  );

  if (!users.length) {
    console.log(`❌ Usuário "${identifier}" não encontrado.`);
    process.exit(1);
  }

  const user = users[0];
  const plan = PLANS[planId];
  const referenceCode = `MIG${Date.now()}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Billing ativo por 30 dias
  await database.query(
    `INSERT INTO billing (user_id, plan_id, amount, currency, method, reference_code, status, activated_at, expires_at, created_at)
     VALUES (?, ?, 0, 'MZN', 'manual', ?, 'active', NOW(), ?, NOW())`,
    [user.id, planId, referenceCode, expiresAt]
  );

  // Aplicar limites do plano e reativar conta
  await database.query(
    `UPDATE users SET plan = ?, max_containers = ?, max_ram_mb = ?, max_storage_mb = ?, suspended_at = NULL WHERE id = ?`,
    [planId, plan.max_containers, plan.max_ram_mb, plan.max_storage_mb, user.id]
  );

  console.log(`
✅ Cliente migrado com sucesso!
   Usuário:  ${user.username} (${user.email})
   Plano:    ${plan.name} (${planId})
   Limites:  ${plan.max_containers} containers | ${plan.max_ram_mb}MB RAM | ${plan.max_storage_mb}MB storage
   Vigência: 30 dias (até ${expiresAt.toLocaleDateString('pt-MZ')})
   Conta ${user.suspended_at ? 'REATIVADA (estava suspensa)' : 'já estava ativa'}.
`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
