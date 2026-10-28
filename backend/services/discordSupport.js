// services/discordSupport.js
// Avisa a equipe de suporte num canal do Discord via webhook (sem bot).
//
// .env necessário:
//   DISCORD_SUPPORT_WEBHOOK=   (URL do webhook do canal; trate como senha)
//
// Requer Node 18+ (fetch global).

const WEBHOOK_URL = process.env.DISCORD_SUPPORT_WEBHOOK;

function isConfigured() {
  return Boolean(WEBHOOK_URL);
}

/**
 * `content` é o corpo já formatado pelo supportBridge (id, e-mail, motivo,
 * mensagem) — igual ao que vai na DM do agente, mas sem botões (webhook não
 * interage), por isso o rodapé manda para o painel.
 */
async function notifyTicket({ content }) {
  if (!isConfigured()) {
    console.warn('⚠️ DISCORD_SUPPORT_WEBHOOK não configurado — ticket não avisado');
    return false;
  }

  const body = `${content || '🎫 Novo ticket de suporte'}\n\n✅ Aceite pelo painel do MozHost.`;

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: body.slice(0, 1900),
        allowed_mentions: { parse: [] }, // impede @everyone/@here vindos do texto do usuário
      }),
    });
    if (!res.ok) {
      console.error('❌ Discord webhook falhou:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('❌ Erro ao avisar o Discord:', err.message);
    return false;
  }
}

module.exports = { isConfigured, notifyTicket };
