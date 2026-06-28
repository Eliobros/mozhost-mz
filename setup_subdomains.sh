#!/bin/bash

echo "🌐 Configurando Sistema de Subdomínios MozHost"
echo "=============================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Verificar se Nginx está instalado
echo -e "${BLUE}📋 Verificando dependências...${NC}"
if ! command_exists nginx; then
    echo -e "${YELLOW}⚠️  Nginx não encontrado. Instalando...${NC}"
    sudo apt update
    sudo apt install -y nginx
else
    echo -e "${GREEN}✅ Nginx já instalado${NC}"
fi

# 2. Instalar dependência do proxy
echo -e "${BLUE}📦 Instalando dependências do Node.js...${NC}"
cd /workspace/backend
npm install http-proxy-middleware

# 3. Configurar Nginx
echo -e "${BLUE}🔧 Configurando Nginx...${NC}"
sudo cp /workspace/nginx_subdomain_config.conf /etc/nginx/sites-available/mozhost-subdomains

# Habilitar o site
sudo ln -sf /etc/nginx/sites-available/mozhost-subdomains /etc/nginx/sites-enabled/

# Remover configuração default se existir
sudo rm -f /etc/nginx/sites-enabled/default

# 4. Testar configuração do Nginx
echo -e "${BLUE}🧪 Testando configuração do Nginx...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Configuração do Nginx válida${NC}"
    
    # Reiniciar Nginx
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx recarregado${NC}"
else
    echo -e "${RED}❌ Erro na configuração do Nginx${NC}"
    echo "Verifique o arquivo de configuração"
    exit 1
fi

# 5. Verificar se as portas estão abertas
echo -e "${BLUE}🔍 Verificando portas...${NC}"
if sudo netstat -tlnp | grep -q ":80 "; then
    echo -e "${GREEN}✅ Porta 80 aberta${NC}"
else
    echo -e "${YELLOW}⚠️  Porta 80 não está sendo usada${NC}"
fi

if sudo netstat -tlnp | grep -q ":443 "; then
    echo -e "${GREEN}✅ Porta 443 aberta${NC}"
else
    echo -e "${YELLOW}ℹ️  Porta 443 não está sendo usada (SSL não configurado ainda)${NC}"
fi

# 6. Configurar firewall se necessário
echo -e "${BLUE}🔥 Configurando firewall...${NC}"
if command_exists ufw; then
    sudo ufw allow 'Nginx Full'
    echo -e "${GREEN}✅ Firewall configurado para Nginx${NC}"
fi

# 7. Criar logs do Nginx
sudo mkdir -p /var/log/nginx
sudo touch /var/log/nginx/containers_access.log
sudo touch /var/log/nginx/containers_error.log
sudo chown www-data:www-data /var/log/nginx/containers_*.log

echo ""
echo -e "${GREEN}🎉 Configuração concluída!${NC}"
echo ""
echo -e "${YELLOW}📋 Próximos passos:${NC}"
echo "1. Configure o DNS wildcard no seu provedor:"
echo "   - Adicione registro CNAME: *.mozhost -> mozhost.shop"
echo "   - Adicione registro A: mozhost -> SEU_IP_SERVIDOR"
echo ""
echo "2. Reinicie o backend MozHost:"
echo "   cd /workspace/backend && npm start"
echo ""
echo "3. Teste criando um container e acessando:"
echo "   http://usuario-container.mozhost.shop"
echo ""
echo -e "${BLUE}💡 Para configurar SSL (HTTPS):${NC}"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d mozhost.shop -d *.mozhost.shop"
echo ""
echo -e "${GREEN}✨ Sistema de subdomínios pronto para uso!${NC}"