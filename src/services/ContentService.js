/* =====================================================================
   Website content: dashboard editing (validated, audited) and the website runtime model.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { TYPES } = require('../content/types');
const { validate, describe } = require('../content/validate');
const { toSiteModel } = require('../content/siteModel');
const { contentRepos } = require('../repositories/ContentRepository');
const { repos } = require('../repositories/RecordRepository');
const { transaction } = require('../db/pool');
const { can } = require('./policy');
const { badRequest, forbidden, notFound, conflict } = require('../utils/errors');
const Activity = require('./ActivityService');
const { changed } = require('./events');

const typeOf = key => { const t = TYPES[key]; if (!t) throw notFound('Unknown content type.'); return t; };
const guard = (staff, op) => { if (!can(staff, 'content', op)) throw forbidden(op === 'r' ? 'Not allowed.' : 'Only admin or operations staff can edit website content.'); };

/* MySQL constraint errors → friendly messages */
function dbError(e, t) {
  if (e.code === 'ER_DUP_ENTRY') return conflict(`A ${t.label.toLowerCase().replace(/s$/, '')} with this ID already exists.`);
  if (e.code === 'ER_NO_REFERENCED_ROW_2' || e.code === 'ER_NO_REFERENCED_ROW') { const m = /REFERENCES `(\w+)`/.exec(e.message); return badRequest(`Linked record not found${m ? ` in ${m[1]}` : ''}.`); }
  if (e.code === 'ER_ROW_IS_REFERENCED_2' || e.code === 'ER_ROW_IS_REFERENCED') { const m = /`(\w+)`, CONSTRAINT/.exec(e.message); return conflict(`This record is still used${m ? ` by ${m[1].replace(/_/g, ' ')}` : ''}. Remove or reassign those first, or unpublish it instead.`); }
  return e;
}

/* keep the published model consistent when records are unpublished (no dangling references) */
function consistent(c) {
  const dest = new Set(c.destinations.map(d => d.id)), states = new Set(c.states.map(s => s.id)), themes = new Set(c.themes.map(t => t.id));
  c.packages = c.packages.filter(p => dest.has(p.destinationId)).map(p => ({ ...p, themes: p.themes.filter(t => themes.has(t)) }));
  const pk = new Set(c.packages.map(p => p.id));
  c.places = c.places.filter(p => states.has(p.stateId)).map(p => (p.destinationId && !dest.has(p.destinationId) ? { ...p, destinationId: null } : p));
  c.reels = c.reels.filter(r => dest.has(r.destinationId)).map(r => (r.packageId && !pk.has(r.packageId) ? { ...r, packageId: null } : r));
  c.visa = c.visa.map(v => (v.destinationId && !dest.has(v.destinationId) ? { ...v, destinationId: null } : v));
  return c;
}

