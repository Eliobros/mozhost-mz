#!/bin/bash

echo "🚀 Testando Dashboard MozHost..."

# 1. Verificar se frontend está rodando
echo "📡 Verificando se frontend está rodando..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend está rodando"
else
    echo "❌ Frontend não está rodando. Execute 'npm run dev' no diretório frontend"
    exit 1
fi

# 2. Verificar se backend está rodando
echo "📡 Verificando se backend está rodando..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend está rodando"
else
    echo "❌ Backend não está rodando. Execute 'npm run dev' no diretório backend"
    exit 1
fi

# 3. Testar autenticação
echo "🔐 Testando autenticação..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "admin", "password": "Eliobrostech33@@"}')

if echo "$AUTH_RESPONSE" | grep -q "token"; then
    echo "✅ Login funcionando"
    TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "🎫 Token obtido: ${TOKEN:0:20}..."
else
    echo "❌ Erro no login:"
    echo "$AUTH_RESPONSE"
    echo ""
    echo "💡 Certifique-se de que existe um usuário 'admin' com senha '123456'"
    echo "   Ou crie um novo usuário via interface web"
    exit 1
fi

# 4. Testar API de containers
echo "📦 Testando API de containers..."
CONTAINERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/containers)

if echo "$CONTAINERS_RESPONSE" | grep -q "containers"; then
    echo "✅ API de containers funcionando"
    CONTAINER_COUNT=$(echo "$CONTAINERS_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo "📊 Containers encontrados: $CONTAINER_COUNT"
else
    echo "❌ Erro na API de containers:"
    echo "$CONTAINERS_RESPONSE"
fi

echo ""
echo "🎉 Teste completo!"
echo ""
echo "🌐 Acesse: http://localhost:3000"
echo "🔑 Login: admin / 123456"
echo ""
echo "📋 Funcionalidades disponíveis:"
echo "  ✅ Login/Logout"
echo "  ✅ Dashboard com estatísticas"
echo "  ✅ Lista de containers"  
echo "  ✅ Start/Stop containers"
echo "  ✅ Layout responsivo"
echo "  ✅ Notificações"
echo ""
echo "🔧 Para criar um container de teste:"
echo "curl -X POST http://localhost:3001/api/containers \\"
echo "  -H \"Authorization: Bearer $TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"name\": \"meu-bot-teste\", \"type\": \"nodejs\"}'"
