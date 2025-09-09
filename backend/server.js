// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

// Importar módulos
const database = require('./models/database');
const authRoutes = require('./routes/auth');
const containerRoutes = require('./routes/containers');
const fileRoutes = require('./routes/files');
const proxyRoutes = require('./routes/proxy');
const terminalHandler = require('./controllers/terminal');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3001;

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: false, // Permitir WebSocket
}));

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Adicione também este middleware para preflight requests:
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});
// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: {
    error: 'Too many requests, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/files', fileRoutes);
app.use('/proxy', proxyRoutes);

// Socket.IO para terminal e logs em tempo real
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Configurar terminal handler
  terminalHandler.handleConnection(socket, io);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    terminalHandler.handleDisconnection(socket);
  });
});

// Error handling middleware
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// Inicializar servidor
async function startServer() {
  try {
    // Testar conexão com banco
    console.log('🔍 Testing database connection...');
    const dbConnected = await database.testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Inicializar tabelas
    console.log('📋 Initializing database tables...');
    await database.initTables();

    // Limpar containers órfãos no startup
    console.log('🧹 Cleaning up orphaned containers...');
    await cleanupOrphanedContainers();

    // Iniciar servidor
    server.listen(PORT, () => {
      console.log('🚀 MozHost Backend started successfully!');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
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
    
    // Verificar se há containers na tabela primeiro
    const containerCount = await database.query('SELECT COUNT(*) as count FROM containers');
    
    if (containerCount[0].count === 0) {
      console.log('✅ No containers to cleanup');
      return;
    }
    
    // Buscar todos os containers ativos no banco
    const activeContainers = await database.query(
      'SELECT id, docker_container_id FROM containers WHERE status = ? AND docker_container_id IS NOT NULL',
      ['running']
    );

    console.log(`🔍 Checking ${activeContainers.length} containers...`);

    for (const container of activeContainers) {
      try {
        // Verificar se container ainda existe no Docker
        const dockerContainer = dockerManager.docker.getContainer(container.docker_container_id);
        const inspect = await dockerContainer.inspect();
        
        // Atualizar status baseado no estado real
        const realStatus = inspect.State.Running ? 'running' : 'stopped';
        
        await database.query(
          'UPDATE containers SET status = ? WHERE id = ?',
          [realStatus, container.id]
        );
        
      } catch (dockerError) {
        // Container não existe mais no Docker
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
    // Não quebrar o startup por causa disso
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();
