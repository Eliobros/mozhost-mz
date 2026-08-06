// server.js
require('dotenv').config()
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const expressWs = require('express-ws');
const path = require('path');
const jwt = require('jsonwebtoken');


// Passport OAuth
const passport = require('./utils/passport');

// Importar módulos
const database = require('./models/database');
const authRoutes = require('./routes/auth');
const whatsappLinkRoutes = require('./routes/whatsapp-link');
const { adminRouter } = require('./routes/auth');
const alexaRoutes = require('./routes/alexa');
const aiRoutes = require('./routes/ai');

const containerRoutes = require('./routes/containers');
const couponRoutes = require('./routes/coupons');
const fileRoutes = require('./routes/files');
const proxyRoutes = require('./routes/proxy');
const terminalHandler = require('./controllers/terminal');
const { startWhatsApp, disconnectWhatsApp, getWhatsAppSocket } = require('./utils/whatsapp'); // ✅ adicionar getWhatsAppSocket
const paymentRoutes = require('./routes/payment');
const authenticateToken = require('./middleware/auth');
const domainsRoutes = require('./routes/domains');
const monitoringRoutes = require('./routes/monitoring');
const notificationRoutes = require('./routes/notifications');
const subscriptionService = require('./services/subscriptionService');
const databasesRoutes = require('./routes/databases');
const emailRoutes = require('./routes/emails');
const billingRoutes = require('./routes/billing');

// ✅ NOVO: Support bridge
const supportBridge = require('./services/supportBridge');
const supportRoutes = require('./routes/support');
const { setupSupportSocket } = require('./routes/support');

// ✨ NOVO: Importar NotificationManager
const notificationManager = require('./utils/notification-manager');

const app = express();
app.set('trust proxy', 1);
const server = createServer(app);

// HABILITAR WEBSOCKET (express-ws)
const wsInstance = expressWs(app, server);

const parseOrigins = (originsStr) => {
  if (!originsStr) return [];
  return originsStr
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
};

const ALLOWED_ORIGINS = parseOrigins(process.env.CORS_ORIGINS || '');

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      console.log('🔍 Origin recebido:', JSON.stringify(origin));
      console.log('🔍 Allowed:', ALLOWED_ORIGINS);
      if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ✨ NOVO: Configurar NotificationManager com Socket.IO
notificationManager.setSocketIO(io);

const PORT = process.env.PORT || 3001;

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key', 'x-admin-password']
}));

app.options('*', (req, res) => {
  const reqOrigin = req.headers.origin;
  if (!reqOrigin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(reqOrigin)) {
    res.header('Access-Control-Allow-Origin', reqOrigin || '');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key, x-admin-password');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(200);
  }
  return res.sendStatus(403);
});

// Rate limiting
const RL_WINDOW_MIN = Number(process.env.RATE_LIMIT_WINDOW) || 15;
const RL_MAX = Number(process.env.RATE_LIMIT_MAX) || 100;

const limiter = rateLimit({
  windowMs: RL_WINDOW_MIN * 60 * 1000,
  max: RL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => {
    return req.path.includes('/cli-upload');
  }
});
app.use('/api/', limiter);

// Passport OAuth
app.use(passport.initialize());

// Body parsing
// Garanta que o body-parser capture exatamente o formato string/buffer bruto
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Captura a string exata recebida na rede antes de virar objeto
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}));



app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    connectedUsers: notificationManager.getConnectedUsersCount()
  });
});

