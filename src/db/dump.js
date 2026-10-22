/* Plain-SQL dump of the whole database (schema + data), restorable with: mysql <database> < file.sql */
const { getPool } = require('./pool');

async function dumpSql() {
  const pool = getPool();
  const [tables] = await pool.query("SELECT table_name AS name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name");
  const out = [`-- TripPartner database export ${new Date().toISOString()}`, 'SET NAMES utf8mb4;', 'SET FOREIGN_KEY_CHECKS=0;', 'START TRANSACTION;'];
  for (const { name } of tables) {
    const [[c]] = await pool.query(`SHOW CREATE TABLE \`${name}\``);
    out.push('', `DROP TABLE IF EXISTS \`${name}\`;`, c['Create Table'] + ';');
    const [rows] = await pool.query(`SELECT * FROM \`${name}\``);
    for (const r of rows) out.push(`INSERT INTO \`${name}\` (${Object.keys(r).map(k => '`' + k + '`').join(',')}) VALUES (${Object.values(r).map(v => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : pool.escape(typeof v === 'object' && !Buffer.isBuffer(v) ? JSON.stringify(v) : v))).join(',')});`);
  }
  out.push('', 'COMMIT;', 'SET FOREIGN_KEY_CHECKS=1;');
  return out.join('\n') + '\n';
}

module.exports = { dumpSql };
