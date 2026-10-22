/* Imports records from the previous storage format (single `docs` JSON table + `sessions`)
   into the relational tables, then renames the old tables to *_legacy as a backup. */
const { repos } = require('../../repositories/RecordRepository');
const { isoToDb } = require('../../utils/common');

const tableExists = async (conn, name) => { const [[r]] = await conn.query('SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?', [name]); return r.n > 0; };

module.exports = async conn => {
  if (!(await tableExists(conn, 'docs'))) return;
  const [rows] = await conn.query('SELECT col,id,data,created,updated FROM docs ORDER BY created');
  let n = 0;
  for (const r of rows) {
    const repo = repos[r.col]; if (!repo) continue;
    const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
    if (r.col === 'settings') {
      /* merge over the defaults seeded by the previous migration */
      const [cur] = await conn.query('SELECT data FROM settings WHERE id=?', [r.id]);
      const base = cur.length ? (typeof cur[0].data === 'string' ? JSON.parse(cur[0].data) : cur[0].data) : {};
      await conn.query('REPLACE INTO settings (id,data,created_at,updated_at) VALUES (?,?,?,?)', [r.id, JSON.stringify({ ...base, ...data }), isoToDb(r.created), isoToDb(r.updated)]);
      n++; continue;
    }
    if (await repo.exists(r.id, conn)) continue;
    await repo.create(data, r.id, conn);
    await conn.query(`UPDATE \`${repo.table}\` SET created_at=?, updated_at=? WHERE id=?`, [isoToDb(r.created), isoToDb(r.updated), r.id]);
    n++;
  }
  if (await tableExists(conn, 'sessions')) {
    const [ss] = await conn.query('SELECT token,staff,expires FROM sessions WHERE expires > ?', [Date.now()]);
    for (const s of ss) await conn.query('INSERT IGNORE INTO staff_sessions (token,staff_id,expires_at,created_at) SELECT ?,id,?,? FROM staff WHERE id=?', [s.token, s.expires, isoToDb(), s.staff]);
    await conn.query('RENAME TABLE sessions TO sessions_legacy');
  }
  await conn.query('RENAME TABLE docs TO docs_legacy');
  console.log(`  imported ${n} records from the previous storage format (old tables kept as docs_legacy / sessions_legacy)`);
};
