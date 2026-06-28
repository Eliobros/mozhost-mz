// services/dnsMonitor.js
const dns = require('dns').promises;
const db = require('../models/database');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');

// SERVER_IP vem de backend/config/constants.js (mesmo valor usado em routes/domains.js)
// Apenas fallback se tudo falhar — em produção isso vem do env.
const SERVER_IP = require('../config/constants').SERVER_IP;

class DNSMonitor {
  constructor() {
    this.monitoring = new Map();
    this.checkInterval = 60000; // 1 minuto
    this.maxAttempts = 1440; // 24 horas
  }

  async checkDNS(domain) {
    try {
      const addresses = await dns.resolve4(domain);
      const configured = addresses.includes(SERVER_IP);

      console.log(`🔍 DNS check ${domain}: ${addresses.join(', ')} | Match: ${configured}`);

      return {
        configured,
        ip: addresses[0],
        allIPs: addresses
      };
    } catch (error) {
      console.log(`⚠️  DNS check ${domain}: ${error.code || error.message}`);
      return {
        configured: false,
        ip: null,
        error: error.message
      };
    }
  }

  async startMonitoring(domain, containerId) {
    if (this.monitoring.has(domain)) {
      console.log(`⚠️  ${domain} já está sendo monitorado`);
      return;
    }

    console.log(`📡 Iniciando monitoramento DNS: ${domain}`);

    let attempts = 0;

    const intervalId = setInterval(async () => {
      try {
        attempts++;
        console.log(`🔄 Verificação ${attempts}/${this.maxAttempts}: ${domain}`);

        const result = await this.checkDNS(domain);

        if (result.configured) {
          console.log(`✅ DNS configurado corretamente: ${domain} → ${result.ip}`);

          // Parar monitoramento
          clearInterval(intervalId);
          this.monitoring.delete(domain);

          // Atualizar status no banco para ssl_generating (vai gerar SSL logo depois)
          await db.query(
            'UPDATE custom_domains SET status = ?, ip_detected = ? WHERE domain = ?',
            ['ssl_generating', result.ip, domain]
          );

          // Iniciar geração de SSL
          await this.generateSSL(domain, containerId);

        } else if (attempts >= this.maxAttempts) {
          // Timeout após 24h
          console.log(`❌ Timeout: ${domain} - DNS não configurado após 24h`);
          clearInterval(intervalId);
          this.monitoring.delete(domain);

          await db.query(
            'UPDATE custom_domains SET status = ?, error_message = ? WHERE domain = ?',
            ['failed', 'DNS não configurado após 24 horas', domain]
          );
        } else {
          // Continuar verificando
          console.log(`⏳ Aguardando propagação DNS: ${domain} (${attempts}/${this.maxAttempts})`);
        }
      } catch (error) {
        console.error(`❌ Erro ao verificar ${domain}:`, error.message);
      }
    }, this.checkInterval);

    this.monitoring.set(domain, {
      intervalId,
      attempts,
      containerId,
      startedAt: new Date()
    });
  }

  stopMonitoring(domain) {
    if (this.monitoring.has(domain)) {
      const { intervalId } = this.monitoring.get(domain);
      clearInterval(intervalId);
      this.monitoring.delete(domain);
      console.log(`⏹️  Monitoramento parado: ${domain}`);
      return true;
    }
    return false;
  }

  async generateSSL(domain, containerId) {
    console.log(`🔒 Iniciando geração de SSL para: ${domain}`);

    try {
      // Atualizar status
      await db.query(
        'UPDATE custom_domains SET status = ? WHERE domain = ?',
        ['ssl_generating', domain]
      );

      // Buscar informações do container
      const containers = await db.query(
        'SELECT * FROM containers WHERE id = ?',
        [containerId]
      );

      if (containers.length === 0) {
        throw new Error('Container não encontrado');
      }

      const container = containers[0];
      console.log(`📦 Container encontrado: ${container.name} (porta ${container.port})`);

      // Criar configuração Nginx ANTES do SSL
      await this.createNginxConfigHTTP(domain, container.port);

      // Gerar certificado SSL com Let's Encrypt
      console.log(`📜 Gerando certificado SSL com Let's Encrypt...`);

      const certbotCmd = `sudo certbot certonly --nginx \
        -d ${domain} \
        --non-interactive \
        --agree-tos \
        --email admin@mozhost.shop \
        --redirect \
        --expand`;

      const { stdout, stderr } = await execPromise(certbotCmd);
      console.log(`Certbot output: ${stdout}`);

      if (stderr && !stderr.includes('Successfully')) {
        console.warn(`Certbot warnings: ${stderr}`);
      }

      // Atualizar configuração Nginx com SSL
      await this.createNginxConfigHTTPS(domain, container.port);

      // Calcular data de expiração (90 dias)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      // Atualizar status no banco
      await db.query(
        'UPDATE custom_domains SET status = ?, ssl_expires_at = ?, error_message = NULL WHERE domain = ?',
        ['active', expiresAt.toISOString().slice(0, 19).replace('T', ' '), domain]
      );

      console.log(`✅ Domínio ${domain} ativo com SSL!`);

    } catch (error) {
      console.error(`❌ Erro ao gerar SSL para ${domain}:`, error.message);

      await db.query(
        'UPDATE custom_domains SET status = ?, error_message = ? WHERE domain = ?',
        ['failed', error.message, domain]
      );

      // Tentar limpar arquivos criados
      await this.cleanupNginxConfig(domain);
    }
  }

