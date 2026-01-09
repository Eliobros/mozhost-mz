const fetch = require('node-fetch');
const db = require('../models/database');

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
        const response = await fetch(`${process.env.ALAUDA_API_URL}/api/validate/key`, {
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
            // Atualiza
            await db.query(`
                UPDATE users 
                SET username = ?, email = ?, email_plan = ?, last_sync_at = NOW()
                WHERE alauda_user_id = ?
            `, [alaudaData.userName, alaudaData.email, alaudaData.plan, alaudaData.userId]);

            return existing[0].id;
        } else {
            // Cria novo
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
 * Middleware principal
 */
const alaudaAuthMiddleware = async (req, res, next) => {
    try {
        // 1. Extrai API Key
        const apiKey = req.headers['x-api-key'] ||
                      req.headers.authorization?.replace('Bearer ', '');

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API Key não fornecida',
                message: 'Use: X-API-Key ou Authorization: Bearer <key>'
            });
        }

        // 2. Verifica cache
        const cached = validationCache.get(apiKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            req.user = cached.data.user;
            req.alaudaKey = cached.data.alaudaKey;
            return next();
        }

        // 3. Valida com Alauda
        console.log('[Alauda Auth] Validando key...');
        const alaudaResponse = await validateWithAlauda(apiKey);

        if (!alaudaResponse || !alaudaResponse.success) {
            validationCache.delete(apiKey);
            return res.status(401).json({
                success: false,
                error: 'API Key inválida ou expirada'
            });
        }

        const alaudaData = alaudaResponse.data;

        // 4. Verifica status
        if (!alaudaData.active) {
            return res.status(403).json({
                success: false,
                error: 'API Key desativada'
            });
        }

        if (alaudaData.suspended) {
            return res.status(403).json({
                success: false,
                error: 'API Key suspensa',
                message: alaudaData.suspensionReason || 'Key suspensa'
            });
        }

        // 5. Sincroniza localmente
        const localUserId = await syncUserLocally(alaudaData);

        // 6. Prepara dados
        const userData = {
            id: localUserId,
            userId: localUserId,
            alaudaUserId: alaudaData.userId,
            username: alaudaData.userName,
            email: alaudaData.email,
            plan: alaudaData.plan,
            isActive: true
        };

        // 7. Cache
        validationCache.set(apiKey, {
            timestamp: Date.now(),
            data: { user: userData, alaudaKey: alaudaData }
        });

        // 8. Adiciona no request
        req.user = userData;
        req.alaudaKey = alaudaData;
        req.clientIP = getClientIP(req);

        console.log(`[Alauda Auth] ✅ ${userData.username} (${userData.plan})`);
        next();

    } catch (error) {
        console.error('[Alauda Auth] Erro:', error);
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
