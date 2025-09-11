// check_containers.js
const database = require('./models/database');

async function main() {
  try {
    const containers = await database.query('SELECT * FROM containers');
    console.log('Containers no banco:');
    console.table(containers); // mostra de forma organizada
  } catch (err) {
    console.error('Erro ao consultar o banco:', err);
  } finally {
    process.exit();
  }
}

main();
