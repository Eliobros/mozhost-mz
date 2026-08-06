const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ===== CONFIGURAÇÕES =====
const VERIFY_TOKEN = "escolha_uma_senha_aqui"; // mesmo valor cadastrado na Meta
const WHATSAPP_TOKEN = "SEU_TOKEN_DE_ACESSO_AQUI"; // o token gerado no painel da Meta (permanente, não o temporário)
const PHONE_NUMBER_ID = "1274577799076172"; // o Phone Number ID do seu número (841617651)
const CONTATO_HUMANO = "+258 84 161 7651"; // número que aparece na mensagem de "falar com humano"

const GRAPH_URL = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;

// Guarda em memória qual "estado" cada usuário está (simples, sem banco de dados por enquanto)
const estadoUsuarios = {};

// ===== FUNÇÃO PARA ENVIAR MENSAGEM =====
async function enviarMensagem(para, texto) {
  try {
    await axios.post(
      GRAPH_URL,
      {
        messaging_product: "whatsapp",
        to: para,
        type: "text",
        text: { body: texto }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`Mensagem enviada para ${para}`);
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err.response ? err.response.data : err.message);
  }
}

// ===== MENSAGENS DO MENU =====
const MENU_PRINCIPAL =
  "Olá! 👋 Bem-vindo(a) à Eliobros Tech.\n\n" +
  "Escolha uma opção digitando o número:\n" +
  "1️⃣ Preços\n" +
  "2️⃣ Suporte\n" +
  "3️⃣ Falar com humano";

const RESPOSTA_PRECOS =
  "💰 *Preços*\n\nEm breve enviaremos nossa tabela de preços atualizada. Digite 0 para voltar ao menu.";

const RESPOSTA_SUPORTE =
  "🛠️ *Suporte*\n\nDescreva seu problema que iremos te ajudar por aqui. Digite 0 para voltar ao menu.";

const RESPOSTA_HUMANO =
  `👤 Perfeito! Um atendente irá lhe responder por aqui em breve.\n\nSe preferir, também pode nos contactar diretamente pelo número ${CONTATO_HUMANO}.`;

const RESPOSTA_INVALIDA =
  "Não entendi 🤔. Digite 1, 2 ou 3 para escolher uma opção do menu, ou 0 para ver o menu novamente.";

// ===== PROCESSAR MENSAGEM RECEBIDA =====
async function processarMensagem(from, texto) {
  const opcao = texto.trim();

  // Se o usuário digitar 0 ou "menu", volta ao menu principal
  if (opcao === "0" || opcao.toLowerCase() === "menu") {
    estadoUsuarios[from] = "menu";
    await enviarMensagem(from, MENU_PRINCIPAL);
    return;
  }

  const estadoAtual = estadoUsuarios[from];

  // Primeira mensagem do usuário (sem estado ainda) -> manda o menu
  if (!estadoAtual) {
    estadoUsuarios[from] = "menu";
    await enviarMensagem(from, MENU_PRINCIPAL);
    return;
  }

  // Usuário está no menu principal, escolhendo uma opção
  if (estadoAtual === "menu") {
    switch (opcao) {
      case "1":
        estadoUsuarios[from] = "precos";
        await enviarMensagem(from, RESPOSTA_PRECOS);
        break;
      case "2":
        estadoUsuarios[from] = "suporte";
        await enviarMensagem(from, RESPOSTA_SUPORTE);
        break;
      case "3":
        estadoUsuarios[from] = "humano";
        await enviarMensagem(from, RESPOSTA_HUMANO);
        break;
      default:
        await enviarMensagem(from, RESPOSTA_INVALIDA);
    }
    return;
  }

  // Se já está em qualquer outro estado (precos, suporte, humano) e manda algo que não é 0,
  // por enquanto só reforça a opção de voltar ao menu
  await enviarMensagem(from, "Digite 0 para voltar ao menu principal.");
}

// ===== ROTAS DO WEBHOOK =====

// Verificação do webhook (GET) - usado pela Meta na hora de configurar
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recebimento de mensagens (POST)
app.post('/webhook', async (req, res) => {
  // Responde 200 imediatamente pra Meta não reenviar o mesmo evento
  res.sendStatus(200);

  try {
    const entry = req.body.entry && req.body.entry[0];
    const changes = entry && entry.changes && entry.changes[0];
    const value = changes && changes.value;
    const mensagens = value && value.messages;

    if (mensagens && mensagens.length > 0) {
      const msg = mensagens[0];
      const from = msg.from; // número de quem mandou
      const texto = msg.text ? msg.text.body : "";

      console.log(`Mensagem recebida de ${from}: ${texto}`);

      if (texto) {
        await processarMensagem(from, texto);
      }
    }
  } catch (err) {
    console.error("Erro ao processar webhook:", err.message);
  }
});

app.listen(3005, () => console.log('Webhook rodando na porta 3005'));
