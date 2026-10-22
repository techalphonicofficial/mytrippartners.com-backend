/* Dashboard CRUD for operational collections (/api/:col) with per-collection business rules. */
const PSEO = require('../../admin/pseo-shared.js');
const { repos } = require('../repositories/RecordRepository');
const { COLS, can } = require('./policy');
const { S, now } = require('../utils/common');
const { badRequest, forbidden, notFound } = require('../utils/errors');
const Activity = require('./ActivityService');
const AuthService = require('./AuthService');
const PartnerService = require('./PartnerService');
const { changed, SITE_COLLECTIONS } = require('./events');

const out = (col, d) => (col === 'staff' ? AuthService.publicStaff(d) : d);

/* redirect validation + normalisation */
const normRedirect = r => {
  r.from = '/' + S(r.from, 300).replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '');
  r.to = S(r.to, 500); r.code = [301, 302].includes(+r.code) ? +r.code : 301;
  if (!/^(\/|https?:\/\/)/.test(r.to)) throw badRequest('Redirect target must start with / or https://');
  if (r.from.replace(/\/+$/, '') === r.to.replace(/\/+$/, '')) throw badRequest('A page cannot redirect to itself.');
  return r;
};

function guard(staff, col, op) {
  if (!COLS.includes(col)) throw forbidden();
  if (op === 'd') { if (['activity', 'settings'].includes(col) || !(staff.role === 'admin' || can(staff, col, 'd'))) throw forbidden('Only an admin can delete.'); return; }
  if (op === 'w' && col === 'activity') throw forbidden();
  if (!can(staff, col, op)) throw forbidden();
}
const touched = col => { if (SITE_COLLECTIONS.has(col)) changed(col); };

const RecordService = {
  normRedirect,

  async list(staff, col, { limit } = {}) {
    guard(staff, col, 'r');
    const rows = await repos[col].list({ limit: col === 'activity' ? (+limit || 300) : undefined });
    return rows.map(r => out(col, r));
  },

  async get(staff, col, id) {
    guard(staff, col, 'r');
    const d = await repos[col].get(id); if (!d) throw notFound();
    return out(col, d);
  },

  async create(staff, col, body) {
    guard(staff, col, 'w');
    const b = { ...(body || {}) };
    if (col === 'staff') {
      if (!/^\S+@\S+\.\S+$/.test(b.email || '') || String(b.password || '').length < 8) throw badRequest('Valid email and a password of 8+ characters are required.');
      b.email = b.email.toLowerCase();
      if (await repos.staff.findBy('email', b.email)) throw badRequest('A staff member with this email exists.');
      b.pass = AuthService.hashPw(b.password); delete b.password; b.active = true;
    }
    if (col === 'coupons') { b.code = S(b.code, 30).toUpperCase(); if (!b.code) throw badRequest('Code is required.'); if (await repos.coupons.findBy('code', b.code)) throw badRequest('A coupon with this code already exists.'); }
    if (col === 'redirects') { normRedirect(b); if (await repos.redirects.findBy('from', b.from)) throw badRequest('A redirect from this URL already exists.'); }
    if (col === 'seo_pages') { b.path = PSEO.normPath(b.path); b.id = PSEO.pid(b.path); if (await repos.seo_pages.exists(b.id)) throw badRequest('This page already has an override — edit it instead.'); }
    if (b.id && await repos[col].exists(b.id)) throw badRequest('This record already exists.');
    const d = await repos[col].create(b, b.id);
    await Activity.log(staff, 'created', col, d.id, b.name || b.title || b.code || b.subject || '');
    touched(col);
    return out(col, d);
  },

  async update(staff, col, id, body) {
    guard(staff, col, 'w');
    let b = { ...(body || {}) }; delete b.id;
    if (col === 'staff') {
      if (b.password) { if (String(b.password).length < 8) throw badRequest('Password must be 8+ characters.'); b.pass = AuthService.hashPw(b.password); delete b.password; } else delete b.pass;
      if (id === staff.id && (b.active === false || (b.role && b.role !== 'admin'))) throw badRequest('You cannot disable or demote your own account.');
      if (b.email) { b.email = String(b.email).toLowerCase(); const other = await repos.staff.findBy('email', b.email); if (other && other.id !== id) throw badRequest('A staff member with this email exists.'); }
    }
    if (col === 'partners') b = await PartnerService.applyDecision(id, b);
    if (col === 'coupons' && b.code != null) { b.code = S(b.code, 30).toUpperCase(); const other = await repos.coupons.findBy('code', b.code); if (other && other.id !== id) throw badRequest('A coupon with this code already exists.'); }
    if (col === 'redirects' && (b.from != null || b.to != null)) {
      const cur = await repos.redirects.get(id); if (!cur) throw notFound();
      const merged = normRedirect({ ...cur, ...b });
      Object.assign(b, { from: merged.from, to: merged.to, code: merged.code });
      const other = await repos.redirects.findBy('from', b.from); if (other && other.id !== id) throw badRequest('A redirect from this URL already exists.');
    }
    const d = await repos[col].update(id, b); if (!d) throw notFound();
    await Activity.log(staff, 'updated', col, id, Object.keys(b).filter(k => k !== 'pass').join(', '));
    touched(col);
    return out(col, d);
  },

  async remove(staff, col, id) {
    guard(staff, col, 'd');
    if (col === 'staff' && id === staff.id) throw badRequest('You cannot delete yourself.');
    if (!(await repos[col].remove(id))) throw notFound();
    await Activity.log(staff, 'deleted', col, id);
    touched(col);
    return { ok: true };
  },

  /* CSV export (formula-injection safe) */
  async exportCsv(staff, col) {
    if (!COLS.includes(col) || col === 'staff' || !can(staff, col, 'r')) throw forbidden();
    const rows = await repos[col].list();
    const keys = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(k => !['pass', 'notes', 'payments', 'staffNotes'].includes(k));
    const esc = v => { let t = String(v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
    await Activity.log(staff, 'exported', col, '', rows.length + ' rows');
    return { filename: `${col}-${now().slice(0, 10)}.csv`, body: '﻿' + [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n') };
  },
};

module.exports = RecordService;
