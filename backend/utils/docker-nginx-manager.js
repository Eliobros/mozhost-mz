// utils/docker-nginx-manager.js
const fs = require('fs-extra');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class DockerNginxManager {
  async createNginxConfig(containerId, pmaDomain, pmaPort) {
    const nginxConfig = `# phpMyAdmin proxy para container ${containerId}
server {
    listen 80;
    server_name ${pmaDomain};

    access_log /var/log/nginx/pma-${containerId}-access.log;
    error_log /var/log/nginx/pma-${containerId}-error.log;

    location / {
        proxy_pass http://127.0.0.1:${pmaPort};
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
}
`;

    const configPath = `/etc/nginx/sites-available/pma-${containerId}`;
    const enabledPath = `/etc/nginx/sites-enabled/pma-${containerId}`;
    const tempPath = `/tmp/pma-${containerId}.conf`;

    try {
      await fs.writeFile(tempPath, nginxConfig);
      await execAsync(`sudo mv ${tempPath} ${configPath}`);
      await execAsync(`sudo chmod 644 ${configPath}`);
      await execAsync(`sudo ln -sf ${configPath} ${enabledPath}`);
      await execAsync('sudo nginx -t');
      await execAsync('sudo nginx -s reload');

      console.log(`✅ Nginx config criado: ${pmaDomain} -> ${pmaPort}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao criar config Nginx:`, error.message);
      try {
        await execAsync(`sudo rm -f ${tempPath} ${configPath} ${enabledPath}`);
      } catch (e) {}
      throw error;
    }
  }

  async removeNginxConfig(containerId) {
    try {
      await execAsync(`sudo rm -f /etc/nginx/sites-enabled/pma-${containerId}`);
      await execAsync(`sudo rm -f /etc/nginx/sites-available/pma-${containerId}`);
      await execAsync('sudo nginx -s reload');
      console.log(`✅ Nginx config removido para ${containerId}`);
    } catch (error) {
      console.error(`⚠️  Erro ao remover config Nginx para ${containerId}:`, error.message);
    }
  }
}

module.exports = DockerNginxManager;
