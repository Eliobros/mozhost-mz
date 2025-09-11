const pool = require('./models/database'); // já pega o dotenv

async function fixEnum() {
  await pool.query(`
    ALTER TABLE containers 
    MODIFY COLUMN status ENUM('stopped','running','error','building') DEFAULT 'stopped';
  `);
  console.log('ENUM atualizado com sucesso!');
  process.exit();
}

fixEnum();
