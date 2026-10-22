/* One-time import of the old SQLite database into MySQL (rows already in MySQL are kept).
   Usage: node --env-file-if-exists=.env tools/migrate-sqlite-to-mysql.js [path/to/trippartner.db]
   Default source: data/trippartner.db, else ../database/trippartner.db */
const path = require('path'), fs = require('fs'), { DatabaseSync } = require('node:sqlite');
const { connect, config } = require('../mysql.js');
const src = process.argv[2] || [path.join(__dirname, '..', 'data', 'trippartner.db'), path.join(__dirname, '..', '..', 'database', 'trippartner.db')].find(f => fs.existsSync(f));
if (!src || !fs.existsSync(src)) { console.error('SQLite database not found: ' + (src || 'data/trippartner.db')); process.exit(1); }
(async () => {
  const lite = new DatabaseSync(src, { readOnly: true }), pool = await connect();
  const docs = lite.prepare('SELECT col,id,data,created,updated FROM docs').all();
  const ss = lite.prepare('SELECT token,staff,expires FROM sessions').all();
  let n = 0;
  for (const r of docs) { const [x] = await pool.execute('INSERT IGNORE INTO docs(col,id,data,created,updated) VALUES(?,?,?,?,?)', [r.col, r.id, r.data, r.created, r.updated]); n += x.affectedRows; }
  for (const s of ss) await pool.execute('INSERT IGNORE INTO sessions(token,staff,expires) VALUES(?,?,?)', [s.token, s.staff, s.expires]);
  console.log(`Imported ${n} of ${docs.length} rows from ${src} into ${config.database} (${docs.length - n} already existed).`);
  lite.close(); await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
