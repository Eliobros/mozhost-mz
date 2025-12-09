const mysql = require('mysql2/promise');

const db = await mysql.createConnection({
  host: 'mysql-shared',
  port: 3306,
  user: 'user_6',
  password: '0.v3za9h3g4i.c10kbl481in',
  database: 'mozhost_user_6'
});
