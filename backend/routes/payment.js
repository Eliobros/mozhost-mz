// routes/payment.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Pacotes de coins disponíveis
const COIN_PACKAGES = [
  { id: 1, coins: 100, price: 50, name: '100 Coins' },
  { id: 2, coins: 250, price: 100, name: '250 Coins' },
  { id: 3, coins: 500, price: 200, name: '500 Coins' },
  { id: 4, coins: 1000, price: 350, name: '1000 Coins' },
  { id: 5, coins: 2500, price: 800, name: '2500 Coins' }
];

// Listar pacotes disponíveis
router.get('/packages', (req, res) => {
  res.json({ packages: COIN_PACKAGES });
});

// Criar pagamento
router.post('/create', [
  body('packageId').isInt({ min: 1, max: 5 }).withMessage('Package ID inválido'),
  body('phone').matches(/^(84|85|86|87)[0-9]{7}$/).withMessage('Número inválido. Use formato: 84XXXXXXX, 85XXXXXXX, 86XXXXXXX ou 87XXXXXXX'),
  body('method').isIn(['mpesa', 'emola']).withMessage('Método deve ser mpesa ou emola')
], authMiddleware, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validação falhou', details: errors.array() });
    }

    const { packageId, phone, method } = req.body;
    const userId = req.user.userId;

    // Validar compatibilidade número/método
    const phonePrefix = phone.substring(0, 2);
    
    if (method === 'mpesa' && !['84', '85'].includes(phonePrefix)) {
      return res.status(400).json({ 
        error: 'Número incompatível com MPesa',
        message: 'MPesa aceita apenas números 84 ou 85. Use eMola para números 86/87.'
      });
    }
    
    if (method === 'emola' && !['86', '87'].includes(phonePrefix)) {
      return res.status(400).json({ 
        error: 'Número incompatível com eMola',
        message: 'eMola aceita apenas números 86 ou 87. Use MPesa para números 84/85.'
      });
    }

    // Buscar pacote
    const pkg = COIN_PACKAGES.find(p => p.id === packageId);
    if (!pkg) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    // Salvar transação como PENDING
    const result = await database.query(
      `INSERT INTO transactions (user_id, package_id, coins, amount, payment_method, phone_number, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [userId, pkg.id, pkg.coins, pkg.price, method, phone]
    );

    const transactionId = result.insertId;

    // Chamar API do Paymoz
    try {
      const apiKey = process.env.PAYMOZ_API_KEY || 'sua_api_key_aqui';
      const apiUrl = 'https://paymoz.tech/api/v1/pagamentos/processar/';

      const payload = {
        metodo: method,
        valor: pkg.price.toFixed(2),
        numero_celular: phone
      };

      console.log('📤 Enviando para Paymoz:', {
        url: apiUrl,
        payload,
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey.substring(0, 8) + '...'
      });

      // Timeout de 60 segundos para usuário confirmar no celular
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let response;
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `ApiKey ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.error('⏱️ Timeout: Usuário não confirmou o pagamento a tempo');
          
          await database.query(
            'UPDATE transactions SET status = \'failed\', updated_at = NOW() WHERE id = ?',
            [transactionId]
          );
          
          return res.status(408).json({
            error: 'Timeout',
            message: 'Tempo esgotado aguardando confirmação do pagamento. Por favor, tente novamente.'
          });
        }
        throw fetchError;
      }

      console.log('📥 Status HTTP:', response.status);
      console.log('📥 Content-Type:', response.headers.get('content-type'));

      // Pegar resposta como texto primeiro
      const responseText = await response.text();
      console.log('📥 Resposta bruta (primeiros 1000 chars):', responseText.substring(0, 1000));

      // Verificar se não é um erro HTTP antes de fazer parse
      if (!response.ok) {
        console.error('❌ Erro HTTP:', response.status, responseText);
        
        await database.query(
          'UPDATE transactions SET status = \'failed\', provider_response = ?, updated_at = NOW() WHERE id = ?',
          [responseText.substring(0, 1000), transactionId]
        );

        return res.status(response.status).json({
          error: 'Erro no gateway de pagamento',
          message: `O servidor de pagamento retornou erro ${response.status}`,
          debug: responseText.substring(0, 200)
        });
      }

      // Tentar fazer parse do JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ JSON parseado com sucesso:', data);
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse do JSON:', parseError.message);
        console.error('❌ Resposta completa:', responseText);
        
        await database.query(
          'UPDATE transactions SET status = \'failed\', provider_response = ?, updated_at = NOW() WHERE id = ?',
          [responseText.substring(0, 1000), transactionId]
        );

        return res.status(500).json({
          error: 'Resposta inválida do gateway',
          message: 'O servidor de pagamento retornou uma resposta inválida (não é JSON)',
          debug: {
            contentType: response.headers.get('content-type'),
            preview: responseText.substring(0, 200)
          }
        });
      }

      console.log('📱 Resposta Paymoz completa:', JSON.stringify(data, null, 2));

      // Processar resposta
      if (data.sucesso) {
        // Salvar dados da transação
        await database.query(
          `UPDATE transactions 
           SET provider_transaction_id = ?, 
               provider_conversation_id = ?,
               provider_reference = ?,
               provider_response = ?,
               status = 'processing',
               updated_at = NOW()
           WHERE id = ?`,
          [
            data.dados?.output_TransactionID || 'N/A',
            data.dados?.output_ConversationID || 'N/A',
            data.dados?.output_ThirdPartyReference || 'N/A',
            JSON.stringify(data),
            transactionId
          ]
        );

        // Verificar se pagamento foi aprovado imediatamente
        if (data.dados?.output_ResponseCode === 'INS-0') {
          console.log(`✅ Pagamento aprovado! Adicionando ${pkg.coins} coins ao user ${userId}`);
          
          await database.query(
            'UPDATE users SET coins = coins + ? WHERE id = ?',
            [pkg.coins, userId]
          );

          await database.query(
            'UPDATE transactions SET status = \'completed\', updated_at = NOW() WHERE id = ?',
            [transactionId]
          );

          const userResult = await database.query(
            'SELECT coins FROM users WHERE id = ?',
            [userId]
          );

          return res.json({
            success: true,
            message: 'Pagamento aprovado! Coins adicionadas com sucesso.',
            transaction: {
              id: transactionId,
              coins: pkg.coins,
              amount: pkg.price,
              status: 'completed',
              transactionId: data.dados.output_TransactionID
            },
            newBalance: userResult[0].coins
          });
        } else {
          // Pagamento em processamento (aguardando confirmação do usuário)
          console.log('⏳ Pagamento em processamento, aguardando confirmação...');
          
          return res.json({
            success: true,
            message: 'Pagamento iniciado. Por favor, confirme no seu celular.',
            transaction: {
              id: transactionId,
              status: 'processing',
              transactionId: data.dados?.output_TransactionID,
              responseCode: data.dados?.output_ResponseCode,
              responseDesc: data.dados?.output_ResponseDesc
            }
          });
        }

      } else {
        // Falha no pagamento
        console.error('❌ Pagamento falhou:', data.mensagem);
        
        await database.query(
          'UPDATE transactions SET status = \'failed\', provider_response = ?, updated_at = NOW() WHERE id = ?',
          [JSON.stringify(data), transactionId]
        );

        return res.status(400).json({
          error: 'Pagamento falhou',
          message: data.mensagem || 'Erro ao processar pagamento'
        });
      }

    } catch (paymentError) {
      console.error('❌ Erro fatal ao processar pagamento:', paymentError);
      console.error('Stack:', paymentError.stack);

      await database.query(
        'UPDATE transactions SET status = \'failed\', updated_at = NOW() WHERE id = ?',
        [transactionId]
      );

      return res.status(500).json({
        error: 'Erro ao processar pagamento',
        message: 'Falha na comunicação com o gateway de pagamento',
        details: paymentError.message
      });
    }

  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      error: 'Falha ao criar pagamento',
      message: 'Erro interno do servidor'
    });
  }
});

