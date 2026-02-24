import  { sendPushToUser } from './routes/push.js'
;

await sendPushToUser(1, {
  title: '🚀 Teste de Push',
  message: 'Push notifications funcionando!',
  url: '/dashboard'
});
