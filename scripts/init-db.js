// Cria (ou recria) o banco emcasaburger a partir de database/schema.sql.
// ATENÇÃO: o script faz DROP DATABASE — todos os dados atuais são apagados.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4',
    multipleStatements: true,
  });
  await conn.query(sql);
  await conn.end();
  console.log('Banco "emcasaburger" criado com sucesso.');
})().catch((err) => {
  console.error('Falha ao criar o banco:', err.message);
  process.exit(1);
});
