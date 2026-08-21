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

  // ============================================
  // NOVO MÉTODO - ADICIONA AQUI!
  // ============================================
  async getConnection() {
    try {
      return await this.pool.getConnection();
    } catch (error) {
      console.error('Error getting database connection:', error);
      throw error;
    }
  }
  // ============================================

  async initTables() {
    try {
      // Tabela de usuários
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
	  email_quota INT DEFAULT 500,
	  email_plan ENUM('free', 'basic', 'pro', 'business') DEFAULT 'free',
          plan ENUM('free', 'starter', 'basic', 'pro', 'business') DEFAULT 'free',
          max_containers INT DEFAULT 2,
          max_ram_mb INT DEFAULT 0,
          max_storage_mb INT DEFAULT 0,
          coins INT DEFAULT 250,
          email_verified BOOLEAN DEFAULT false,
          email_verification_code VARCHAR(10),
          email_verification_expires TIMESTAMP NULL,
          verification_bonus_awarded BOOLEAN DEFAULT false,
          reset_token VARCHAR(64),
          reset_expires TIMESTAMP NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Adicionar coluna free_trial_ends se não existir
      try {
        await this.query(`ALTER TABLE users ADD COLUMN free_trial_ends TIMESTAMP NULL`);
        console.log('✅ Added free_trial_ends column');
      } catch (e) {
        // Column already exists
      }

      // Definir trial de 7 dias para usuários free existentes que não têm
      try {
        await this.query(`UPDATE users SET free_trial_ends = DATE_ADD(created_at, INTERVAL 7 DAY) WHERE plan = 'free' AND free_trial_ends IS NULL`);
      } catch (e) {}

      // Adicionar coluna suspended_at se não existir (conta suspensa por falta de pagamento)
      try {
        await this.query(`ALTER TABLE users ADD COLUMN suspended_at TIMESTAMP NULL`);
        console.log('✅ Added suspended_at column');
      } catch (e) {}

      // Ampliar ENUM de planos (starter/business eram usados pelo billing mas não cabiam no ENUM)
      try {
        await this.query(`ALTER TABLE users MODIFY COLUMN plan ENUM('free', 'starter', 'basic', 'pro', 'business') DEFAULT 'free'`);
        console.log('✅ users.plan ENUM atualizado (free, starter, basic, pro, business)');
      } catch (e) {}

      // Permitir método 'manual' no billing (migração de cliente feita por script)
      try {
        await this.query(`ALTER TABLE billing MODIFY COLUMN method ENUM('mpesa', 'emola', 'mercadopago', 'manual') NOT NULL`);
        console.log('✅ billing.method ENUM atualizado (inclui manual)');
      } catch (e) {}

      // OAuth columns
      try {
        await this.query(`ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20) NULL`);
        console.log('✅ Added oauth_provider column');
      } catch (e) {}

      try {
        await this.query(`ALTER TABLE users ADD COLUMN oauth_provider_id VARCHAR(255) NULL`);
        console.log('✅ Added oauth_provider_id column');
      } catch (e) {}

      try {
        await this.query(`ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL`);
        console.log('✅ Added avatar_url column');
      } catch (e) {}

      try {
        await this.query(`ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT true`);
        console.log('✅ Added profile_completed column');
      } catch (e) {}

      try {
        await this.query(`ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL`);
        console.log('✅ Made password_hash nullable for OAuth users');
      } catch (e) {}

      // Verificar e corrigir a tabela de containers
      try {
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
            environment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_containers (user_id),
            INDEX idx_container_status (status)
          )
        `);

        try {
          await this.query(`
            ALTER TABLE containers
            MODIFY COLUMN status ENUM('stopped', 'running', 'error', 'building') DEFAULT 'stopped'
          `);
          console.log('✅ ENUM status da tabela containers atualizado');
        } catch (alterError) {
          console.log('ℹ️  ENUM status já estava correto ou tabela é nova');
        }
      } catch (containerError) {
        console.error('⚠️  Erro ao configurar tabela containers:', containerError.message);
        throw containerError;
      }

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

      // Tabela de databases dos usuários (MySQL/phpMyAdmin)
      await this.query(`
        CREATE TABLE IF NOT EXISTS user_databases (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          host VARCHAR(255) NOT NULL DEFAULT 'mysql-shared',
          port INT NOT NULL DEFAULT 3306,
          database_name VARCHAR(100) NOT NULL,
          username VARCHAR(100) NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_database (user_id)
        )
      `);

      // Tabela de pagamentos
      await this.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          payment_method ENUM('mpesa', 'emola') NOT NULL,
          phone_number VARCHAR(20),
          coins_to_add INT NOT NULL,
          status ENUM('pending', 'completed', 'failed', 'expired') DEFAULT 'pending',
          external_payment_id VARCHAR(100),
          provider VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_payment_user (user_id),
          INDEX idx_payment_status (status)
        )
      `);

      // Tabela de subscrições (controle de expiração de containers)
      await this.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          container_id VARCHAR(36) NOT NULL,
          coins_paid INT NOT NULL DEFAULT 500,
          ram_mb INT NOT NULL DEFAULT 1024,
          storage_mb INT NOT NULL DEFAULT 1024,
          starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          status ENUM('active', 'expiring_soon', 'expired') DEFAULT 'active',
          renewed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE,
          INDEX idx_sub_user (user_id),
          INDEX idx_sub_container (container_id),
          INDEX idx_sub_expires (expires_at)
        )
      `);

      // Tabela de notificações
      await this.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
          category ENUM('container', 'billing', 'system', 'welcome', 'subscription') DEFAULT 'system',
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          read_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_notif_user (user_id),
          INDEX idx_notif_read (user_id, read_at)
        )
      `);

	// ============================================
