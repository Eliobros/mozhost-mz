// migrations/fix_domain_payments.js
// Corrige a tabela domain_payments para suportar transferências:
//  1. Adiciona a coluna auth_code (EPP code da transferência para dentro)
//  2. Inclui 'transfer' no ENUM de action
const database = require('../models/database');

async function fixDomainPayments() {
  try {
    console.log('🔧 Verificando tabela domain_payments (auth_code + action transfer)...');

    // 1. Coluna auth_code
    try {
      await database.query('ALTER TABLE domain_payments ADD COLUMN auth_code VARCHAR(255) NULL');
      console.log('✅ Coluna auth_code adicionada em domain_payments');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ Coluna auth_code já existe');
      } else {
        console.log(`ℹ️ Coluna auth_code: ${e.message}`);
      }
    }

    // 2. ENUM action com 'transfer'
    try {
      await database.query(`
        ALTER TABLE domain_payments
        MODIFY COLUMN action ENUM('buy', 'renew', 'transfer') NOT NULL
      `);
      console.log('✅ ENUM action atualizado (buy, renew, transfer)');
    } catch (e) {
      console.log(`ℹ️ ENUM action: ${e.message}`);
    }

    // 3. Índice auxiliar para buscas por domínio (usado em transfer out / status)
    try {
      await database.query(`
        ALTER TABLE domain_payments ADD INDEX idx_dompay_domain (domain)
      `);
      console.log('✅ Índice idx_dompay_domain criado');
    } catch (e) {
      console.log('ℹ️ Índice idx_dompay_domain já existe ou não aplicável');
    }

    // Verificação final
    const cols = await database.query("SHOW COLUMNS FROM domain_payments LIKE 'auth_code'");
    const actionCol = await database.query("SHOW COLUMNS FROM domain_payments LIKE 'action'");
    console.log('📋 auth_code:', cols[0] || 'AUSENTE');
    console.log('📋 action:', actionCol[0]?.Type || 'AUSENTE');

  } catch (error) {
    console.error('❌ Erro ao corrigir domain_payments:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixDomainPayments()
    .then(() => {
      console.log('🎉 Migração domain_payments concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na migração:', error);
      process.exit(1);
    });
}

module.exports = { fixDomainPayments };
