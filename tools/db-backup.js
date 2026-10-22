/* Backup of the MySQL database (as SQL) + uploaded files (safe while the server runs).
   Usage: npm run backup            → BACKUP_DIR/<timestamp>/trippartner.sql + uploads/
   Keeps the newest 30 backups. Restore: stop the server, mysql <database> < trippartner.sql, copy uploads/ back to DATA_DIR, start. */
const path = require('path'), fs = require('fs');
const config = require('../src/config');
const db = require('../src/db/pool');
const { dumpSql } = require('../src/db/dump');

(async () => {
  await db.connect();
  const sql = await dumpSql(); await db.close();
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19), dir = path.join(config.backupDir, stamp);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'trippartner.sql'), sql);
  const up = path.join(config.dataDir, 'uploads'); if (fs.existsSync(up)) fs.cpSync(up, path.join(dir, 'uploads'), { recursive: true });
  const all = fs.readdirSync(config.backupDir).filter(n => /^\d{4}-/.test(n)).sort();
  all.slice(0, Math.max(0, all.length - 30)).forEach(n => fs.rmSync(path.join(config.backupDir, n), { recursive: true, force: true }));
  console.log('Backup written: ' + dir);
})().catch(e => { console.error(e.message); process.exit(1); });