// ============================================
// SOCKET.IO — NOTIFICAÇÕES + SUPORTE
// ============================================
io.on('connection', async (socket) => {
  console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    console.error('[Socket.IO] Token não fornecido');
    socket.disconnect();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const users = await database.query(
      'SELECT id, username FROM users WHERE id = ? AND is_active = true',
      [userId]
    );

    if (users.length === 0) {
      console.error('[Socket.IO] Usuário não encontrado ou inativo');
      socket.disconnect();
      return;
    }

    socket.userId = userId;
    socket.username = users[0].username;
    notificationManager.registerUserSocket(userId, socket.id);

    console.log(`✅ [Socket.IO] Usuário autenticado: ${socket.username} (ID: ${userId})`);

    socket.emit('connected', {
      message: 'Conectado ao sistema de notificações',
      userId,
      username: socket.username
    });

    // ✅ NOVO: suporte — usuário entra na sala do seu ticket
    socket.on('join_ticket', async ({ ticketId }) => {
      if (!ticketId) return;
      socket.join(`ticket_${ticketId}`);
      console.log(`🎫 [Suporte] ${socket.username} entrou em ticket_${ticketId}`);

      // Re-enviar estado do ticket caso o socket tenha reconnectado
      try {
        const tickets = await database.query(
          'SELECT status, agent_name FROM support_tickets WHERE id = ? AND user_id = ?',
          [ticketId, userId]
        );
        if (tickets.length > 0 && tickets[0].status === 'active') {
          socket.emit('agente_entrou', {
            agentName: tickets[0].agent_name,
            ticketId,
            reconnected: true
          });
        }
      } catch {}
    });

    socket.on('leave_ticket', ({ ticketId }) => {
      socket.leave(`ticket_${ticketId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
      if (socket.userId) {
        notificationManager.unregisterUserSocket(socket.userId);
      }
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

  } catch (error) {
    console.error('[Socket.IO] Erro na autenticação:', error.message);
    socket.disconnect();
  }
});

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRouter);
app.use('/api/containers', containerRoutes);
app.use('/api/whatsapp-link', whatsappLinkRoutes);
app.use('/api/files', fileRoutes);
app.use('/proxy', proxyRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/github', require('./routes/github'));
app.use('/api/payment', paymentRoutes);
app.use('/api/domains', domainsRoutes);
app.use('/api/databases', databasesRoutes);
app.use('/api', couponRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/alexa', alexaRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/support', supportRoutes); // ✅ NOVO
const campaigns = require('./routes/campaigns');
app.use('/api', campaigns);
const terminalRoutes = require('./routes/terminal');
app.use('/api/terminal', terminalRoutes);
const logsRoutes = require('./routes/logs');
app.use('/api/logs', logsRoutes);
const mysqlRoutes = require('./routes/mysql');
app.use('/api/mysql', mysqlRoutes);
const qrcodeRoutes = require('./routes/qrcode');
app.use('/api/qrcode', qrcodeRoutes);
const registrarRoutes = require('./routes/registrar');
app.use('/api/registrar', registrarRoutes);
app.use('/api/billing', billingRoutes);
const pushRoutes = require('./routes/push');
app.use('/api/push', pushRoutes);
const whatsappRoutes = require('./routes/whatsapp');
app.use('/api/whatsapp', whatsappRoutes);
const emailForwarding = require('./routes/emailForwarding');
const passkeysRouter = require('./routes/passkeys');
app.use('/api/passkeys', passkeysRouter);
app.use('/api/email-forwarding', emailForwarding);

// 🟢 Webhook oficial do WhatsApp (Cloud API / Meta)
// Fora do /api para não sofrer rate limit. URLs:
//   GET  https://api.mozhost.shop/webhook/whatsapp  (verificação da Meta)
//   POST https://api.mozhost.shop/webhook/whatsapp  (mensagens recebidas)
app.use('/webhook/whatsapp', require('./routes/whatsapp-webhook'));

app.use('*', async (req, res, next) => {
  const hostHeader = req.get('host') || '';
  const host = hostHeader.split(':')[0];

  if (req.originalUrl && req.originalUrl.startsWith('/api')) {
    return next();
  }

  if (!host || !host.endsWith('.mozhost.shop') || host === 'api.mozhost.shop' || host.startsWith('api.')) {
    return next();
  }

  try {
    const containers = await database.query(
      'SELECT port FROM containers WHERE domain = ? AND status = ?',
      [host, 'running']
    );

    if (containers.length === 0) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const { createProxyMiddleware } = require('http-proxy-middleware');
    const proxy = createProxyMiddleware({
      target: `http://localhost:${containers[0].port}`,
      changeOrigin: true
    });

    return proxy(req, res, next);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy error' });
  }
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ============================================
// 404 HANDLER
// ============================================
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// ============================================
// INICIALIZAR SERVIDOR
// ============================================
async function startServer() {
  try {
    console.log('🔍 Testing database connection...');
    const dbConnected = await database.testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    console.log('📋 Initializing database tables...');
    await database.initTables();

    console.log('🧹 Cleaning up orphaned containers...');
    await cleanupOrphanedContainers();

    console.log('🤖 Initializing MozHost AI...');
    const mozhostAi = require('./services/mozhostAiService');
    mozhostAi.initialize();

    console.log('📱 Initializing WhatsApp...');
    startWhatsApp();

    // ✅ NOVO: inicializar bridge APÓS o WhatsApp estar a arrancar
    // No Cloud API não há sessão/QR: ligamos o bridge ao sender da API oficial
    supportBridge.init(io, getWhatsAppSocket());

    server.listen(PORT, () => {
      console.log('🚀 MozHost Backend started successfully!');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔔 WebSocket notifications: ws://localhost:${PORT}`);
      console.log(`🔌 WebSocket terminal: ws://localhost:${PORT}/api/terminal/:containerId`);
      console.log(`🤝 Support bridge: /api/support`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Limpeza de containers órfãos
async function cleanupOrphanedContainers() {
  try {
    const dockerManager = require('./utils/docker-manager');
    const containerCount = await database.query('SELECT COUNT(*) as count FROM containers');

    if (containerCount[0].count === 0) {
      console.log('✅ No containers to cleanup');
      return;
    }

    const activeContainers = await database.query(
      'SELECT id, docker_container_id FROM containers WHERE status = ? AND docker_container_id IS NOT NULL',
      ['running']
    );

    console.log(`🔍 Checking ${activeContainers.length} containers...`);

    for (const container of activeContainers) {
      try {
        const dockerContainer = dockerManager.docker.getContainer(container.docker_container_id);
        const inspect = await dockerContainer.inspect();
        const realStatus = inspect.State.Running ? 'running' : 'stopped';

        await database.query(
          'UPDATE containers SET status = ? WHERE id = ?',
          [realStatus, container.id]
        );

      } catch (dockerError) {
        console.log(`🧹 Cleaning up orphaned container: ${container.id}`);
        await database.query(
          'UPDATE containers SET status = ? WHERE id = ?',
          ['error', container.id]
        );
      }
    }

    console.log('✅ Container cleanup completed');
  } catch (error) {
    console.error('⚠️ Error during container cleanup:', error.message);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  disconnectWhatsApp();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  disconnectWhatsApp();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

// Job para verificar subscriptions
const checkSubscriptions = async () => {
  try {
    console.log('🔍 Verificando subscriptions...');
    const expiring = await subscriptionService.checkExpiringSubscriptions();
    if (expiring > 0) {
      console.log(`⚠️  ${expiring} subscriptions expirando em breve`);
    }

    const expired = await subscriptionService.expireSubscriptions();
    if (expired > 0) {
      console.log(`❌ ${expired} subscriptions expiradas`);
    }

    console.log('✅ Verificação de subscriptions concluída');
  } catch (error) {
    console.error('❌ Erro ao verificar subscriptions:', error);
  }
};

setTimeout(() => {
  checkSubscriptions();
}, 10000);

setInterval(() => {
  checkSubscriptions();
}, 60 * 60 * 1000);
