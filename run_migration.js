#!/usr/bin/env node
// Script para executar a migração do banco de dados
require('dotenv').config({ path: './backend/.env' });

const { fixContainersStatusEnum } = require('./backend/migrations/fix_containers_status');

async function main() {
  console.log('🚀 Iniciando migração do banco de dados...');
  console.log('📋 Configurações:');
  console.log(`  - Host: ${process.env.DB_HOST}`);
  console.log(`  - Database: ${process.env.DB_NAME}`);
  console.log(`  - User: ${process.env.DB_USER}`);
  
  try {
    await fixContainersStatusEnum();
    console.log('✅ Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  }
}

main();