// services/mozhostAiFunctions.js
// Function Calling para IA MozHost - Consultas ao banco MySQL

const database = require('../models/database');
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// ============================================
// 🔒 VALIDAÇÃO DE SEGURANÇA
// ============================================

async function validateContainerOwnership(containerId, userId) {
  const containers = await database.query(
    'SELECT id, docker_container_id, user_id, name, status FROM containers WHERE id = ?',
    [containerId]
  );

  if (containers.length === 0) {
    return { error: 'Container não encontrado' };
  }

  const container = containers[0];

  if (container.user_id !== userId) {
    return { error: 'Acesso negado: este container não pertence a você' };
  }

  if (container.status !== 'running') {
    return { error: `Container não está rodando (status: ${container.status})` };
  }

  return { container, dockerContainer: docker.getContainer(container.docker_container_id) };
}

function sanitizePath(filePath) {
  if (!filePath || filePath.includes('..')) {
    return null;
  }
  // Remove leading slash if present to make relative
  return filePath.replace(/^\/+/, '');
}

// ============================================
// 📋 DECLARAÇÕES DE FUNÇÕES (Schema Gemini)
// ============================================

const functionDeclarations = [
  {
    name: 'contar_usuarios',
    description: 'Conta o total de usuários cadastrados na plataforma MozHost, podendo filtrar por status',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['todos', 'ativos', 'inativos', 'verificados', 'nao_verificados'],
          description: 'Filtrar por status do usuário'
        }
      },
      required: ['status']
    }
  },
  {
    name: 'usuarios_inativos',
    description: 'Lista usuários que não atualizam a conta há um determinado número de dias',
    parameters: {
      type: 'object',
      properties: {
        dias: {
          type: 'number',
          description: 'Número de dias de inatividade (ex: 30)'
        },
        limite: {
          type: 'number',
          description: 'Quantidade máxima de resultados (padrão: 10)'
        }
      },
      required: ['dias']
    }
  },
  {
    name: 'estatisticas_gerais',
    description: 'Retorna estatísticas gerais da plataforma MozHost: total de usuários, containers, pagamentos, receita, etc.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'consultar_containers',
    description: 'Consulta informações sobre containers da plataforma, podendo filtrar por status',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['todos', 'running', 'stopped', 'error', 'building'],
          description: 'Filtrar containers por status'
        },
        limite: {
          type: 'number',
          description: 'Quantidade máxima de resultados (padrão: 15)'
        }
      },
      required: ['status']
    }
  },
  {
    name: 'estatisticas_pagamentos',
    description: 'Retorna estatísticas de pagamentos: total arrecadado, pagamentos pendentes, completados, por método (mpesa, emola)',
    parameters: {
      type: 'object',
      properties: {
        periodo_dias: {
          type: 'number',
          description: 'Período em dias para filtrar (ex: 7, 30, 90)'
        },
        metodo: {
          type: 'string',
          enum: ['todos', 'mpesa', 'emola'],
          description: 'Filtrar por método de pagamento'
        }
      },
      required: []
    }
  },
  {
    name: 'buscar_usuario',
    description: 'Busca informações de um usuário específico pelo nome de usuário ou email',
    parameters: {
      type: 'object',
      properties: {
        termo: {
          type: 'string',
          description: 'Username ou email do usuário para buscar'
        }
      },
      required: ['termo']
    }
  },
  {
    name: 'containers_por_usuario',
    description: 'Lista os containers de um usuário específico pelo username ou email',
    parameters: {
      type: 'object',
      properties: {
        termo: {
          type: 'string',
          description: 'Username ou email do usuário'
        }
      },
      required: ['termo']
    }
  },
  {
    name: 'receita_por_periodo',
    description: 'Calcula a receita (valor arrecadado) em pagamentos completados, agrupada por dia, semana ou mês',
    parameters: {
      type: 'object',
      properties: {
        periodo_dias: {
          type: 'number',
          description: 'Período em dias para analisar (padrão: 30)'
        },
        agrupar_por: {
          type: 'string',
          enum: ['dia', 'semana', 'mes'],
          description: 'Como agrupar os resultados'
        }
      },
      required: ['agrupar_por']
    }
  },
  {
    name: 'subscricoes_expirando',
    description: 'Lista subscrições que estão prestes a expirar ou já expiraram',
    parameters: {
      type: 'object',
      properties: {
        dias: {
          type: 'number',
          description: 'Buscar subscrições que expiram nos próximos X dias (ex: 7)'
        },
        status: {
          type: 'string',
          enum: ['todas', 'active', 'expiring_soon', 'expired'],
          description: 'Filtrar por status da subscrição'
        }
      },
      required: []
    }
  },
  {
    name: 'top_usuarios_coins',
    description: 'Lista os usuários com mais coins (saldo) ou os que mais gastaram coins',
    parameters: {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          enum: ['mais_coins', 'mais_containers', 'novos_recentes'],
          description: 'Tipo de ranking'
        },
        limite: {
          type: 'number',
          description: 'Quantidade de resultados (padrão: 10)'
        }
      },
      required: ['tipo']
    }
  },
  {
    name: 'estatisticas_whatsapp',
    description: 'Retorna estatísticas das contas WhatsApp vinculadas na plataforma',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'notificacoes_recentes',
    description: 'Lista as notificações mais recentes da plataforma, podendo filtrar por tipo ou categoria',
    parameters: {
      type: 'object',
      properties: {
        categoria: {
          type: 'string',
          enum: ['todas', 'container', 'billing', 'system', 'welcome', 'subscription'],
          description: 'Filtrar por categoria'
        },
        limite: {
          type: 'number',
          description: 'Quantidade de resultados (padrão: 10)'
        }
      },
      required: []
    }
  },
  {
    name: 'listar_arquivos',
    description: 'Lista arquivos e pastas de um diretório dentro do container do usuário',
    parameters: {
      type: 'object',
      properties: {
        diretorio: {
          type: 'string',
          description: 'Caminho do diretório a listar (ex: ".", "src", "src/routes"). Sem ../'
        },
        container_id: {
          type: 'number',
          description: 'ID do container no banco de dados'
        }
      },
      required: ['diretorio', 'container_id']
    }
  },
  {
    name: 'ler_arquivo',
    description: 'Lê o conteúdo de um arquivo dentro do container do usuário',
    parameters: {
      type: 'object',
      properties: {
        caminho: {
          type: 'string',
          description: 'Caminho do arquivo a ler (ex: "index.js", "src/app.js"). Sem ../'
        },
        container_id: {
          type: 'number',
          description: 'ID do container no banco de dados'
        }
      },
      required: ['caminho', 'container_id']
    }
  },
  {
    name: 'editar_arquivo',
    description: 'Sobrescreve o conteúdo de um arquivo dentro do container do usuário',
    parameters: {
      type: 'object',
      properties: {
        caminho: {
          type: 'string',
          description: 'Caminho do arquivo a editar (ex: "index.js", "src/app.js"). Sem ../'
        },
        novo_conteudo: {
          type: 'string',
          description: 'Novo conteúdo completo do arquivo'
        },
        container_id: {
          type: 'number',
          description: 'ID do container no banco de dados'
        }
      },
      required: ['caminho', 'novo_conteudo', 'container_id']
    }
  },
  {
  name: 'escalar_para_suporte',
  description: 'Escala a conversa para um agente humano quando o utilizador pede suporte humano, diz que quer falar com uma pessoa real, ou quando a IA não consegue resolver o problema',
  parameters: {
    type: 'object',
    properties: {
      motivo: {
        type: 'string',
        description: 'Resumo do problema do utilizador para passar ao agente humano'
      }
    },
    required: ['motivo']
  }
},
  {
    name: 'executar_comando',
    description: 'Executa um comando no terminal do container do usuário e retorna o output',
    parameters: {
      type: 'object',
      properties: {
        comando: {
          type: 'string',
          description: 'Comando a executar (ex: "ls -la", "npm install", "node -v")'
        },
        container_id: {
          type: 'number',
          description: 'ID do container no banco de dados'
        }
      },
      required: ['comando', 'container_id']
    }
  },
  {
    name: 'minha_conta',
    description: 'Retorna informações da conta do usuário autenticado atual (dados, plano, coins, etc.)',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
  name: 'enviar_codigo_suporte',
  description: 'Envia um código de verificação para o email do usuário autenticado para confirmar ações sensíveis como mudança de email, exclusão de conta, etc.',
  parameters: {
    type: 'object',
    properties: {
      purpose: {
        type: 'string',
        enum: ['email_verify', 'change_email', 'delete_container', 'change_password', 'other'],
        description: 'Motivo do envio do código'
      }
    },
    required: ['purpose']
  }
},
{
  name: 'verificar_codigo_suporte',
  description: 'Verifica se o código informado pelo usuário é válido para confirmar uma ação sensível',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'Código de 6 dígitos informado pelo usuário'
      },
      purpose: {
        type: 'string',
        enum: ['email_verify', 'change_email', 'delete_container', 'change_password', 'other'],
        description: 'Motivo do código a verificar'
      }
    },
    required: ['code', 'purpose']
  }
},
  {
    name: 'meus_containers',
    description: 'Lista todos os containers do usuário autenticado atual',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['todos', 'running', 'stopped', 'error', 'building'],
          description: 'Filtrar por status (padrão: todos)'
        }
      },
      required: []
    }
  }
];

