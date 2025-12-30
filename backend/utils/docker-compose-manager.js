// utils/docker-compose-manager.js
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class DockerComposeManager {
  async createDockerCompose(containerPath, containerId, port, type) {
    if (type !== 'php') return null;

    const dbPassword = require('crypto').randomBytes(16).toString('hex');
    const dbName = 'mozhost_db';
    const dbUser = 'mozhost_user';
    const mysqlPort = port + 2000; // Porta externa MySQL

    const compose = {
      version: '3.8',
      services: {
        php: {
          image: 'php:8.3-apache',
          container_name: `mozhost_php_${containerId}`,
          ports: [`${port}:80`],
          volumes: ['./php:/var/www/html'],
          environment: {
            DB_HOST: 'mysql',
            DB_NAME: dbName,
            DB_USER: dbUser,
            DB_PASSWORD: dbPassword
          },
          depends_on: ['mysql'],
          restart: 'unless-stopped',
          networks: [`mozhost_${containerId}`],
          mem_limit: '512m',
          cpus: '0.5'
        },
        mysql: {
          image: 'mysql:8.0',
          container_name: `mozhost_mysql_${containerId}`,
          ports: [`${mysqlPort}:3306`], // Porta externa
          environment: {
            MYSQL_ROOT_PASSWORD: dbPassword,
            MYSQL_DATABASE: dbName,
            MYSQL_USER: dbUser,
            MYSQL_PASSWORD: dbPassword
          },
          volumes: [
            './mysql/data:/var/lib/mysql',
            './mysql/init:/docker-entrypoint-initdb.d'
          ],
          restart: 'unless-stopped',
          networks: [`mozhost_${containerId}`],
          mem_limit: '512m',
          cpus: '0.3'
        },
        phpmyadmin: {
          image: 'phpmyadmin:latest',
          container_name: `mozhost_pma_${containerId}`,
          ports: [`${port + 1000}:80`],
          environment: {
            PMA_HOST: 'mysql',
            PMA_USER: dbUser,
            PMA_PASSWORD: dbPassword
          },
          depends_on: ['mysql'],
          restart: 'unless-stopped',
          networks: [`mozhost_${containerId}`],
          mem_limit: '256m',
          cpus: '0.2'
        }
      },
      networks: {
        [`mozhost_${containerId}`]: {
          driver: 'bridge'
        }
      }
    };

    const composeYml = yaml.dump(compose);
    await fs.writeFile(
      path.join(containerPath, 'docker-compose.yml'),
      composeYml
    );

    return {
      dbName,
      dbUser,
      dbPassword,
      pmaPort: port + 1000,
      mysqlPort
    };
  }

  async startCompose(containerPath) {
    await execAsync(`cd ${containerPath} && docker-compose up -d`);
    console.log(`🐳 Docker-compose iniciado em ${containerPath}`);
  }

  async stopCompose(containerPath) {
    await execAsync(`cd ${containerPath} && docker-compose stop`);
    console.log(`🛑 Docker-compose parado em ${containerPath}`);
  }

  async removeCompose(containerPath) {
    try {
      await execAsync(`cd ${containerPath} && docker-compose down -v`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`🗑️  Docker-compose removido de ${containerPath}`);
    } catch (error) {
      console.log('Docker-compose down error:', error.message);
    }
  }

  async getComposeLogs(containerPath, tail = 100) {
    const { stdout } = await execAsync(`cd ${containerPath} && docker-compose logs --tail=${tail}`);
    return stdout;
  }

  async enableApacheModRewrite(containerId) {
    try {
      await execAsync(`docker exec mozhost_php_${containerId} a2enmod rewrite`);
      await execAsync(`docker exec mozhost_php_${containerId} service apache2 restart`);
      console.log(`✅ mod_rewrite ativado para ${containerId}`);
    } catch (error) {
      console.error(`⚠️  Erro ao ativar mod_rewrite:`, error.message);
    }
  }
}

module.exports = DockerComposeManager;
