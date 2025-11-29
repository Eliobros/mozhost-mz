// utils/docker-manager.js
const Docker = require('dockerode');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { promisify } = require('util');
const yaml = require('js-yaml');
const database = require('../models/database');

const execAsync = promisify(exec);

class DockerManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.userDataPath = process.env.USER_DATA_PATH || '/root/mozhost/user-data';
    this.containersPath = path.join(this.userDataPath, 'containers');

    this.basePort = 4000;
    this.portRange = { min: 4000, max: 5000 };
  }

  // 👇 NOVA FUNÇÃO HELPER PARA CRIAR DIRETÓRIOS COM PERMISSÕES CORRETAS
  async createContainerDir(dirPath) {
    await fs.ensureDir(dirPath);
    await fs.chmod(dirPath, 0o775); // Permissão 775 (rwxrwxr-x)
    return dirPath;
  }

  async createDockerCompose(containerPath, containerId, port, type) {
    if (type !== 'php') return null;

    const dbPassword = require('crypto').randomBytes(16).toString('hex');
    const dbName = 'mozhost_db';
    const dbUser = 'mozhost_user';

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
          environment: {
            MYSQL_ROOT_PASSWORD: dbPassword,
            MYSQL_DATABASE: dbName,
            MYSQL_USER: dbUser,
            MYSQL_PASSWORD: dbPassword
          },
          volumes: ['./mysql/data:/var/lib/mysql'],
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
      pmaPort: port + 1000
    };
  }

  async createUserContainer(userId, containerData) {
    const { name, type, environment = {} } = containerData;
    const containerId = uuidv4();

    try {
      const containerPath = path.join(this.containersPath, containerId);
      
      // 👇 USAR A NOVA FUNÇÃO COM PERMISSÕES CORRETAS
      await this.createContainerDir(containerPath);

      const port = await this.findAvailablePort();

      // Buscar username
      const userInfo = await database.query(
        'SELECT username FROM users WHERE id = ?',
        [userId]
      );
      const username = userInfo[0]?.username || 'user';

      const subdomain = `${username}-${name}`.toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const domain = `${subdomain}.mozhost.topaziocoin.online`;

      // PHP com MySQL
      if (type === 'php') {
        // 👇 CRIAR SUBPASTAS COM PERMISSÕES CORRETAS
        await this.createContainerDir(path.join(containerPath, 'php'));
        await this.createContainerDir(path.join(containerPath, 'mysql'));
        await this.createContainerDir(path.join(containerPath, 'mysql', 'data'));

        const dbInfo = await this.createDockerCompose(containerPath, containerId, port, type);
        const pmaDomain = `pma-${subdomain}.mozhost.topaziocoin.online`;

        // Criar arquivos PHP
        await this.createInitialFiles(path.join(containerPath, 'php'), type);

        // Iniciar com docker-compose
        console.log(`🐳 Starting docker-compose for ${containerId}...`);
        await execAsync(`cd ${containerPath} && docker-compose up -d`);

        // Salvar no banco
        await database.query(`
          INSERT INTO containers
          (id, user_id, name, type, docker_container_id, port, domain, status,
           db_name, db_user, db_password, pma_port, pma_domain)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?, ?, ?, ?, ?)
        `, [
          containerId, userId, name, type, `mozhost_php_${containerId}`,
          port, domain,
          dbInfo.dbName, dbInfo.dbUser, dbInfo.dbPassword,
          dbInfo.pmaPort, pmaDomain
        ]);

        console.log(`✅ PHP+MySQL container created:`, {
          id: containerId,
          domain,
          pmaDomain,
          port,
          pmaPort: dbInfo.pmaPort
        });

        return {
          id: containerId,
          dockerId: `mozhost_php_${containerId}`,
          port,
          domain,
          pmaDomain,
          pmaPort: dbInfo.pmaPort,
          dbInfo,
          path: containerPath,
          status: 'running'
        };

      } else {
        // Node.js / Python (código antigo mantido)
        const imageConfig = this.getImageConfig(type);
        const workingDir = '/app';
        const volumeMount = [`${containerPath}:/app/code:rw`];

        const containerConfig = {
          Image: imageConfig.image,
          name: `mozhost_${containerId}`,
          ExposedPorts: { [`${imageConfig.internalPort}/tcp`]: {} },
          HostConfig: {
            PortBindings: { [`${imageConfig.internalPort}/tcp`]: [{ HostPort: port.toString() }] },
            Memory: parseInt(process.env.MAX_RAM_PER_CONTAINER) * 1024 * 1024 || 512 * 1024 * 1024,
            CpuQuota: parseInt(parseFloat(process.env.MAX_CPU_PER_CONTAINER || '0.5') * 100000),
            CpuPeriod: 100000,
            RestartPolicy: { Name: 'unless-stopped' },
            Binds: volumeMount,
            NetworkMode: 'bridge'
          },
          Env: [
            `NODE_ENV=production`,
            `PORT=${imageConfig.internalPort}`,
            ...Object.entries(environment).map(([k, v]) => `${k}=${v}`)
          ],
          WorkingDir: workingDir,
          Cmd: imageConfig.cmd
        };

        const container = await this.docker.createContainer(containerConfig);

        await database.query(`
          INSERT INTO containers (id, user_id, name, type, docker_container_id, port, domain, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'stopped')
        `, [containerId, userId, name, type, container.id, port, domain]);

        await this.createInitialFiles(containerPath, type);

        return {
          id: containerId,
          dockerId: container.id,
          port,
          domain,
          path: containerPath,
          status: 'stopped'
        };
      }

    } catch (error) {
      console.error('Error creating container:', error);
      throw new Error(`Failed to create container: ${error.message}`);
    }
  }

  async startContainer(containerId) {
    try {
      const containerInfo = await database.query(
        'SELECT docker_container_id, type FROM containers WHERE id = ?',
        [containerId]
      );

      if (!containerInfo.length) {
        throw new Error('Container not found');
      }

      const { docker_container_id, type } = containerInfo[0];

      if (type === 'php') {
        // PHP usa docker-compose
        const containerPath = path.join(this.containersPath, containerId);
        await execAsync(`cd ${containerPath} && docker-compose start`);
      } else {
        // Node/Python usa docker direto
        const container = this.docker.getContainer(docker_container_id);
        await container.start();
      }

      await database.query(
        'UPDATE containers SET status = "running", updated_at = NOW() WHERE id = ?',
        [containerId]
      );

      return { success: true, status: 'running' };
    } catch (error) {
      await database.query(
        'UPDATE containers SET status = "error" WHERE id = ?',
        [containerId]
      );
      throw error;
    }
  }

  async stopContainer(containerId) {
    try {
      const containerInfo = await database.query(
        'SELECT docker_container_id, type FROM containers WHERE id = ?',
        [containerId]
      );

      if (!containerInfo.length) {
        throw new Error('Container not found');
      }

      const { docker_container_id, type } = containerInfo[0];

      if (type === 'php') {
        const containerPath = path.join(this.containersPath, containerId);
        await execAsync(`cd ${containerPath} && docker-compose stop`);
      } else {
        const container = this.docker.getContainer(docker_container_id);
        await container.stop();
      }

      await database.query(
        'UPDATE containers SET status = "stopped", updated_at = NOW() WHERE id = ?',
        [containerId]
      );

      return { success: true, status: 'stopped' };
    } catch (error) {
      console.error('Error stopping container:', error);
      throw error;
    }
  }

  async deleteContainer(containerId) {
    try {
      const containerInfo = await database.query(
        'SELECT docker_container_id, type FROM containers WHERE id = ?',
        [containerId]
      );

      if (containerInfo.length) {
        const { docker_container_id, type } = containerInfo[0];

        if (type === 'php') {
          const containerPath = path.join(this.containersPath, containerId);
          try {
            // Parar docker-compose
            await execAsync(`cd ${containerPath} && docker-compose down -v`);
            // Aguardar containers pararem
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (e) {
            console.log('Docker-compose down error:', e.message);
          }
        } else {
          const container = this.docker.getContainer(docker_container_id);
          try {
            await container.stop();
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (e) {}
          await container.remove();
        }
      }

      // Remover do banco
      await database.query('DELETE FROM containers WHERE id = ?', [containerId]);

      const containerPath = path.join(this.containersPath, containerId);

      // 👇 TRATAMENTO DE PERMISSÃO APRIMORADO
      try {
        // Tentar deletar normalmente primeiro
        await fs.remove(containerPath);
        console.log(`✅ Container ${containerId} deletado`);
      } catch (error) {
        // Se falhar por permissão, usar sudo
        if (error.code === 'EACCES' || error.code === 'EPERM') {
          console.log(`⚠️  Usando sudo para deletar ${containerId}...`);
          await execAsync(`sudo rm -rf ${containerPath}`);
          console.log(`✅ Container ${containerId} deletado com sudo`);
        } else {
          throw error; // Outro tipo de erro
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting container:', error);
      throw error;
    }
  }

  async getContainerLogs(containerId, tail = 100) {
    try {
      const containerInfo = await database.query(
        'SELECT docker_container_id, type FROM containers WHERE id = ?',
        [containerId]
      );

      if (!containerInfo.length) {
        throw new Error('Container not found');
      }

      const { docker_container_id, type } = containerInfo[0];

      if (type === 'php') {
        const containerPath = path.join(this.containersPath, containerId);
        const { stdout } = await execAsync(`cd ${containerPath} && docker-compose logs --tail=${tail}`);
        return stdout;
      } else {
        const container = this.docker.getContainer(docker_container_id);
        const logs = await container.logs({
          stdout: true,
          stderr: true,
          tail,
          timestamps: true
        });
        return logs.toString();
      }
    } catch (error) {
      console.error('Error getting logs:', error);
      throw error;
    }
  }

  async findAvailablePort() {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      const isUsed = await database.query('SELECT id FROM containers WHERE port = ? OR pma_port = ?', [port, port]);
      if (!isUsed.length) {
        return port;
      }
    }
    throw new Error('No available ports');
  }

  getImageConfig(type) {
    const configs = {
      nodejs: {
        image: 'node:18-alpine',
        internalPort: 3000,
        cmd: ['sh', '-c', 'cd /app/code && npm install && npm start']
      },
      python: {
        image: 'python:3.11-alpine',
        internalPort: 8000,
        cmd: ['sh', '-c', 'cd /app/code && pip install -r requirements.txt && python main.py']
      },
      php: {
        image: 'php:8.3-apache',
        internalPort: 80,
        cmd: ['apache2-foreground']
      }
    };

    return configs[type] || configs.nodejs;
  }

  async createInitialFiles(containerPath, type) {
    const templates = {
      nodejs: {
        'package.json': JSON.stringify({
          name: 'mozhost-app',
          version: '1.0.0',
          main: 'index.js',
          scripts: { start: 'node index.js' },
          dependencies: { express: '^4.18.2' }
        }, null, 2),
        'index.js': `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from MozHost!',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`
      },
      python: {
        'requirements.txt': 'flask==2.3.3',
        'main.py': `from flask import Flask, jsonify
from datetime import datetime
import os

app = Flask(__name__)
PORT = int(os.environ.get('PORT', 8000))

@app.route('/')
def hello():
    return jsonify({
        'message': 'Hello from MozHost!',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=False)`
      },
      php: {
        'index.php': `<?php
header('Content-Type: application/json');

// Configuração MySQL
$host = getenv('DB_HOST') ?: 'mysql';
$dbname = getenv('DB_NAME') ?: 'mozhost_db';
$user = getenv('DB_USER') ?: 'mozhost_user';
$pass = getenv('DB_PASSWORD');

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Cria tabela de exemplo
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS visits (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip VARCHAR(45)
        )
    ");

    // Registra visita
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $stmt = $pdo->prepare("INSERT INTO visits (ip) VALUES (?)");
    $stmt->execute([$ip]);

    // Conta visitas
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM visits");
    $visits = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    $dbStatus = "✅ Connected to MySQL";

} catch (PDOException $e) {
    $dbStatus = "❌ Database Error";
    $visits = 0;
}

echo json_encode([
    'success' => true,
    'message' => 'Hello from MozHost with MySQL!',
    'language' => 'PHP',
    'version' => PHP_VERSION,
    'database' => $dbStatus,
    'total_visits' => $visits,
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT);
?>`,
        '.htaccess': `RewriteEngine On
DirectoryIndex index.php

<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>`
      }
    };

    const files = templates[type] || templates.nodejs;

    for (const [filename, content] of Object.entries(files)) {
      await fs.writeFile(path.join(containerPath, filename), content);
    }
    
    // 👇 GARANTIR PERMISSÕES NOS ARQUIVOS CRIADOS
    await execAsync(`chmod -R 775 ${containerPath}`);
  }

  async getContainerStats(containerId) {
    try {
      const containerInfo = await database.query(
        'SELECT docker_container_id FROM containers WHERE id = ?',
        [containerId]
      );

      if (!containerInfo.length) {
        throw new Error('Container not found');
      }

      const container = this.docker.getContainer(containerInfo[0].docker_container_id);
      const stats = await container.stats({ stream: false });

      return {
        cpu: this.calculateCpuPercent(stats),
        memory: {
          used: stats.memory_stats.usage,
          limit: stats.memory_stats.limit,
          percent: (stats.memory_stats.usage / stats.memory_stats.limit) * 100
        },
        network: stats.networks
      };
    } catch (error) {
      console.error('Error getting container stats:', error);
      return null;
    }
  }

  calculateCpuPercent(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
                     stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage -
                        stats.precpu_stats.system_cpu_usage;

    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
    }
    return 0;
  }
}

module.exports = new DockerManager();
