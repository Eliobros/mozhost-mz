// utils/docker-file-manager.js
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const templateManager = require('./template-manager');

const execAsync = promisify(exec);

class DockerFileManager {
  constructor(userDataPath) {
    this.userDataPath = userDataPath || '/root/mozhost/user-data';
    this.containersPath = path.join(this.userDataPath, 'containers');
  }

  async createContainerDir(dirPath) {
    await fs.ensureDir(dirPath);
    await fs.chmod(dirPath, 0o775);
    return dirPath;
  }

  async createMySQLInitScript(containerPath, dbUser, dbPassword, dbName) {
    const initScriptDir = path.join(containerPath, 'mysql', 'init');
    await this.createContainerDir(initScriptDir);

    const initSQL = `-- Script de inicialização automática do MySQL
CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';
GRANT ALL PRIVILEGES ON ${dbName}.* TO '${dbUser}'@'%';
GRANT ALL PRIVILEGES ON *.* TO '${dbUser}'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;

SELECT 'Usuario ${dbUser} criado com sucesso!' as Status;
`;

    await fs.writeFile(
      path.join(initScriptDir, '01-init.sql'),
      initSQL
    );

    console.log(`✅ Script de inicialização MySQL criado para ${dbUser}`);
  }

  async createEnvFile(containerPath, containerId, dbInfo, domain, pmaDomain, mysqlDomain) {
    const envContent = `# Configurações do Banco de Dados MySQL
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=${dbInfo.dbName}
DB_USERNAME=${dbInfo.dbUser}
DB_PASSWORD=${dbInfo.dbPassword}

# Conexão Externa MySQL
MYSQL_EXTERNAL_HOST=${mysqlDomain}
MYSQL_EXTERNAL_PORT=${dbInfo.mysqlPort}

# Configurações da Aplicação
APP_ENV=production
APP_DEBUG=false
APP_URL=https://${domain}

# Acesso ao phpMyAdmin
PMA_URL=https://${pmaDomain}
PMA_USER=${dbInfo.dbUser}
PMA_PASSWORD=${dbInfo.dbPassword}
`;

    const tempFile = `/tmp/env_${containerId}`;
    await fs.writeFile(tempFile, envContent);
    await execAsync(`docker cp ${tempFile} mozhost_php_${containerId}:/var/www/html/.env`);
    await execAsync(`docker exec mozhost_php_${containerId} chmod 644 /var/www/html/.env`);
    await fs.unlink(tempFile);

    console.log(`✅ Arquivo .env criado automaticamente`);
  }

  /**
   * Criar arquivos iniciais usando o template-manager
   * @param {string} containerPath - Caminho do container
   * @param {string} type - Tipo do template ('nodejs', 'python', 'php', 'bot-baileys', 'bot-wwebjs')
   */
  async createInitialFiles(containerPath, type) {
    try {
      // Mapear tipos antigos para novos templates
      const typeMapping = {
        'nodejs': 'api',
        'python': 'python',
        'php': 'php',
        'bot-baileys': 'bot-baileys',
        'bot-wwebjs': 'bot-wwebjs',
        'bot-telegram': 'bot-telegram',
        'bot-discord': 'bot-discord',
        'api': 'api'
      };

      const templateType = typeMapping[type] || 'api';

      // Se for PHP, usar template legado (pois tem lógica específica)
      if (type === 'php') {
        await this.createPHPTemplate(containerPath);
        return;
      }

      // Se for Python, usar template legado (por enquanto)
      if (type === 'python') {
  await this.createPythonTemplate(containerPath);
  await fs.writeFile(path.join(containerPath, '.env'), ''); // ← adicionar
  return;
}

      // Para API e Bots, usar template-manager
      console.log(`📦 Aplicando template: ${templateType}`);
      await templateManager.applyTemplate(containerPath, templateType);
      await fs.writeFile(path.join(containerPath, '.env'), ''); // ← adicionar
      
      await execAsync(`chmod -R 775 ${containerPath}`);
      
      console.log(`✅ Template ${templateType} aplicado com sucesso!`);

    } catch (error) {
      console.error(`❌ Erro ao criar arquivos iniciais:`, error);
      throw error;
    }
  }

  /**
   * Template PHP legado (mantido por compatibilidade)
   */
  async createPHPTemplate(containerPath) {
    const files = {
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
    };

    for (const [filename, content] of Object.entries(files)) {
      await fs.writeFile(path.join(containerPath, filename), content);
    }
  }

  /**
   * Template Python legado (mantido por compatibilidade)
   */
  async createPythonTemplate(containerPath) {
  const files = {
    'requirements.txt': 'flask==2.3.3\npython-dotenv',
    'main.py': `from flask import Flask, jsonify
from dotenv import load_dotenv
from datetime import datetime
import os

load_dotenv()

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
  };

  for (const [filename, content] of Object.entries(files)) {
    await fs.writeFile(path.join(containerPath, filename), content);
  }

  await fs.writeFile(path.join(containerPath, '.env'), '');
}
}

module.exports = DockerFileManager;
