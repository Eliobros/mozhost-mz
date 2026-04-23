// utils/docker-manager.js
const Docker = require('dockerode');
const tarFs = require('tar-fs'); // ← ADICIONA ISSO
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const database = require('../models/database');

const DockerFileManager = require('./docker-file-manager');
const DockerComposeManager = require('./docker-compose-manager');
const DockerNginxManager = require('./docker-nginx-manager');

// ✨ NOVO: Importar NotificationManager
const notificationManager = require('./notification-manager');

class DockerManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.userDataPath = process.env.USER_DATA_PATH || '/root/mozhost/user-data';
    this.containersPath = path.join(this.userDataPath, 'containers');

    this.basePort = 4000;
    this.portRange = { min: 4000, max: 5000 };

    this.fileManager = new DockerFileManager(this.userDataPath);
    this.composeManager = new DockerComposeManager();
    this.nginxManager = new DockerNginxManager();
  }

  async createUserContainer(userId, containerData) {
    const { name, type, environment = {} } = containerData;
    const containerId = uuidv4();

    try {
      const containerPath = path.join(this.containersPath, containerId);
      await this.fileManager.createContainerDir(containerPath);

      const port = await this.findAvailablePort();

      const userInfo = await database.query(
        'SELECT username FROM users WHERE id = ?',
        [userId]
      );
      const username = userInfo[0]?.username || 'user';

      const subdomain = `${username}-${name}`.toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const domain = `${subdomain}.mozhost.shop`;

      let result;
      if (type === 'static') {
  result = await this.createStaticContainer(
    userId, containerId, containerPath, port,
    name, type, domain)
} else if (type === 'php') {
        result = await this.createPHPContainer(
          userId, containerId, containerPath, port,
          name, type, subdomain, domain, username
        );
      } else {
        result = await this.createNodePythonContainer(
          userId, containerId, containerPath, port,
          name, type, domain, environment
        );
      }

      // ✨ NOVO: Notificar criação do container
      await notificationManager.notifyContainerCreated(userId, name, domain);

      return result;

    } catch (error) {
      console.error('Error creating container:', error);
      
      // ✨ NOVO: Notificar erro na criação
      await notificationManager.notifyContainerError(
        userId, 
        name, 
        error.message
      );
      
      throw new Error(`Failed to create container: ${error.message}`);
    }
  }

  async createPHPContainer(userId, containerId, containerPath, port, name, type, subdomain, domain, username) {
    await this.fileManager.createContainerDir(path.join(containerPath, 'php'));
    await this.fileManager.createContainerDir(path.join(containerPath, 'mysql'));
    await this.fileManager.createContainerDir(path.join(containerPath, 'mysql', 'data'));

    const dbInfo = await this.composeManager.createDockerCompose(containerPath, containerId, port, type);

    await this.fileManager.createMySQLInitScript(
      containerPath, dbInfo.dbUser, dbInfo.dbPassword, dbInfo.dbName
    );

    const pmaDomain = `pma-${subdomain}.mozhost.shop`;
    const mysqlDomain = `mysql.${subdomain}.mozhost.shop`;

    await this.fileManager.createInitialFiles(path.join(containerPath, 'php'), type);

    console.log(`🐳 Starting docker-compose for ${containerId}...`);
    await this.composeManager.startCompose(containerPath);

    console.log(`⏳ Aguardando MySQL inicializar...`);
    await new Promise(resolve => setTimeout(resolve, 10000));

    await this.composeManager.enableApacheModRewrite(containerId);

    try {
      await this.fileManager.createEnvFile(
        containerPath, containerId, dbInfo, domain, pmaDomain, mysqlDomain
      );
    } catch (error) {
      console.error(`⚠️  Erro ao criar .env:`, error.message);
    }

    try {
      await this.nginxManager.createNginxConfig(containerId, pmaDomain, dbInfo.pmaPort);
    } catch (error) {
      console.error('⚠️  Erro ao criar Nginx config:', error.message);
    }

    await database.query(`
      INSERT INTO containers
      (id, user_id, name, type, docker_container_id, port, domain, status,
       db_name, db_user, db_password, pma_port, pma_domain, mysql_port, mysql_domain)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?, ?, ?, ?, ?, ?, ?)
    `, [
      containerId, userId, name, type, `mozhost_php_${containerId}`,
      port, domain,
      dbInfo.dbName, dbInfo.dbUser, dbInfo.dbPassword,
      dbInfo.pmaPort, pmaDomain, dbInfo.mysqlPort, mysqlDomain
    ]);

    console.log(`✅ PHP+MySQL container created:`, {
      id: containerId,
      domain,
      pmaDomain,
      mysqlDomain,
      port,
      pmaPort: dbInfo.pmaPort,
      mysqlPort: dbInfo.mysqlPort
    });

    return {
      id: containerId,
      dockerId: `mozhost_php_${containerId}`,
      port,
      domain,
      pmaDomain,
      pmaPort: dbInfo.pmaPort,
      mysqlDomain,
      mysqlPort: dbInfo.mysqlPort,
      dbInfo,
      path: containerPath,
      status: 'running'
    };
  }

