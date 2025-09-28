// migrations/add_whatsapp_verification.js
const database = require('../models/database');

async function up() {
  try {
    console.log('🔧 Executando migração: Adicionar verificação via WhatsApp...');

    // Adicionar campos para WhatsApp na tabela users
    await database.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS country_code VARCHAR(5),
      ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS whatsapp_verification_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS whatsapp_verification_expires TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS preferred_verification_method ENUM('email', 'whatsapp') DEFAULT 'email'
    `);

    console.log('✅ Campos de WhatsApp adicionados à tabela users');

    // Verificar se os campos foram adicionados corretamente
    const result = await database.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('phone', 'country_code', 'whatsapp_verified', 'whatsapp_verification_code', 'whatsapp_verification_expires', 'preferred_verification_method')
    `);

    console.log('✅ Campos confirmados:', result.map(r => r.COLUMN_NAME));
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