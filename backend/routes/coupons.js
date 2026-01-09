// routes/coupons.js

const express = require('express');
const router = express.Router();
const database = require('../models/database');
const authMiddleware = require('../middleware/auth');
const { authenticateAdmin } = require('../middleware/auth');

// ============================================
// ROTAS ADMIN
// ============================================

// Criar cupom
router.post('/admin/coupons/create', authenticateAdmin, async (req, res) => {
  try {
    const { code, coins, maxUses, expiresAt } = req.body;

    if (!code || !coins) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código e coins são obrigatórios' 
      });
    }

    if (coins <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Coins deve ser maior que 0' 
      });
    }

    const existing = await database.query(
      'SELECT id FROM coupons WHERE code = ?',
      [code.toUpperCase()]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cupom já existe' 
      });
    }

    const result = await database.query(
      `INSERT INTO coupons (code, coins, max_uses, expires_at, active) 
       VALUES (?, ?, ?, ?, TRUE)`,
      [code.toUpperCase(), coins, maxUses || null, expiresAt || null]
    );

    console.log(`[Coupon] Created: ${code.toUpperCase()} by admin ${req.user.username}`);

    res.json({
      success: true,
      message: 'Cupom criado com sucesso',
      coupon: {
        id: result.insertId,
        code: code.toUpperCase(),
        coins,
        maxUses: maxUses || 'ilimitado',
        expiresAt: expiresAt || 'sem expiração'
      }
    });

  } catch (error) {
    console.error('Erro ao criar cupom:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar cupom',
      error: error.message
    });
  }
});

// Listar cupons
router.get('/admin/coupons', authenticateAdmin, async (req, res) => {
  try {
    const coupons = await database.query(`
      SELECT 
        c.*,
        COUNT(cr.id) as total_redemptions,
        COALESCE(SUM(cr.coins_received), 0) as total_coins_given
      FROM coupons c
      LEFT JOIN coupon_redemptions cr ON c.id = cr.coupon_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    res.json({
      success: true,
      coupons
    });

  } catch (error) {
    console.error('Erro ao listar cupons:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar cupons',
      error: error.message
    });
  }
});

// Stats de cupom
router.get('/admin/coupons/:code/stats', authenticateAdmin, async (req, res) => {
  try {
    const { code } = req.params;

    const stats = await database.query(`
      SELECT 
        c.code,
        c.coins,
        c.max_uses,
        c.used_count,
        c.expires_at,
        c.active,
        COUNT(cr.id) as redemptions,
        COALESCE(SUM(cr.coins_received), 0) as total_coins_distributed,
        GROUP_CONCAT(u.username SEPARATOR ', ') as users_who_used
      FROM coupons c
      LEFT JOIN coupon_redemptions cr ON c.id = cr.coupon_id
      LEFT JOIN users u ON cr.user_id = u.id
      WHERE c.code = ?
      GROUP BY c.id
    `, [code.toUpperCase()]);

    if (!stats || stats.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cupom não encontrado' 
      });
    }

    res.json({
      success: true,
      stats: stats[0]
    });

  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar estatísticas',
      error: error.message
    });
  }
});

// Desativar cupom
router.patch('/admin/coupons/:id/deactivate', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await database.query(
      'UPDATE coupons SET active = FALSE WHERE id = ?',
      [id]
    );

    console.log(`[Coupon] Deactivated: ID ${id} by admin ${req.user.username}`);

    res.json({
      success: true,
      message: 'Cupom desativado'
    });

  } catch (error) {
    console.error('Erro ao desativar cupom:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao desativar cupom',
      error: error.message
    });
  }
});

// ============================================
// ROTAS USUÁRIO
// ============================================

// Resgatar cupom
router.post('/coupons/redeem', authMiddleware, async (req, res) => {
  let connection;
  
  try {
    connection = await database.getConnection();
    await connection.beginTransaction();

    const { code } = req.body;
    const userId = req.user.userId;

    if (!code) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Código do cupom é obrigatório' 
      });
    }

    const [coupons] = await connection.query(
      `SELECT * FROM coupons 
       WHERE code = ? AND active = TRUE`,
      [code.toUpperCase()]
    );

    if (coupons.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Cupom inválido ou desativado' 
      });
    }

    const coupon = coupons[0];

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Cupom expirado' 
      });
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Cupom esgotado' 
      });
    }

    const [alreadyUsed] = await connection.query(
      `SELECT id FROM coupon_redemptions 
       WHERE coupon_id = ? AND user_id = ?`,
      [coupon.id, userId]
    );

    if (alreadyUsed.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Você já resgatou este cupom' 
      });
    }

    await connection.query(
      `UPDATE users SET coins = coins + ? WHERE id = ?`,
      [coupon.coins, userId]
    );

    await connection.query(
      `INSERT INTO coupon_redemptions (coupon_id, user_id, coins_received)
       VALUES (?, ?, ?)`,
      [coupon.id, userId, coupon.coins]
    );

    await connection.query(
      `UPDATE coupons SET used_count = used_count + 1 WHERE id = ?`,
      [coupon.id]
    );

    const [user] = await connection.query(
      'SELECT coins FROM users WHERE id = ?',
      [userId]
    );

    await connection.commit();

    console.log(`[Coupon] Redeemed: ${code.toUpperCase()} by user ${req.user.username} (${coupon.coins} coins)`);

    res.json({
      success: true,
      message: `${coupon.coins} coins adicionados!`,
      coinsReceived: parseFloat(coupon.coins),
      newBalance: parseFloat(user[0].coins)
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erro ao resgatar cupom:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: 'Você já resgatou este cupom' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Erro ao resgatar cupom',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