// ============================================
// ⚙️ IMPLEMENTAÇÕES DAS FUNÇÕES
// ============================================

const functionImplementations = {

  async contar_usuarios({ status }) {
    let where = '';
    switch (status) {
      case 'ativos': where = 'WHERE is_active = true'; break;
      case 'inativos': where = 'WHERE is_active = false'; break;
      case 'verificados': where = 'WHERE email_verified = true'; break;
      case 'nao_verificados': where = 'WHERE email_verified = false'; break;
      default: where = '';
    }

    const result = await database.query(`SELECT COUNT(*) as total FROM users ${where}`);
    return { total: result[0].total, filtro: status };
  },

  async usuarios_inativos({ dias, limite = 10 }) {
    const users = await database.query(
      `SELECT id, username, email, plan, coins, updated_at, created_at
       FROM users
       WHERE DATEDIFF(NOW(), updated_at) >= ? AND is_active = true
       ORDER BY updated_at ASC
       LIMIT ?`,
      [dias, limite]
    );

    return {
      total_encontrados: users.length,
      dias_inatividade: dias,
      usuarios: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        plano: u.plan,
        coins: u.coins,
        ultima_atividade: u.updated_at,
        cadastrado_em: u.created_at
      }))
    };
  },

  async estatisticas_gerais() {
    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      totalContainers,
      runningContainers,
      totalPayments,
      completedPayments,
      totalWhatsapp,
      totalSubscriptions
    ] = await Promise.all([
      database.query('SELECT COUNT(*) as t FROM users'),
      database.query('SELECT COUNT(*) as t FROM users WHERE is_active = true'),
      database.query('SELECT COUNT(*) as t FROM users WHERE email_verified = true'),
      database.query('SELECT COUNT(*) as t FROM containers'),
      database.query("SELECT COUNT(*) as t FROM containers WHERE status = 'running'"),
      database.query('SELECT COUNT(*) as t FROM payments'),
      database.query("SELECT COUNT(*) as t FROM payments WHERE status = 'completed'"),
      database.query('SELECT COUNT(*) as t FROM whatsapp_accounts WHERE verified = true'),
      database.query("SELECT COUNT(*) as t FROM subscriptions WHERE status = 'active'")
    ]);

    const revenue = await database.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'"
    );

    const plansBreakdown = await database.query(
      'SELECT plan, COUNT(*) as total FROM users GROUP BY plan ORDER BY total DESC'
    );

    return {
      usuarios: {
        total: totalUsers[0].t,
        ativos: activeUsers[0].t,
        verificados: verifiedUsers[0].t
      },
      containers: {
        total: totalContainers[0].t,
        rodando: runningContainers[0].t
      },
      pagamentos: {
        total: totalPayments[0].t,
        completados: completedPayments[0].t,
        receita_total_mzn: revenue[0].total
      },
      whatsapp_vinculados: totalWhatsapp[0].t,
      subscricoes_ativas: totalSubscriptions[0].t,
      usuarios_por_plano: plansBreakdown.map(p => ({ plano: p.plan, total: p.total }))
    };
  },

  async consultar_containers({ status, limite = 15 }) {
    let where = '';
    if (status && status !== 'todos') {
      where = `WHERE c.status = '${status}'`;
    }

    const containers = await database.query(
      `SELECT c.id, c.name, c.type, c.status, c.domain, c.memory_limit_mb, c.port,
              u.username, c.created_at
       FROM containers c
       JOIN users u ON c.user_id = u.id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT ?`,
      [limite]
    );

    const statusCounts = await database.query(
      'SELECT status, COUNT(*) as total FROM containers GROUP BY status'
    );

    return {
      total_encontrados: containers.length,
      por_status: statusCounts.map(s => ({ status: s.status, total: s.total })),
      containers: containers.map(c => ({
        id: c.id,
        nome: c.name,
        tipo: c.type,
        status: c.status,
        dominio: c.domain || 'Sem domínio',
        memoria_mb: c.memory_limit_mb,
        porta: c.port,
        dono: c.username,
        criado_em: c.created_at
      }))
    };
  },

