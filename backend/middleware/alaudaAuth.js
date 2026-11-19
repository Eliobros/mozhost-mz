const fetch = require('node-fetch');
const jwt = require('jsonwebtoken'); // Adicionado para ler o token JWT do painel
const db = require('../models/database');
const { alaudaApi } = require('../utils/alaudaUrl');

/**
 * Obtém IP do cliente
 */
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'unknown';
}

/**
 * Cache em memória (5 minutos)
 */
const validationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Valida API Key com Alauda
 */
async function validateWithAlauda(apiKey) {
    try {
        const response = await fetch(alaudaApi('/validate/key'), {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();

    } catch (error) {
        console.error('[Alauda Auth] Erro:', error.message);
        return null;
    }
}

/**
 * Sincroniza usuário localmente
 */
async function syncUserLocally(alaudaData) {
    try {
        const existing = await db.query(
            'SELECT * FROM users WHERE alauda_user_id = ?',
            [alaudaData.userId]
        );

        if (existing.length > 0) {
            await db.query(`
                UPDATE users
                SET username = ?, email = ?, email_plan = ?, last_sync_at = NOW()
                WHERE alauda_user_id = ?
            `, [alaudaData.userName, alaudaData.email, alaudaData.plan, alaudaData.userId]);

            return existing[0].id;
        } else {
            const quotas = { free: 500, basic: 5000, pro: 50000, premium: 100000 };
            const result = await db.query(`
                INSERT INTO users (
                    username, email, password_hash, alauda_user_id,
                    email_plan, email_quota, plan, is_active,
                    last_sync_at, created_at
                ) VALUES (?, ?, 'ALAUDA_AUTH', ?, ?, ?, ?, true, NOW(), NOW())
            `, [
                alaudaData.userName,
                alaudaData.email,
                alaudaData.userId,
                alaudaData.plan,
                quotas[alaudaData.plan] || 500,
                alaudaData.plan
            ]);

            return result.insertId;
        }
    } catch (error) {
        console.error('[Alauda Auth] Erro ao sincronizar:', error);
        throw error;
    }
}

/**
 * Middleware principal corrigido
 */
const alaudaAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const xApiKey = req.headers['x-api-key'];
        
        let tokenOrKey = xApiKey || authHeader?.replace('Bearer ', '');

        if (!tokenOrKey) {
            return res.status(401).json({
                success: false,
                error: 'API Key ou Token não fornecido',
                message: 'Use: X-API-Key ou Authorization: Bearer <token>'
            });
        }

        // =====================================================================
        // CASO 1: Requisição veio do Painel Web (Token JWT começando com 'ey')
        // =====================================================================
        if (authHeader && tokenOrKey.startsWith('ey')) {
            try {
                // Decodifica o JWT usando a secret local da MozHost
                const decoded = jwt.verify(tokenOrKey, process.env.JWT_SECRET);
                
                req.user = {
                    id: decoded.userId,
                    userId: decoded.userId,
                    username: decoded.username,
                    email: decoded.email,
                    plan: decoded.plan || 'free',
                    isActive: true
                };
                req.clientIP = getClientIP(req);

                // injeta a sua chave mestra do .env para uso interno, caso precise
                req.alaudaKey = process.env.ALAUDA_API_KEY; 

                console.log(`[Alauda Auth] ✅ Painel Web autenticado via JWT: ${req.user.username}`);
                return next(); // Libera o acesso direto
                
            } catch (jwtError) {
                console.error('[Alauda Auth] JWT inválido:', jwtError.message);
                return res.status(401).json({
                    success: false,
                    error: 'Sessão expirada. Faça login novamente.'
                });
            }
        }

        // =====================================================================
        // CASO 2: Requisição externa / API Key Tradicional estática
        // =====================================================================
        const cached = validationCache.get(tokenOrKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            req.user = cached.data.user;
            req.alaudaKey = cached.data.alaudaKey;
            return next();
        }

        console.log('[Alauda Auth] Validando API Key com a Alauda...');
        const alaudaResponse = await validateWithAlauda(tokenOrKey);

        if (!alaudaResponse || !alaudaResponse.success) {
            validationCache.delete(tokenOrKey);
            return res.status(401).json({
                success: false,
                error: 'API Key inválida ou expirada'
            });
        }

        const alaudaData = alaudaResponse.data;

        if (!alaudaData.active) {
            return res.status(403).json({ success: false, error: 'API Key desativada' });
        }

        if (alaudaData.suspended) {
            return res.status(403).json({
                success: false,
                error: 'API Key suspensa',
                message: alaudaData.suspensionReason || 'Key suspensa'
            });
        }

        const localUserId = await syncUserLocally(alaudaData);

        const userData = {
            id: localUserId,
            userId: localUserId,
            alaudaUserId: alaudaData.userId,
            username: alaudaData.userName,
            email: alaudaData.email,
            plan: alaudaData.plan,
            isActive: true
        };

        validationCache.set(tokenOrKey, {
            timestamp: Date.now(),
            data: { user: userData, alaudaKey: tokenOrKey }
        });

        req.user = userData;
        req.alaudaKey = tokenOrKey;
        req.clientIP = getClientIP(req);

        console.log(`[Alauda Auth] ✅ API Key válida: ${userData.username}`);
        next();

    } catch (error) {
        console.error('[Alauda Auth] Erro Crítico:', error);
        res.status(500).json({
            success: false,
            error: 'Erro na autenticação'
        });
    }
};

// Limpa cache periodicamente
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of validationCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            validationCache.delete(key);
        }
    }
}, 10 * 60 * 1000);

module.exports = alaudaAuthMiddleware;
