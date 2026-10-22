/* Loads the website content (formerly hard-coded in the website's JavaScript) into the content tables.
   Runs once; types that already have rows are left untouched. */
const path = require('path');
const fs = require('fs');
const { contentRepos } = require('../../repositories/ContentRepository');
const { fromSiteModel, settingsFromSiteModel } = require('../../content/siteModel');
const { isoToDb, now } = require('../../utils/common');

/* insertion order respects foreign keys */
const ORDER = ['destinations', 'themes', 'packages', 'states', 'placeCategories', 'places', 'guides', 'visa', 'services', 'infoPages', 'faqs', 'reels', 'holidays', 'samplePartners'];

module.exports = async conn => {
  const X = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'seeds', 'content.json'), 'utf8'));
  const data = fromSiteModel(X);
  for (const type of ORDER) {
    const repo = contentRepos[type];
    if (await repo.count(conn)) continue;
    for (const dto of data[type]) await repo.create(dto, conn);
  }
  const t = isoToDb(now());
  for (const [id, rec] of Object.entries(settingsFromSiteModel(X))) {
    const [rows] = await conn.query('SELECT data FROM settings WHERE id=?', [id]);
    if (rows.length) {
      /* keep values already saved in the dashboard; add missing keys from the website defaults */
      const cur = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      await conn.query('UPDATE settings SET data=?, updated_at=? WHERE id=?', [JSON.stringify({ ...rec, ...cur }), t, id]);
    } else await conn.query('INSERT INTO settings (id,data,created_at,updated_at) VALUES (?,?,?,?)', [id, JSON.stringify(rec), t, t]);
  }
  /* departures + coupons for a brand-new database (the dashboard manages them afterwards) */
  const [[dep]] = await conn.query('SELECT COUNT(*) AS n FROM departures');
  const [[legacy]] = await conn.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='docs'");
  if (!dep.n && !legacy.n) {
    const title = id => (X.PKG.find(p => p.id === id) || {}).title || id;
    let i = 0;
    for (const [pkg, date] of X.DEPARTURES) {
      i++;
      await conn.query('INSERT INTO departures SET ?', [{ id: 'DEP' + String(i).padStart(4, '0'), package_id: pkg, package_title: title(pkg), departure_date: date, seats: 20, booked: 0, status: 'Open', captain: '', note: '', created_at: t, updated_at: t }]);
    }
    for (const [code, c] of Object.entries(X.CONFIG.coupons || {})) {
      await conn.query('INSERT IGNORE INTO coupons SET ?', [{ id: 'C' + code, code, pct: c.pct, description: c.desc || '', max_days: c.maxDays || 0, valid_till: null, active: 1, created_at: t, updated_at: t }]);
    }
  }
};
