// services/mozhostAiService.js
// Serviço de IA para MozHost - Gemini com Function Calling

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { functionDeclarations, executeFunction } = require('./mozhostAiFunctions');

const SYSTEM_INSTRUCTION = `Você é a assistente de IA da MozHost, a plataforma moçambicana de hospedagem de bots e APIs.

Você tem acesso a funções que consultam dados REAIS do banco de dados e dos containers da MozHost. USE SEMPRE as funções disponíveis para buscar dados reais. Nunca invente dados.

Responda sempre em português de forma clara e objetiva. Use emojis moderadamente.
Quando apresentar dados, formate-os de forma legível.

Você pode ajudar o usuário com:
- Ver e gerenciar seus containers (listar arquivos, ler/editar código, executar comandos)
- Consultar estatísticas da plataforma
- Buscar informações sobre sua conta
- Ajudar com dúvidas sobre a MozHost
- Diagnosticar problemas nos containers

IMPORTANTE: Ao usar funções de container (listar_arquivos, ler_arquivo, editar_arquivo, executar_comando), o sistema validará automaticamente que o container pertence ao usuário.`;

class MozhostAiService {
  constructor() {
    this.enabled = false;
    this.genAI = null;
    this.chats = new Map();
  }

  /**
   * Inicializa o serviço com a API key
   */
  initialize() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  GEMINI_API_KEY não configurada. IA MozHost desabilitada.');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.enabled = true;
    console.log('✅ MozHost IA inicializada (Gemini + Function Calling)');
  }

  /**
   * Envia mensagem para a IA e processa Function Calls
   */
  async chat(userId, message) {
    if (!this.enabled) {
      return { success: false, error: 'IA não configurada (falta GEMINI_API_KEY)' };
    }

    try {
      // Obter ou criar chat para este usuário
      const chat = this.getOrCreateChat(userId);

      // Enviar mensagem
      let result = await chat.sendMessage(message);
      let functionCallCount = 0;

      // Loop para processar Function Calls
      while (true) {
        const candidate = result.response.candidates?.[0];
        const part = candidate?.content?.parts?.[0];

        if (part?.functionCall) {
          functionCallCount++;
          const { name, args } = part.functionCall;
          console.log(`🔧 MozHost IA chamou: ${name}`, JSON.stringify(args));

          // Executar função no banco
          const functionResult = await executeFunction(name, args || {}, userId);

          // Enviar resultado de volta ao Gemini
          result = await chat.sendMessage([{
            functionResponse: {
              name: name,
              response: functionResult
            }
          }]);

          if (functionCallCount >= 5) {
            console.warn('⚠️ Limite de function calls atingido');
            break;
          }
        } else {
          break;
        }
      }

      const response = result.response.text();

      return {
        success: true,
        response,
        functionCalls: functionCallCount
      };

    } catch (error) {
      console.error('❌ Erro na IA MozHost:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria ou reutiliza um chat para o usuário
   */
  getOrCreateChat(userId) {
    const key = String(userId);

    if (this.chats.has(key)) {
      return this.chats.get(key);
    }

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
      tools: [{ functionDeclarations }]
    });

    const chat = model.startChat({ history: [] });

    this.chats.set(key, chat);

    // Limpar chat após 30 minutos de inatividade
    setTimeout(() => {
      this.chats.delete(key);
    }, 30 * 60 * 1000);

    return chat;
  }

  /**
   * Limpa o chat de um usuário (reseta conversa)
   */
  resetChat(userId) {
    this.chats.delete(String(userId));
  }
}

module.exports = new MozhostAiService();