// Verificar status de transação
router.get('/transaction/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const transactions = await database.query(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!transactions.length) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    res.json({ transaction: transactions[0] });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Falha ao buscar transação' });
  }
});

// Histórico de transações do usuário
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const transactions = await database.query(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    res.json({ transactions });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Falha ao buscar histórico' });
  }
});

// Webhook para receber notificações do Paymoz (opcional)
router.post('/webhook', async (req, res) => {
  try {
    console.log('🔔 Webhook recebido:', req.body);

    const { transaction_id, status, reference } = req.body;

    // Buscar transação pelo provider_transaction_id
    const transactions = await database.query(
      'SELECT * FROM transactions WHERE provider_transaction_id = ?',
      [transaction_id]
    );

    if (!transactions.length) {
      console.log('⚠️ Transação não encontrada no webhook');
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactions[0];

    // Atualizar status
    if (status === 'completed' && transaction.status !== 'completed') {
      // Adicionar coins ao usuário
      await database.query(
        'UPDATE users SET coins = coins + ? WHERE id = ?',
        [transaction.coins, transaction.user_id]
      );

      await database.query(
        'UPDATE transactions SET status = \'completed\', updated_at = NOW() WHERE id = ?',
        [transaction.id]
      );

      console.log(`✅ Coins adicionadas via webhook: ${transaction.coins} para user ${transaction.user_id}`);
    }

    res.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Endpoint para admin verificar transações pendentes
router.get('/admin/pending', async (req, res) => {
  try {
    const { password } = req.query;

    if (password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
      return res.status(401).json({ error: 'Senha de administrador inválida' });
    }

    const pending = await database.query(
      `SELECT t.*, u.username, u.email 
       FROM transactions t 
       JOIN users u ON t.user_id = u.id 
       WHERE t.status IN ('pending', 'processing') 
       ORDER BY t.created_at DESC 
       LIMIT 100`
    );

    res.json({ transactions: pending });

  } catch (error) {
    console.error('Admin pending transactions error:', error);
    res.status(500).json({ error: 'Falha ao buscar transações pendentes' });
  }
});

// Endpoint para admin aprovar transação manualmente
router.post('/admin/approve', async (req, res) => {
  try {
    const { transactionId, password } = req.body;

    if (password !== (process.env.ADMIN_PASSWORD || 'Cadeira33@')) {
      return res.status(401).json({ error: 'Senha de administrador inválida' });
    }

    const transactions = await database.query(
      'SELECT * FROM transactions WHERE id = ?',
      [transactionId]
    );

    if (!transactions.length) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    const transaction = transactions[0];

    if (transaction.status === 'completed') {
      return res.status(400).json({ error: 'Transação já foi completada' });
    }

    // Adicionar coins
    await database.query(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [transaction.coins, transaction.user_id]
    );

    // Atualizar transação
    await database.query(
      'UPDATE transactions SET status = \'completed\', updated_at = NOW() WHERE id = ?',
      [transactionId]
    );

    console.log(`✅ Admin aprovação manual: ${transaction.coins} coins para user ${transaction.user_id}`);

    res.json({ 
      success: true, 
      message: 'Transação aprovada e coins adicionadas',
      transaction: {
        id: transactionId,
        coins: transaction.coins,
        userId: transaction.user_id
      }
    });

  } catch (error) {
    console.error('Admin approve error:', error);
    res.status(500).json({ error: 'Falha ao aprovar transação' });
  }
});

module.exports = router;
