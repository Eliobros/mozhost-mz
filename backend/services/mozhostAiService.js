// services/mozhostAiService.js
// Serviço de IA para MozHost - Gemini com Function Calling

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { functionDeclarations, executeFunction, ADMIN_ONLY_FUNCTIONS } = require('./mozhostAiFunctions');

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
  async chat(userId, message, userInfo) {
    if (!this.enabled) {
      return { success: false, error: 'IA não configurada (falta GEMINI_API_KEY)' };
    }

    try {
      // Obter ou criar chat para este usuário
      const chat = this.getOrCreateChat(userId, userInfo);

      // Enviar mensagem
      let result = await chat.sendMessage(message);
      let functionCallCount = 0;

      // Loop para processar Function Calls
      let response = '';
      while (true) {
        const candidate = result.response.candidates?.[0];
        const part = candidate?.content?.parts?.[0];

        if (part?.functionCall) {
          functionCallCount++;
          const { name, args } = part.functionCall;
          console.log(`🔧 MozHost IA chamou: ${name}`, JSON.stringify(args));

          // Executar função no banco
          const functionResult = await executeFunction(name, args || {}, userId, userInfo?.isAdmin);

          // Enviar resultado de volta ao Gemini
          result = await chat.sendMessage([{
            functionResponse: {
              name: name,
              response: functionResult
            }
          }]);

          if (functionCallCount >= 5) {
            console.warn('⚠️ Limite de function calls atingido');
            // O último turno foi só functionResponse (sem texto). Devolve um
            // aviso amigável em vez de tentar ler text() de um turno vazio.
            response = 'Atingi o limite de operações nesta conversa. Envie outra mensagem para continuar.';
            break;
          }
        } else {
          response = result.response.text();
          break;
        }
      }

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
  getOrCreateChat(userId, userInfo) {
    // Inclui isAdmin na chave: se o papel mudar, o chat é recriado com o
    // conjunto de funções correto (evita cache com função de admin para um
    // usuário que deixou de ser admin e vice-versa).
    const key = `${userId}:${userInfo?.isAdmin ? 'admin' : 'user'}`;

    if (this.chats.has(key)) {
      return this.chats.get(key);
    }

    // Incluir contexto do usuário autenticado no system instruction
    const userContext = userInfo
      ? `\n\nUSUÁRIO AUTENTICADO ATUAL:
- ID: ${userInfo.userId}
- Username: ${userInfo.username}
- Email: ${userInfo.email}
- Plano: ${userInfo.plan}

Quando o usuário perguntar sobre "meus containers", "minha conta", "meus dados", etc., use o ID ${userInfo.userId} ou username "${userInfo.username}" para buscar os dados dele. Use a função "minha_conta" para dados da conta e "meus_containers" para listar os containers dele.`
      : '';

    // 🔒 Usuários comuns NÃO recebem as funções de administrador no schema,
    // para que o modelo nem sequer as sugira (o servidor bloqueia de novo).
    const declarations = userInfo?.isAdmin
      ? functionDeclarations
      : functionDeclarations.filter((d) => !ADMIN_ONLY_FUNCTIONS.has(d.name));

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION + userContext,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
      tools: [{ functionDeclarations: declarations }]
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
    this.chats.delete(`${userId}:admin`);
    this.chats.delete(`${userId}:user`);
  }
}

module.exports = new MozhostAiService();
