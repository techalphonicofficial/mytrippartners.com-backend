/* Versioned schema migrations.
   Files in ./migrations run once each, in name order, and are recorded in `schema_migrations`.
   - NNN_name.sql : plain SQL (statements separated by ';' at line end)
   - NNN_name.js  : module.exports = async (conn, ctx) => { ... }   (for data migrations / seeds) */
const fs = require('fs');
const path = require('path');
const { getPool } = require('./pool');
const logger = require('../utils/logger');

const DIR = path.join(__dirname, 'migrations');

const splitSql = sql => sql.replace(/^\s*--.*$/gm, '').split(/;\s*$/m).map(s => s.trim()).filter(Boolean);

async function migrate(ctx = {}) {
  const pool = getPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(191) NOT NULL PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [done] = await pool.query('SELECT name FROM schema_migrations');
  const applied = new Set(done.map(r => r.name));
  const files = fs.readdirSync(DIR).filter(f => /^\d+_.+\.(sql|js)$/.test(f)).sort();
  const ran = [];
  for (const f of files) {
    if (applied.has(f)) continue;
    const conn = await pool.getConnection();
    try {
      /* DDL auto-commits in MySQL, so a migration is atomic only for its data statements */
      await conn.beginTransaction();
      if (f.endsWith('.sql')) for (const s of splitSql(fs.readFileSync(path.join(DIR, f), 'utf8'))) await conn.query(s);
      else await require(path.join(DIR, f))(conn, ctx);
      await conn.query('INSERT INTO schema_migrations(name) VALUES(?)', [f]);
      await conn.commit();
      ran.push(f); logger.info(`migration applied: ${f}`);
    } catch (e) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
      throw new Error(`Migration ${f} failed: ${e.message}`);
    } finally { conn.release(); }
  }
  return ran;
}

module.exports = { migrate };
