// services/mozhostAiService.js
// SELETOR de provider da IA MozHost.
//
//   AI_PROVIDER=meta    → Meta Model API (Chat Completions + tool calling)
//                         implementação em ./mozhostAiService.meta.js
//   AI_PROVIDER=gemini  → Gemini (implementação original)
//                         implementação em ./mozhostAiService.gemini.js
//
// Se AI_PROVIDER não estiver definido, escolhe meta quando existir
// MODEL_API_KEY, caso contrário gemini (compatível com o que já estava).
// A escolha é feita no arranque do processo — mudar de provider = reiniciar.

const provider = String(process.env.AI_PROVIDER || '').toLowerCase()
  || (process.env.MODEL_API_KEY ? 'meta' : 'gemini');

const impl = provider === 'meta'
  ? require('./mozhostAiService.meta')
  : require('./mozhostAiService.gemini');

module.exports = impl;
