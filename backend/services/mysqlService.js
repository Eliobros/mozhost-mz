// backend/services/mysqlService.js

const mysql = require('mysql2/promise');

class MySQLService {
  constructor() {
    this.pool = mysql.createPool({
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: process.env.MYSQL_ROOT_PASSWORD,
      waitForConnections: true,
      connectionLimit: 10
    });
  }

  // Criar database para usuário
  async createUserDatabase(userId) {
    const dbName = `mozhost_user_${userId}`;
    const dbUser = `user_${userId}`;
    const dbPassword = this.generatePassword();

    try {
      const connection = await this.pool.getConnection();

      // Criar database
      await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);

      // Criar usuário com acesso apenas ao seu DB
      await connection.query(
        `CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}'`
      );

      // Dar permissões apenas no database dele
      await connection.query(
        `GRANT ALL PRIVILEGES ON ${dbName}.* TO '${dbUser}'@'%'`
      );

      await connection.query('FLUSH PRIVILEGES');
      connection.release();

      return {
        host: 'mysql-shared',
        port: 3306,
        database: dbName,
        user: dbUser,
        password: dbPassword
      };
    } catch (error) {
      console.error('Erro ao criar database:', error);
      throw error;
    }
  }

  // Deletar database do usuário
  async deleteUserDatabase(userId) {
    const dbName = `mozhost_user_${userId}`;
    const dbUser = `user_${userId}`;

    try {
      const connection = await this.pool.getConnection();

      await connection.query(`DROP DATABASE IF EXISTS ${dbName}`);
      await connection.query(`DROP USER IF EXISTS '${dbUser}'@'%'`);

      connection.release();
    } catch (error) {
      console.error('Erro ao deletar database:', error);
      throw error;
    }
  }

  // Gerar senha aleatória
  generatePassword() {
    return Math.random().toString(36).slice(-12) + 
           Math.random().toString(36).slice(-12);
  }

  // Verificar uso de storage
  async getDatabaseSize(userId) {
    const dbName = `mozhost_user_${userId}`;
    
    try {
      const connection = await this.pool.getConnection();
      const [rows] = await connection.query(
        `SELECT 
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
         FROM information_schema.TABLES 
         WHERE table_schema = ?`,
        [dbName]
      );
      connection.release();

      return rows[0].size_mb || 0;
    } catch (error) {
      console.error('Erro ao verificar tamanho:', error);
      return 0;
    }
  }
}

module.exports = new MySQLService();
