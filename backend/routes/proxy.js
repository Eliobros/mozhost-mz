// routes/proxy.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const database = require('../models/database');

const router = express.Router();

// Middleware para resolver subdomínio para porta do container
const resolveContainerPort = async (req, res, next) => {
  try {
    const subdomain = req.params.subdomain || req.headers['x-subdomain'];
    
    if (!subdomain) {
      return res.status(400).json({
        error: 'Subdomain not found',
        message: 'Unable to determine container from subdomain'
      });
    }

    console.log(`🔍 Resolvendo subdomínio: ${subdomain}`);

    // Buscar container pelo subdomínio
    // Formato: usuario-container ou container-id
    let container;
    
    // Primeiro, tentar buscar por domain customizado
    container = await database.query(
      'SELECT * FROM containers WHERE domain = ? AND status = "running"',
      [`${subdomain}.mozhost.shop`]
    );

    // Se não encontrar, tentar buscar por padrão usuario-container
    if (container.length === 0) {
      // Dividir subdomínio (ex: "joao-meubot" -> buscar container "meubot" do usuário "joao")
      const parts = subdomain.split('-');
      if (parts.length >= 2) {
        const username = parts[0];
        const containerName = parts.slice(1).join('-');
        
        container = await database.query(`
          SELECT c.*, u.username 
          FROM containers c 
          JOIN users u ON c.user_id = u.id 
          WHERE u.username = ? AND c.name = ? AND c.status = "running"
        `, [username, containerName]);
      }
    }

    // Se ainda não encontrar, tentar buscar só pelo nome do container
    if (container.length === 0) {
      container = await database.query(
        'SELECT * FROM containers WHERE name = ? AND status = "running"',
        [subdomain]
      );
    }

    if (container.length === 0) {
      return res.status(404).json({
        error: 'Container not found',
        message: `No running container found for subdomain: ${subdomain}`,
        subdomain: subdomain,
        suggestions: [
          'Verifique se o container está rodando',
          'Confirme o nome do subdomínio',
          'Verifique se o domínio foi configurado corretamente'
        ]
      });
    }

    const containerInfo = container[0];
    
    // Verificar se container tem porta atribuída
    if (!containerInfo.port) {
      return res.status(503).json({
        error: 'Container port not available',
        message: 'Container is running but no port assigned'
      });
    }

    console.log(`✅ Container encontrado: ${containerInfo.name} na porta ${containerInfo.port}`);

    // Adicionar informações do container ao request
    req.containerInfo = containerInfo;
    req.targetPort = containerInfo.port;
    
    next();
  } catch (error) {
    console.error('Erro ao resolver container:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resolve container'
    });
  }
};

// Proxy middleware dinâmico
const createDynamicProxy = (req, res, next) => {
  const targetPort = req.targetPort;
  
  if (!targetPort) {
    return res.status(500).json({
      error: 'No target port',
      message: 'Container port not resolved'
    });
  }

  // Criar proxy middleware dinamicamente
  const proxyMiddleware = createProxyMiddleware({
    target: `http://localhost:${targetPort}`,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Remove /proxy/subdomain da URL
      return path.replace(/^\/proxy\/[^\/]+/, '') || '/';
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for port ${targetPort}:`, err.message);
      res.status(502).json({
        error: 'Bad Gateway',
        message: 'Container is not responding',
        container: req.containerInfo?.name,
        port: targetPort,
        suggestions: [
          'Container pode estar iniciando',
          'Verifique se a aplicação está rodando na porta correta',
          'Consulte os logs do container'
        ]
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`📡 Proxy request: ${req.method} ${req.url} -> localhost:${targetPort}`);
      
      // Adicionar headers customizados
      proxyReq.setHeader('X-Container-Name', req.containerInfo?.name || 'unknown');
      proxyReq.setHeader('X-Container-Id', req.containerInfo?.id || 'unknown');
      proxyReq.setHeader('X-Forwarded-Host', req.get('host'));
    },
    onProxyRes: (proxyRes, req, res) => {
      // Adicionar headers de resposta
      proxyRes.headers['X-Served-By'] = 'MozHost';
      proxyRes.headers['X-Container'] = req.containerInfo?.name || 'unknown';
    }
  });

  proxyMiddleware(req, res, next);
};

// Rota principal do proxy
router.all('/:subdomain/*', resolveContainerPort, createDynamicProxy);
router.all('/:subdomain', resolveContainerPort, createDynamicProxy);

// Rota para informações do container (útil para debug)
router.get('/:subdomain/_info', resolveContainerPort, (req, res) => {
  const { containerInfo } = req;
  
  res.json({
    container: {
      id: containerInfo.id,
      name: containerInfo.name,
      type: containerInfo.type,
      status: containerInfo.status,
      port: containerInfo.port,
      created_at: containerInfo.created_at
    },
    proxy: {
      subdomain: req.params.subdomain,
      target: `http://localhost:${containerInfo.port}`,
      domain: `${req.params.subdomain}.mozhost.shop`
    },
    server: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

module.exports = router;