const ContentService = {
  types: () => Object.values(TYPES).map(describe),

  async list(staff, key) { guard(staff, 'r'); return contentRepos[typeOf(key).key].list(); },
  async get(staff, key, id) { guard(staff, 'r'); const d = await contentRepos[typeOf(key).key].get(id); if (!d) throw notFound(); return d; },

  async create(staff, key, input) {
    guard(staff, 'w'); const t = typeOf(key);
    const dto = validate(t, input);
    try { const d = await contentRepos[key].create(dto); await Activity.log(staff, 'created', 'content:' + key, d.id, d[t.title] || ''); changed('content', key); return d; }
    catch (e) { throw dbError(e, t); }
  },
  async update(staff, key, id, input) {
    guard(staff, 'w'); const t = typeOf(key);
    const dto = validate(t, input, { partial: true });
    try {
      const d = await contentRepos[key].update(id, dto); if (!d) throw notFound();
      await Activity.log(staff, 'updated', 'content:' + key, d.id, Object.keys(dto).join(', ')); changed('content', key); return d;
    } catch (e) { throw dbError(e, t); }
  },
  async remove(staff, key, id) {
    guard(staff, 'd'); const t = typeOf(key);
    try { if (!(await contentRepos[key].remove(id))) throw notFound(); } catch (e) { throw dbError(e, t); }
    await Activity.log(staff, 'deleted', 'content:' + key, id); changed('content', key); return { ok: true };
  },
  /* drag-and-drop ordering: ids in the new display order */
  async reorder(staff, key, ids) {
    guard(staff, 'w'); const t = typeOf(key);
    if (!Array.isArray(ids) || !ids.length) throw badRequest('Send the ids in the new order.');
    await transaction(async conn => { for (let i = 0; i < ids.length; i++) await conn.query(`UPDATE \`${t.table}\` SET sort_order=? WHERE id=?`, [(i + 1) * 10, String(ids[i])]); });
    await Activity.log(staff, 'reordered', 'content:' + key, '', ids.length + ' items'); changed('content', key); return { ok: true };
  },

  /* images available in the website's public img/ folder (for the editor's picker) */
  images() {
    try { return fs.readdirSync(config.imagesDir).filter(f => /\.jpg$/i.test(f)).map(f => f.replace(/\.jpg$/i, '')).sort(); } catch (e) { return []; }
  },

  /* ---------- website runtime model ---------- */
  async siteModel() {
    const c = {};
    for (const key of Object.keys(TYPES)) c[key] = await contentRepos[key].list({ activeOnly: true });
    consistent(c);
    const [site, content, departures, coupons, overrides] = await Promise.all([repos.settings.get('site'), repos.settings.get('content'), repos.departures.list(), repos.coupons.list(), repos.packages.list()]);
    /* dashboard price / tag / festive overrides ("Packages & prices") */
    const ov = new Map(overrides.map(o => [o.id, o]));
    c.packages = c.packages.map(p => {
      const o = ov.get(p.id); if (!o) return p;
      const q = { ...p };
      if (+o.price > 0) q.price = +o.price;
      if (o.tag) q.tag = o.tag;
      if (q.festive) q.festive = { ...q.festive, ...(o.eb !== undefined && o.eb !== '' ? { earlyBirdPct: +o.eb } : {}), ...(o.seats !== undefined && o.seats !== '' ? { seats: +o.seats } : {}) };
      return q;
    });
    departures.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const model = toSiteModel(c, { site: site || {}, content: content || {}, departures, coupons });
    return { model, blocked: new Set(overrides.filter(o => o.active === false).map(o => o.id)) };
  },

  /* catalogue for the dashboard (replaces the old exported admin/catalog.json) */
  async adminCatalog(pagesMeta) {
    const c = {}; for (const key of ['destinations', 'themes', 'packages']) c[key] = await contentRepos[key].list();
    const [site, departures, coupons] = await Promise.all([repos.settings.get('site'), repos.departures.list(), repos.coupons.list()]);
    const D = new Map(c.destinations.map(d => [d.id, d]));
    const m = toSiteModel({ ...Object.fromEntries(Object.keys(TYPES).map(k => [k, []])), ...c }, {});
    return {
      exported: new Date().toISOString(),
      config: { phone: site?.phone || '', whatsapp: site?.whatsapp || '', email: site?.email || '', support: site?.support || '', address: site?.address || '', hours: site?.hours || '', domain: site?.domain || 'www.trippartner.com' },
      themes: c.themes.map(t => ({ id: t.id, name: t.name })),
      dests: m.DEST.map(d => ({ id: d.id, name: d.name, short: d.short, type: d.type, region: d.region, price: d.price, img: d.img, best: d.best, hl: d.hl, about: d.about, air: d.air })),
      packages: m.PKG.map(p => ({ id: p.id, title: p.title, dest: p.dest, destName: (D.get(p.dest) || {}).name, type: (D.get(p.dest) || {}).type, n: p.n, price: p.price, img: p.img, themes: p.themes, tag: p.tag || '', route: p.route || '', fx: p.fx || null, wk: p.wk ? { km: p.wk.km } : null })),
      departures: departures.filter(d => d.status !== 'Cancelled').map(d => ({ pkg: d.pkg, date: d.date })),
      coupons: coupons.filter(k => k.active).map(k => ({ code: k.code, pct: k.pct, maxDays: k.maxDays, desc: k.desc })),
      seoPages: pagesMeta || [],
    };
  },
};

module.exports = ContentService;
