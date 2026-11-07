// services/discordBot.js
// Canal Discord para os agentes de suporte (alternativa ao WhatsApp).
//
// Como funciona: o ID do utilizador Discord (17-20 dígitos) é cadastrado como
// "telefone" do agente em support_agents. Números de telefone têm no máximo
// 15 dígitos, então o supportBridge distingue os dois pelo tamanho.
//
// .env necessário:
//   DISCORD_BOT_TOKEN=
//   DISCORD_SUPPORT_CHANNEL=   (opcional — comandos como !encerrar também valem nele)
//
// Requer: npm install discord.js@14   (Node 18+)
// Portal do Developer → Bot → PRIVILEGED INTENTS → ligar MESSAGE CONTENT INTENT.
// Sem isso o Discord entrega message.content vazio e os comandos de texto
// (!aceitar / !encerrar / respostas) são ignorados sem erro nenhum.

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} = require('discord.js');

const TOKEN = process.env.DISCORD_BOT_TOKEN;

let client = null;
let ready = false;
let handler = null; // (ev) => Promise<boolean> — handleIncomingMessage do supportBridge

function isDiscordId(id) {
  return /^\d{17,20}$/.test(String(id || ''));
}

function setHandler(fn) {
  handler = fn;
}

function dispatch(ev) {
  if (!handler) return;
  Promise.resolve(handler(ev)).catch((err) =>
    console.error('❌ Erro ao processar msg do Discord:', err.message)
  );
}

function start() {
  if (client) return;
  if (!TOKEN) {
    console.warn('⚠️ DISCORD_BOT_TOKEN não configurado — canal Discord desligado');
    return;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages, // comandos no canal #support
      GatewayIntentBits.DirectMessages,
      // PRIVILEGIADO — sem ele o content vem vazio e o !encerrar morre
      // silencioso no `if (!text) return` (ver Portal do Developer).
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel], // necessário para receber DMs
  });

  client.once(Events.ClientReady, (c) => {
    ready = true;
    console.log(`✅ Discord bot conectado como ${c.user.tag}`);
  });

  // Toque nos botões Aceitar / Recusar
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (!/^(aceitar|recusar):\d+$/.test(interaction.customId)) return;

    try {
      await interaction.update({
        content: `${interaction.message.content}\n\n✔️ Resposta registrada: ${interaction.customId.split(':')[0]}`,
        components: [], // remove os botões para não clicar duas vezes
      });
    } catch (err) {
      console.warn('⚠️ Não foi possível atualizar a mensagem do botão:', err.message);
    }

    dispatch({
      id: interaction.id,
      from: interaction.user.id,
      name: interaction.user.username,
      type: 'button',
      text: null,
      payload: interaction.customId,
    });
  });

  // Mensagens do agente: DM (comandos e respostas ao utilizador) + canal
  // #support (o ticket é publicado lá com botões, por isso o !encerrar e as
  // respostas também têm de valer no canal).
  client.on(Events.MessageCreate, (message) => {
    if (message.author.bot) return;
    if (message.guild) {
      // Só o canal de suporte configurado — o resto do servidor é ignorado.
      // Quem não é agente é filtrado a seguir pelo supportBridge.
      const supportChannel = String(process.env.DISCORD_SUPPORT_CHANNEL || '').trim();
      if (!supportChannel || message.channelId !== supportChannel) return;
    }
    const text = (message.content || '').trim();
    if (!text) {
      // Content vazio = MESSAGE CONTENT INTENT desligado no Portal (o código
      // já o pede). Antes isto era um return silencioso que engolia o
      // !encerrar sem erro nenhum — agora fica no log.
      console.warn(
        '⚠️ Discord entregou mensagem sem texto — ligue MESSAGE CONTENT INTENT no Portal do Developer (Bot → Privileged Intents).'
      );
      return;
    }

    dispatch({
      id: message.id,
      from: message.author.id,
      name: message.author.username,
      type: 'text',
      text,
      payload: null,
    });
  });

  client.login(TOKEN).catch((err) => console.error('❌ Login do Discord falhou:', err.message));
}

/** Texto livre por DM. Devolve true/false (não lança erro). */
async function sendText(userId, text) {
  if (!client || !ready) {
    console.warn('⚠️ Discord bot ainda não está pronto — mensagem não enviada');
    return false;
  }
  try {
    const user = await client.users.fetch(userId);
    await user.send({
      content: String(text).slice(0, 2000),
      allowedMentions: { parse: [] },
    });
    return true;
  } catch (err) {
    console.error(`❌ DM do Discord falhou para ${userId}:`, err.message);
    return false;
  }
}

/** Linha de botões Aceitar / Recusar (partilhada por DM e canal). */
function buildOfferRow(ticketId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`aceitar:${ticketId}`)
      .setLabel('Aceitar')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`recusar:${ticketId}`)
      .setLabel('Recusar')
      .setStyle(ButtonStyle.Danger)
  );
}

function offerContent(body) {
  return `${body}\n\n🎯 Toca em *Aceitar* para assumir este ticket.`.slice(0, 1900);
}

/** Oferta de ticket com botões Aceitar / Recusar.
 * `body` é o texto já formatado pelo supportBridge (id, e-mail, motivo,
 * mensagem) — assim a DM e o canal #support mostram exactamente o mesmo.
 */
async function sendTicketOffer(userId, { ticketId, body, username, email, msg }) {
  if (!client || !ready) {
    console.warn('⚠️ Discord bot ainda não está pronto — ticket não avisado');
    return false;
  }
  try {
    const user = await client.users.fetch(userId);
    // Corpo vindo do bridge; fallback para o formato antigo se não vier.
    const content =
      body ||
      `🎫 **Novo ticket #${ticketId}**\n` +
        `👤 ${username || 'Usuário'} (${email || 'sem e-mail'})\n` +
        `💬 ${String(msg || '').slice(0, 1500)}`;
    await user.send({
      content: offerContent(content),
      components: [buildOfferRow(ticketId)],
      allowedMentions: { parse: [] },
    });
    return true;
  } catch (err) {
    console.error(`❌ Oferta de ticket no Discord falhou para ${userId}:`, err.message);
    return false;
  }
}

/**
 * Publica o ticket num canal (ex.: #support) COM botões Aceitar/Recusar.
 * Alternativa ao webhook: um clique no canal chega ao mesmo handler.
 * Requer permissão de "Enviar mensagens" do bot nesse canal.
 */
async function postTicketInChannel(channelId, { ticketId, body }) {
  if (!client || !ready) {
    console.warn('⚠️ Discord bot ainda não está pronto — ticket não publicado no canal');
    return false;
  }
  try {
    const channel = await client.channels.fetch(String(channelId));
    if (!channel || typeof channel.send !== 'function') {
      console.error(`❌ Canal Discord ${channelId} não encontrado ou não é de texto`);
      return false;
    }
    await channel.send({
      content: offerContent(body || `🎫 **Novo ticket #${ticketId}**`),
      components: [buildOfferRow(ticketId)],
      allowedMentions: { parse: [] },
    });
    return true;
  } catch (err) {
    console.error(`❌ Publicação no canal Discord ${channelId} falhou:`, err.message);
    return false;
  }
}

module.exports = {
  isDiscordId,
  isReady: () => ready,
  setHandler,
  start,
  sendText,
  sendTicketOffer,
  postTicketInChannel,
};