async buildCustomImage(type, containerPath) {
  const imageTag = `mozhost-${type}:latest`;
  
  // Verificar se imagem já existe
  try {
    await this.docker.getImage(imageTag).inspect();
    console.log(`✅ Imagem ${imageTag} já existe, reutilizando...`);
    return imageTag;
  } catch {
    console.log(`📦 Criando imagem customizada ${imageTag}...`);
  }

  let dockerfileContent = '';
  
  if (type === 'nodejs') {
    dockerfileContent = `
FROM node:20-alpine

# Instalar git e outras ferramentas
RUN apk add --no-cache git python3 make g++

WORKDIR /app/code

# Instalar dependências globais úteis
RUN npm install -g nodemon pm2

EXPOSE 3000

CMD ["node", "index.js"]
`;
  } else if (type === 'python') {
    dockerfileContent = `
FROM python:3.11-alpine

# Instalar git
RUN apk add --no-cache git gcc musl-dev

WORKDIR /app/code

EXPOSE 5000

CMD ["python", "main.py"]
`;
  }

  // Criar diretório temporário para build
  const buildDir = path.join('/tmp', `mozhost-build-${type}-${Date.now()}`);
  await fs.ensureDir(buildDir);
  
  const dockerfilePath = path.join(buildDir, 'Dockerfile');
  await fs.writeFile(dockerfilePath, dockerfileContent.trim());

  try {
    // Build da imagem
    const tarStream = require('tar-fs').pack(buildDir);
    
    const stream = await this.docker.buildImage(tarStream, {
      t: imageTag,
      dockerfile: 'Dockerfile'
    });

    // Aguardar build com logs
    await new Promise((resolve, reject) => {
      this.docker.modem.followProgress(stream, 
        (err, res) => {
          if (err) {
            console.error('❌ Erro no build:', err);
            reject(err);
          } else {
            console.log('✅ Build concluído!');
            resolve(res);
          }
        },
        (event) => {
          if (event.stream) {
            process.stdout.write(event.stream);
          }
        }
      );
    });

    console.log(`✅ Imagem ${imageTag} criada com sucesso!`);
    return imageTag;

  } finally {
    // Limpar diretório temporário
    await fs.remove(buildDir);
  }
}


/*
async buildCustomImage(type, containerPath) {
  const imageTag = `mozhost-${type}:latest`;
  
  // Verificar se imagem já existe
  try {
    await this.docker.getImage(imageTag).inspect();
    return imageTag; // Imagem já existe
  } catch {
    // Imagem não existe, criar
  }

  let dockerfileContent = '';
  
  if (type === 'nodejs') {
    dockerfileContent = `
FROM node:18-alpine

# Instalar git e outras ferramentas
RUN apk add --no-cache git python3 make g++

WORKDIR /app/code

# Instalar dependências globais úteis
RUN npm install -g nodemon pm2

EXPOSE 3000

CMD ["node", "index.js"]
`;
  } else if (type === 'python') {
    dockerfileContent = `
FROM python:3.11-alpine

# Instalar git
RUN apk add --no-cache git gcc musl-dev

WORKDIR /app/code

EXPOSE 5000

CMD ["python", "main.py"]
`;
  }

  // Salvar Dockerfile temporário
  const dockerfilePath = path.join(containerPath, 'Dockerfile.custom');
  await fs.writeFile(dockerfilePath, dockerfileContent);

  // Build da imagem
  const stream = await this.docker.buildImage({
    context: containerPath,
    src: ['Dockerfile.custom']
  }, {
    t: imageTag
  });

  // Aguardar build
  await new Promise((resolve, reject) => {
    this.docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
  });

  // Remover Dockerfile temporário
  await fs.unlink(dockerfilePath);

  return imageTag;
}
*/
/*

  async createNodePythonContainer(userId, containerId, containerPath, port, name, type, domain, environment) {
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

    await this.fileManager.createInitialFiles(containerPath, type);

    return {
      id: containerId,
      dockerId: container.id,
      port,
      domain,
      path: containerPath,
      status: 'stopped'
    };
  }
*/