async enviar_codigo_suporte({ purpose }, userId) {
  const { sendEmail, generateCode } = require('../utils/email');

  // Buscar dados do utilizador
  const users = await database.query(
    'SELECT id, username, email FROM users WHERE id = ?',
    [userId]
  );

  if (users.length === 0) {
    return { erro: 'Usuário não encontrado' };
  }

  const user = users[0];

  // Invalidar códigos anteriores do mesmo purpose
  await database.query(
    `UPDATE verification_codes 
     SET used_at = NOW() 
     WHERE user_id = ? AND purpose = ? AND used_at IS NULL`,
    [userId, purpose]
  );

  // Gerar novo código
  const code = generateCode(6);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

  // Guardar no banco
  await database.query(
    `INSERT INTO verification_codes (user_id, code, purpose, expires_at) 
     VALUES (?, ?, ?, ?)`,
    [userId, code, purpose, expiresAt]
  );

  // Labels para o email
  const purposeLabels = {
    email_verify: 'Verificação de Email',
    change_email: 'Alteração de Email',
    delete_container: 'Exclusão de Container',
    change_password: 'Alteração de Password',
    other: 'Verificação de Segurança'
  };

  const label = purposeLabels[purpose] || 'Verificação';

  // Enviar email via Resend
  await sendEmail({
    toEmail: user.email,
    toName: user.username,
    subject: `MozHost - Código de ${label}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #6c47ff; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🔐 MozHost</h1>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 15px;">Olá, <strong>${user.username}</strong>!</p>
          <p style="font-size: 15px;">O teu código para <strong>${label}</strong> é:</p>
          <div style="background: white; border: 2px dashed #6c47ff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6c47ff;">${code}</span>
          </div>
          <p style="color: #888; font-size: 13px;">⏱️ Este código expira em <strong>10 minutos</strong>.</p>
          <p style="color: #888; font-size: 13px;">Se não foste tu a solicitar, ignora este email.</p>
        </div>
      </div>
    `,
    textContent: `MozHost - Código de ${label}\n\nOlá ${user.username}!\n\nO teu código é: ${code}\n\nExpira em 10 minutos.`
  });

  return {
    sucesso: true,
    mensagem: `Código enviado para ${user.email}`,
    expira_em: '10 minutos'
  };
},

