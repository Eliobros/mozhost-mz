require('dotenv').config();
const express = require('express');
const router = express.Router();
const dns = require('dns').promises;
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const EmailService = require('../services/EmailService');
const checkEmailQuota = require('../middleware/checkEmailQuota');
const alaudaAuthMiddleware = require('../middleware/alaudaAuth');

// =========================================================================
// BANCO DA VPS DE E-MAIL (REMOTO) - credenciais vêm do .env
// EMAIL_DB_HOST, EMAIL_DB_PORT, EMAIL_DB_USER, EMAIL_DB_PASSWORD,
// EMAIL_DB_NAME, EMAIL_DB_SSL (opcional: 'true')
// =========================================================================
const dbEmail = mysql.createPool({
    host: process.env.EMAIL_DB_HOST,
    port: process.env.EMAIL_DB_PORT || 3306,
    user: process.env.EMAIL_DB_USER,
    password: process.env.EMAIL_DB_PASSWORD,
    database: process.env.EMAIL_DB_NAME,
    ssl: process.env.EMAIL_DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

async function queryEmailDB(sql, params = []) {
    const [rows] = await dbEmail.execute(sql, params);
    return rows;
}

// =========================================================================
// ROTAS DE ENVIO DE E-MAIL (serviço normal)
// =========================================================================

// Enviar email
router.post('/send', alaudaAuthMiddleware, checkEmailQuota, async (req, res) => {
    try {
        const { to, subject, html, text, fromName } = req.body;

        if (!to || !subject || (!html && !text)) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: to, subject, e (html ou text)'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return res.status(400).json({ success: false, error: 'Email inválido' });
        }

        const emailService = new EmailService();
        const result = await emailService.send({
            userId: req.user.id,
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
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('[Email] Erro ao buscar estatísticas:', error);
        res.status(500).json({ success: false, error: error.message });
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
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('[Email] Erro ao buscar logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Ver quota atual
router.get('/quota', alaudaAuthMiddleware, async (req, res) => {
    try {
        const emailService = new EmailService();
        const quota = await emailService.getQuota(req.user.id);
        res.json({ success: true, data: quota });
    } catch (error) {
        console.error('[Email] Erro ao buscar quota:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// SERVIÇO DE E-MAIL CORPORATIVO DEDICADO (SaaS)
// =========================================================================

// Email API da VPS de e-mail: só aceita requisições vindas do IP desta máquina
const EMAIL_API_URL = process.env.EMAIL_API_URL || 'http://13.121.82.195:3002';
const EMAIL_API_TIMEOUT_MS = 20000;

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,63}$/;
const PREFIX_REGEX = /^[a-z0-9._-]{1,64}$/;

const normalizeDomain = (value) => String(value || '').toLowerCase().trim();
const isValidDomain = (value) => DOMAIN_REGEX.test(value);

// Chamada à email-api com timeout
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
// POST /api/emails/corporate/domain/add
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
        const token = `mozhost-verification=${crypto.randomBytes(16).toString('hex')}`;

        await queryEmailDB(
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
        console.error('Error adding corporate domain:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 1.1 CONSULTAR STATUS DO DOMÍNIO CORPORATIVO
// GET /api/emails/corporate/domain/status/:domainName
router.get('/corporate/domain/status/:domainName', alaudaAuthMiddleware, async (req, res) => {
    const name = normalizeDomain(req.params.domainName);

    if (!name) {
        return res.status(400).json({ success: false, error: 'O nome do domínio é obrigatório.' });
    }

    if (!isValidDomain(name)) {
        return res.status(400).json({ success: false, error: 'Formato de domínio inválido.' });
    }

    try {
        const rows = await queryEmailDB(
            'SELECT name, verification_token, verified FROM virtual_domains WHERE name = ?',
            [name]
        );

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

// 2. VERIFICAR DOMÍNIO (DNS TXT) E GERAR DKIM AUTOMATICAMENTE
// POST /api/emails/corporate/domain/verify
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
        const rows = await queryEmailDB(
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

        const records = await dns.resolveTxt(name);
        const flatRecords = records.flat();

        if (flatRecords.includes(expectedToken)) {
            // Dispara a email-api (VPS de e-mail) para gerar o DKIM
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

            // Sem DKIM o e-mail sairia sem assinatura: não ativamos o domínio
            if (dkimError) {
                console.error(`⚠️ Falha ao gerar DKIM para ${name}: ${dkimError}`);
                return res.status(502).json({
                    success: false,
                    error: 'O DNS foi confirmado, mas não foi possível gerar as chaves DKIM agora. Tente novamente em alguns instantes.'
                });
            }

            console.log(`✨ DKIM automático gerado com sucesso via API para ${name}`);

            await queryEmailDB(
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
// POST /api/emails/corporate/account/create
router.post('/corporate/account/create', alaudaAuthMiddleware, async (req, res) => {
    const { domainName, emailPrefix, plainPassword } = req.body;

    if (!domainName || !emailPrefix || !plainPassword) {
        return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios.' });
    }

    const name = normalizeDomain(domainName);
    const prefix = String(emailPrefix).toLowerCase().trim();

    if (!isValidDomain(name)) {
        return res.status(400).json({ success: false, error: 'Formato de domínio inválido.' });
    }

    if (!PREFIX_REGEX.test(prefix)) {
        return res.status(400).json({ success: false, error: 'Nome da conta inválido. Use letras, números, ponto, hífen ou underscore.' });
    }

    if (String(plainPassword).length < 8) {
        return res.status(400).json({ success: false, error: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    const fullEmail = `${prefix}@${name}`;

    try {
        const domains = await queryEmailDB(
            'SELECT id FROM virtual_domains WHERE name = ? AND verified = 1',
            [name]
        );

        if (!domains || domains.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'O domínio correspondente não está verificado ou não foi encontrado.'
            });
        }

        const domainId = domains[0].id;

        // Salt para SHA512-CRYPT ($6$)
        const salt = `$6$${crypto.randomBytes(8).toString('hex')}$`;

        await queryEmailDB(
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
        console.error('Error creating email account:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 4. LISTAR CONTAS DE E-MAIL DE UM DOMÍNIO
// GET /api/emails/corporate/accounts/:domainName
router.get('/corporate/accounts/:domainName', alaudaAuthMiddleware, async (req, res) => {
    const name = normalizeDomain(req.params.domainName);

    if (!name) {
        return res.status(400).json({ success: false, error: 'O nome do domínio é obrigatório.' });
    }

    if (!isValidDomain(name)) {
        return res.status(400).json({ success: false, error: 'Formato de domínio inválido.' });
    }

    try {
        const rows = await queryEmailDB(
            `SELECT u.id, u.email, u.quota_gb
             FROM virtual_users u
             JOIN virtual_domains d ON u.domain_id = d.id
             WHERE d.name = ?`,
            [name]
        );

        return res.json({ success: true, domain: name, accounts: rows });
    } catch (error) {
        console.error('Error listing email accounts:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 5. APAGAR UMA CONTA DE E-MAIL CORPORATIVA
// DELETE /api/emails/corporate/account/delete
router.delete('/corporate/account/delete', alaudaAuthMiddleware, async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: 'O endereço de e-mail é obrigatório.' });
    }

    const target = String(email).toLowerCase().trim();

    try {
        const result = await queryEmailDB(
            'DELETE FROM virtual_users WHERE email = ?',
            [target]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Esta conta de e-mail não foi encontrada no servidor.' });
        }

        return res.json({
            success: true,
            message: `A conta ${target} foi excluída permanentemente do servidor dedicado.`
        });
    } catch (error) {
        console.error('Error deleting email account:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 6. BUSCAR A CHAVE PÚBLICA DKIM DO DOMÍNIO
// GET /api/emails/corporate/domain/dkim/:domainName
router.get('/corporate/domain/dkim/:domainName', alaudaAuthMiddleware, async (req, res) => {
    const name = normalizeDomain(req.params.domainName);

    if (!name) {
        return res.status(400).json({ success: false, error: 'O nome do domínio é obrigatório.' });
    }

    if (!isValidDomain(name)) {
        return res.status(400).json({ success: false, error: 'Formato de domínio inválido.' });
    }

    try {
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
            recordValue: result.data.dkimRecordValue
        });
    } catch (error) {
        console.error('Error fetching DKIM from Email API:', error);
        return res.status(502).json({ success: false, error: 'Erro ao conectar ao servidor de e-mail auxiliar.' });
    }
});

module.exports = router;