async createNodePythonContainer(userId, containerId, containerPath, port, name, type, domain, environment) {
  // ✨ NOVO: Build imagem customizada com git

  
  const imageConfig = this.getImageConfig(type);

    // Buscar comando de inicialização personalizado do usuário
    const userCommands = await database.query(
      'SELECT startup_command_nodejs, startup_command_python FROM users WHERE id = ?',
      [userId]
    );
    
    if (userCommands.length > 0) {
      const userCmd = type === 'python' 
        ? userCommands[0].startup_command_python 
        : userCommands[0].startup_command_nodejs;
      
      if (userCmd && userCmd.trim()) {
        // Manter os prefixos de instalação de dependências do sistema
        const systemDeps = imageConfig.cmd[2].split('&&').filter(c => c.trim().startsWith('apk ') || c.trim().startsWith('cd ')).map(c => c.trim());
        const cdCmd = `cd /app/code`;
        const fullCmd = [...systemDeps.filter(c => !c.startsWith('cd')), cdCmd, userCmd.trim()].join(' && ');
        imageConfig.cmd = ['sh', '-c', fullCmd];
      }
    }

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

  await this.fileManager.createInitialFiles(containerPath, type);


 // No final de createNodePythonContainer antes do return:
try {
  await this.nginxManager.createSiteNginxConfig(containerId, domain, port);
} catch (error) {
  console.error('⚠️ Erro ao criar Nginx config:', error.message);
}
 
  return {
    id: containerId,
    dockerId: container.id,
    port,
    domain,
    path: containerPath,
    status: 'stopped'
  };
}

