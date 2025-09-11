// routes/proxy.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const database = require('../models/database');
const router = express.Router();

// Captura qualquer subdomínio
router.all('/*', async (req, res, next) => {
  try {
    // Captura o subdomínio do host
    let host = req.headers.host; // ex: admin-tina-bot.mozhost.topaziocoin.online
    let containerName = host.split('.')[0]; // pega "admin-tina-bot"

    console.log(`Proxy request for host: ${host}, container: ${containerName}`);
    console.log(`Original path: ${req.path}`);

    // Buscar pelo domain completo primeiro, depois pelo name
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

    // Criar proxy middleware
    const proxy = createProxyMiddleware({
      target: `http://localhost:${port}`,
      changeOrigin: true,
      // Mantém o path original
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