// TABELAS DE EMAIL SERVICE
// ============================================

// Tabela de logs de emails enviados
await this.query(`
  CREATE TABLE IF NOT EXISTS email_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    status ENUM('sent', 'failed', 'bounced', 'opened', 'clicked') DEFAULT 'sent',
    message_id VARCHAR(255),
    provider VARCHAR(50) DEFAULT 'brevo',
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_email_user (user_id),
    INDEX idx_email_status (status),
    INDEX idx_email_sent (sent_at),
    INDEX idx_email_user_month (user_id, sent_at)
  )
`);

console.log('✅ Email tables initialized successfully');

      // Tabela de billing (planos com dinheiro real)
      await this.query(`
        CREATE TABLE IF NOT EXISTS billing (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          plan_id VARCHAR(50) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(5) DEFAULT 'MZN',
          method ENUM('mpesa', 'emola', 'mercadopago') NOT NULL,
          reference_code VARCHAR(100) UNIQUE,
          transaction_id VARCHAR(100),
          status ENUM('pending', 'processing', 'active', 'expired', 'failed', 'cancelled') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          activated_at TIMESTAMP NULL,
          expires_at TIMESTAMP NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_billing_user (user_id),
          INDEX idx_billing_status (status),
          INDEX idx_billing_ref (reference_code)
        )
      `);

      console.log('✅ Billing table initialized successfully');

      // Tabela de pagamentos de domínios
      await this.query(`
        CREATE TABLE IF NOT EXISTS domain_payments (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          domain VARCHAR(255) NOT NULL,
          action ENUM('buy', 'renew', 'transfer') NOT NULL,
          price_usd DECIMAL(10,2) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(5) DEFAULT 'MZN',
          method ENUM('mpesa', 'emola', 'mercadopago') NOT NULL,
          phone VARCHAR(20),
          years INT DEFAULT 1,
          reference_code VARCHAR(100) UNIQUE,
          transaction_id VARCHAR(100),
          auth_code VARCHAR(255) NULL,
          status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_dompay_user (user_id),
          INDEX idx_dompay_status (status),
          INDEX idx_dompay_ref (reference_code),
          INDEX idx_dompay_domain (domain)
        )
      `);

      console.log('✅ Domain payments table initialized successfully');

      // Tabela de contas WhatsApp vinculadas
      await this.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_accounts (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NULL,
          whatsapp_number VARCHAR(20) NOT NULL,
          verification_code VARCHAR(20),
          code_expires_at TIMESTAMP NULL,
          verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_wa_number (whatsapp_number),
          INDEX idx_wa_user (user_id),
          INDEX idx_wa_code (verification_code)
        )
      `);

      console.log('✅ WhatsApp accounts table initialized successfully');

      await this.query(`
        CREATE TABLE IF NOT EXISTS email_templates (
          id INT PRIMARY KEY AUTO_INCREMENT,
          assunto VARCHAR(255) NOT NULL,
          corpo MEDIUMTEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Tabela de tickets de suporte humano (criada aqui como safety net
      // para fresh installs. Em bases com tabela já existente, as colunas
      // novas são adicionadas pelas migrations).
      await this.query(`
        CREATE TABLE IF NOT EXISTS support_tickets (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          status ENUM('waiting','active','closed','cancelled') DEFAULT 'waiting',
          summary VARCHAR(500),
          last_message TEXT,
          conversation_history TEXT,
          agent_phone VARCHAR(20),
          agent_name VARCHAR(100),
          rating TINYINT NULL,
          feedback_text TEXT NULL,
          feedback_summary VARCHAR(500) NULL,
          feedback_sentiment ENUM('muito_positivo','positivo','neutro','negativo','muito_negativo') NULL,
          feedback_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          claimed_at TIMESTAMP NULL,
          closed_at TIMESTAMP NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_support_user (user_id),
          INDEX idx_support_status (status)
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS support_messages (
          id INT PRIMARY KEY AUTO_INCREMENT,
          ticket_id INT NOT NULL,
          sender ENUM('user','agent','system') NOT NULL,
          agent_name VARCHAR(100),
          message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
          INDEX idx_ticket_messages (ticket_id, created_at)
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS support_agents (
          id INT PRIMARY KEY AUTO_INCREMENT,
          phone VARCHAR(20) NOT NULL,
          agent_name VARCHAR(100) NOT NULL,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_support_agent_phone (phone)
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
