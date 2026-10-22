/* MySQL / MariaDB connection shared by server.js and tools/.
   Env: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE */
const mysql = require('mysql2/promise');

const config = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: +process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'trippartner',
  charset: 'utf8mb4',
};

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS docs (col VARCHAR(40) NOT NULL, id VARCHAR(191) NOT NULL, data LONGTEXT NOT NULL, created VARCHAR(30) NOT NULL, updated VARCHAR(30) NOT NULL,
    PRIMARY KEY (col, id), KEY docs_col (col, created)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,
  `CREATE TABLE IF NOT EXISTS sessions (token VARCHAR(128) NOT NULL PRIMARY KEY, staff VARCHAR(191) NOT NULL, expires BIGINT NOT NULL)
    ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,
];

/* creates the database (if allowed) and tables, returns a pool */
async function connect() {
  const { database, ...server } = config;
  const c = await mysql.createConnection(server);
  try { await c.query(`CREATE DATABASE IF NOT EXISTS \`${database.replace(/`/g, '')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); } finally { await c.end(); }
  const pool = mysql.createPool({ ...config, connectionLimit: 5 });
  for (const s of SCHEMA) await pool.query(s);
  return pool;
}

/* plain SQL dump of both tables (schema + data), loadable with: mysql trippartner < file.sql */
async function dumpSql(pool) {
  const q = v => v == null ? 'NULL' : typeof v === 'number' ? String(v) : pool.escape(String(v));
  const out = ['-- TripPartner database export ' + new Date().toISOString(), 'SET NAMES utf8mb4;', 'START TRANSACTION;', ...SCHEMA.map(s => s + ';')];
  for (const t of ['docs', 'sessions']) {
    const [rows] = await pool.query(`SELECT * FROM \`${t}\``);
    for (const r of rows) out.push(`INSERT IGNORE INTO \`${t}\` (${Object.keys(r).map(k => '`' + k + '`').join(',')}) VALUES (${Object.values(r).map(q).join(',')});`);
  }
  out.push('COMMIT;');
  return out.join('\n') + '\n';
}

module.exports = { config, connect, dumpSql };
