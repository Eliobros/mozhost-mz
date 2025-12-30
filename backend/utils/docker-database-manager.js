// utils/docker-database-manager.js
const Docker = require('dockerode');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { promisify } = require('util');
const database = require('../models/database');

const execAsync = promisify(exec);

class DockerDatabaseManager {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.userDataPath = process.env.USER_DATA_PATH || '/root/mozhost/user-data';
    this.databasesPath = path.join(this.userDataPath, 'databases');
    this.publicHost = process.env.PUBLIC_HOST || 'mozhost.topaziocoin.online';

    this.portRange = { min: 5100, max: 5500 };

    // Garantir diretório existe
    fs.ensureDirSync(this.databasesPath);
  }

  /**
   * Criar novo database
   */
  async createDatabase(userId, databaseData) {
   const { name, type, linkToContainer, database_name, username, password } = databaseData;  // ← adicionar password aqui
  
    const databaseId = uuidv4();

    try {
      // Validar se database_name já existe para este usuário
      if (database_name) {
        const existing = await database.query(
          'SELECT id FROM `databases` WHERE user_id = ? AND database_name = ?',
          [userId, database_name]
        );
        
        if (existing.length > 0) {
          throw new Error('Você já possui um database com esse nome. Escolha outro nome.');
        }
      }

      // Criar diretório
      const dbPath = path.join(this.databasesPath, databaseId);
      await fs.ensureDir(dbPath);
      await fs.ensureDir(path.join(dbPath, 'data'));
      await fs.ensureDir(path.join(dbPath, 'init'));

      // Encontrar porta disponível
      const port = await this.findAvailablePort();

      // Gerar credenciais (permite customização parcial)
      const credentials = this.generateCredentials(type, {
        database_name,
        username,
	password
      });

      // Gerar subdomínio: nome-tipo.dominio.com
      const subdomain = `${this.sanitizeName(name)}-${type}.${this.publicHost}`;

      // Criar docker-compose
      await this.createDockerCompose(dbPath, databaseId, type, port, credentials);

      // Criar script de inicialização (se MySQL/Postgres)
      if (['mysql', 'mariadb', 'postgres'].includes(type)) {
        await this.createInitScript(dbPath, type, credentials);
      }

      // Iniciar container
      console.log(`🐳 Starting database ${databaseId}...`);
      await execAsync(`cd ${dbPath} && docker-compose up -d`);

      // Aguardar database inicializar
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Connection string (mantida como extra)
      const connectionString = this.buildConnectionString(
        type, credentials, port, subdomain
      );

      // Salvar no banco
      await database.query(
        'INSERT INTO `databases` (id, user_id, name, type, status, host, port, database_name, username, password, docker_container_id, docker_compose_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          databaseId,
          userId,
          name,
          type,
          'running',
          subdomain,
          port,
          credentials.database,
          credentials.username,
          credentials.password,
          `mozhost_db_${databaseId}`,
          dbPath
        ]
      );

      // Vincular a container se solicitado
      if (linkToContainer) {
        await this.linkToContainer(databaseId, linkToContainer);
      }

      // Retornar dados separados (mais amigável)
      return {
        id: databaseId,
        name,
        type,
        status: 'running',
        
        // Dados de conexão separados
        host: subdomain,
        port: port,
        database_name: credentials.database,
        username: credentials.username,
        password: credentials.password,
        
        // Connection string como bônus
        connection_string: connectionString,
        
        cost: 5 // coins/dia
      };

    } catch (error) {
      // Limpar em caso de erro
      try {
        const dbPath = path.join(this.databasesPath, databaseId);
        await fs.remove(dbPath);
      } catch (e) {}

      throw new Error(`Failed to create database: ${error.message}`);
    }
  }

  /**
   * Sanitizar nome para subdomínio (remove caracteres especiais)
   */
  sanitizeName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Gerar credenciais (permite customização parcial)
   */
  generateCredentials(type, custom = {}) {
  const randomStr = () => Math.random().toString(36).slice(2, 12);

  return {
    database: custom.database_name || `db_${randomStr()}`,
    username: custom.username || `user_${randomStr()}`,
    password: custom.password || `${randomStr()}${randomStr()}`.toUpperCase()  // ← Agora aceita custom!
  };
}

  /**
   * Criar docker-compose.yml
   */
  async createDockerCompose(dbPath, databaseId, type, port, credentials) {
    const configs = {
      mysql: {
        image: 'mysql:8.0',
        environment: [
          `MYSQL_ROOT_PASSWORD=${credentials.password}`,
          `MYSQL_DATABASE=${credentials.database}`,
          `MYSQL_USER=${credentials.username}`,
          `MYSQL_PASSWORD=${credentials.password}`
        ],
        volumes: [
          './data:/var/lib/mysql',
          './init:/docker-entrypoint-initdb.d'
        ],
        ports: [`0.0.0.0:${port}:3306`]
      },
      mariadb: {
        image: 'mariadb:10.11',
        environment: [
          `MYSQL_ROOT_PASSWORD=${credentials.password}`,
          `MYSQL_DATABASE=${credentials.database}`,
          `MYSQL_USER=${credentials.username}`,
          `MYSQL_PASSWORD=${credentials.password}`
        ],
        volumes: [
          './data:/var/lib/mysql',
          './init:/docker-entrypoint-initdb.d'
        ],
        ports: [`0.0.0.0:${port}:3306`]
      },
      postgres: {
        image: 'postgres:15',
        environment: [
          `POSTGRES_DB=${credentials.database}`,
          `POSTGRES_USER=${credentials.username}`,
          `POSTGRES_PASSWORD=${credentials.password}`
        ],
        volumes: [
          './data:/var/lib/postgresql/data',
          './init:/docker-entrypoint-initdb.d'
        ],
        ports: [`0.0.0.0:${port}:5432`]
      },
      mongodb: {
        image: 'mongo:6.0',
        environment: [
          `MONGO_INITDB_ROOT_USERNAME=${credentials.username}`,
          `MONGO_INITDB_ROOT_PASSWORD=${credentials.password}`,
          `MONGO_INITDB_DATABASE=${credentials.database}`
        ],
        volumes: ['./data:/data/db'],
        ports: [`0.0.0.0:${port}:27017`]
      },
      redis: {
        image: 'redis:7.0',
        command: `redis-server --requirepass ${credentials.password}`,
        volumes: ['./data:/data'],
        ports: [`0.0.0.0:${port}:6379`]
      }
    };

    const config = configs[type];

    const composeContent = `version: '3.8'

services:
  db:
    image: ${config.image}
    container_name: mozhost_db_${databaseId}
    restart: unless-stopped
${config.environment ? `    environment:\n${config.environment.map(e => `      - ${e}`).join('\n')}` : ''}
${config.command ? `    command: ${config.command}` : ''}
    volumes:
${config.volumes.map(v => `      - ${v}`).join('\n')}
    ports:
${config.ports.map(p => `      - "${p}"`).join('\n')}
    mem_limit: 1g
    cpus: 0.5
`;

    await fs.writeFile(path.join(dbPath, 'docker-compose.yml'), composeContent);
  }

  /**
   * Criar script de inicialização
   */
  async createInitScript(dbPath, type, credentials) {
    if (type === 'mysql' || type === 'mariadb') {
      const initScript = `-- Inicialização do database
CREATE DATABASE IF NOT EXISTS ${credentials.database};
USE ${credentials.database};

-- Adicione suas tabelas aqui se necessário
`;
      await fs.writeFile(path.join(dbPath, 'init', 'init.sql'), initScript);
    } else if (type === 'postgres') {
      const initScript = `-- Inicialização do database
-- Database já criado automaticamente
`;
      await fs.writeFile(path.join(dbPath, 'init', 'init.sql'), initScript);
    }
  }

  /**
   * Build connection string
   */
  buildConnectionString(type, credentials, port, host = null) {
    const { username, password, database } = credentials;
    const dbHost = host || this.publicHost;

    const strings = {
      mysql: `mysql://${username}:${password}@${dbHost}:${port}/${database}`,
      mariadb: `mysql://${username}:${password}@${dbHost}:${port}/${database}`,
      postgres: `postgres://${username}:${password}@${dbHost}:${port}/${database}`,
      mongodb: `mongodb://${username}:${password}@${dbHost}:${port}/${database}`,
      redis: `redis://:${password}@${dbHost}:${port}`
    };

    return strings[type];
  }

  /**
   * Encontrar porta disponível
   */
  async findAvailablePort() {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      const isUsed = await database.query(
        'SELECT id FROM `databases` WHERE port = ?',
        [port]
      );
      if (!isUsed.length) {
        return port;
      }
    }
    throw new Error('No available ports for databases');
  }

  /**
   * Vincular database a container
   */
  async linkToContainer(databaseId, containerId) {
    await database.query(
      'INSERT IGNORE INTO database_container_links (database_id, container_id) VALUES (?, ?)',
      [databaseId, containerId]
    );
  }

  /**
   * Parar database
   */
  async stopDatabase(databaseId) {
    const dbInfo = await database.query(
      'SELECT docker_compose_path FROM `databases` WHERE id = ?',
      [databaseId]
    );

    if (!dbInfo.length) {
      throw new Error('Database not found');
    }

    const dbPath = dbInfo[0].docker_compose_path;
    await execAsync(`cd ${dbPath} && docker-compose stop`);

    await database.query(
      'UPDATE `databases` SET status = ? WHERE id = ?',
      ['stopped', databaseId]
    );
  }

  /**
   * Iniciar database
   */
  async startDatabase(databaseId) {
    const dbInfo = await database.query(
      'SELECT docker_compose_path FROM `databases` WHERE id = ?',
      [databaseId]
    );

    if (!dbInfo.length) {
      throw new Error('Database not found');
    }

    const dbPath = dbInfo[0].docker_compose_path;
    await execAsync(`cd ${dbPath} && docker-compose start`);

    await database.query(
      'UPDATE `databases` SET status = ? WHERE id = ?',
      ['running', databaseId]
    );
  }

  /**
   * Deletar database
   */
  async deleteDatabase(databaseId) {
    const dbInfo = await database.query(
      'SELECT docker_compose_path FROM `databases` WHERE id = ?',
      [databaseId]
    );

    if (!dbInfo.length) {
      throw new Error('Database not found');
    }

    const dbPath = dbInfo[0].docker_compose_path;

    // Parar e remover containers
    try {
      await execAsync(`cd ${dbPath} && docker-compose down -v`);
    } catch (e) {
      console.error('Error stopping database:', e);
    }

    // Remover do banco
    await database.query('DELETE FROM `databases` WHERE id = ?', [databaseId]);

    // Remover arquivos
    try {
      await fs.remove(dbPath);
    } catch (error) {
      if (error.code === 'EACCES') {
        await execAsync(`sudo rm -rf ${dbPath}`);
      }
    }
  }
}

module.exports = new DockerDatabaseManager();
