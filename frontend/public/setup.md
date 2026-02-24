# 🔔 Push Notifications — Guia de Setup

## 1. Instalar dependência no backend

```bash
npm install web-push
```

---

## 2. Gerar VAPID Keys (fazer UMA VEZ só!)

```bash
node -e "const wp=require('web-push'); console.log(wp.generateVAPIDKeys())"
```

Vai aparecer algo assim:
```
{ publicKey: 'BNx...', privateKey: 'abc...' }
```

Copie e cole no seu `.env`:

```env
VAPID_PUBLIC_KEY=BNx...
VAPID_PRIVATE_KEY=abc...
VAPID_EMAIL=suporte@mozhost.com
```

⚠️ NUNCA mude essas chaves depois — todas as subscriptions existentes vão parar de funcionar.

---

## 3. Criar tabela no banco de dados

```sql
CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Registrar as rotas no Express

```js
// app.js ou server.js
const pushRoutes = require('./routes/push');
app.use('/api/push', pushRoutes);
```

---

## 5. Colocar o sw.js na pasta public do Next.js

```
/public/sw.js  ✅ (já está aqui neste pacote)
```

O Next.js serve arquivos da pasta `/public` automaticamente em `/sw.js`.

---

## 6. Adicionar botão de ativar push no seu componente

No `NotificationsSystem.jsx`, adicione um botão visível para o usuário clicar:

```jsx
// Dentro do Header do modal, ao lado de "Marcar todas como lidas"
{!pushEnabled && Notification.permission !== 'denied' && (
  <button
    onClick={requestNotificationPermission}
    className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
  >
    🔔 Ativar push
  </button>
)}
```

**Por quê?** O browser exige que a permissão seja pedida por um clique direto do usuário.
Se chamar via `useEffect` automático, muitos browsers bloqueiam silenciosamente.

---

## 7. Enviar push quando criar uma notificação no backend

```js
const { sendPushToUser } = require('./routes/push');

// Exemplo: ao criar container
await sendPushToUser(userId, {
  title: '🚀 Container iniciado!',
  message: 'Seu container web-01 está online.',
  url: '/dashboard/containers'
});

// Exemplo: cobrança
await sendPushToUser(userId, {
  title: '💳 Pagamento confirmado',
  message: 'Seu plano foi renovado com sucesso.',
  url: '/billing'
});
```

---

## Fluxo completo

```
Usuário clica "Ativar push"
  → Browser pede permissão
  → SW registrado em /sw.js
  → Subscription criada no browser
  → Subscription enviada para POST /api/push/subscribe
  → Salva no banco

Evento acontece no backend (container iniciado, cobrança, etc.)
  → sendPushToUser(userId, payload)
  → web-push envia para o browser via servidor Google/Mozilla
  → sw.js recebe evento 'push'
  → Mostra notificação nativa
  → Usuário clica → abre o app na URL correta
```

---

## Testando localmente

Push só funciona em **HTTPS** ou **localhost**. Para testar:
- Use `localhost` (funciona sem HTTPS)
- Ou use `ngrok` para expor sua porta local com HTTPS

```bash
npx ngrok http 3000
```