// routes/proxy.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const database = require('../models/database');
const router = express.Router();

// Captura qualquer subdomínio
router.all('/*', async (req, res, next) => {
  try {
    let host = req.headers.host; // ex: admin-tina-bot.mozhost.topaziocoin.online
    let containerName = host.split('.')[0]; // pega "admin-tina-bot"

    // 🚨 Exceção para o subdomínio "api"
    if (containerName === 'api') {
      console.log(`Skipping proxy for host: ${host} (reserved for backend API)`);
      return next(); // passa pro Express normal (authRoutes, etc.)
    }

    console.log(`Proxy request for host: ${host}, container: ${containerName}`);
    console.log(`Original path: ${req.path}`);

    const container = await database.query(
      'SELECT port FROM containers WHERE (domain = ? OR name = ?) AND status = ?',
      [host, containerName, 'running']
    );

    if (!container.length) {
      console.log(`Container not found - searched domain: ${host}, searched name: ${containerName}`);
      return res.status(404).json({
        error: 'Container not found or not running',
        searched_domain: host,
        searched_name: containerName
      });
    }

    const port = container[0].port;
    console.log(`Found container on port: ${port}`);

    const proxy = createProxyMiddleware({
      target: `http://localhost:${port}`,
      changeOrigin: true,
      pathRewrite: {
        '^/': '/'
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(502).json({ 
          error: 'Bad Gateway', 
          details: err.message,
          target: `http://localhost:${port}`,
          path: req.path
        });
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying ${req.method} ${req.url} -> http://localhost:${port}${req.path}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`Response from container: ${proxyRes.statusCode}`);
      }
    });

    proxy(req, res, next);

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

module.exports = router;
