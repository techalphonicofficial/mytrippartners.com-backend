/* MySQL / MariaDB connection pool + transaction helper. */
const mysql = require('mysql2/promise');
const config = require('../config');

let pool = null;

const dbName = () => config.db.database.replace(/`/g, '');

/* creates the database if the user is allowed to, then opens the pool */
async function connect() {
  if (pool) return pool;
  const { database, connectionLimit, ...server } = config.db;
  const c = await mysql.createConnection({ ...server, charset: 'utf8mb4' });
  try { await c.query(`CREATE DATABASE IF NOT EXISTS \`${dbName()}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); } finally { await c.end(); }
  pool = mysql.createPool({ ...config.db, charset: 'utf8mb4', dateStrings: true, decimalNumbers: true, supportBigNumbers: true, bigNumberStrings: false });
  return pool;
}

const getPool = () => { if (!pool) throw new Error('Database not connected'); return pool; };

/* runs fn(conn) inside a transaction; commits on success, rolls back on error */
async function transaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const r = await fn(conn);
    await conn.commit();
    return r;
  } catch (e) {
    try { await conn.rollback(); } catch (_) { /* connection lost */ }
    throw e;
  } finally { conn.release(); }
}

async function close() { if (pool) { const p = pool; pool = null; await p.end(); } }

module.exports = { connect, getPool, transaction, close, dbName };
