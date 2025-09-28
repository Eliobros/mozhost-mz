// migrations/add_whatsapp_verification.js
const database = require('../models/database');

async function up() {
  try {
    console.log('🔧 Executando migração: Adicionar verificação via WhatsApp...');

    // Verificar quais campos já existem
    const existingColumns = await database.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('phone', 'country_code', 'whatsapp_verified', 'whatsapp_verification_code', 'whatsapp_verification_expires', 'preferred_verification_method')
    `);

    const existing = existingColumns.map(r => r.COLUMN_NAME);
    console.log('🔍 Campos existentes:', existing);

    // Adicionar campos que não existem
    const fieldsToAdd = [
      { name: 'phone', sql: 'ADD COLUMN phone VARCHAR(20)' },
      { name: 'country_code', sql: 'ADD COLUMN country_code VARCHAR(5)' },
      { name: 'whatsapp_verified', sql: 'ADD COLUMN whatsapp_verified BOOLEAN DEFAULT false' },
      { name: 'whatsapp_verification_code', sql: 'ADD COLUMN whatsapp_verification_code VARCHAR(10)' },
      { name: 'whatsapp_verification_expires', sql: 'ADD COLUMN whatsapp_verification_expires TIMESTAMP NULL' },
      { name: 'preferred_verification_method', sql: "ADD COLUMN preferred_verification_method ENUM('email', 'whatsapp') DEFAULT 'email'" }
    ];

    for (const field of fieldsToAdd) {
      if (!existing.includes(field.name)) {
        try {
          await database.query(`ALTER TABLE users ${field.sql}`);
          console.log(`✅ Campo '${field.name}' adicionado`);
        } catch (error) {
          console.log(`⚠️  Campo '${field.name}' pode já existir:`, error.message);
        }
      } else {
        console.log(`ℹ️  Campo '${field.name}' já existe`);
      }
    }

    // Verificar campos finais
    const finalResult = await database.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('phone', 'country_code', 'whatsapp_verified', 'whatsapp_verification_code', 'whatsapp_verification_expires', 'preferred_verification_method')
    `);

    console.log('✅ Campos confirmados:', finalResult.map(r => r.COLUMN_NAME));
    console.log('✅ Migração concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('🔧 Revertendo migração: Remover verificação via WhatsApp...');

    await database.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS phone,
      DROP COLUMN IF EXISTS country_code,
      DROP COLUMN IF EXISTS whatsapp_verified,
      DROP COLUMN IF EXISTS whatsapp_verification_code,
      DROP COLUMN IF EXISTS whatsapp_verification_expires,
      DROP COLUMN IF EXISTS preferred_verification_method
    `);

    console.log('✅ Migração revertida com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao reverter migração:', error);
    throw error;
  }
}

module.exports = { up, down };