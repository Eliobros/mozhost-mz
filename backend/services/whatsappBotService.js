// services/whatsappBotService.js
const database = require('../models/database');
const mozhostAi = require('./mozhostAiService');

class WhatsAppBotService {
  /**
   * Processa mensagens recebidas no WhatsApp
   * @param {object} sock - Socket do Baileys
   * @param {object} msg - Mensagem recebida
   */
  async handleMessage(sock, msg) {
    if (msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const phoneNumber = from.replace('@s.whatsapp.net', '');
    const text = msg.message?.conversation ||
                 msg.message?.extendedTextMessage?.text;

    if (!text) return;

    const command = text.trim().toLowerCase();

    // Só processar comandos que começam com !
    if (!command.startsWith('!')) return;

    console.log(`📩 Comando WhatsApp de ${phoneNumber}: ${command}`);

    try {
      // Comando !ia aceita texto livre depois (ex: !ia quantos usuários temos?)
      if (command.startsWith('!ia ') || command === '!ia') {
        await this.handleIA(sock, from, phoneNumber, text.trim());
        return;
      }

      switch (command) {
        case '!vincular':
          await this.handleVincular(sock, from, phoneNumber);
          break;
        case '!menu':
        case '!ajuda':
        case '!help':
          await this.handleMenu(sock, from);
          break;
        case '!saldo':
          await this.handleSaldo(sock, from, phoneNumber);
          break;
        case '!containers':
        case '!status':
          await this.handleContainers(sock, from, phoneNumber);
          break;
        case '!plano':
          await this.handlePlano(sock, from, phoneNumber);
          break;
        case '!faturas':
        case '!pagamento':
          await this.handleFaturas(sock, from, phoneNumber);
          break;
        case '!dominios':
          await this.handleDominios(sock, from, phoneNumber);
          break;
        case '!suporte':
          await this.handleSuporte(sock, from);
          break;
        case '!desvincular':
          await this.handleDesvincular(sock, from, phoneNumber);
          break;
        default:
          await sock.sendMessage(from, {
            text: `❌ Comando não reconhecido.\n\nDigite *!menu* para ver os comandos disponíveis.`
          });
      }
    } catch (error) {
      console.error('❌ Erro ao processar comando WhatsApp:', error);
      await sock.sendMessage(from, {
        text: `❌ Erro ao processar comando. Tente novamente.`
      });
    }
  }

  /**
   * Busca o usuário vinculado a um número de WhatsApp
   */
  async getLinkedUser(phoneNumber) {
    const rows = await database.query(
      `SELECT wa.user_id, u.username, u.email, u.coins, u.plan, u.max_containers
       FROM whatsapp_accounts wa
       JOIN users u ON wa.user_id = u.id
       WHERE wa.whatsapp_number = ? AND wa.verified = TRUE`,
      [phoneNumber]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Envia mensagem de "conta não vinculada"
   */
  async sendNotLinked(sock, from) {
    await sock.sendMessage(from, {
      text: `❌ *WhatsApp não vinculado!*\n\nEnvie *!vincular* para vincular sua conta MozHost.`
    });
  }

  // ========== COMANDOS ==========

  async handleVincular(sock, from, phoneNumber) {
    // Verificar se já está vinculado
    const user = await this.getLinkedUser(phoneNumber);

    if (user) {
      await sock.sendMessage(from, {
        text: `✅ *WhatsApp já vinculado!*\n\n` +
              `👤 Usuário: ${user.username}\n` +
              `📧 Email: ${user.email}\n\n` +
              `Digite *!menu* para ver os comandos disponíveis.`
      });
      return;
    }

    // Gerar código único
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'MOZH-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Limpar códigos antigos deste número
    await database.query(
      'DELETE FROM whatsapp_accounts WHERE whatsapp_number = ? AND verified = FALSE',
      [phoneNumber]
    );

    // Criar registro pendente
    await database.query(
      'INSERT INTO whatsapp_accounts (whatsapp_number, verification_code, code_expires_at, verified) VALUES (?, ?, ?, FALSE)',
      [phoneNumber, code, expiresAt]
    );

    await sock.sendMessage(from, {
      text: `🔐 *Código de Vinculação MozHost*\n\n` +
            `Seu código: *${code}*\n\n` +
            `⏰ Válido por 15 minutos\n\n` +
            `📱 Acesse o painel MozHost e digite este código na seção "Vincular WhatsApp"\n\n` +
            `🔗 https://mozhost.shop`
    });
  }

  async handleMenu(sock, from) {
    await sock.sendMessage(from, {
      text: `🤖 *MozHost Bot - Comandos*\n\n` +
            `*Vinculação:*\n` +
            `!vincular - Gerar código de vinculação\n` +
            `!desvincular - Remover vinculação\n\n` +
            `*Conta:*\n` +
            `!saldo - Ver seus coins\n` +
            `!plano - Ver detalhes do plano\n\n` +
            `*Containers:*\n` +
            `!containers - Listar containers\n` +
            `!status - Status dos containers\n` +
            `!dominios - Listar seus domínios\n\n` +
            `*Pagamento:*\n` +
            `!faturas - Ver últimos pagamentos\n\n` +
            `*IA:*\n` +
            `!ia <pergunta> - Consultar dados com IA\n\n` +
            `*Suporte:*\n` +
            `!suporte - Falar com suporte\n` +
            `!menu - Ver este menu`
    });
  }

  async handleSaldo(sock, from, phoneNumber) {
    const user = await this.getLinkedUser(phoneNumber);
    if (!user) return this.sendNotLinked(sock, from);

    await sock.sendMessage(from, {
      text: `💰 *Saldo de Coins*\n\n` +
            `👤 ${user.username}\n` +
            `🪙 Coins: *${user.coins}*\n\n` +
            `Acesse o painel para comprar mais coins:\n` +
            `🔗 https://mozhost.shop`
    });
  }

  async handleContainers(sock, from, phoneNumber) {
    const user = await this.getLinkedUser(phoneNumber);
    if (!user) return this.sendNotLinked(sock, from);

    const containers = await database.query(
      'SELECT name, status, domain FROM containers WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [user.user_id]
    );

    if (containers.length === 0) {
      await sock.sendMessage(from, {
        text: `📦 *Seus Containers*\n\nVocê ainda não tem containers.\n\nAcesse o painel para criar:\n🔗 https://mozhost.shop`
      });
      return;
    }

    const statusEmoji = { running: '🟢', stopped: '🔴', error: '⚠️', building: '🟡' };
    const containerList = containers.map(c =>
      `${statusEmoji[c.status] || '⚪'} *${c.name}*\n   Status: ${c.status}${c.domain ? `\n   🔗 ${c.domain}` : ''}`
    ).join('\n\n');

    await sock.sendMessage(from, {
      text: `📦 *Seus Containers (${containers.length})*\n\n${containerList}`
    });
  }

  async handlePlano(sock, from, phoneNumber) {
    const user = await this.getLinkedUser(phoneNumber);
    if (!user) return this.sendNotLinked(sock, from);

    const containers = await database.query(
      'SELECT COUNT(*) as count FROM containers WHERE user_id = ?',
      [user.user_id]
    );

    const subscriptions = await database.query(
      `SELECT s.expires_at, s.status, c.name as container_name
       FROM subscriptions s
       JOIN containers c ON s.container_id = c.id
       WHERE s.user_id = ? AND s.status != 'expired'
       ORDER BY s.expires_at ASC LIMIT 5`,
      [user.user_id]
    );

    let subsText = '';
    if (subscriptions.length > 0) {
      subsText = '\n\n*Assinaturas ativas:*\n' + subscriptions.map(s => {
        const expires = new Date(s.expires_at);
        const daysLeft = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24));
        return `📦 ${s.container_name}: ${daysLeft > 0 ? `${daysLeft} dias restantes` : 'Expirado'}`;
      }).join('\n');
    }

    await sock.sendMessage(from, {
      text: `💳 *Seu Plano*\n\n` +
            `👤 ${user.username}\n` +
            `📦 Plano: *${user.plan}*\n` +
            `🪙 Coins: *${user.coins}*\n` +
            `📦 Containers: ${containers[0].count}/${user.max_containers}` +
            subsText
    });
  }

  async handleFaturas(sock, from, phoneNumber) {
    const user = await this.getLinkedUser(phoneNumber);
    if (!user) return this.sendNotLinked(sock, from);

    const payments = await database.query(
      `SELECT amount, payment_method, status, coins_to_add, created_at
       FROM payments
       WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 5`,
      [user.user_id]
    );

    if (payments.length === 0) {
      await sock.sendMessage(from, {
        text: `💳 *Pagamentos*\n\nNenhum pagamento encontrado.\n\nAcesse o painel para comprar coins:\n🔗 https://mozhost.shop`
      });
      return;
    }

    const statusEmoji = { completed: '✅', pending: '⏳', failed: '❌', expired: '⌛' };
    const paymentList = payments.map(p => {
      const date = new Date(p.created_at).toLocaleDateString('pt-MZ');
      return `${statusEmoji[p.status] || '❓'} ${p.amount} MT (${p.payment_method})\n   ${p.coins_to_add} coins - ${date}`;
    }).join('\n\n');

    await sock.sendMessage(from, {
      text: `💳 *Últimos Pagamentos*\n\n${paymentList}`
    });
  }

  async handleIA(sock, from, phoneNumber, fullText) {
    const user = await this.getLinkedUser(phoneNumber);
    if (!user) return this.sendNotLinked(sock, from);

    // Extrair a pergunta (remover o "!ia " do início)
    const pergunta = fullText.substring(3).trim();

    if (!pergunta) {
      await sock.sendMessage(from, {
        text: `🤖 *MozHost IA*\n\nEnvie sua pergunta após o comando.\n\n*Exemplo:*\n!ia quantos usuários estão inativos há 30 dias?\n!ia qual a receita do último mês?\n!ia buscar usuário fulano`
      });
      return;
    }

    // Indicar que está processando
    await sock.sendMessage(from, { text: `🤖 Processando...` });

    const result = await mozhostAi.chat(user.user_id, pergunta);

    if (!result.success) {
      await sock.sendMessage(from, {
        text: `❌ Erro na IA: ${result.error}`
      });
      return;
    }

    await sock.sendMessage(from, {
      text: `🤖 *MozHost IA*\n\n${result.response}`
    });
  }

  async handleDominios(sock, from, phoneNumber) {
    const user = await this.getLinkedUser(phoneNumber);
    if (!user) return this.sendNotLinked(sock, from);

    const containers = await database.query(
      'SELECT name, domain, status FROM containers WHERE user_id = ? AND domain IS NOT NULL AND domain != "" ORDER BY created_at DESC',
      [user.user_id]
    );

    if (containers.length === 0) {
      await sock.sendMessage(from, {
        text: `🌐 *Seus Domínios*\n\nNenhum domínio configurado.\n\nAcesse o painel para configurar:\n🔗 https://mozhost.shop`
      });
      return;
    }

    const statusEmoji = { running: '🟢', stopped: '🔴', error: '⚠️', building: '🟡' };
    const domainList = containers.map(c =>
      `🔗 *${c.domain}*\n   📦 Container: ${c.name}\n   ${statusEmoji[c.status] || '⚪'} Status: ${c.status}`
    ).join('\n\n');

    await sock.sendMessage(from, {
      text: `🌐 *Seus Domínios (${containers.length})*\n\n${domainList}`
    });
  }

  async handleSuporte(sock, from) {
    await sock.sendMessage(from, {
      text: `💬 *Suporte MozHost*\n\n` +
            `📧 Email: suporte@mozhost.com\n` +
            `🌐 Site: https://mozhost.shop\n\n` +
            `Responda esta mensagem e nossa equipe irá atendê-lo em breve!`
    });
  }

  async handleDesvincular(sock, from, phoneNumber) {
    const user = await this.getLinkedUser(phoneNumber);
    if (!user) return this.sendNotLinked(sock, from);

    await database.query(
      'DELETE FROM whatsapp_accounts WHERE whatsapp_number = ? AND verified = TRUE',
      [phoneNumber]
    );

    await sock.sendMessage(from, {
      text: `✅ *WhatsApp desvinculado!*\n\n` +
            `Sua conta foi desvinculada com sucesso.\n` +
            `Envie *!vincular* para vincular novamente.`
    });
  }
}

module.exports = new WhatsAppBotService();
