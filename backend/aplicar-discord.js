// aplicar-discord.js
// Aplica 4 edições pequenas no services/supportBridge.js para ligar o canal Discord.
// Rode na pasta backend:   node aplicar-discord.js
// Faz backup em services/supportBridge.js.bak e aborta se algum ponto não for encontrado.

const fs = require('fs');

const FILE = 'services/supportBridge.js';
const src = fs.readFileSync(FILE, 'utf8');

if (src.includes("require('./discordBot')")) {
  console.log('ℹ️ Já aplicado. Nada a fazer.');
  process.exit(0);
}

const edits = [
  {
    find: "const mozhostAi = require('./mozhostAiService');",
    replace:
      "const mozhostAi = require('./mozhostAiService');\n" +
      "const discord = require('./discordBot');",
  },
  {
    find: '_io = io;',
    replace:
      '_io = io;\n' +
      '  discord.setHandler(handleIncomingMessage);\n' +
      '  discord.start();',
  },
  {
    find: 'async function sendAgent(agentPhone, text) {',
    replace:
      'async function sendAgent(agentPhone, text) {\n' +
      '  const agentId = normalizePhone(agentPhone);\n' +
      '  if (discord.isDiscordId(agentId)) return discord.sendText(agentId, text);',
  },
  {
    find: 'const to = normalizePhone(n);',
    replace:
      'const to = normalizePhone(n);\n' +
      '    if (discord.isDiscordId(to)) {\n' +
      '      const ok = await discord.sendTicketOffer(to, {\n' +
      '        ticketId,\n' +
      '        username: user.username,\n' +
      '        email: user.email,\n' +
      '        msg: lastMessage || summary,\n' +
      '      });\n' +
      '      console.log(\n' +
      '        ok\n' +
      '          ? `📤 Ticket #${ticketId} enviado ao Discord de ${to}`\n' +
      '          : `❌ Falha ao avisar o Discord de ${to}`\n' +
      '      );\n' +
      '      continue;\n' +
      '    }',
  },
];

let out = src;
for (const { find, replace } of edits) {
  const count = out.split(find).length - 1;
  if (count !== 1) {
    console.error(`❌ Ponto de edição encontrado ${count}x (esperado 1): ${find}`);
    console.error('Nada foi alterado.');
    process.exit(1);
  }
  out = out.replace(find, () => replace);
}

fs.writeFileSync(FILE + '.bak', src);
fs.writeFileSync(FILE, out);
console.log('✅ supportBridge.js atualizado (backup em supportBridge.js.bak)');
