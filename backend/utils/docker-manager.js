// utils/docker-manager.js
const Docker = require('dockerode');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const database = require('../models/database');

class DockerManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.userDataPath = process.env.USER_DATA_PATH || '/root/mozhost/user-data';
    this.containersPath = path.join(this.userDataPath, 'containers');
    
    // Porta inicial para containers
    this.basePort = 4000;
    this.portRange = { min: 4000, max: 5000 };
  }

  async createUserContainer(userId, containerData) {
    const { name, type, environment = {} } = containerData;
    const containerId = uuidv4();
    
    try {
      // Criar diretório do usuário
      const containerPath = path.join(this.containersPath, containerId);
      await fs.ensureDir(containerPath);

      // Porta disponível
      const port = await this.findAvailablePort();
      
      // Configurar imagem baseada no tipo
      const imageConfig = this.getImageConfig(type);
      
      // Configurações do container
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
          Binds: [`${containerPath}:/app/code:rw`],
          NetworkMode: 'bridge'
        },
        Env: [
          `NODE_ENV=production`,
          `PORT=${imageConfig.internalPort}`,
          ...Object.entries(environment).map(([k, v]) => `${k}=${v}`)
        ],
        WorkingDir: '/app',
        Cmd: imageConfig.cmd
      };

      // Criar container no Docker
      const container = await this.docker.createContainer(containerConfig);
      
      // Buscar username para gerar subdomínio
      const userInfo = await database.query(
        'SELECT username FROM users WHERE id = ?',
        [userId]
      );
      const username = userInfo[0]?.username || 'user';
      console.log(`🔍 Username encontrado: ${username} para user_id: ${userId}`);
      
      // Gerar subdomínio automático: username-containername
      const subdomain = `${username}-${name}`.toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')  // Substituir caracteres especiais por hífen
        .replace(/-+/g, '-')          // Remover hífens duplos
        .replace(/^-|-$/g, '');       // Remover hífens no início/fim
      
      const domain = `${subdomain}.mozhost.topaziocoin.online`;
      console.log(`🌐 Domínio gerado: ${domain}`);

      // Salvar no banco
      await database.query(`
        INSERT INTO containers (id, user_id, name, type, docker_container_id, port, domain, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'stopped')
      `, [containerId, userId, name, type, container.id, port, domain]);

      // Criar arquivos iniciais
      await this.createInitialFiles(containerPath, type);

      const result = {
        id: containerId,
        dockerId: container.id,
        port,
        domain,
        path: containerPath,
        status: 'stopped'
      };
      
      console.log(`✅ Container criado com sucesso:`, result);
      return result;

    } catch (error) {
      console.error('Error creating container:', error);
      throw new Error(`Failed to create container: ${error.message}`);
    }
  }

  async startContainer(containerId) {
    try {
      const containerInfo = await database.query(
        'SELECT docker_container_id FROM containers WHERE id = ?',
        [containerId]
      );

      if (!containerInfo.length) {
        throw new Error('Container not found');
      }

      const container = this.docker.getContainer(containerInfo[0].docker_container_id);
      await container.start();
      
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
        'SELECT docker_container_id FROM containers WHERE id = ?',
        [containerId]
      );

      if (!containerInfo.length) {
        throw new Error('Container not found');
      }

      const container = this.docker.getContainer(containerInfo[0].docker_container_id);
      await container.stop();
      
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
        'SELECT docker_container_id FROM containers WHERE id = ?',
        [containerId]
      );

      if (containerInfo.length) {
        const container = this.docker.getContainer(containerInfo[0].docker_container_id);
        
        try {
          await container.stop();
        } catch (e) {
          // Container já parado
        }
        
        await container.remove();
      }

      // Remover do banco
      await database.query('DELETE FROM containers WHERE id = ?', [containerId]);

      // Remover arquivos
      const containerPath = path.join(this.containersPath, containerId);
      await fs.remove(containerPath);

      return { success: true };
    } catch (error) {
      console.error('Error deleting container:', error);
      throw error;
    }
  }

  async getContainerLogs(containerId, tail = 100) {
    try {
      const containerInfo = await database.query(
        'SELECT docker_container_id FROM containers WHERE id = ?',
        [containerId]
      );

      if (!containerInfo.length) {
        throw new Error('Container not found');
      }

      const container = this.docker.getContainer(containerInfo[0].docker_container_id);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true
      });

      return logs.toString();
    } catch (error) {
      console.error('Error getting logs:', error);
      throw error;
    }
  }

  async findAvailablePort() {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      const isUsed = await database.query('SELECT id FROM containers WHERE port = ?', [port]);
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
      }
    };

    const files = templates[type] || templates.nodejs;
    
    for (const [filename, content] of Object.entries(files)) {
      await fs.writeFile(path.join(containerPath, filename), content);
    }
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
