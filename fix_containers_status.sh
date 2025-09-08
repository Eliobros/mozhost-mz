#!/bin/bash

echo "🔧 Corrigindo problema do ENUM status na tabela containers..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se o arquivo .env existe
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ Arquivo backend/.env não encontrado!${NC}"
    echo "Por favor, configure suas credenciais do banco de dados."
    exit 1
fi

echo -e "${YELLOW}📋 Executando migração do banco de dados...${NC}"

# Executar o script de migração
cd /workspace
node run_migration.js

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Migração concluída com sucesso!${NC}"
    echo ""
    echo -e "${YELLOW}🚀 Agora você pode:${NC}"
    echo "1. Reiniciar o backend: cd backend && npm start"
    echo "2. Testar a criação/start de containers"
    echo ""
    echo -e "${GREEN}🎉 O problema do ENUM 'error' foi corrigido!${NC}"
else
    echo ""
    echo -e "${RED}❌ Erro na migração. Verifique as configurações do banco.${NC}"
    exit 1
fi