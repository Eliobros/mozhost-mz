// models/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000
    });
  }

  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async initTables() {
    try {
      // Tabela de usuários
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          plan ENUM('free', 'basic', 'pro') DEFAULT 'free',
          max_containers INT DEFAULT 2,
          max_ram_mb INT DEFAULT 512,
          max_storage_mb INT DEFAULT 1024,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Tabela de containers
      await this.query(`
        CREATE TABLE IF NOT EXISTS containers (
          id VARCHAR(36) PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          type ENUM('nodejs', 'python') NOT NULL,
          status ENUM('stopped', 'running', 'error', 'building') DEFAULT 'stopped',
          docker_container_id VARCHAR(100),
          port INT,
          domain VARCHAR(255),
          cpu_limit DECIMAL(3,2) DEFAULT 0.5,
          memory_limit_mb INT DEFAULT 512,
          storage_used_mb INT DEFAULT 0,
          auto_restart BOOLEAN DEFAULT true,
          environment TEXT, -- JSON string
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_containers (user_id),
          INDEX idx_container_status (status)
        )
      `);

      // Tabela de logs
      await this.query(`
        CREATE TABLE IF NOT EXISTS container_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          container_id VARCHAR(36) NOT NULL,
          log_type ENUM('stdout', 'stderr', 'system') DEFAULT 'stdout',
          message TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE,
          INDEX idx_container_logs (container_id, timestamp)
        )
      `);

      // Tabela de sessões ativas
      await this.query(`
        CREATE TABLE IF NOT EXISTS active_sessions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_sessions (user_id, expires_at)
        )
      `);

      // Tabela de usage/estatísticas
      await this.query(`
        CREATE TABLE IF NOT EXISTS usage_stats (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          container_id VARCHAR(36),
          cpu_usage DECIMAL(5,2),
          memory_usage_mb INT,
          network_in_mb DECIMAL(10,2),
          network_out_mb DECIMAL(10,2),
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE,
          INDEX idx_usage_time (recorded_at),
          INDEX idx_usage_user (user_id, recorded_at)
        )
      `);

      console.log('✅ Database tables initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.query('SELECT 1 as test');
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }
}

module.exports = new Database();
