// services/mozhostAiService.meta.js
// Serviço de IA para MozHost - Meta Model API (Chat Completions + Tool Calling)
//
// Base URL : https://api.meta.ai/v1   (compatível com OpenAI SDK)
// Auth     : Bearer MODEL_API_KEY
// Modelos  : muse-spark-1.3 (padrão), muse-wonder-1.0, etc. — ver muse-ai.txt
// Docs     : muse-call.txt (tool calling) e muse-ai.txt (visão geral)
//
// O executor das funções (mozhostAiFunctions.executeFunction) e as declarações
// continuam os MESMOS; aqui só muda o transporte e o formato do envelope das tools.

const axios = require('axios');
const { functionDeclarations, executeFunction, ADMIN_ONLY_FUNCTIONS } = require('./mozhostAiFunctions');

const PROVIDER = 'meta';
const BASE_URL = (process.env.AI_BASE_URL || 'https://api.meta.ai/v1').replace(/\/+$/, '');
const MODEL = process.env.AI_MODEL || 'muse-spark-1.3';
// muse-spark é um modelo de RASONAMENTO: os reasoning_tokens são descontados
// dos max_tokens e, se o orçamento acabar, o content volta null
// (finish_reason: "length"). Por isso: esforço de reasoning configurável
// (none|minimal|low|medium|high — vazio = não enviar o parâmetro) e
// max_tokens folgado.
const REASONING_EFFORT = process.env.AI_REASONING_EFFORT ?? 'low';
const MAX_TOKENS_CHAT = parseInt(process.env.AI_MAX_TOKENS || '4000', 10);
const MAX_TOKENS_COMPLETE = 800;
const MAX_TOOL_CALLS = 5; // limite de execuções de funções por turno de chat
const CHAT_TTL_MS = 30 * 60 * 1000; // 30 minutos de inatividade
const REQUEST_TIMEOUT_MS = 60000;

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
    this.provider = PROVIDER;
    this.model = MODEL;
    this.enabled = false;
    this.apiKey = null;
    // key -> { messages: Array, timer: Timeout }  (histórico por utilizador)
    this.chats = new Map();
  }

  /**
   * Inicializa o serviço com a API key
   */
  initialize() {
    const apiKey = process.env.MODEL_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  MODEL_API_KEY não configurada. IA MozHost desabilitada.');
      return;
    }

    this.apiKey = apiKey;
    this.enabled = true;
    console.log(`✅ MozHost IA inicializada (Meta Model API | ${this.model})`);
  }

  /**
   * POST /v1/chat/completions — chamada base da Meta Model API.
   */
  async request(body) {
    const { data } = await axios.post(`${BASE_URL}/chat/completions`, body, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: REQUEST_TIMEOUT_MS,
    });
    return data;
  }

  /**
   * Completion simples, sem tools (usado pelo supportBridge para resumos).
   * Mesma interface do provider gemini — os dois expõem complete().
   */
  async complete({ prompt, temperature = 0.3, maxTokens = MAX_TOKENS_COMPLETE }) {
    if (!this.enabled) {
      throw new Error('IA não configurada (falta MODEL_API_KEY)');
    }

    const data = await this.request({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
      ...this.reasoningParams(),
    });

    const choice = data.choices?.[0];
    const content = (choice?.message?.content || '').trim();
    if (!content) {
      // Orçamento de reasoning consumido (finish_reason: length) ou recusa.
      throw new Error(`Resposta vazia do modelo (finish_reason: ${choice?.finish_reason || 'n/d'})`);
    }
    return content;
  }

  /**
   * Parâmetro reasoning_effort (só envia se configurado — a API rejeita
   * parâmetros desconhecidos com HTTP 400).
   */
  reasoningParams() {
    const effort = String(REASONING_EFFORT || '').trim();
    return effort ? { reasoning_effort: effort } : {};
  }

  /**
   * Envia mensagem para a IA e processa Tool Calls
   */
  async chat(userId, message, userInfo) {
    if (!this.enabled) {
      return { success: false, error: 'IA não configurada (falta MODEL_API_KEY)' };
    }

    try {
      const state = this.getOrCreateChat(userId, userInfo);

      // 🔒 Usuários comuns NÃO recebem as funções de administrador no schema,
      // para que o modelo nem sequer as sugira (o servidor bloqueia de novo).
      const declarations = userInfo?.isAdmin
        ? functionDeclarations
        : functionDeclarations.filter((d) => !ADMIN_ONLY_FUNCTIONS.has(d.name));

      // Chat Completions aninha a declaração em `function` (muse-call.txt).
      const tools = declarations.map((d) => ({ type: 'function', function: d }));

      const messages = [
        { role: 'system', content: state.systemInstruction },
        ...state.messages,
        { role: 'user', content: message },
      ];
      let functionCallCount = 0;
      let response = '';

      while (true) {
        const data = await this.request({
          model: this.model,
          messages,
          tools,
          // Apenas "auto" é suportado; false mantém 1 chamada por turno
          // (a doc permite deixar em true, mas aí há de processar todas em loop).
          parallel_tool_calls: false,
          temperature: 0.7,
          max_tokens: MAX_TOKENS_CHAT,
          ...this.reasoningParams(),
        });

        const msg = data.choices?.[0]?.message;
        const toolCalls = msg?.tool_calls || [];

        if (toolCalls.length === 0) {
          response = (msg?.content || '').trim();
          if (!response) {
            // Cobre finish_reason "length" (reasoning esgotou o orçamento) e
            // recusas: nunca devolvemos string vazia à rota/frontend.
            response = 'Não consegui concluir esta resposta. Tente novamente — se persistir, tente reformular a pergunta.';
          }
          break;
        }

        if (functionCallCount >= MAX_TOOL_CALLS) {
          console.warn('⚠️ Limite de function calls atingido');
          response = 'Atingi o limite de operações nesta conversa. Envie outra mensagem para continuar.';
          break;
        }

        // A doc é explícita: é obrigatório devolver a mensagem assistant
        // COMPLETA (com tool_calls) antes das tool messages — senão HTTP 400.
        messages.push({
          role: 'assistant',
          content: msg.content ?? null,
          tool_calls: toolCalls,
        });

        for (const tc of toolCalls) {
          if (functionCallCount >= MAX_TOOL_CALLS) break;
          functionCallCount++;

          // A doc: os argumentos são gerados pelo modelo e NÃO são garantidos
          // contra o schema — validar sempre antes de executar.
          let args = {};
          let invalidArgs = false;
          try {
            args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
          } catch (_e) {
            invalidArgs = true;
          }

          const name = tc.function?.name;
          let result;
          if (invalidArgs) {
            result = { erro: 'Argumentos inválidos retornados pelo modelo' };
          } else {
            console.log(`🔧 MozHost IA chamou: ${name}`, JSON.stringify(args));
            result = await executeFunction(name, args || {}, userId, userInfo?.isAdmin);
          }

          // Uma tool message por chamada, com o tool_call_id de origem.
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }

        if (functionCallCount >= MAX_TOOL_CALLS) {
          console.warn('⚠️ Limite de function calls atingido');
          response = 'Atingi o limite de operações nesta conversa. Envie outra mensagem para continuar.';
          break;
        }
      }

      // Persiste apenas trocas completas (evita histórico com tool calls
      // pendentes de resultado). messages[0] é o system, que é remontado a
      // cada request — não pode entrar no histórico guardado.
      if (response) {
        state.messages = messages.slice(1);
      }

      return {
        success: true,
        response,
        functionCalls: functionCallCount
      };

    } catch (error) {
      const detail = error.response?.data ? JSON.stringify(error.response.data) : '';
      console.error('❌ Erro na IA MozHost:', error.message, detail);
      return { success: false, error: detail || error.message };
    }
  }

  /**
   * Cria ou reutiliza o histórico de conversa do utilizador
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

    const domainContext = `
\n\nMANUAL DE PROCEDIMENTOS DE DOMÍNIOS MOZHOST:
1. Conectar um domínio existente:
- O usuário deve acessar a página principal em: mozhost.shop/dashboard
- Ir ao Menu -> Domínios.
- Se não tiver domínios, clicar no botão "Conectar Domínio".
- Digitar o domínio e selecionar o container onde deseja conectá-lo.
- O sistema exibirá os dados de DNS. O usuário deve copiar e colocar esses dados no seu provedor atual de domínios.
- Após configurar no provedor, voltar ao painel da MozHost. O status mudará para "Conectando" e "Criando SSL". Basta aguardar alguns minutos e atualizar a página.

2. Registrar/Comprar um novo domínio:
- No painel (mozhost.shop/dashboard -> Menu -> Domínios), ir à aba "Registrar".
- Preenche os seus dados de registrante no modal que abrir como nome, email telefone , cidade e etc... para efetuar a compra dos dominios.
- NOTA IMPORTANTE: Domínios nacionais (.mz) AINDA NÃO estão disponíveis por questões burocráticas com os provedores locais.
- Métodos de pagamento aceitos: M-Pesa, e-Mola (Moçambique), Cartão Bancário, PayPal, e Mercado Pago (para clientes do Brasil).
- Após a compra, para vincular ao container: Ir na aba "Conectar", inserir o domínio comprado e, na mesma aba, rolar para a direita até a seção "DNS" para inserir os dados que o sistema retornou no momento da conexão.

3. Tranferencia de dominios tanto de mozhost pra fora e de fora pra ca:
- A transferencia de dominios ainda nao esta dipsonivel mas brevemente tera essa funcionalidade entao atualmente so podes apontar os dns ou tranferir os nameservers pra ca.
- Voce pode efetuar a tranferencia dos nameservers pra mozhost rolando mais á direita e indo a aba   de nameservers e copiar oq foi gerado pra ele e ir colocar no seu provedor atual
- A propagacao dura alguns minutos pra o dominio refletir e comecar a gerir pela mozhost.`

;


    const state = {
      // systemInstruction = system message + contexto do utilizador autenticado
      systemInstruction: SYSTEM_INSTRUCTION + userContext + domainContext,
      // messages = histórico (sem o system, que vai em cada request)
      messages: [],
    };

    this.chats.set(key, state);

    // Limpar chat após 30 minutos de inatividade
    setTimeout(() => {
      this.chats.delete(key);
    }, CHAT_TTL_MS);

    return state;
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