async createStaticContainer(userId, containerId, containerPath, port, name, type, domain) {
  // Criar pasta html onde o cliente vai colocar os arquivos
  const htmlPath = path.join(containerPath, 'html');
  await this.fileManager.createContainerDir(htmlPath);

  // Criar index.html padrão
  await fs.writeFile(
    path.join(htmlPath, 'index.html'),
    `<h1>Site no ar! Faça upload dos seus arquivos.</h1>`
  );

  // Config nginx que serve a pasta html
  const nginxConf = `
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}`;

  await fs.writeFile(path.join(containerPath, 'nginx.conf'), nginxConf);

  const containerConfig = {
    Image: 'nginx:alpine',
    name: `mozhost_${containerId}`,
    ExposedPorts: { '80/tcp': {} },
    HostConfig: {
      PortBindings: { '80/tcp': [{ HostPort: port.toString() }] },
      Binds: [
        `${htmlPath}:/usr/share/nginx/html:rw`,
        `${containerPath}/nginx.conf:/etc/nginx/conf.d/default.conf:ro`
      ],
      RestartPolicy: { Name: 'unless-stopped' },
      NetworkMode: 'bridge'
    }
  };

  const container = await this.docker.createContainer(containerConfig);
  await container.start();

  await database.query(`
    INSERT INTO containers (id, user_id, name, type, docker_container_id, port, domain, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'running')
  `, [containerId, userId, name, type, container.id, port, domain]);

   try {
  await this.nginxManager.createSiteNginxConfig(containerId, domain, port);
} catch (error) {
  console.error('⚠️ Erro ao criar Nginx config:', error.message);
}


  return {
    id: containerId,
    dockerId: container.id,
    port,
    domain,
    path: containerPath,
    status: 'running'
  };
}

  async startContainer(containerId) {
    try {
      const containerInfo = await database.query(
        'SELECT docker_container_id, type, name, user_id FROM containers WHERE id = ?',
        [containerId]
      );

      if (!containerInfo.length) {
        throw new Error('Container not found');
      }

      const { docker_container_id, type, name, user_id } = containerInfo[0];

      if (type === 'php') {
        const containerPath = path.join(this.containersPath, containerId);
        await this.composeManager.startCompose(containerPath);
      } else {
        const container = this.docker.getContainer(docker_container_id);
        await container.start();
      }

      await database.query(
        'UPDATE containers SET status = "running", updated_at = NOW() WHERE id = ?',
        [containerId]
      );

      // ✨ NOVO: Notificar container iniciado
      await notificationManager.notifyContainerStarted(user_id, name, containerId);

      return { success: true, status: 'running' };
    } catch (error) {
      await database.query(
        'UPDATE containers SET status = "error" WHERE id = ?',
        [containerId]
      );

      // ✨ NOVO: Notificar erro
      const containerInfo = await database.query(
        'SELECT name, user_id FROM containers WHERE id = ?',
        [containerId]
      );
      
      if (containerInfo.length) {
        await notificationManager.notifyContainerError(
          containerInfo[0].user_id,
          containerInfo[0].name,
          error.message
        );
      }

      throw error;
    }
  }

  async stopContainer(containerId) {
    try {
      const containerInfo = await database.query(
        'SELECT docker_container_id, type, name, user_id FROM containers WHERE id = ?',
        [containerId]
      );

      if (!containerInfo.length) {
        throw new Error('Container not found');
      }

      const { docker_container_id, type, name, user_id } = containerInfo[0];

      if (type === 'php') {
        const containerPath = path.join(this.containersPath, containerId);
        await this.composeManager.stopCompose(containerPath);
      } else {
        const container = this.docker.getContainer(docker_container_id);
        await container.stop();
      }

      await database.query(
        'UPDATE containers SET status = "stopped", updated_at = NOW() WHERE id = ?',
        [containerId]
      );

      // ✨ NOVO: Notificar container parado
      await notificationManager.notifyContainerStopped(user_id, name, containerId);

      return { success: true, status: 'stopped' };
    } catch (error) {
      console.error('Error stopping container:', error);
      throw error;
    }
  }

  async deleteContainer(containerId) {
    try {
      const containerInfo = await database.query(
        'SELECT docker_container_id, type, name, user_id FROM containers WHERE id = ?',
        [containerId]
      );

      let containerName = 'Container';
      let userId = null;

      if (containerInfo.length) {
        const { docker_container_id, type, name, user_id } = containerInfo[0];
        containerName = name;
        userId = user_id;

        if (type === 'php') {
          await this.nginxManager.removeNginxConfig(containerId);
          const containerPath = path.join(this.containersPath, containerId);
          await this.composeManager.removeCompose(containerPath);
        } else {
          const container = this.docker.getContainer(docker_container_id);
          try {
            await container.stop();
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (e) {}
          await container.remove();
        }
      }

      await database.query('DELETE FROM containers WHERE id = ?', [containerId]);

      const containerPath = path.join(this.containersPath, containerId);

      try {
        await fs.remove(containerPath);
        console.log(`✅ Container ${containerId} deletado`);
      } catch (error) {
        if (error.code === 'EACCES' || error.code === 'EPERM') {
          console.log(`⚠️  Usando sudo para deletar ${containerId}...`);
          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);
          await execAsync(`sudo rm -rf ${containerPath}`);
          console.log(`✅ Container ${containerId} deletado com sudo`);
        } else {
          throw error;
        }
      }

      // ✨ NOVO: Notificar container deletado
      if (userId) {
        await notificationManager.notifyContainerDeleted(userId, containerName);
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
        return await this.composeManager.getComposeLogs(containerPath, tail);
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
      const isUsed = await database.query(
        'SELECT id FROM containers WHERE port = ? OR pma_port = ? OR mysql_port = ?',
        [port, port, port]
      );
      if (!isUsed.length) {
        return port;
      }
    }
    throw new Error('No available ports');
  }

  getImageConfig(type) {
  const configs = {
    nodejs: {
      image: 'node:20-alpine',
      internalPort: 3000,
      cmd: ['sh', '-c', 'apk add --no-cache git && cd /app/code && npm install && npm start']
    },
    api: {
      image: 'node:20-alpine',
      internalPort: 3000,
      cmd: ['sh', '-c', 'apk add --no-cache git && cd /app/code && npm install && npm start']
    },
    'bot-baileys': {
      image: 'node:20-alpine',
      internalPort: 3000,
      cmd: ['sh', '-c', 'apk add --no-cache git python3 make g++ && cd /app/code && npm install && npm start']
    },
    'bot-wwebjs': { 
      image: 'node:20-alpine',
      internalPort: 3000,
      cmd: ['sh', '-c', 'apk add --no-cache git python3 make g++ chromium nss freetype harfbuzz ca-certificates ttf-freefont && cd /app/code && npm install && npm start']
    },
    python: {
      image: 'python:3.11-alpine',
      internalPort: 8000,
      cmd: ['sh', '-c', 'cd /app/code && pip install -r requirements.txt && python main.py']
    },
    static: {
      image: 'nginx:alpine',
      internalPort: 80,
      cmd: ['nginx', '-g', 'daemon off;']
}
  };

  return configs[type] || configs.nodejs;
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
      const maxRam = parseInt(process.env.MAX_RAM_PER_CONTAINER) * 1024 * 1024 || 512 * 1024 * 1024;

      return {
        cpu: this.calculateCpuPercent(stats),
        memory: {
          used: stats.memory_stats.usage,
          limit: maxRam,
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