async verificar_codigo_suporte({ code, purpose }, userId) {
  const codes = await database.query(
    `SELECT id, code, expires_at, used_at 
     FROM verification_codes 
     WHERE user_id = ? AND purpose = ? AND used_at IS NULL
     ORDER BY created_at DESC 
     LIMIT 1`,
    [userId, purpose]
  );

  if (codes.length === 0) {
    return { valido: false, motivo: 'Nenhum código encontrado para este propósito' };
  }

  const record = codes[0];

  // Verificar expiração
  if (new Date() > new Date(record.expires_at)) {
    return { valido: false, motivo: 'Código expirado' };
  }

  // Verificar código
  if (record.code !== String(code)) {
    return { valido: false, motivo: 'Código incorreto' };
  }

  // Marcar como usado
  await database.query(
    'UPDATE verification_codes SET used_at = NOW() WHERE id = ?',
    [record.id]
  );

  return {
    valido: true,
    mensagem: 'Código verificado com sucesso ✅'
  };
},


  async estatisticas_pagamentos({ periodo_dias, metodo }) {
    let dateFilter = '';
    const params = [];

    if (periodo_dias) {
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(periodo_dias);
    }

    let methodFilter = '';
    if (metodo && metodo !== 'todos') {
      methodFilter = 'AND payment_method = ?';
      params.push(metodo);
    }

    const stats = await database.query(
      `SELECT payment_method, status, COUNT(*) as quantidade, COALESCE(SUM(amount), 0) as valor_total, COALESCE(SUM(coins_to_add), 0) as coins_total
       FROM payments
       WHERE 1=1 ${dateFilter} ${methodFilter}
       GROUP BY payment_method, status
       ORDER BY quantidade DESC`,
      params
    );

    const pendentes = await database.query(
      `SELECT COUNT(*) as t FROM payments WHERE status = 'pending' ${dateFilter.replace('AND', 'AND')}`,
      periodo_dias ? [periodo_dias] : []
    );

    return {
      periodo: periodo_dias ? `Últimos ${periodo_dias} dias` : 'Todo o período',
      metodo_filtro: metodo || 'todos',
      detalhes: stats.map(s => ({
        metodo: s.payment_method,
        status: s.status,
        quantidade: s.quantidade,
        valor_total_mzn: s.valor_total,
        coins_total: s.coins_total
      })),
      pendentes: pendentes[0].t
    };
  },

  async buscar_usuario({ termo }) {
    const users = await database.query(
      `SELECT id, username, email, plan, coins, max_containers, is_active, email_verified, created_at, updated_at
       FROM users
       WHERE username LIKE ? OR email LIKE ?
       LIMIT 5`,
      [`%${termo}%`, `%${termo}%`]
    );

    if (users.length === 0) {
      return { encontrados: 0, mensagem: 'Nenhum usuário encontrado' };
    }

    const results = [];
    for (const user of users) {
      const containers = await database.query(
        'SELECT COUNT(*) as total FROM containers WHERE user_id = ?',
        [user.id]
      );
      const running = await database.query(
        "SELECT COUNT(*) as total FROM containers WHERE user_id = ? AND status = 'running'",
        [user.id]
      );

      results.push({
        id: user.id,
        username: user.username,
        email: user.email,
        plano: user.plan,
        coins: user.coins,
        max_containers: user.max_containers,
        ativo: user.is_active,
        email_verificado: user.email_verified,
        containers_total: containers[0].total,
        containers_rodando: running[0].total,
        cadastrado_em: user.created_at,
        ultima_atividade: user.updated_at
      });
    }

    return { encontrados: results.length, usuarios: results };
  },

  async containers_por_usuario({ termo }) {
    const users = await database.query(
      'SELECT id, username FROM users WHERE username LIKE ? OR email LIKE ? LIMIT 1',
      [`%${termo}%`, `%${termo}%`]
    );

    if (users.length === 0) {
      return { erro: 'Usuário não encontrado' };
    }

    const user = users[0];
    const containers = await database.query(
      `SELECT id, name, type, status, domain, memory_limit_mb, port, created_at
       FROM containers WHERE user_id = ? ORDER BY created_at DESC`,
      [user.id]
    );

    return {
      usuario: user.username,
      total_containers: containers.length,
      containers: containers.map(c => ({
        id: c.id,
        nome: c.name,
        tipo: c.type,
        status: c.status,
        dominio: c.domain || 'Sem domínio',
        memoria_mb: c.memory_limit_mb,
        porta: c.port,
        criado_em: c.created_at
      }))
    };
  },

  async receita_por_periodo({ periodo_dias = 30, agrupar_por }) {
    let dateFormat;
    switch (agrupar_por) {
      case 'dia': dateFormat = '%Y-%m-%d'; break;
      case 'semana': dateFormat = '%x-W%v'; break;
      case 'mes': dateFormat = '%Y-%m'; break;
      default: dateFormat = '%Y-%m-%d';
    }

    const result = await database.query(
      `SELECT DATE_FORMAT(completed_at, ?) as periodo,
              payment_method,
              COUNT(*) as quantidade,
              SUM(amount) as valor_total,
              SUM(coins_to_add) as coins_total
       FROM payments
       WHERE status = 'completed' AND completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY periodo, payment_method
       ORDER BY periodo DESC`,
      [dateFormat, periodo_dias]
    );

    return {
      periodo: `Últimos ${periodo_dias} dias`,
      agrupado_por: agrupar_por,
      dados: result.map(r => ({
        periodo: r.periodo,
        metodo: r.payment_method,
        valor_mzn: r.valor_total,
        coins: r.coins_total,
        transacoes: r.quantidade
      }))
    };
  },

  async subscricoes_expirando({ dias = 7, status }) {
    let where = 'WHERE 1=1';
    const params = [];

    if (status && status !== 'todas') {
      where += ' AND s.status = ?';
      params.push(status);
    } else {
      where += ' AND s.expires_at <= DATE_ADD(NOW(), INTERVAL ? DAY)';
      params.push(dias);
    }

    const subs = await database.query(
      `SELECT s.id, s.coins_paid, s.ram_mb, s.starts_at, s.expires_at, s.status,
              u.username, u.email, c.name as container_name
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       JOIN containers c ON s.container_id = c.id
       ${where}
       ORDER BY s.expires_at ASC
       LIMIT 20`,
      params
    );

    return {
      filtro_dias: dias,
      total: subs.length,
      subscricoes: subs.map(s => ({
        id: s.id,
        usuario: s.username,
        email: s.email,
        container: s.container_name,
        coins_pagos: s.coins_paid,
        ram_mb: s.ram_mb,
        inicio: s.starts_at,
        expira_em: s.expires_at,
        status: s.status
      }))
    };
  },

  async top_usuarios_coins({ tipo, limite = 10 }) {
    let query, params;

    switch (tipo) {
      case 'mais_coins':
        query = 'SELECT id, username, email, plan, coins, created_at FROM users ORDER BY coins DESC LIMIT ?';
        params = [limite];
        break;
      case 'mais_containers':
        query = `SELECT u.id, u.username, u.email, u.plan, u.coins, COUNT(c.id) as total_containers
                 FROM users u
                 LEFT JOIN containers c ON u.id = c.user_id
                 GROUP BY u.id
                 ORDER BY total_containers DESC
                 LIMIT ?`;
        params = [limite];
        break;
      case 'novos_recentes':
        query = 'SELECT id, username, email, plan, coins, created_at FROM users ORDER BY created_at DESC LIMIT ?';
        params = [limite];
        break;
      default:
        return { erro: 'Tipo inválido' };
    }

    const users = await database.query(query, params);

    return {
      tipo,
      total: users.length,
      usuarios: users.map(u => ({
        username: u.username,
        email: u.email,
        plano: u.plan,
        coins: u.coins,
        total_containers: u.total_containers || undefined,
        cadastrado_em: u.created_at || undefined
      }))
    };
  },
  
  async escalar_para_suporte({ motivo }, userId) {
  const result = await database.query(
    `INSERT INTO support_tickets 
     (user_id, status, summary, created_at) 
     VALUES (?, 'waiting', ?, NOW())`,
    [userId, motivo]
  );

  return {
    sucesso: true,
    ticketId: result.insertId,
    mensagem: 'Ticket de suporte criado'
  };
},

  async estatisticas_whatsapp() {
    const totalVinculados = await database.query(
      'SELECT COUNT(*) as t FROM whatsapp_accounts WHERE verified = true'
    );
    const totalPendentes = await database.query(
      'SELECT COUNT(*) as t FROM whatsapp_accounts WHERE verified = false'
    );

    const recentes = await database.query(
      `SELECT wa.whatsapp_number, u.username, wa.created_at
       FROM whatsapp_accounts wa
       LEFT JOIN users u ON wa.user_id = u.id
       WHERE wa.verified = true
       ORDER BY wa.created_at DESC
       LIMIT 5`
    );

    return {
      vinculados: totalVinculados[0].t,
      pendentes: totalPendentes[0].t,
      vinculacoes_recentes: recentes.map(r => ({
        numero: r.whatsapp_number,
        usuario: r.username || 'Sem vínculo',
        data: r.created_at
      }))
    };
  },

  async notificacoes_recentes({ categoria, limite = 10 }) {
    let where = '';
    const params = [];

    if (categoria && categoria !== 'todas') {
      where = 'WHERE n.category = ?';
      params.push(categoria);
    }

    params.push(limite);

    const notifs = await database.query(
      `SELECT n.id, n.type, n.category, n.title, n.message, n.read_at, n.created_at,
              u.username
       FROM notifications n
       JOIN users u ON n.user_id = u.id
       ${where}
       ORDER BY n.created_at DESC
       LIMIT ?`,
      params
    );

    return {
      total: notifs.length,
      categoria_filtro: categoria || 'todas',
      notificacoes: notifs.map(n => ({
        tipo: n.type,
        categoria: n.category,
        titulo: n.title,
        mensagem: n.message.substring(0, 100),
        usuario: n.username,
        lida: !!n.read_at,
        data: n.created_at
      }))
    };
  },

  async minha_conta(_args, userId) {
    const user = await database.query(
      `SELECT id, username, email, plan, coins, is_active, email_verified, created_at, updated_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (user.length === 0) {
      return { erro: 'Usuário não encontrado' };
    }

    const u = user[0];
    const containerCount = await database.query(
      'SELECT COUNT(*) as total FROM containers WHERE user_id = ?',
      [userId]
    );

    return {
      id: u.id,
      username: u.username,
      email: u.email,
      plano: u.plan,
      coins: u.coins,
      ativo: u.is_active,
      email_verificado: u.email_verified,
      total_containers: containerCount[0].total,
      cadastrado_em: u.created_at,
      atualizado_em: u.updated_at
    };
  },

  async meus_containers({ status } = {}, userId) {
    let where = 'WHERE c.user_id = ?';
    const params = [userId];

    if (status && status !== 'todos') {
      where += ' AND c.status = ?';
      params.push(status);
    }

    const containers = await database.query(
      `SELECT c.id, c.name, c.status, c.type, c.port, c.domain, c.created_at
       FROM containers c
       ${where}
       ORDER BY c.created_at DESC`,
      params
    );

    return {
      total: containers.length,
      filtro_status: status || 'todos',
      containers: containers.map(c => ({
        id: c.id,
        nome: c.name,
        status: c.status,
        tipo: c.type,
        porta: c.port,
        dominio: c.domain,
        criado_em: c.created_at
      }))
    };
  },

  async listar_arquivos({ diretorio, container_id }, userId) {
    const safePath = sanitizePath(diretorio);
    if (safePath === null) {
      return { erro: 'Caminho inválido: não é permitido usar ../' };
    }

    const validation = await validateContainerOwnership(container_id, userId);
    if (validation.error) return { erro: validation.error };

    try {
      const exec = await validation.dockerContainer.exec({
        Cmd: ['/bin/sh', '-c', `ls -la ${safePath || '.'}`],
        AttachStdout: true,
        AttachStderr: true
      });

      const stream = await exec.start({ Detach: false });
      let output = '';
      await new Promise((resolve) => {
        stream.on('data', (chunk) => { output += chunk.toString('utf-8').replace(/[\x00-\x08]/g, ''); });
        stream.on('end', resolve);
      });

      return {
        container: validation.container.name,
        diretorio: safePath || '.',
        conteudo: output.trim()
      };
    } catch (error) {
      return { erro: `Falha ao listar arquivos: ${error.message}` };
    }
  },

  async ler_arquivo({ caminho, container_id }, userId) {
    const safePath = sanitizePath(caminho);
    if (safePath === null) {
      return { erro: 'Caminho inválido: não é permitido usar ../' };
    }

    const validation = await validateContainerOwnership(container_id, userId);
    if (validation.error) return { erro: validation.error };

    try {
      const exec = await validation.dockerContainer.exec({
        Cmd: ['/bin/sh', '-c', `cat ${safePath}`],
        AttachStdout: true,
        AttachStderr: true
      });

      const stream = await exec.start({ Detach: false });
      let output = '';
      await new Promise((resolve) => {
        stream.on('data', (chunk) => { output += chunk.toString('utf-8').replace(/[\x00-\x08]/g, ''); });
        stream.on('end', resolve);
      });

      if (output.length > 10000) {
        output = output.substring(0, 10000) + '\n... (truncado, arquivo muito grande)';
      }

      return {
        container: validation.container.name,
        arquivo: safePath,
        conteudo: output
      };
    } catch (error) {
      return { erro: `Falha ao ler arquivo: ${error.message}` };
    }
  },

  async editar_arquivo({ caminho, novo_conteudo, container_id }, userId) {
    const safePath = sanitizePath(caminho);
    if (safePath === null) {
      return { erro: 'Caminho inválido: não é permitido usar ../' };
    }

    const validation = await validateContainerOwnership(container_id, userId);
    if (validation.error) return { erro: validation.error };

    try {
      const encoded = Buffer.from(novo_conteudo).toString('base64');
      const exec = await validation.dockerContainer.exec({
        Cmd: ['/bin/sh', '-c', `echo '${encoded}' | base64 -d > ${safePath}`],
        AttachStdout: true,
        AttachStderr: true
      });

      const stream = await exec.start({ Detach: false });
      let output = '';
      await new Promise((resolve) => {
        stream.on('data', (chunk) => { output += chunk.toString('utf-8').replace(/[\x00-\x08]/g, ''); });
        stream.on('end', resolve);
      });

      const inspectResult = await exec.inspect();

      return {
        container: validation.container.name,
        arquivo: safePath,
        sucesso: inspectResult.ExitCode === 0,
        mensagem: inspectResult.ExitCode === 0 ? 'Arquivo editado com sucesso' : `Erro ao editar: ${output.trim()}`
      };
    } catch (error) {
      return { erro: `Falha ao editar arquivo: ${error.message}` };
    }
  },

  async executar_comando({ comando, container_id }, userId) {
    const validation = await validateContainerOwnership(container_id, userId);
    if (validation.error) return { erro: validation.error };

    try {
      const exec = await validation.dockerContainer.exec({
        Cmd: ['/bin/sh', '-c', comando],
        AttachStdout: true,
        AttachStderr: true
      });

      const stream = await exec.start({ Detach: false });
      let output = '';
      await new Promise((resolve) => {
        stream.on('data', (chunk) => { output += chunk.toString('utf-8').replace(/[\x00-\x08]/g, ''); });
        stream.on('end', resolve);
      });

      const inspectResult = await exec.inspect();

      if (output.length > 10000) {
        output = output.substring(0, 10000) + '\n... (truncado)';
      }

      return {
        container: validation.container.name,
        comando: comando,
        output: output.trim() || '(sem output)',
        exit_code: inspectResult.ExitCode
      };
    } catch (error) {
      return { erro: `Falha ao executar comando: ${error.message}` };
    }
  }
};

// ============================================
// 🔧 EXECUTOR DE FUNÇÕES
// ============================================

async function executeFunction(functionName, args, userId) {
  const fn = functionImplementations[functionName];
  if (!fn) {
    return { erro: `Função '${functionName}' não encontrada` };
  }

  try {
    console.log(`🔧 MozHost IA - Executando: ${functionName}`, JSON.stringify(args));
    const result = await fn(args, userId);
    console.log(`✅ Função ${functionName} executada com sucesso`);
    return result;
  } catch (error) {
    console.error(`❌ Erro na função ${functionName}:`, error.message);
    return { erro: `Falha ao executar ${functionName}: ${error.message}` };
  }
}

module.exports = {
  functionDeclarations,
  executeFunction
};
