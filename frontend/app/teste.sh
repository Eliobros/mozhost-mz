#!/bin/bash

echo "🧪 Testando Editor de Código MozHost..."

# 1. Obter token
echo "🔑 Obtendo token de autenticação..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "admin", "password": "Eliobrostech33@@"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Erro ao obter token. Verifique se o backend está rodando e se o usuário admin existe."
    exit 1
fi

echo "✅ Token obtido: ${TOKEN:0:20}..."

# 2. Verificar containers existentes
echo "📦 Verificando containers existentes..."
CONTAINERS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/containers)
CONTAINER_COUNT=$(echo "$CONTAINERS" | grep -o '"total":[0-9]*' | cut -d':' -f2)

echo "📊 Containers existentes: $CONTAINER_COUNT"

# 3. Criar container de exemplo se não existir
if [ "$CONTAINER_COUNT" -eq 0 ]; then
    echo "🏗️  Criando container de exemplo..."
    CREATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/containers \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "editor-test-bot", 
        "type": "nodejs"
      }')
    
    if echo "$CREATE_RESPONSE" | grep -q "successfully"; then
        echo "✅ Container 'editor-test-bot' criado com sucesso!"
    else
        echo "❌ Erro ao criar container:"
        echo "$CREATE_RESPONSE"
    fi
else
    echo "✅ Usando containers existentes"
fi

# 4. Listar containers e pegar o primeiro ID
echo "📋 Listando containers para teste..."
CONTAINER_INFO=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/containers)
FIRST_CONTAINER_ID=$(echo "$CONTAINER_INFO" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$FIRST_CONTAINER_ID" ]; then
    echo "❌ Nenhum container encontrado para teste"
    exit 1
fi

echo "🎯 Usando container ID: $FIRST_CONTAINER_ID"

# 5. Testar API de arquivos
echo "📁 Testando listagem de arquivos..."
FILES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/files/$FIRST_CONTAINER_ID")

if echo "$FILES_RESPONSE" | grep -q "items"; then
    echo "✅ API de arquivos funcionando"
    FILE_COUNT=$(echo "$FILES_RESPONSE" | grep -o '"name"' | wc -l)
    echo "📄 Arquivos encontrados: $FILE_COUNT"
else
    echo "❌ Erro na API de arquivos:"
    echo "$FILES_RESPONSE"
fi

# 6. Criar arquivo de teste
echo "📝 Criando arquivo de teste..."
TEST_FILE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/files/$FIRST_CONTAINER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "test-editor.js",
    "type": "file",
    "content": "// Teste do Editor MozHost\nconsole.log(\"Hello from Monaco Editor! 🚀\");\n\n// Este arquivo foi criado pelo script de teste\nconst message = \"MozHost Editor funcionando perfeitamente!\";\nconsole.log(message);"
  }')

if echo "$TEST_FILE_RESPONSE" | grep -q "successfully"; then
    echo "✅ Arquivo de teste criado: test-editor.js"
else
    echo "ℹ️  Arquivo pode já existir"
fi

# 7. Criar arquivo Python de teste
echo "🐍 Criando arquivo Python de teste..."
curl -s -X POST http://localhost:3001/api/files/$FIRST_CONTAINER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "test-bot.py",
    "type": "file",
    "content": "# Bot de exemplo MozHost\nprint(\"🤖 Bot iniciado!\")\n\nclass MozBot:\n    def __init__(self):\n        self.name = \"MozHost Bot\"\n        self.status = \"online\"\n    \n    def send_message(self, message):\n        print(f\"📤 Enviando: {message}\")\n        return True\n\nif __name__ == \"__main__\":\n    bot = MozBot()\n    bot.send_message(\"Hello World from MozHost! 🚀\")"
  }' > /dev/null

# 8. Criar arquivo JSON de teste
echo "📋 Criando arquivo de configuração..."
curl -s -X POST http://localhost:3001/api/files/$FIRST_CONTAINER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "config.json",
    "type": "file",
    "content": "{\n  \"botName\": \"MozHost Test Bot\",\n  \"version\": \"1.0.0\",\n  \"author\": \"MozHost User\",\n  \"features\": [\n    \"Monaco Editor\",\n    \"Syntax Highlighting\", \n    \"Auto-completion\",\n    \"File Explorer\"\n  ],\n  \"settings\": {\n    \"autoSave\": true,\n    \"theme\": \"vs-dark\",\n    \"fontSize\": 14\n  }\n}"
  }' > /dev/null

# 9. Testar leitura de arquivo
echo "📖 Testando leitura de arquivo..."
FILE_CONTENT=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/files/$FIRST_CONTAINER_ID?path=test-editor.js")

if echo "$FILE_CONTENT" | grep -q "Monaco Editor"; then
    echo "✅ Leitura de arquivo funcionando"
else
    echo "❌ Erro na leitura de arquivo"
fi

echo ""
echo "🎉 Teste do Editor concluído!"
echo ""
echo "📱 Acesse o Editor:"
echo "🌐 URL: http://localhost:3000#files"
echo "🔑 Login: admin / 123456"
echo "📦 Container: editor-test-bot (ou similar)"
echo ""
echo "📂 Arquivos criados para teste:"
echo "  📄 test-editor.js (JavaScript)"
echo "  🐍 test-bot.py (Python)" 
echo "  📋 config.json (JSON)"
echo "  📝 index.js (padrão)"
echo "  📦 package.json (padrão)"
echo ""
echo "🧪 Teste estes recursos no editor:"
echo "  ✅ Abrir diferentes tipos de arquivo"
echo "  ✅ Editar com syntax highlighting"
echo "  ✅ Salvar alterações (Ctrl+S)"
echo "  ✅ Criar novos arquivos/pastas"
echo "  ✅ Navegar pelo explorador"
echo "  ✅ Trocar tema (claro/escuro)"
echo "  ✅ Auto-complete e IntelliSense"
echo ""
echo "🔥 Recursos avançados:"
echo "  🔍 Ctrl+F - Buscar no arquivo"
echo "  🔄 Ctrl+H - Buscar e substituir"
echo "  📏 Alt+Up/Down - Mover linhas"
echo "  📋 Shift+Alt+Up/Down - Duplicar linha"
echo "  💬 Ctrl+/ - Comentar/descomentar"
