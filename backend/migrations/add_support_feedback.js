// migrations/add_support_feedback.js
// Adiciona colunas de avaliação e feedback em support_tickets.
//
// Colunas adicionadas:
//   - rating            : nota de 1 a 5 estrelas que o utilizador deixou
//   - feedback_text     : mensagem livre com o que o utilizador achou
//   - feedback_summary  : resumo curto gerado pela IA para o agente
//   - feedback_sentiment: classificação do sentimento (muito_positivo .. muito_negativo)
//   - feedback_at       : timestamp da avaliação

const database = require('../models/database');

async function up() {
  try {
    console.log('🔧 Migração: adicionar colunas de avaliação em support_tickets...');

    const existing = await database.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'support_tickets'
        AND COLUMN_NAME IN (
          'rating',
          'feedback_text',
          'feedback_summary',
          'feedback_sentiment',
          'feedback_at'
        )
    `);
    const has = new Set(existing.map(c => c.COLUMN_NAME));
    console.log('🔍 Colunas já existentes:', [...has]);

    const want = [
      { name: 'rating',            sql: 'ADD COLUMN rating TINYINT NULL' },
      { name: 'feedback_text',     sql: 'ADD COLUMN feedback_text TEXT NULL' },
      { name: 'feedback_summary',  sql: 'ADD COLUMN feedback_summary VARCHAR(500) NULL' },
      { name: 'feedback_sentiment',sql: "ADD COLUMN feedback_sentiment ENUM('muito_positivo','positivo','neutro','negativo','muito_negativo') NULL" },
      { name: 'feedback_at',       sql: 'ADD COLUMN feedback_at TIMESTAMP NULL' },
    ];

    for (const col of want) {
      if (has.has(col.name)) {
        console.log(`ℹ️  Coluna '${col.name}' já existe, pulando.`);
        continue;
      }
      try {
        await database.query(`ALTER TABLE support_tickets ${col.sql}`);
        console.log(`✅ Coluna '${col.name}' adicionada`);
      } catch (e) {
        console.warn(`⚠️  Falha ao adicionar '${col.name}':`, e.message);
        throw e;
      }
    }

    console.log('✅ Migração add_support_feedback concluída!');
  } catch (err) {
    console.error('❌ Erro na migração add_support_feedback:', err.message);
    throw err;
  }
}

async function down() {
  try {
    console.log('🔧 Revertendo migração add_support_feedback...');
    await database.query(`
      ALTER TABLE support_tickets
        DROP COLUMN IF EXISTS rating,
        DROP COLUMN IF EXISTS feedback_text,
        DROP COLUMN IF EXISTS feedback_summary,
        DROP COLUMN IF EXISTS feedback_sentiment,
        DROP COLUMN IF EXISTS feedback_at
    `);
    console.log('✅ Migração revertida!');
  } catch (err) {
    console.error('❌ Erro ao reverter:', err.message);
    throw err;
  }
}

// Permite rodar standalone: `node backend/migrations/add_support_feedback.js`
if (require.main === module) {
  up()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('💥 Falha:', e);
      process.exit(1);
    });
}

module.exports = { up, down };
