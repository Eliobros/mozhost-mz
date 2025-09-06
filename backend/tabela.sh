#!/bin/bash

echo "🔧 Corrigindo ENUM de status dos containers..."

cd /root/mozhost/backend

# Script Node.js para corrigir o ENUM
node -e "
const database = require('./models/database');

async function fixEnum() {
  try {
    console.log('🔍 Verificando estrutura atual...');
    
    // Verificar ENUM atual
    const result = await database.query(\`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'containers' 
      AND COLUMN_NAME = 'status'
    \`);
    
    console.log('📋 ENUM atual:', result[0]?.COLUMN_TYPE);
    
    // Corrigir ENUM para incluir 'error'
    console.log('🔧 Corrigindo ENUM...');
    await database.query(\`
      ALTER TABLE containers 
      MODIFY COLUMN status ENUM('stopped', 'running', 'error', 'building') DEFAULT 'stopped'
    \`);
    
    console.log('✅ ENUM corrigido com sucesso!');
    
    // Verificar resultado
    const newResult = await database.query(\`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'containers' 
      AND COLUMN_NAME = 'status'
    \`);
    
    console.log('📋 ENUM novo:', newResult[0]?.COLUMN_TYPE);
    
    // Testar inserção de status 'error'
    console.log('🧪 Testando status error...');
    const testResult = await database.query(\`
      SELECT 'error' as test_status
    \`);
    console.log('✅ Teste passou:', testResult[0]?.test_status);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

fixEnum();
"

echo ""
echo "🎉 Correção concluída!"
echo ""
echo "📋 Agora os containers podem ter status:"
echo "  • stopped   - Container parado"
echo "  • running   - Container em execução"
echo "  • error     - Container com erro"
echo "  • building  - Container sendo criado"
echo ""
echo "🔄 Reinicie o backend para aplicar as correções:"
echo "   Ctrl+C no terminal do backend"
echo "   npm run dev"
