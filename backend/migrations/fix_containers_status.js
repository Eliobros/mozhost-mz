// migrations/fix_containers_status.js
const database = require('../models/database');

async function fixContainersStatusEnum() {
  try {
    console.log('🔧 Verificando e corrigindo ENUM status da tabela containers...');
    
    // Verificar estrutura atual
    const columns = await database.query("SHOW COLUMNS FROM containers LIKE 'status'");
    console.log('📋 Estrutura atual:', columns[0]);
    
    // Corrigir o ENUM para incluir todos os valores necessários
    await database.query(`
      ALTER TABLE containers 
      MODIFY COLUMN status ENUM('stopped', 'running', 'error', 'building') 
      DEFAULT 'stopped'
    `);
    
    console.log('✅ ENUM status corrigido com sucesso!');
    
    // Verificar se foi aplicado
    const updatedColumns = await database.query("SHOW COLUMNS FROM containers LIKE 'status'");
    console.log('📋 Nova estrutura:', updatedColumns[0]);
    
    // Verificar containers existentes
    const containers = await database.query('SELECT id, name, status FROM containers');
    console.log(`📦 Containers existentes: ${containers.length}`);
    containers.forEach(c => {
      console.log(`  - ${c.name}: ${c.status}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao corrigir estrutura:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixContainersStatusEnum()
    .then(() => {
      console.log('🎉 Migração concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na migração:', error);
      process.exit(1);
    });
}

module.exports = { fixContainersStatusEnum };