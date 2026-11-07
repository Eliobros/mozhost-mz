const express = require('express');
const router = express.Router();
const EmailService = require('../services/EmailService');
const checkEmailQuota = require('../middleware/checkEmailQuota');
const alaudaAuthMiddleware = require('../middleware/alaudaAuth');

// Enviar email
router.post('/send', alaudaAuthMiddleware, checkEmailQuota, async (req, res) => {
  try {
    const { to, subject, html, text, fromName } = req.body;
    
    // Validações
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        success: false,
        error: 'Campos obrigatórios: to, subject, e (html ou text)' 
      });
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ 
        success: false,
        error: 'Email inválido' 
      });
    }

    const emailService = new EmailService();
    const result = await emailService.send({
      userId: req.user.id, // ← Vem do seu authMiddleware
      to,
      subject,
      html,
      text,
      fromName
    });

    res.json({ 
      success: true, 
      messageId: result.messageId,
      message: 'Email enviado com sucesso',
      quota: req.emailQuota
    });

  } catch (error) {
    console.error('[Email] Erro ao enviar:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Erro ao enviar email' 
    });
  }
});

// Ver estatísticas de emails
router.get('/stats', alaudaAuthMiddleware, async (req, res) => {
  try {
    const emailService = new EmailService();
    const stats = await emailService.getStats(req.user.id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Email] Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Listar emails enviados (histórico)
router.get('/logs', alaudaAuthMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const emailService = new EmailService();
    const logs = await emailService.getLogs(req.user.id, { 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('[Email] Erro ao buscar logs:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Ver quota atual
router.get('/quota', alaudaAuthMiddleware, async (req, res) => {
  try {
    const emailService = new EmailService();
    const quota = await emailService.getQuota(req.user.id);
    
    res.json({
      success: true,
      data: quota
    });
  } catch (error) {
    console.error('[Email] Erro ao buscar quota:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// =========================================================================
// NOVAS ROTAS - SERVIÇO DE E-MAIL CORPORATIVO DEDICADO (SaaS)
// =========================================================================
const dns = require('dns').promises;
const crypto = require('crypto');
const db = require('../models/database'); // Sua classe Database configurada

// Email API da VPS de e-mail: só aceita requisições vindas do IP desta máquina
const EMAIL_API_URL = 'http://13.121.82.195:3002';
const EMAIL_API_TIMEOUT_MS = 20000;

// Mesma validação da email-api: evita domínio malformado/injeção antes de sair daqui
const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,63}$/;

const normalizeDomain = (value) => String(value || '').toLowerCase().trim();
const isValidDomain = (value) => DOMAIN_REGEX.test(value);

// Chamada à email-api com timeout: sem isso o painel ficaria pendurado se a VPS travasse
const callEmailApi = async (pathAndQuery, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), EMAIL_API_TIMEOUT_MS);
    try {
        const response = await fetch(`${EMAIL_API_URL}${pathAndQuery}`, { ...options, signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
    } finally {
        clearTimeout(timer);
    }
};

// 1. ADICIONAR DOMÍNIO E GERAR TOKEN DE VERIFICAÇÃO TXT
// Endpoint: POST /api/emails/corporate/domain/add
router.post('/corporate/domain/add', alaudaAuthMiddleware, async (req, res) => {
    const { domainName } = req.body;
    
    if (!domainName) {
        return res.status(400).json({ success: false, error: 'O nome do domínio é obrigatório.' });
    }

    const name = normalizeDomain(domainName);

    if (!isValidDomain(name)) {
        return res.status(400).json({ success: false, error: 'Formato de domínio inválido. Ex: seunegocio.com' });
    }

    try {
        // Gera um token único (ex: mozhost-verification=a1b2c3d4...)
        const token = `mozhost-verification=${crypto.randomBytes(16).toString('hex')}`;
        
        // Salva na tabela virtual_domains da VPS externa com status "não verificado" (verified = 0)
        await db.queryEmail(
            'INSERT INTO virtual_domains (name, verified, verification_token) VALUES (?, 0, ?)',
            [name, token]
        );

        return res.status(201).json({
            success: true,
            message: 'Domínio pré-registrado. Adicione o registro TXT no seu gerenciador de DNS para validar.',
            domain: name,
            txtRecordName: '@',
            txtRecordValue: token
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, error: 'Este domínio já está cadastrado no sistema de e-mail.' });
        }
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 1.1 CONSULTAR STATUS DO DOMÍNIO CORPORATIVO (token + verificação)
// Endpoint: GET /api/emails/corporate/domain/status/:domainName
router.get('/corporate/domain/status/:domainName', alaudaAuthMiddleware, async (req, res) => {
    const { domainName } = req.params;

    if (!domainName) {
        return res.status(400).json({ success: false, error: 'O nome do domínio é obrigatório.' });
    }

    const name = normalizeDomain(domainName);

    if (!isValidDomain(name)) {
        return res.status(400).json({ success: false, error: 'Formato de domínio inválido.' });
    }

    try {
        const rows = await db.queryEmail(
            'SELECT name, verification_token, verified FROM virtual_domains WHERE name = ?',
            [name]
        );

        // Domínio ainda não cadastrado: resposta 200 para o painel decidir o estado inicial
        if (!rows || rows.length === 0) {
            return res.json({ success: true, domain: name, exists: false, verified: false, token: null });
        }

        const domainRecord = rows[0];

        return res.json({
            success: true,
            domain: domainRecord.name,
            exists: true,
            verified: domainRecord.verified === 1,
            token: domainRecord.verification_token || null
        });
    } catch (error) {
        console.error('Error fetching corporate domain status:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 2. BOTÃO "VERIFICAR DOMÍNIO" - CONSULTA O DNS E ATIVA O DKIM AUTOMATICAMENTE
// Endpoint: POST /api/emails/corporate/domain/verify
router.post('/corporate/domain/verify', alaudaAuthMiddleware, async (req, res) => {
    const { domainName } = req.body;

    if (!domainName) {
        return res.status(400).json({ success: false, error: 'O nome do domínio é obrigatório.' });
    }

    const name = normalizeDomain(domainName);

    if (!isValidDomain(name)) {
        return res.status(400).json({ success: false, error: 'Formato de domínio inválido.' });
    }

    try {
        // Busca o token gerado para esse domínio direto na VPS de e-mail
        const rows = await db.queryEmail(
            'SELECT id, verification_token, verified FROM virtual_domains WHERE name = ?',
            [name]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Este domínio não foi adicionado no painel ainda.' });
        }

        const domainRecord = rows[0];

        if (domainRecord.verified === 1) {
            return res.json({ success: true, message: 'Este domínio já se encontra verificado.' });
        }

        const expectedToken = domainRecord.verification_token;

        // Faz a pesquisa real de registros TXT usando o resolvedor DNS do Node.js
        const records = await dns.resolveTxt(name);
        const flatRecords = records.flat();

        // Compara se o token gerado pela MozHost foi encontrado no DNS do domínio
        if (flatRecords.includes(expectedToken)) {
            
            // -------------------------------------------------------------------------
            // DISPARO AUTOMÁTICO PARA A EMAIL-API (VPS DE E-MAIL) GERAR O DKIM
            // -------------------------------------------------------------------------
            let dkimError = null;

            try {
                const result = await callEmailApi('/api/v1/dkim/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domainName: name })
                });

                if (!result.ok) {
                    dkimError = result.data?.error || `email-api respondeu com status ${result.status}`;
                }
            } catch (apiError) {
                dkimError = apiError.name === 'AbortError'
                    ? 'timeout ao falar com o servidor de e-mail'
                    : apiError.message;
            }
            // -------------------------------------------------------------------------

            // Sem DKIM o e-mail sairia sem assinatura (spam/phishing): não ativamos o domínio
            // e devolvemos erro para o cliente poder clicar em "Verificar" novamente.
            if (dkimError) {
                console.error(`⚠️ Falha ao gerar DKIM para ${name}: ${dkimError}`);
                return res.status(502).json({
                    success: false,
                    error: 'O DNS foi confirmado, mas não foi possível gerar as chaves DKIM agora. Tente novamente em alguns instantes.'
                });
            }

            console.log(`✨ DKIM Automático gerado com sucesso via API para ${name}`);

            // Ativa o domínio na VPS externa (verified = 1) após gerar as chaves
            await db.queryEmail(
                'UPDATE virtual_domains SET verified = 1 WHERE name = ?',
                [name]
            );

            return res.json({ 
                success: true, 
                message: 'Domínio verificado, chaves de criptografia aplicadas e serviço ativado com sucesso!' 
            });
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Token de verificação não encontrado no DNS. Certifique-se de salvar as alterações e aguarde a propagação.' 
            });
        }
    } catch (error) {
        console.error('DNS Verification Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Nenhum registro TXT foi detectado ou ocorreu um erro na consulta ao servidor DNS.' 
        });
    }
});


// 3. CRIAR CONTA DE E-MAIL CORPORATIVA (ex: contacto@empresa.site)
// Endpoint: POST /api/emails/corporate/account/create
router.post('/corporate/account/create', alaudaAuthMiddleware, async (req, res) => {
    const { domainName, emailPrefix, plainPassword } = req.body;
    
    if (!domainName || !emailPrefix || !plainPassword) {
        return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios.' });
    }

    const fullEmail = `${emailPrefix.toLowerCase().trim()}@${domainName.toLowerCase().trim()}`;

    try {
        // Verifica se o domínio existe e está devidamente validado por DNS
        const domains = await db.queryEmail(
            'SELECT id FROM virtual_domains WHERE name = ? AND verified = 1',
            [domainName.toLowerCase().trim()]
        );

        if (!domains || domains.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'O domínio correspondente não está verificado ou não foi encontrado.' 
            });
        }

        const domainId = domains[0].id;
        
        // Define a assinatura do Salt clássico Linux para gerar o SHA512-CRYPT ($6$)
        const salt = `$6$${crypto.randomBytes(8).toString('hex')}$`;

        // Executa a query utilizando a função nativa ENCRYPT do MariaDB/MySQL na VPS externa
        await db.queryEmail(
            'INSERT INTO virtual_users (domain_id, email, password, quota_gb) VALUES (?, ?, ENCRYPT(?, ?), 5)',
            [domainId, fullEmail, plainPassword, salt]
        );

        return res.status(201).json({ 
            success: true, 
            message: `A conta corporativa ${fullEmail} foi criada com sucesso no servidor dedicado.` 
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, error: 'Esta conta de e-mail corporativo já existe.' });
        }
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 4. LISTAR TODAS AS CONTAS DE E-MAIL DE UM DOMÍNIO VERIFICADO
// Endpoint: GET /api/emails/corporate/accounts/:domainName
router.get('/corporate/accounts/:domainName', alaudaAuthMiddleware, async (req, res) => {
    const { domainName } = req.params;

    if (!domainName) {
        return res.status(400).json({ success: false, error: 'O nome do domínio é obrigatório.' });
    }

    try {
        // Busca as contas associadas ao domínio na VPS de e-mail
        const rows = await db.queryEmail(
            `SELECT u.id, u.email, u.quota_gb 
             FROM virtual_users u
             JOIN virtual_domains d ON u.domain_id = d.id
             WHERE d.name = ?`,
            [domainName.toLowerCase().trim()]
        );

        return res.json({
            success: true,
            domain: domainName.toLowerCase().trim(),
            accounts: rows
        });
    } catch (error) {
        console.error('Error listing email accounts:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 5. APAGAR UMA CONTA DE E-MAIL CORPORATIVA
// Endpoint: DELETE /api/emails/corporate/account/delete
router.delete('/corporate/account/delete', alaudaAuthMiddleware, async (req, res) => {
    const { email } = req.body; // ex: 'contacto@empresa.site'

    if (!email) {
        return res.status(400).json({ success: false, error: 'O endereço de e-mail é obrigatório.' });
    }

    try {
        // Executa a remoção direta na tabela virtual_users da VPS externa
        const result = await db.queryEmail(
            'DELETE FROM virtual_users WHERE email = ?',
            [email.toLowerCase().trim()]
        );

        // O MariaDB retorna informações sobre as linhas afetadas
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Esta conta de e-mail não foi encontrada no servidor.' });
        }

        return res.json({
            success: true,
            message: `A conta ${email.toLowerCase().trim()} foi excluída permanentemente do servidor dedicado.`
        });
    } catch (error) {
        console.error('Error deleting email account:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 6. BUSCAR A CHAVE PÚBLICA DKIM DO DOMÍNIO PARA EXIBIR NO PAINEL
// Endpoint: GET /api/emails/corporate/domain/dkim/:domainName
router.get('/corporate/domain/dkim/:domainName', alaudaAuthMiddleware, async (req, res) => {
    const { domainName } = req.params;

    if (!domainName) {
        return res.status(400).json({ success: false, error: 'O nome do domínio é obrigatório.' });
    }

    const name = normalizeDomain(domainName);

    if (!isValidDomain(name)) {
        return res.status(400).json({ success: false, error: 'Formato de domínio inválido.' });
    }

    try {
        // Requisita à email-api na VPS de e-mail o conteúdo do arquivo .txt gerado pelo OpenDKIM
        const result = await callEmailApi(`/api/v1/dkim/get?domain=${encodeURIComponent(name)}`);

        if (!result.ok) {
            if (result.status === 404) {
                return res.status(404).json({
                    success: false,
                    error: 'Chave DKIM ainda não gerada. Certifique-se de que o domínio já foi verificado por DNS.'
                });
            }

            console.error(`⚠️ Email API recusou a leitura do DKIM de ${name}: status ${result.status}`);
            return res.status(502).json({
                success: false,
                error: result.data?.error || 'Servidor de e-mail indisponível para retornar a chave DKIM.'
            });
        }

        return res.json({
            success: true,
            domain: name,
            recordName: 'mozhost._domainkey',
            recordType: 'TXT',
            recordValue: result.data.dkimRecordValue // O texto gigante que vai para o DNS
        });

    } catch (error) {
        console.error('Error fetching DKIM from Email API:', error);
        return res.status(502).json({ success: false, error: 'Erro ao conectar ao servidor de e-mail auxiliar.' });
    }
});



module.exports = router;