  async createNginxConfigHTTP(domain, port) {
    console.log(`📝 Criando configuração Nginx HTTP para ${domain}`);

    const nginxConfig = `# HTTP only - Antes do SSL
server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_request_buffering off;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        client_max_body_size 100M;
    }

    access_log /var/log/nginx/custom-${domain}-access.log;
    error_log /var/log/nginx/custom-${domain}-error.log;
}
`;

    const tempPath = `/tmp/custom-domain-${domain}.conf`;
    const finalPath = `/etc/nginx/sites-available/custom-${domain}`;
    const enabledPath = `/etc/nginx/sites-enabled/custom-${domain}`;

    try {
      // Escrever em /tmp primeiro
      await fs.writeFile(tempPath, nginxConfig);

      // Mover para nginx com sudo
      await execPromise(`sudo mv ${tempPath} ${finalPath}`);
      await execPromise(`sudo chmod 644 ${finalPath}`);

      // Criar symlink
      await execPromise(`sudo ln -sf ${finalPath} ${enabledPath}`);

      // Testar e recarregar
      await execPromise('sudo nginx -t');
      await execPromise('sudo nginx -s reload');

      console.log(`✅ Configuração HTTP criada: ${domain}`);
    } catch (error) {
      console.error(`❌ Erro ao criar config HTTP:`, error.message);
      throw error;
    }
  }

  async createNginxConfigHTTPS(domain, port) {
    console.log(`📝 Atualizando configuração Nginx com HTTPS para ${domain}`);

    const nginxConfig = `# HTTPS com SSL
server {
    listen 80;
    server_name ${domain};

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain};

    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_request_buffering off;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        client_max_body_size 100M;
    }

    access_log /var/log/nginx/custom-${domain}-access.log;
    error_log /var/log/nginx/custom-${domain}-error.log;
}
`;

    const tempPath = `/tmp/custom-domain-${domain}.conf`;
    const finalPath = `/etc/nginx/sites-available/custom-${domain}`;

    try {
      // Escrever em /tmp
      await fs.writeFile(tempPath, nginxConfig);

      // Mover com sudo (sobrescrever o anterior)
      await execPromise(`sudo mv ${tempPath} ${finalPath}`);
      await execPromise(`sudo chmod 644 ${finalPath}`);

      // Testar e recarregar
      await execPromise('sudo nginx -t');
      await execPromise('sudo nginx -s reload');

      console.log(`✅ Configuração HTTPS atualizada: ${domain}`);
    } catch (error) {
      console.error(`❌ Erro ao criar config HTTPS:`, error.message);
      throw error;
    }
  }

  async cleanupNginxConfig(domain) {
    console.log(`🧹 Limpando configurações do Nginx para ${domain}`);

    try {
      await execPromise(`sudo rm -f /etc/nginx/sites-enabled/custom-${domain}`);
      await execPromise(`sudo rm -f /etc/nginx/sites-available/custom-${domain}`);
      await execPromise('sudo nginx -s reload');
      console.log(`✅ Configurações removidas: ${domain}`);
    } catch (error) {
      console.error(`⚠️  Erro ao limpar configurações:`, error.message);
    }
  }

  async removeDomain(domain) {
    console.log(`🗑️  Removendo domínio: ${domain}`);

    try {
      // Parar monitoramento
      this.stopMonitoring(domain);

      // Remover configuração Nginx
      await this.cleanupNginxConfig(domain);

      // Remover certificado SSL (opcional - pode deixar para expirar)
      try {
        await execPromise(`sudo certbot delete --cert-name ${domain} --non-interactive`);
        console.log(`🔒 Certificado SSL removido: ${domain}`);
      } catch (error) {
        console.log(`⚠️  Certificado não encontrado ou erro ao remover: ${error.message}`);
      }

      console.log(`✅ Domínio removido completamente: ${domain}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao remover domínio ${domain}:`, error.message);
      return false;
    }
  }

  getMonitoringStatus() {
    const status = [];
    for (const [domain, info] of this.monitoring.entries()) {
      status.push({
        domain,
        attempts: info.attempts,
        maxAttempts: this.maxAttempts,
        startedAt: info.startedAt,
        containerId: info.containerId
      });
    }
    return status;
  }
}

// Criar instância singleton
const monitor = new DNSMonitor();

// Retomar monitoramento ao iniciar o servidor
(async () => {
  try {
    console.log('🔄 Verificando domínios pendentes...');

    const pending = await db.query(
      'SELECT * FROM custom_domains WHERE status IN (?, ?)',
      ['pending', 'dns_pending']
    );

    if (pending.length > 0) {
      console.log(`📡 Retomando monitoramento de ${pending.length} domínios`);

      for (const domain of pending) {
        monitor.startMonitoring(domain.domain, domain.container_id);
      }
    } else {
      console.log('✅ Nenhum domínio pendente');
    }
  } catch (error) {
    console.error('❌ Erro ao retomar monitoramento:', error);
  }
})();

module.exports = monitor;
