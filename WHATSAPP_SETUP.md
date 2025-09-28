# 📱 Configuração do WhatsApp com Baileys

## Visão Geral

Este sistema agora suporta verificação de conta via WhatsApp além do email tradicional. O usuário pode escolher como quer receber o código de verificação:

- **E-mail**: Usa o e-mail cadastrado (método padrão)
- **WhatsApp**: Permite informar um número de WhatsApp para receber o código

## Funcionalidades Implementadas

### Backend
✅ Campos de telefone adicionados na tabela `users`
✅ Integração com Baileys para WhatsApp Web
✅ Endpoints de verificação via WhatsApp
✅ Seleção de método de verificação preferido
✅ Códigos de verificação independentes (email e WhatsApp)

### Frontend  
✅ Seletor de método de verificação (Email/WhatsApp)
✅ Seletor de país com bandeiras e códigos
✅ Campo para número de WhatsApp
✅ Interface adaptada para ambos os métodos
✅ Mensagens dinâmicas baseadas no método escolhido

## Configuração

### 1. Dependências
As seguintes dependências foram adicionadas:
```bash
npm install @whiskeysockets/baileys qrcode-terminal axios
```

### 2. Primeiro Uso do WhatsApp

Quando você iniciar o servidor pela primeira vez, será exibido um QR Code no terminal:

```bash
npm start
```

No terminal você verá:
```
📱 QR Code para WhatsApp:
[QR CODE ASCII ART]

🔗 Escaneie o QR Code acima com seu WhatsApp para conectar
```

**Como conectar:**
1. Abra o WhatsApp no seu celular
2. Vá em "Dispositivos Conectados" ou "WhatsApp Web"
3. Escaneie o QR Code que aparece no terminal
4. O WhatsApp será conectado e funcionará automaticamente

### 3. Estrutura de Arquivos

```
backend/
├── utils/
│   ├── email.js          # Utilitário para envio de emails
│   └── whatsapp.js       # Utilitário para WhatsApp com Baileys
├── migrations/
│   └── add_whatsapp_verification.js  # Migração do banco
└── .auth/
    └── whatsapp/         # Dados de autenticação do WhatsApp (criado automaticamente)
```

### 4. Variáveis de Ambiente

Adicione ao seu `.env` (opcional):
```env
# Email (Brevo)
BREVO_API_KEY=sua_chave_brevo
FROM_EMAIL=noreply@seudominio.com
FROM_NAME=MozHost

# Códigos de verificação
EMAIL_CODE_TTL_MIN=15
RESET_TTL_MIN=15
```

## Como Usar

### Para o Usuário Final

1. **Registro**: 
   - Escolha entre "E-mail" ou "WhatsApp" para receber o código
   - Se escolher WhatsApp, selecione o país e digite o número
   - Se escolher Email, usará o e-mail cadastrado

2. **Verificação**:
   - Digite o código recebido via WhatsApp ou email
   - Código válido por 15 minutos
   - Possível reenviar código

### Para o Desenvolvedor

#### Endpoints Disponíveis

```javascript
// Registro com método de verificação
POST /api/auth/register
{
  "username": "usuario",
  "email": "email@exemplo.com", 
  "password": "senha123",
  "phone": "11999999999",           // opcional
  "countryCode": "+55",             // opcional  
  "preferredVerificationMethod": "whatsapp" // email|whatsapp
}

// Verificar código do WhatsApp
POST /api/auth/verify-whatsapp
Headers: Authorization: Bearer token
{
  "code": "123456"
}

// Reenviar código (dinâmico)
POST /api/auth/resend-code  
Headers: Authorization: Bearer token
{
  "method": "whatsapp" // email|whatsapp
}

// Status da conexão WhatsApp
GET /api/auth/whatsapp-status
Headers: Authorization: Bearer token
```

#### Estrutura do Usuário

```javascript
{
  "id": 1,
  "username": "usuario",
  "email": "email@exemplo.com",
  "phone": "11999999999",
  "countryCode": "+55", 
  "emailVerified": true,
  "whatsappVerified": false,
  "preferredVerificationMethod": "whatsapp"
}
```

## Fluxo de Verificação

### Registro via Email (Padrão)
1. Usuário preenche dados básicos
2. Sistema envia código por email
3. Usuário insere código na interface
4. Conta verificada

### Registro via WhatsApp  
1. Usuário escolhe "WhatsApp"
2. Seleciona país e informa número
3. Sistema envia código via WhatsApp Web
4. Usuário insere código na interface  
5. Conta verificada

## Troubleshooting

### WhatsApp não conecta
- Verifique se o QR Code foi escaneado corretamente
- Certifique-se de que o WhatsApp Web está ativo no seu celular
- Se perder a conexão, o sistema tentará reconectar automaticamente

### Códigos não chegam
- **Email**: Verifique configuração do BREVO_API_KEY
- **WhatsApp**: Verifique se o WhatsApp está conectado via `/api/auth/whatsapp-status`

### Banco de Dados
Se os campos não foram criados, execute manualmente:
```bash
node migrations/add_whatsapp_verification.js
```

## Segurança

- Números de telefone são validados
- Códigos expiram em 15 minutos
- Cada método tem seu próprio código de verificação
- Baileys usa WhatsApp Web oficial (mais seguro que APIs não oficiais)
- Dados de autenticação WhatsApp são criptografados

## Próximos Passos

- [ ] Adicionar rate limiting específico para WhatsApp
- [ ] Implementar webhook para status de entrega
- [ ] Adicionar suporte a templates de mensagem
- [ ] Dashboard administrativo para gerenciar conexão WhatsApp