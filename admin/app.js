/* =====================================================================
   TripPartner Admin — single-page dashboard
   Talks to the backend at ../api/ (or window.TP_API). If no backend is reachable
   (opened as a file or a static preview) it runs in DEMO mode with sample data
   held in this browser only, using the same API contract.
   ===================================================================== */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
const inrC = n => { n = +n || 0; return n >= 1e7 ? '₹' + (n / 1e7).toFixed(2) + ' Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(1) + ' L' : inr(n); };
const DAY = 864e5;
const p2 = n => String(n).padStart(2, '0');
const ld = x => { const d = new Date(x); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }; /* local calendar date */
const today = () => ld(Date.now());
const addDays = (d, n) => { const [y, m, dd] = d.split('-').map(Number); return ld(new Date(y, m - 1, dd + n)); };
const fmtD = s => s ? new Date(s.length === 10 ? s + 'T00:00:00' : s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDT = s => s ? new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';
const ago = s => { const m = Math.round((Date.now() - new Date(s)) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const daysTo = d => Math.round((new Date(d + 'T00:00:00') - new Date(today() + 'T00:00:00')) / DAY);
const digits = p => String(p || '').replace(/\D/g, '').slice(-10);
const wa = (p, msg) => `https://wa.me/91${digits(p)}?text=${encodeURIComponent(msg || '')}`;
const initials = n => String(n || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();

/* ---------- icons ---------- */
const IC = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  lead: '<path d="M4 4h16v12H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  bag: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  out: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h11"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  dot: '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.5"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.5 2 2 3.6 4.5 4.5l1.2-1.2 2 1-.5 1.6c-3.5.3-7.6-3.6-7.4-7.2L10.5 8l1 2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  rupee: '<path d="M7 5h10M7 9h10M7 5c6 0 6 8 0 8l7 7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
};
const ic = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;

/* ---------- roles & domain constants ---------- */
const PERM = {
  admin: '*',
  sales: { leads: 'rw', bookings: 'rw', departures: 'r', packages: 'r', coupons: 'r', partners: 'r', partner_requests: 'r', proposals: 'r', reviews: 'r', settings: 'r', activity: 'r', seo_pages: 'r', seo_templates: 'r', redirects: 'r', content: 'r' },
  ops: { leads: 'r', bookings: 'rw', departures: 'rwd', packages: 'rw', coupons: 'rw', partners: 'rw', partner_requests: 'rw', proposals: 'rw', reviews: 'rw', settings: 'r', activity: 'r', seo_pages: 'rw', seo_templates: 'rw', redirects: 'rwd', content: 'rwd' },
};
const can = (col, op) => { if (!ME) return false; const p = PERM[ME.role]; if (p === '*') return true; return !!(p && p[col] && p[col].includes(op)); };
const LEAD_ST = ['New', 'Contacted', 'Quoted', 'Won', 'Lost'];
const STAGES = ['Requested', 'Hotels confirmed', 'Advance paid', 'Vouchers sent', 'Trip completed'];
const DEP_ST = ['Open', 'Filling fast', 'Sold out', 'Cancelled'];
const PARTNER_ST = ['Verification pending', 'Verified', 'Rejected', 'Hidden'];
const REQ_ST = ['Awaiting response', 'Accepted', 'Declined', 'Closed'];
const PROP_ST = ['Waiting for partner', 'Both agreed', 'Converted to booking', 'Declined'];
const REV_ST = ['Pending', 'Published', 'Hidden'];
const PAY_MODES = ['UPI', 'Bank transfer', 'Card', 'Cash', 'Cheque'];
const SOURCES = ['Website enquiry', 'Plan My Trip', 'Booking form', 'WhatsApp', 'Phone call', 'Walk-in', 'Travel Partner', 'Referral', 'Website'];
const HOTEL = { std: 'Standard (3★)', dlx: 'Deluxe (4★)', prm: 'Premium (5★)' };
const stClass = s => ({ New: 'new', Contacted: 'mid', Quoted: 'warn', Won: 'ok', Lost: 'bad', Open: 'ok', 'Filling fast': 'warn', 'Sold out': 'mid', Cancelled: 'bad', 'Verification pending': 'warn', Verified: 'ok', Rejected: 'bad', Hidden: '', 'Awaiting response': 'warn', Accepted: 'ok', Declined: 'bad', Closed: '', 'Waiting for partner': 'warn', 'Both agreed': 'new', 'Converted to booking': 'ok', Pending: 'warn', Published: 'ok', Active: 'ok', Inactive: '' }[s] || '');
const stIcon = c => ({ new: 'dot', ok: 'check', warn: 'clock', bad: 'x', mid: 'phone' }[c] || 'pause');
const chip = s => { const c = stClass(s); return `<span class="st ${c}">${ic(stIcon(c))}${esc(s)}</span>`; };
const stageChip = b => b.cancelled ? chip('Cancelled') : `<span class="st ${b.status >= 5 ? 'ok' : b.status >= 3 ? 'new' : 'warn'}">${ic(b.status >= 5 ? 'check' : b.status >= 3 ? 'dot' : 'clock')}${esc(STAGES[(b.status || 1) - 1])}</span>`;

/* ---------- state ---------- */
let MODE = 'live', ME = null, CAT = { packages: [], dests: [], departures: [], coupons: [], config: {}, themes: [] };
const DATA = {};
const IMGB = window.TP_IMG || '../img/';
const PK = id => CAT.packages.find(p => p.id === id);
const DN = id => ((CAT.dests || []).find(d => d.id === id) || {}).name || id;
const pkgTitle = (id, fb) => (PK(id) || {}).title || fb || id || '—';
const pkgImg = id => { const p = PK(id); return p ? `<img loading="lazy" src="${IMGB}${p.img}.jpg" alt="" onerror="this.style.visibility='hidden'">` : '<img alt="">'; };
const paid = b => (b.payments || []).reduce((a, p) => a + (+p.amount || 0), 0);
const API_BASE = window.TP_API || new URL('../api/', location.href).href;
const allProofs = () => (DATA.bookings || []).flatMap(b => (b.proofs || []).map(p => ({ b, p })));
const proofImg = (b, p) => p.demoImg || (MODE === 'live' && p.file ? API_BASE + 'payment-proofs/' + encodeURIComponent(b.id) + '/' + encodeURIComponent(p.file) : '');
const proofChip = s => `<span class="st ${s === 'Approved' ? 'ok' : s === 'Rejected' ? 'bad' : 'warn'}">${ic(s === 'Approved' ? 'check' : s === 'Rejected' ? 'x' : 'clock')}${s === 'Pending' ? 'To verify' : s}</span>`;
const payLink = ref => 'https://' + String((CAT.config || {}).domain || 'www.trippartner.com').replace(/^https?:\/\//, '') + '/#pay-' + ref;
const REJECT_WHY = ['Amount not received in our account', 'UTR / transaction ID does not match', 'Screenshot unclear or incomplete', 'Amount on screenshot differs', 'Duplicate of an earlier payment', 'Paid to a wrong account'];

/* =====================================================================
   API (live) + Mock (demo) — same contract
   ===================================================================== */
async function http(method, path, body) {
  if (MODE === 'demo') return Mock.call(method, path, body);
  const r = await fetch(API_BASE + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'include' });
  const data = (r.headers.get('content-type') || '').includes('json') ? await r.json() : null;
  if (r.status === 401 && !path.startsWith('auth/')) { ME = null; renderLogin('Your session has expired. Please log in again.'); throw new Error('Session expired'); }
  if (!r.ok) { const err = new Error((data && data.error) || `Request failed (${r.status})`); err.status = r.status; err.fields = (data && data.fields) || null; throw err; }
  return data;
}
const api = { list: c => http('GET', c), get: (c, id) => http('GET', `${c}/${encodeURIComponent(id)}`), create: (c, b) => http('POST', c, b), update: (c, id, b) => http('PATCH', `${c}/${encodeURIComponent(id)}`, b), remove: (c, id) => http('DELETE', `${c}/${encodeURIComponent(id)}`) };
async function load(...cols) { await Promise.all(cols.filter(c => can(c, 'r')).map(async c => { DATA[c] = await api.list(c); })); cols.forEach(c => { DATA[c] = DATA[c] || []; }); }

const Mock = (() => {
  const KEY = 'tp_admin_demo_v2'; let db = null, me = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage unavailable: keep in memory */ } };
  const uid = p => (p || '') + Math.random().toString(36).slice(2, 10).toUpperCase();
  const now = () => new Date().toISOString();
  const strip = s => { const { pass, ...r } = s; return r; };
  function init() { try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; } if (!db || !db.v) { db = seed(); save(); } ensureSeo(); }
  function ensureSeo() { const t = now(); let ch = false;
    if (!db.seo_templates) { db.seo_templates = PSEO.DEFAULT_TEMPLATES.map(x => ({ ...JSON.parse(JSON.stringify(x)), created: t, updated: t })); ch = true; }
    if (!db.seo_pages) { db.seo_pages = []; ch = true; }
    if (!db.redirects) { db.redirects = [{ id: 'RD1', from: '/kashmir-tour/', to: '/destinations/kashmir/', code: 301, active: true, hits: 42, lastHit: new Date(Date.now() - 3 * 36e5).toISOString(), created: t, updated: t, demo: true }, { id: 'RD2', from: '/goa-offer/', to: '/destinations/goa/', code: 302, active: true, hits: 7, created: t, updated: t, demo: true }]; ch = true; }
    if (!db.settings.find(x => x.id === 'seo')) { db.settings.push({ id: 'seo', ...PSEO.DEFAULT_SETTINGS, domain: (CAT.config || {}).domain || PSEO.DEFAULT_SETTINGS.domain, created: t, updated: t }); ch = true; }
    if (ch) save(); }
  function log(action, col, ref, note) { db.activity.unshift({ id: uid('A'), by: me ? me.name : 'Website', role: me ? me.role : 'public', action, col, ref, note: note || '', created: now(), updated: now() }); db.activity = db.activity.slice(0, 400); }
  function call(method, path, body) {
    return new Promise((res, rej) => setTimeout(() => { try { res(handle(method, path, body || {})); } catch (e) { rej(e); } }, 60));
  }
  function handle(method, path, b) {
    if (!db) init();
    const dm = method === 'POST' && /^bookings\/([^/]+)\/proofs\/([^/]+)\/decision$/.exec(path);
    if (dm) return proofDecision(decodeURIComponent(dm[1]), decodeURIComponent(dm[2]), b);
    if (path === 'seo/data') { if (!me) throw new Error('Not logged in'); return { base: CAT.seoPages || [], data: { dests: CAT.dests, packages: CAT.packages, themes: CAT.themes }, siteDir: false }; }
    if (path === 'seo/publish') {
      if (!['admin', 'ops'].includes(me.role)) throw new Error('Only admin or operations can publish.');
      const st = db.settings.find(x => x.id === 'seo'), inv = PSEO.inventory({ base: CAT.seoPages || [], overrides: db.seo_pages, templates: db.seo_templates, data: { dests: CAT.dests, packages: CAT.packages, themes: CAT.themes } });
      const tp = inv.filter(p => p.kind === 'template' && p.status === 'Live'), live = inv.filter(p => p.kind === 'built-in' || (p.status === 'Live' && !p.thin));
      const prev = st.lastPublish, r = { written: tp.filter(p => !p.thin).length, patched: db.seo_pages.filter(o => (CAT.seoPages || []).some(x => x.path === o.path)).length, removed: 0, restored: 0, thin: tp.filter(p => p.thin).length, sitemap: PSEO.sitemap(live, st.domain, now().slice(0, 10)).count, skipped: 0, errors: [], ms: 40 + Math.round(Math.random() * 60), total: inv.length, simulated: true };
      if (prev) r.removed = Math.max(0, prev.written - r.written);
      st.lastPublish = { at: now(), by: me.name, ...r }; st.history = [st.lastPublish, ...(st.history || [])].slice(0, 20); st.updated = now();
      log('published SEO pages (demo)', 'seo_pages', '', `${r.written} pSEO pages · ${r.patched} overrides · sitemap ${r.sitemap}`); save(); return r; }
    const [col, id] = path.split('/').map(decodeURIComponent);
    if (col === 'auth') {
      if (id === 'login') { me = db.staff.find(s => s.role === (b.role || 'admin') && s.active) || db.staff[0]; log('login', 'staff', me.id); save(); return { staff: strip(me) }; }
      if (id === 'logout') { me = null; return { ok: true }; }
      if (id === 'me') { if (!me) throw new Error('Not logged in'); return { staff: strip(me) }; }
      if (id === 'password') { if (String(b.next || '').length < 8) throw new Error('New password must be at least 8 characters.'); log('changed password', 'staff', me.id); save(); return { ok: true }; }
    }
    if (!db[col]) throw new Error('Unknown endpoint.');
    const ok = op => { const p = PERM[me.role]; return p === '*' || !!(p[col] && p[col].includes(op)); };
    if (method === 'GET') { if (!ok('r')) throw new Error('Not allowed.'); if (id) { const d = db[col].find(x => x.id === id); if (!d) throw new Error('Not found.'); return JSON.parse(JSON.stringify(col === 'staff' ? strip(d) : d)); } return JSON.parse(JSON.stringify(col === 'staff' ? db[col].map(strip) : db[col])); }
    if (method === 'POST') {
      if (!ok('w') || col === 'activity') throw new Error('Not allowed.');
      const d = { ...b, id: b.id || uid(col === 'leads' ? 'EQ' : ''), created: now(), updated: now() };
      if (col === 'staff') { if (!/^\S+@\S+\.\S+$/.test(d.email || '') || String(d.password || '').length < 8) throw new Error('Valid email and a password of 8+ characters are required.'); if (db.staff.some(s => s.email === d.email.toLowerCase())) throw new Error('A staff member with this email exists.'); d.email = d.email.toLowerCase(); delete d.password; d.active = true; }
      if (col === 'coupons') { d.code = String(d.code || '').toUpperCase().trim(); if (!d.code) throw new Error('Code is required.'); }
      if (col === 'redirects') { d.from = '/' + String(d.from || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, ''); d.code = +d.code === 302 ? 302 : 301; if (!/^(\/|https?:\/\/)/.test(d.to || '')) throw new Error('Redirect target must start with / or https://'); if (db.redirects.some(r => r.from === d.from)) throw new Error('A redirect from this URL already exists.'); }
      if (db[col].some(x => x.id === d.id)) throw new Error('This record already exists.');
      db[col].unshift(d); log('created', col, d.id, d.name || d.title || d.code || d.subject || ''); save(); return col === 'staff' ? strip(d) : d;
    }
    if (method === 'PATCH') {
      if (!ok('w') || col === 'activity') throw new Error('Not allowed.');
      const d = db[col].find(x => x.id === id); if (!d) throw new Error('Not found.');
      const p = { ...b }; delete p.id;
      if (col === 'staff') { if (p.password && String(p.password).length < 8) throw new Error('Password must be 8+ characters.'); delete p.password; if (id === me.id && (p.active === false || (p.role && p.role !== 'admin'))) throw new Error('You cannot disable or demote your own account.'); }
      Object.assign(d, p, { updated: now() }); log('updated', col, id, Object.keys(p).join(', ')); save(); return col === 'staff' ? strip(d) : d;
    }
    if (method === 'DELETE') {
      if (['activity', 'settings'].includes(col) || !(me.role === 'admin' || ok('d'))) throw new Error('Only an admin can delete.');
      if (col === 'staff' && id === me.id) throw new Error('You cannot delete yourself.');
      const i = db[col].findIndex(x => x.id === id); if (i < 0) throw new Error('Not found.'); db[col].splice(i, 1); log('deleted', col, id); save(); return { ok: true };
    }
    throw new Error('Unknown endpoint.');
  }
  function proofDecision(ref, pid, x) {
    const p = PERM[me.role]; if (!(p === '*' || (p.bookings || '').includes('w'))) throw new Error('Not allowed.');
    const bk = db.bookings.find(r => r.id === ref); if (!bk) throw new Error('Booking not found.');
    const pr = (bk.proofs || []).find(r => r.id === pid); if (!pr) throw new Error('Proof not found.');
    if (pr.status !== 'Pending') throw new Error(`This proof is already ${pr.status.toLowerCase()}.`);
    const at = now(); bk.staffNotes = bk.staffNotes || [];
    if (x.action === 'approve') {
      const amt = Math.max(1, Math.round(+x.amount || pr.amount)), receipt = 'TPR-' + at.slice(2, 4) + at.slice(5, 7) + '-' + uid().slice(0, 5);
      Object.assign(pr, { status: 'Approved', approvedAmount: amt, receipt, by: me.name, decidedAt: at });
      bk.payments = [...(bk.payments || []), { at: pr.paidAt, amount: amt, mode: pr.mode, ref: pr.utr, by: me.name, proof: pr.id, receipt }];
      const np = bk.payments.reduce((a, r) => a + (+r.amount || 0), 0); if (!bk.cancelled && bk.status < 3 && np >= (+bk.adv || 0)) bk.status = 3;
      bk.staffNotes.push({ at, by: me.name, text: `Payment proof ${pr.id} approved — ${inr(amt)} (${receipt})` });
    } else if (x.action === 'reject') {
      const reason = String(x.reason || '').trim().slice(0, 200); if (!reason) throw new Error('Give a reason so the customer knows what to fix.');
      Object.assign(pr, { status: 'Rejected', reason, by: me.name, decidedAt: at }); bk.staffNotes.push({ at, by: me.name, text: `Payment proof ${pr.id} rejected — ${reason}` });
    } else throw new Error('Choose approve or reject.');
    bk.updated = at; log(x.action === 'approve' ? 'approved payment proof' : 'rejected payment proof', 'bookings', ref, pr.id); save(); return JSON.parse(JSON.stringify(bk));
  }
  /* sample "screenshot" for demo proofs — clearly labelled, not a real payment */
  const shot = (amt, utr, appName) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640"><rect width="360" height="640" fill="#f3f6fa"/><rect width="360" height="190" fill="#1f9d55"/><circle cx="180" cy="80" r="34" fill="#fff"/><path d="M163 80l12 12 22-24" stroke="#1f9d55" stroke-width="7" fill="none" stroke-linecap="round"/><text x="180" y="150" fill="#fff" font-family="Arial" font-size="18" text-anchor="middle">Payment successful</text><text x="180" y="245" font-family="Arial" font-size="34" font-weight="700" text-anchor="middle" fill="#0f1d33">${inr(amt)}</text><text x="180" y="280" font-family="Arial" font-size="15" text-anchor="middle" fill="#5a6a80">Paid to TripPartner</text><g font-family="Arial" font-size="14" fill="#0f1d33"><text x="28" y="350">UPI transaction ID</text><text x="332" y="350" text-anchor="end" font-weight="700">${utr}</text><text x="28" y="390">App</text><text x="332" y="390" text-anchor="end">${appName}</text></g><rect x="20" y="470" width="320" height="60" rx="10" fill="#fff4d6" stroke="#e0a800" stroke-dasharray="6 4"/><text x="180" y="506" font-family="Arial" font-size="15" font-weight="700" text-anchor="middle" fill="#7a4b00">SAMPLE — demo data only</text></svg>`);
  /* ---- sample data (clearly fictional) ---- */
  function seed() {
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; const pick = a => a[Math.floor(rnd() * a.length)]; const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const F = ['Aarav', 'Priya', 'Rohit', 'Neha', 'Ankit', 'Sneha', 'Vikas', 'Pooja', 'Rahul', 'Kavya', 'Amit', 'Ritu', 'Sandeep', 'Nisha', 'Manish', 'Simran', 'Deepak', 'Anjali', 'Karan', 'Swati', 'Arjun', 'Meera', 'Saurabh', 'Isha'];
    const L = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Yadav', 'Kapoor', 'Mishra', 'Jain', 'Mehta', 'Nair', 'Kumar', 'Agarwal', 'Chauhan', 'Rawat', 'Tiwari', 'Kaur', 'Joshi', 'Pandey', 'Malhotra', 'Saxena'];
    const CITY = ['Delhi', 'Noida', 'Gurugram', 'Ghaziabad', 'Faridabad', 'Lucknow', 'Jaipur', 'Patna', 'Muzaffarpur', 'Chandigarh', 'Dehradun', 'Kanpur'];
    const name = () => pick(F) + ' ' + pick(L); const phone = () => String(int(6, 9)) + String(int(100000000, 999999999));
    const iso = daysAgo => new Date(Date.now() - daysAgo * DAY - int(0, 36e6)).toISOString();
    const P = CAT.packages.length ? CAT.packages : [{ id: 'sample', title: 'Sample package', price: 20000, n: 4 }];
    const staff = [
      { id: 'S1', name: 'Demo Admin', email: 'admin@trippartner.com', role: 'admin', active: true, phone: '' },
      { id: 'S2', name: 'Sales Desk', email: 'sales@trippartner.com', role: 'sales', active: true, phone: '' },
      { id: 'S3', name: 'Operations Desk', email: 'ops@trippartner.com', role: 'ops', active: true, phone: '' }].map(x => ({ ...x, created: iso(60), updated: iso(60) }));
    const leads = [];
    for (let i = 0; i < 74; i++) {
      const d = Math.floor(Math.pow(rnd(), 1.3) * 30), p = pick(P), nm = name();
      const st = d < 2 ? (rnd() < .75 ? 'New' : 'Contacted') : d < 7 ? pick(['New', 'Contacted', 'Contacted', 'Quoted', 'Quoted', 'Won']) : pick(['Contacted', 'Quoted', 'Won', 'Won', 'Lost', 'Lost', 'Quoted']);
      const src = pick(['Website enquiry', 'Website enquiry', 'Plan My Trip', 'Booking form', 'WhatsApp', 'Phone call', 'Travel Partner', 'Referral']);
      const subj = src === 'Plan My Trip' ? `Plan My Trip — ${p.destName || p.title}` : rnd() < .12 ? 'Callback request' : p.title;
      const at = iso(d);
      leads.push({ id: 'EQ' + uid().slice(0, 6), subject: subj, pkg: p.id, name: nm, phone: phone(), email: nm.toLowerCase().replace(' ', '.') + '@example.com', month: pick(['Oct 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027', 'Flexible']), pax: pick(['2 adults', '2 adults, 1 child', '4 adults', '1 adult', '6 adults', '2 adults, 2 children']), msg: pick(['', 'Need hotel near the market.', 'Honeymoon trip, please suggest upgrades.', 'Senior citizens travelling — need easy itinerary.', 'Budget around 25k per person.', 'Can we add flights from Patna?']), source: src, status: st, assigned: st === 'New' ? '' : pick(['Sales Desk', 'Demo Admin']), followup: ['Contacted', 'Quoted'].includes(st) ? addDays(today(), int(-3, 4)) : '', notes: st === 'New' ? [] : [{ at, by: 'Sales Desk', text: pick(['Called, shared itinerary on WhatsApp.', 'Customer wants quote with deluxe hotels.', 'Asked to call back in the evening.', 'Sent quote, waiting for confirmation.']) }], city: pick(CITY), created: at, updated: at, demo: true });
    }
    leads.sort((a, b) => b.created.localeCompare(a.created));
    const bookings = [];
    for (let i = 0; i < 30; i++) {
      const p = pick(P), nm = name(), status = pick([1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5]), ad = pick([2, 2, 2, 4, 3, 1, 6]), ch = rnd() < .3 ? 1 : 0;
      const hotel = pick(['std', 'dlx', 'dlx', 'prm']), mult = { std: 1, dlx: 1.25, prm: 1.6 }[hotel];
      const total = Math.round((p.price * mult * ad + p.price * .5 * ch) / 100) * 100, adv = Math.round(total * .25 / 100) * 100;
      const created = iso(int(1, 45)), date = status === 5 ? addDays(today(), -int(3, 40)) : addDays(today(), int(4, 110));
      const payments = status >= 3 ? [{ at: created, amount: adv, mode: pick(['UPI', 'Bank transfer', 'Card']), ref: 'UTR' + int(100000, 999999), by: 'Sales Desk' }] : [];
      if (status >= 4 && rnd() < .5 || status === 5) payments.push({ at: iso(int(0, 10)), amount: total - adv, mode: pick(['UPI', 'Bank transfer']), ref: 'UTR' + int(100000, 999999), by: 'Operations Desk' });
      bookings.push({ id: 'TP26' + uid().slice(0, 5), pkg: p.id, pkgTitle: p.title, date, from: pick(['Delhi', 'Noida', 'Patna', 'Lucknow', 'Land only']), hotel, ad, ch, inf: 0, name: nm, phone: phone(), email: nm.toLowerCase().replace(' ', '.') + '@example.com', names: '', addons: rnd() < .4 ? [pick(['Flights', 'Travel insurance', 'Airport transfer'])] : [], notes: '', pay: pick(['adv', 'full']), coupon: rnd() < .15 ? 'LASTMINUTE' : '', total, adv, status, payments, staffNotes: [], cancelled: i === 7 || i === 19, created, updated: created, demo: true });
    }
    bookings.sort((a, b) => b.created.localeCompare(a.created));
    const deps = CAT.departures.map((d, i) => { const seats = pick([16, 20, 24, 30]), booked = Math.min(seats, int(2, seats)); return { id: 'DP' + i, pkg: d.pkg, pkgTitle: pkgTitle(d.pkg), date: d.date, seats, booked, status: booked >= seats ? 'Sold out' : booked >= seats * .75 ? 'Filling fast' : 'Open', captain: rnd() < .5 ? pick(['Captain A', 'Captain B', 'Captain C']) : '', note: '', created: iso(30), updated: iso(30) }; });
    const coupons = [...CAT.coupons.map(c => ({ ...c, id: 'C' + c.code, validTill: '', active: true })), { id: 'CSAMPLE10', code: 'SAMPLE10', pct: 10, desc: 'Sample coupon (demo only)', maxDays: 0, validTill: addDays(today(), 60), active: false }].map(c => ({ ...c, created: iso(20), updated: iso(20) }));
    const g = ['M', 'F'];
    const partners = Array.from({ length: 10 }, (_, i) => { const p = pick(P), gg = g[i % 2]; return { id: 'PR' + i, name: (gg === 'F' ? pick(['Priya', 'Neha', 'Sneha', 'Kavya', 'Isha', 'Meera']) : pick(['Rohit', 'Ankit', 'Rahul', 'Arjun', 'Karan', 'Vikas'])) + ' ' + pick(L)[0] + '.', g: gg, age: int(21, 38), city: pick(CITY), phone: phone(), email: '', dest: p.destName || p.title, month: pick(['Nov 2026', 'Dec 2026', 'Jan 2027']), bud: pick(['Under ₹25k', '₹25k – ₹50k', '₹50k+']), look: pick(['Anyone', 'Male', 'Female']), about: pick(['Love treks and photography.', 'Weekend traveller, easy-going.', 'First solo trip — prefer group departures.', 'Foodie, early riser.']), seat: rnd() < .7, share: rnd() < .4, women: gg === 'F' && rnd() < .5, status: i < 4 ? 'Verification pending' : pick(['Verified', 'Verified', 'Rejected']), created: iso(int(0, 20)), updated: iso(2), demo: true }; });
    const reqs = Array.from({ length: 6 }, (_, i) => ({ id: 'RQ' + i, to: partners[int(4, 9)].name, from: partners[int(0, 3)].name, trip: pick(P).title, month: pick(['Nov 2026', 'Dec 2026']), msg: 'Hi! Would you like to plan this trip together?', seat: true, room: pick(['separate', 'shared']), status: pick(REQ_ST), fromPhone: '', created: iso(int(0, 12)), updated: iso(1) }));
    const props = Array.from({ length: 4 }, (_, i) => { const p = pick(P), tot = p.price * 2; return { id: 'JP' + i, pkg: p.id, partner: partners[int(4, 9)].name, month: 'Dec 2026', hotel: 'dlx', seat: true, room: pick(['separate', 'shared']), pay: pick(['split', 'me', 'them']), total: tot, you: tot / 2, them: tot / 2, status: pick(PROP_ST), created: iso(int(0, 10)), updated: iso(1) }; });
    const reviews = [
      ['Sample reviewer 1', 'Delhi', 'kashmir-paradise', 5, 'Sample review text — replace with a genuine customer review before publishing.', 'Published'],
      ['Sample reviewer 2', 'Noida', 'goa-fun', 4, 'Sample review text — hotel and transfers were on time.', 'Published'],
      ['Sample reviewer 3', 'Patna', 'chardham-yatra', 5, 'Sample review text — helpful trip captain.', 'Pending'],
      ['Sample reviewer 4', 'Jaipur', 'bali-honeymoon', 3, 'Sample review text — flight timing could be better.', 'Pending']].map(([nm, city, pkg, rating, text, status], i) => ({ id: 'RV' + i, name: nm, city, pkg, trip: pkgTitle(pkg), rating, text, status, created: iso(int(1, 25)), updated: iso(1), demo: true }));
    const settings = [{ id: 'site', ...CAT.config, announcement: '', created: iso(60), updated: iso(60) }];
    const activity = [];
    [...leads.slice(0, 12).map(l => ['new lead', 'leads', l.id, l.subject, l.created]), ...bookings.slice(0, 6).map(b => ['new booking request', 'bookings', b.id, b.pkgTitle, b.created]), ...partners.slice(0, 4).map(p => ['new partner profile', 'partners', p.id, p.name, p.created])]
      .sort((a, b) => b[4].localeCompare(a[4])).forEach(([action, col, ref, note, at]) => activity.push({ id: uid('A'), by: 'Website', role: 'public', action, col, ref, note, created: at, updated: at }));
    bookings.forEach(b => { b.proofs = (b.payments || []).filter(x => x.mode === 'UPI').map((x, i) => { const id = 'PF' + uid().slice(0, 6); x.proof = id; x.receipt = 'TPR-' + x.at.slice(2, 4) + x.at.slice(5, 7) + '-' + uid().slice(0, 5); return { id, amount: x.amount, approvedAmount: x.amount, mode: 'UPI', utr: String(x.ref).replace(/\D/g, '').padStart(12, '4'), paidAt: x.at.slice(0, 10), payer: b.name, app: 'Google Pay', status: 'Approved', receipt: x.receipt, by: x.by, decidedAt: x.at, at: x.at, type: 'svg', demo: true }; }); });
    bookings.filter(b => b.status <= 2).slice(0, 4).forEach((b, i) => { const amt = i === 3 ? Math.round(b.adv / 2) : b.adv, utr = String(int(400000000000, 499999999999)), app = pick(['Google Pay', 'PhonePe', 'Paytm']);
      b.proofs = [...(b.proofs || []), { id: 'PF' + uid().slice(0, 6), amount: amt, mode: i === 2 ? 'Bank transfer' : 'UPI', utr: i === 2 ? 'HDFCN5' + utr : utr, paidAt: iso(i).slice(0, 10), payer: b.name, app: i === 2 ? 'Bank app / net banking' : app, note: i === 3 ? 'Paying half now, rest tomorrow' : '', status: 'Pending', at: iso(i * .3), type: 'svg', demoImg: shot(amt, i === 2 ? 'HDFCN5' + utr : utr, i === 2 ? 'Net banking' : app), demo: true }]; });
    return { v: 2, staff, leads, bookings, departures: deps, packages: [], coupons, partners, partner_requests: reqs, proposals: props, reviews, settings, activity };
  }
  return { call, reset() { db = seed(); save(); }, init };
})();

/* =====================================================================
   UI helpers
   ===================================================================== */
function toast(msg, bad) { const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600); }
const fail = e => toast(e.message || String(e), true);
let dwClose = null;
function openDrawer(title, html, mount) {
  $('#dw-t').textContent = title; $('#dw-b').innerHTML = html; $('#drawer').hidden = false; document.body.style.overflow = 'hidden';
  const f = $('#dw-b input,#dw-b select,#dw-b textarea,#dw-b button'); if (f && !matchMedia('(max-width:700px)').matches) setTimeout(() => f.focus({ preventScroll: true }), 30);
  if (mount) mount($('#dw-b'));
}
function closeDrawer() { $('#drawer').hidden = true; document.body.style.overflow = ''; if (dwClose) { const f = dwClose; dwClose = null; f(); } }
const opt = (list, v) => list.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('');
const fld = (label, name, v = '', type = 'text', extra = '') => `<label class="fld ${type === 'textarea' ? 'full' : ''}"><span>${label}</span>${type === 'textarea' ? `<textarea name="${name}" ${extra}>${esc(v)}</textarea>` : `<input name="${name}" type="${type}" value="${esc(v)}" ${extra}>`}</label>`;
const sel = (label, name, list, v, extra = '') => `<label class="fld"><span>${label}</span><select name="${name}" ${extra}>${opt(list, v)}</select></label>`;
const chk = (label, name, v) => `<label class="chk"><input type="checkbox" name="${name}" ${v ? 'checked' : ''}> ${label}</label>`;
function formData(form) { const o = {}; $$('input,select,textarea', form).forEach(el => { if (!el.name) return; o[el.name] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value.trim(); }); return o; }
const dl = rows => `<dl class="dl">${rows.filter(r => r[1] !== undefined && r[1] !== '' && r[1] !== null).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
function csvDownload(col, rows) {
  if (MODE === 'live') { location.href = API_BASE + 'export/' + col + '.csv'; return; }
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(k => !['pass', 'notes', 'payments', 'staffNotes', 'demo'].includes(k));
  const e = v => { let t = String(v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v); if (/^[=+\-@]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
  const blob = new Blob(['﻿' + [keys.join(','), ...rows.map(r => keys.map(k => e(r[k])).join(','))].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${col}-${today()}.csv`; document.body.appendChild(a); a.click(); a.remove();
}

/* generic sortable/paged table */
function table(cfg) {
  // cfg: {id, rows, cols:[{k,label,cls,sort:fn|true,html:fn}], open:fn(row)->id, empty, pageSize}
  const st = TBL[cfg.id] = TBL[cfg.id] || { sort: null, dir: -1, page: 0 };
  let rows = cfg.rows.slice();
  if (st.sort) { const c = cfg.cols.find(c => c.k === st.sort); const f = typeof c.sort === 'function' ? c.sort : r => r[c.k]; rows.sort((a, b) => { const x = f(a), y = f(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; }); }
  const ps = cfg.pageSize || 25, pages = Math.max(1, Math.ceil(rows.length / ps)); st.page = Math.min(st.page, pages - 1);
  const view = rows.slice(st.page * ps, st.page * ps + ps);
  return `<div class="tw"><table data-tbl="${cfg.id}"><thead><tr>${cfg.cols.map(c => `<th class="${c.cls || ''}" ${c.sort ? `data-sort="${c.k}" aria-sort="${st.sort === c.k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}"` : ''}>${c.label}${st.sort === c.k ? (st.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
   <tbody>${view.length ? view.map(r => `<tr ${cfg.open ? `data-open="${esc(cfg.open(r))}" tabindex="0"` : ''}>${cfg.cols.map(c => `<td class="${c.cls || ''}">${c.html ? c.html(r) : esc(r[c.k])}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cfg.cols.length}"><div class="empty">${cfg.empty || 'Nothing here yet.'}</div></td></tr>`}</tbody></table></div>
   ${pages > 1 ? `<div class="pager" data-pager="${cfg.id}"><span class="num">${st.page * ps + 1}–${Math.min(rows.length, st.page * ps + ps)} of ${rows.length}</span><button class="btn g sm" data-pg="-1" ${st.page ? '' : 'disabled'}>Previous</button><button class="btn g sm" data-pg="1" ${st.page < pages - 1 ? '' : 'disabled'}>Next</button></div>` : ''}`;
}
const TBL = {};
function bindTable(root, id, rerender, onOpen) {
  const t = $(`[data-tbl="${id}"]`, root); if (!t) return;
  $$('th[data-sort]', t).forEach(th => th.onclick = () => { const s = TBL[id]; if (s.sort === th.dataset.sort) s.dir *= -1; else { s.sort = th.dataset.sort; s.dir = -1; } rerender(); });
  $$('tr[data-open]', t).forEach(tr => { tr.onclick = () => onOpen(tr.dataset.open); tr.onkeydown = e => { if (e.key === 'Enter') onOpen(tr.dataset.open); }; });
  const pg = $(`[data-pager="${id}"]`, root); if (pg) $$('[data-pg]', pg).forEach(b => b.onclick = () => { TBL[id].page += +b.dataset.pg; rerender(); });
}

/* ---------- charts (single hue, hover tooltip) ---------- */
function barChart(data, opt = {}) {
  const W = 640, H = opt.h || 200, pl = 34, pb = 24, pt = 8, iw = W - pl - 6, ih = H - pb - pt;
  const max = Math.max(1, ...data.map(d => d.v)), step = max <= 5 ? 1 : Math.ceil(max / 4 / (max > 20 ? 5 : 1)) * (max > 20 ? 5 : 1), top = Math.ceil(max / step) * step;
  const bw = iw / data.length, gap = Math.min(4, bw * .25);
  let g = ''; for (let y = 0; y <= top; y += step) { const yy = pt + ih - (y / top) * ih; g += `<line class="gl" x1="${pl}" x2="${W - 6}" y1="${yy}" y2="${yy}"/><text class="ax" x="${pl - 6}" y="${yy + 4}" text-anchor="end">${y}</text>`; }
  const bars = data.map((d, i) => { const h = (d.v / top) * ih, x = pl + i * bw + gap / 2, y = pt + ih - h; return `<g data-tip="${esc(d.tip || d.label + ': ' + d.v)}"><rect class="hit" x="${pl + i * bw}" y="${pt}" width="${bw}" height="${ih}"/><rect class="bar ${d.dim ? 'dim' : ''}" x="${x}" y="${y}" width="${Math.max(1, bw - gap)}" height="${Math.max(d.v ? 2 : 0, h)}" rx="2"/></g>`; }).join('');
  const lab = data.map((d, i) => d.tick ? `<text class="ax" x="${pl + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(d.tick)}</text>` : '').join('');
  return `<div class="chart" role="img" aria-label="${esc(opt.label || '')}"><svg viewBox="0 0 ${W} ${H}">${g}${bars}${lab}</svg><div class="tip" hidden></div></div>`;
}
function bindCharts(root) {
  $$('.chart', root).forEach(ch => { const tip = $('.tip', ch);
    ch.onmousemove = e => { const g = e.target.closest('[data-tip]'); if (!g) { tip.hidden = true; return; } const r = ch.getBoundingClientRect(), b = $('.bar', g).getBoundingClientRect(); const [a, ...rest] = g.dataset.tip.split('|'); tip.innerHTML = `<b>${esc(a)}</b>${esc(rest.join(' '))}`; tip.hidden = false; tip.style.left = Math.min(r.width - 60, Math.max(60, b.left - r.left + b.width / 2)) + 'px'; tip.style.top = (b.top - r.top) + 'px'; };
    ch.onmouseleave = () => { tip.hidden = true; }; });
}
const hbars = (items, fmt = v => v) => { const max = Math.max(1, ...items.map(i => i.v)); return `<div class="hbars">${items.length ? items.map(i => `<div class="hb" title="${esc(i.label)}: ${esc(fmt(i.v))}"><span>${esc(i.label)}</span><span class="tr"><i style="width:${(i.v / max) * 100}%"></i></span><b class="num">${esc(fmt(i.v))}</b></div>`).join('') : '<p class="muted">No data yet.</p>'}</div>`; };

/* =====================================================================
   Login
   ===================================================================== */
function renderLogin(msg) {
  document.title = 'Login — TripPartner Admin';
  $('#root').innerHTML = `<div class="login">
   <div class="login-art"><div class="logo"><img src="logo.png" alt="TripPartner"></div>
    <div><h1>Run every trip, lead and booking from one place.</h1><p>The TripPartner back office: enquiries from the website, booking pipeline, payments, group departures, Travel Partner moderation and site settings.</p>
    <ul><li>${ic('lead')} Leads CRM with follow-ups &amp; WhatsApp</li><li>${ic('bag')} Booking stages &amp; payment tracking</li><li>${ic('cal')} Departure seat inventory</li><li>${ic('shield')} Role-based staff access</li></ul></div>
    <small style="color:#8ea3c0">www.trippartner.com · staff only</small></div>
   <div class="login-f"><form id="lf" novalidate>
    <h2>Staff login</h2><p class="muted" style="margin:0">Sign in with your TripPartner staff account.</p>
    ${MODE === 'demo' ? `<div class="demo-note"><b>Demo mode.</b> No backend server is connected, so this preview runs on sample data stored only in this browser. Pick a role to see what each team member can access.</div>${sel('Log in as', 'role', [['admin', 'Admin — full access'], ['sales', 'Sales — leads & bookings'], ['ops', 'Operations — trips, partners, content']], 'admin')}` : `${fld('Email', 'email', '', 'email', 'autocomplete="username" required')}${fld('Password', 'password', '', 'password', 'autocomplete="current-password" required')}`}
    <p class="err" id="lerr" role="alert">${esc(msg || '')}</p>
    <button class="btn" type="submit" style="width:100%;min-height:44px">${MODE === 'demo' ? 'Open demo dashboard' : 'Log in'}</button>
   </form></div></div>`;
  $('#lf').onsubmit = async e => { e.preventDefault(); const f = formData(e.target); $('#lerr').textContent = '';
    try { const r = await http('POST', 'auth/login', f); ME = r.staff; start(); } catch (err) { $('#lerr').textContent = err.message; } };
}

/* =====================================================================
   Shell + router
   ===================================================================== */
const NAV = [
  ['Main', [['overview', 'Overview', 'home', null], ['leads', 'Leads', 'lead', 'leads'], ['bookings', 'Bookings', 'bag', 'bookings'], ['proofs', 'Payment proofs', 'rupee', 'bookings'], ['departures', 'Departures', 'cal', 'departures']]],
  ['Catalogue', [['packages', 'Packages & prices', 'box', 'packages'], ['coupons', 'Coupons', 'tag', 'coupons'], ['reviews', 'Reviews', 'star', 'reviews']]],
  ['Website', [['content', 'Website content', 'layout', 'content']]],
  ['Community', [['partners', 'Travel Partner', 'users', 'partners']]],
  ['Marketing', [['seo', 'SEO & pSEO', 'globe', 'seo_pages']]],
  ['Admin', [['staff', 'Staff & roles', 'shield', 'staff'], ['settings', 'Site settings', 'gear', 'settings'], ['activity', 'Activity log', 'clock', 'activity']]],
];
const TITLES = Object.fromEntries(NAV.flatMap(g => g[1]).map(([k, l]) => [k, l]));
function shell() {
  $('#root').innerHTML = `<div class="shell" id="shell">
   <nav class="side" aria-label="Admin"><div class="brand"><img src="logo.png" alt=""><span><b>TripPartner</b><small>Admin console</small></span></div>
    ${NAV.map(([g, items]) => { const vis = items.filter(i => !i[3] || can(i[3], 'r')); return vis.length ? `<div class="grp">${g}</div>${vis.map(([k, l, icn]) => `<a href="#/${k}" data-nav="${k}">${ic(icn)}<span>${l}</span><span class="ct" data-ct="${k}" hidden></span></a>`).join('')}` : ''; }).join('')}
    <div class="me"><span class="av">${esc(initials(ME.name))}</span><span style="min-width:0;flex:1"><b>${esc(ME.name)}</b><small>${esc(ME.role)}</small></span><button class="icon-btn" id="logout" title="Log out" aria-label="Log out">${ic('out')}</button></div></nav>
   <div class="main">
    ${MODE === 'demo' ? `<div class="banner-demo">${ic('alert')}<span><b>Demo data.</b> No backend connected — sample records live in this browser only. Deploy the backend (see README) to use real data.</span><button class="btn g sm" id="demoreset">Reset demo data</button></div>` : ''}
    <header class="top"><button class="icon-btn burger" id="burger" aria-label="Open menu">${ic('menu')}</button><h1 id="ptitle"></h1><span class="sp"></span>
     <div class="gsearch">${ic('search')}<label class="sr" for="gq">Search leads and bookings</label><input id="gq" type="search" placeholder="Search name, phone or booking ref" autocomplete="off"><div class="gres" id="gres" hidden></div></div>
     <button class="icon-btn" id="theme" title="Dark / light mode" aria-label="Toggle dark mode">${ic('moon')}</button></header>
    <main class="page" id="page"></main></div></div>`;
  $('#logout').onclick = async () => { try { await http('POST', 'auth/logout'); } catch (e) { /* ignore */ } ME = null; renderLogin(); };
  $('#burger').onclick = () => $('#shell').classList.toggle('nav-open');
  $('.side').addEventListener('click', e => { if (e.target.closest('a')) $('#shell').classList.remove('nav-open'); });
  $('#theme').onclick = () => { const d = document.documentElement, cur = d.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), nt = cur === 'dark' ? 'light' : 'dark'; d.dataset.theme = nt; try { localStorage.setItem('tp_admin_theme', nt); } catch (e) { /* ignore */ } };
  const dr = $('#demoreset'); if (dr) dr.onclick = () => { Mock.reset(); toast('Demo data reset'); route(); };
  globalSearch();
}
function globalSearch() {
  const q = $('#gq'), out = $('#gres');
  q.oninput = async () => { const s = q.value.trim().toLowerCase(); if (s.length < 2) { out.hidden = true; return; }
    await load('leads', 'bookings'); const sd = s.replace(/\D/g, '');
    const m = r => [r.name, r.id, r.email, r.subject, r.pkgTitle].some(x => String(x || '').toLowerCase().includes(s)) || (sd.length >= 4 && digits(r.phone).includes(sd));
    const L = DATA.leads.filter(m).slice(0, 6), B = DATA.bookings.filter(m).slice(0, 6);
    out.innerHTML = (B.map(b => `<a href="#/bookings/${esc(b.id)}"><span><b>${esc(b.id)}</b> · ${esc(b.name)}</span><small>Booking</small></a>`).join('') + L.map(l => `<a href="#/leads/${esc(l.id)}"><span>${esc(l.name)} · <small>${esc(l.subject)}</small></span><small>Lead</small></a>`).join('')) || '<p class="muted" style="padding:8px">No matches</p>';
    out.hidden = false; };
  q.onblur = () => setTimeout(() => { out.hidden = true; }, 200);
  out.onclick = () => { q.value = ''; out.hidden = true; };
}
async function counts() {
  try { if (can('leads', 'r')) { const n = (DATA.leads || []).filter(l => l.status === 'New').length; setCt('leads', n); }
    if (can('partners', 'r')) setCt('partners', (DATA.partners || []).filter(p => p.status === 'Verification pending').length);
    if (can('bookings', 'r') && DATA.bookings) setCt('proofs', allProofs().filter(x => x.p.status === 'Pending').length);
    if (can('reviews', 'r')) setCt('reviews', (DATA.reviews || []).filter(p => p.status === 'Pending').length); } catch (e) { /* ignore */ }
}
const setCt = (k, n) => { const el = $(`[data-ct="${k}"]`); if (el) { el.textContent = n; el.hidden = !n; } };

const PAGES = {};
async function route() {
  if (!ME) return;
  const [, page = 'overview', id] = (location.hash.match(/^#\/([\w-]+)(?:\/(.+))?/) || []);
  const fn = PAGES[page] ? page : 'overview';
  const navItem = NAV.flatMap(g => g[1]).find(i => i[0] === fn);
  if (navItem && navItem[3] && !can(navItem[3], 'r')) { $('#page').innerHTML = `<div class="card"><h3>${ic('shield')} No access</h3><p class="muted">Your role (${esc(ME.role)}) cannot open ${esc(TITLES[fn])}. Ask an admin for access.</p></div>`; return; }
  $$('[data-nav]').forEach(a => { if (a.dataset.nav === fn) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#ptitle').textContent = TITLES[fn]; document.title = TITLES[fn] + ' — TripPartner Admin';
  if (!$('#drawer').hidden) { dwClose = null; closeDrawer(); $('.dw').classList.remove('wide'); }
  $('#page').innerHTML = '<p class="muted">Loading…</p>';
  try { await PAGES[fn](id ? decodeURIComponent(id) : null); counts(); } catch (e) { if (e.message !== 'Session expired') $('#page').innerHTML = `<div class="card"><h3>${ic('alert')} Could not load this page</h3><p class="muted">${esc(e.message)}</p></div>`; }
}
const setHash = h => { if (location.hash !== h) history.replaceState(null, '', h); };

/* =====================================================================
   Overview
   ===================================================================== */
PAGES.overview = async () => {
  await load('leads', 'bookings', 'departures', 'partners', 'reviews', 'activity');
  const L = DATA.leads, B = DATA.bookings.filter(b => !b.cancelled), t = today();
  const inLast = (r, a, b = 0) => { const d = (Date.now() - new Date(r.created)) / DAY; return d < a && d >= b; };
  const nl7 = L.filter(l => inLast(l, 7)).length, nlp = L.filter(l => inLast(l, 14, 7)).length;
  const open = L.filter(l => !['Won', 'Lost'].includes(l.status)).length;
  const active = B.filter(b => b.status < 5), pipe = active.reduce((a, b) => a + (+b.total || 0), 0);
  const coll30 = B.flatMap(b => b.payments || []).filter(p => (Date.now() - new Date(p.at)) / DAY < 30).reduce((a, p) => a + (+p.amount || 0), 0);
  const closed = L.filter(l => inLast(l, 30) && ['Won', 'Lost'].includes(l.status)), conv = closed.length ? Math.round(closed.filter(l => l.status === 'Won').length / closed.length * 100) : 0;
  const deps = DATA.departures.filter(d => d.status !== 'Cancelled' && d.date >= t && daysTo(d.date) <= 30);
  const due = L.filter(l => l.followup && l.followup <= t && !['Won', 'Lost'].includes(l.status)).sort((a, b) => a.followup.localeCompare(b.followup));
  const bal = B.filter(b => b.status < 5 && (+b.total || 0) - paid(b) > 0 && b.date >= t && daysTo(b.date) <= 30).sort((a, b) => a.date.localeCompare(b.date));
  const days = Array.from({ length: 30 }, (_, i) => addDays(t, i - 29));
  const perDay = days.map((d, i) => { const v = L.filter(l => ld(l.created) === d).length; const dt = new Date(d + 'T00:00:00'); return { v, label: dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), tip: `${dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}|${v} lead${v === 1 ? '' : 's'}`, tick: i % 5 === 4 || i === 29 ? dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '' }; });
  const byDest = {}; B.forEach(b => { const k = (PK(b.pkg) || {}).destName || b.pkgTitle || b.pkg; byDest[k] = (byDest[k] || 0) + (+b.total || 0); });
  const destItems = Object.entries(byDest).map(([label, v]) => ({ label, v })).sort((a, b) => b.v - a.v).slice(0, 7);
  const pend = DATA.partners.filter(p => p.status === 'Verification pending').length, prev = DATA.reviews.filter(r => r.status === 'Pending').length, pfs = allProofs().filter(x => x.p.status === 'Pending').length;
  const delta = nl7 - nlp;
  $('#page').innerHTML = `
   <div class="kpis">
    <a class="kpi" href="#/leads"><small>New leads · 7 days</small><b class="num">${nl7}</b><em>${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)} vs previous 7 days</em></a>
    <a class="kpi" href="#/leads"><small>Open leads</small><b class="num">${open}</b><em>${due.length} follow-up${due.length === 1 ? '' : 's'} due</em></a>
    <a class="kpi" href="#/bookings"><small>Active bookings</small><b class="num">${active.length}</b><em>${active.filter(b => b.status === 1).length} awaiting confirmation</em></a>
    <a class="kpi" href="#/bookings"><small>Pipeline value</small><b class="num">${inrC(pipe)}</b><em>active bookings total</em></a>
    <div class="kpi"><small>Collected · 30 days</small><b class="num">${inrC(coll30)}</b><em>payments recorded</em></div>
    <div class="kpi"><small>Lead win rate · 30 days</small><b class="num">${conv}%</b><em>${closed.length} leads closed</em></div>
   </div>
   <div class="g2">
    <div class="card"><h3>Leads per day <span class="sp"></span><span class="muted" style="font:500 12px var(--f)">last 30 days</span></h3>${barChart(perDay, { label: 'Leads per day, last 30 days' })}</div>
    <div class="card"><h3>Lead pipeline <span class="sp"></span><a href="#/leads">Open CRM</a></h3>${hbars(LEAD_ST.map(s => ({ label: s, v: L.filter(l => l.status === s).length })))}
     ${pend || prev || pfs ? `<div class="sect" style="margin-top:14px"><h4>Needs moderation</h4><div class="rows">${pfs ? `<a href="#/proofs">${ic('rupee')}<span class="sp">Payment proofs to verify</span><b class="num">${pfs}</b></a>` : ''}${pend ? `<a href="#/partners">${ic('users')}<span class="sp">Travel Partner profiles to verify</span><b class="num">${pend}</b></a>` : ''}${prev ? `<a href="#/reviews">${ic('star')}<span class="sp">Reviews waiting to publish</span><b class="num">${prev}</b></a>` : ''}</div></div>` : ''}</div>
   </div>
   <div class="g3">
    <div class="card"><h3>${ic('clock')} Follow-ups due <span class="sp"></span><a href="#/leads">All leads</a></h3><div class="rows">${due.slice(0, 7).map(l => `<a href="#/leads/${esc(l.id)}"><span class="av" style="width:30px;height:30px;font-size:11px">${esc(initials(l.name))}</span><span class="sp"><b>${esc(l.name)}</b><small>${esc(l.subject)}</small></span>${l.followup < t ? `<span class="st bad">${ic('alert')}${-daysTo(l.followup)}d overdue</span>` : `<span class="st warn">${ic('clock')}Today</span>`}</a>`).join('') || '<p class="muted">No follow-ups due. 🎉</p>'}</div></div>
    <div class="card"><h3>${ic('cal')} Departures · next 30 days <span class="sp"></span><a href="#/departures">All</a></h3><div class="rows">${deps.slice(0, 7).map(d => { const f = d.seats ? d.booked / d.seats : 0; return `<a href="#/departures/${esc(d.id)}"><span class="date"><b>${new Date(d.date + 'T00:00:00').getDate()}</b><small>${new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}</small></span><span class="sp"><b>${esc(pkgTitle(d.pkg, d.pkgTitle))}</b><small class="num">${d.booked}/${d.seats} seats booked</small></span><span class="meter ${f >= .75 ? 'hi' : ''}" style="width:70px"><i style="width:${Math.round(f * 100)}%"></i></span></a>`; }).join('') || '<p class="muted">No departures in the next 30 days.</p>'}</div></div>
    <div class="card"><h3>${ic('rupee')} Balance to collect <span class="sp"></span><a href="#/bookings">Bookings</a></h3><div class="rows">${bal.slice(0, 7).map(b => `<a href="#/bookings/${esc(b.id)}"><span class="sp"><b>${esc(b.name)}</b><small>${esc(b.id)} · travels ${fmtD(b.date)}</small></span><b class="num">${inr(b.total - paid(b))}</b></a>`).join('') || '<p class="muted">No balances due for trips in the next 30 days.</p>'}</div></div>
   </div>
   <div class="g2">
    <div class="card"><h3>Booking value by destination <span class="sp"></span><span class="muted" style="font:500 12px var(--f)">all non-cancelled bookings</span></h3>${hbars(destItems, inrC)}</div>
    <div class="card"><h3>Recent activity <span class="sp"></span>${can('activity', 'r') ? '<a href="#/activity">Full log</a>' : ''}</h3><ul class="tl">${DATA.activity.slice(0, 8).map(a => `<li><b>${esc(a.by)}</b> ${esc(a.action)} ${a.note ? `· ${esc(a.note)}` : ''}<small>${esc(a.col)} ${esc(a.ref || '')} · ${ago(a.created)}</small></li>`).join('') || '<li class="muted">No activity yet.</li>'}</ul></div>
   </div>`;
  bindCharts($('#page'));
};

/* =====================================================================
   Leads
   ===================================================================== */
const F = { leads: { tab: 'all', q: '', src: '', who: '' }, bookings: { tab: 'all', q: '' }, deps: { tab: 'upcoming', q: '' }, pkgs: { tab: 'all', q: '' }, partners: { tab: 'profiles' }, act: { col: '' } };
PAGES.leads = async id => {
  await load('leads', 'staff');
  const draw = () => {
    const f = F.leads, s = f.q.toLowerCase(), sd = s.replace(/\D/g, '');
    const base = DATA.leads.filter(l => (!f.src || l.source === f.src) && (!f.who || (f.who === '-' ? !l.assigned : l.assigned === f.who)) && (!s || [l.name, l.subject, l.email, l.id, l.city].some(x => String(x || '').toLowerCase().includes(s)) || (sd.length >= 4 && digits(l.phone).includes(sd))));
    const rows = f.tab === 'all' ? base : f.tab === 'due' ? base.filter(l => l.followup && l.followup <= today() && !['Won', 'Lost'].includes(l.status)) : base.filter(l => l.status === f.tab);
    const srcs = [...new Set(DATA.leads.map(l => l.source).filter(Boolean))], who = [...new Set(DATA.leads.map(l => l.assigned).filter(Boolean))];
    $('#page').innerHTML = `
     <div class="toolbar"><div class="tabs" role="group" aria-label="Lead status">${[['all', 'All', base.length], ['due', 'Follow-up due', base.filter(l => l.followup && l.followup <= today() && !['Won', 'Lost'].includes(l.status)).length], ...LEAD_ST.map(x => [x, x, base.filter(l => l.status === x).length])].map(([k, l, n]) => `<button aria-pressed="${f.tab === k}" data-tab="${k}">${l}<small class="num">${n}</small></button>`).join('')}</div></div>
     <div class="toolbar"><input type="search" id="q" placeholder="Search name, phone, trip…" value="${esc(f.q)}" aria-label="Search leads">
      <select id="fsrc" aria-label="Source"><option value="">All sources</option>${opt(srcs, f.src)}</select>
      <select id="fwho" aria-label="Assigned to"><option value="">Anyone</option><option value="-" ${f.who === '-' ? 'selected' : ''}>Unassigned</option>${opt(who, f.who)}</select><span class="sp"></span>
      <button class="btn g" id="csv">${ic('dl')} CSV</button>${can('leads', 'w') ? `<button class="btn" id="add">${ic('plus')} Add lead</button>` : ''}</div>
     ${table({ id: 'leads', rows, open: r => r.id, empty: 'No leads match these filters.', cols: [
       { k: 'name', label: 'Lead', sort: true, html: r => `<b>${esc(r.name)}</b><small class="num">${esc(r.phone)}${r.city ? ' · ' + esc(r.city) : ''}</small>` },
       { k: 'subject', label: 'Interested in', sort: true, html: r => `${esc(r.subject)}<small>${esc([r.month, r.pax].filter(Boolean).join(' · '))}</small>` },
       { k: 'source', label: 'Source', sort: true, html: r => `<span class="pill">${esc(r.source || 'Website')}</span>` },
       { k: 'status', label: 'Status', sort: r => LEAD_ST.indexOf(r.status), html: r => chip(r.status) },
       { k: 'assigned', label: 'Owner', sort: true, html: r => r.assigned ? esc(r.assigned) : '<span class="muted">—</span>' },
       { k: 'followup', label: 'Follow-up', sort: true, html: r => r.followup ? `<span class="num ${r.followup < today() && !['Won', 'Lost'].includes(r.status) ? '' : ''}">${fmtD(r.followup)}</span>${r.followup < today() && !['Won', 'Lost'].includes(r.status) ? '<small style="color:var(--red)">overdue</small>' : ''}` : '<span class="muted">—</span>' },
       { k: 'created', label: 'Received', sort: true, html: r => `<span title="${esc(fmtDT(r.created))}">${ago(r.created)}</span>` }] })}`;
    const pg = $('#page');
    $$('[data-tab]', pg).forEach(b => b.onclick = () => { f.tab = b.dataset.tab; TBL.leads && (TBL.leads.page = 0); draw(); });
    $('#q').oninput = e => { f.q = e.target.value; clearTimeout(draw.t); draw.t = setTimeout(() => { draw(); const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
    $('#fsrc').onchange = e => { f.src = e.target.value; draw(); }; $('#fwho').onchange = e => { f.who = e.target.value; draw(); };
    $('#csv').onclick = () => csvDownload('leads', DATA.leads);
    const add = $('#add'); if (add) add.onclick = () => leadForm();
    bindTable(pg, 'leads', draw, lid => { setHash('#/leads/' + lid); leadDrawer(lid, draw); });
  };
  draw();
  if (id) leadDrawer(id, draw);
};
function leadForm() {
  openDrawer('Add a lead', `<form id="lfm" class="fg">${fld('Name *', 'name', '', 'text', 'required')}${fld('Mobile *', 'phone', '', 'tel', 'required inputmode="tel"')}${fld('Email', 'email', '', 'email')}${sel('Source', 'source', SOURCES.filter(s => s !== 'Website'), 'Phone call')}
    <label class="fld full"><span>Interested in *</span><input name="subject" list="pkglist" required placeholder="Package or destination"></label><datalist id="pkglist">${CAT.packages.map(p => `<option value="${esc(p.title)}">`).join('')}</datalist>
    ${fld('Travel month', 'month')}${fld('Travellers', 'pax', '', 'text', 'placeholder="2 adults, 1 child"')}${fld('Message / requirement', 'msg', '', 'textarea')}
    <div class="full acts"><button class="btn" type="submit">Save lead</button><button class="btn g" type="button" data-close>Cancel</button></div></form>`, root => {
    $('#lfm', root).onsubmit = async e => { e.preventDefault(); const d = formData(e.target); if (!d.name || digits(d.phone).length !== 10 || !d.subject) return toast('Name, a 10-digit mobile and trip are required', true);
      try { const r = await api.create('leads', { ...d, id: 'EQ' + Date.now().toString(36).toUpperCase().slice(-6), status: 'New', assigned: ME.name, followup: today(), notes: [] }); toast('Lead added'); closeDrawer(); location.hash = '#/leads/' + r.id; } catch (err) { fail(err); } };
  });
}
async function leadDrawer(id, redraw) {
  let l; try { l = await api.get('leads', id); } catch (e) { return fail(e); }
  const staffNames = (DATA.staff || []).filter(s => s.active).map(s => s.name); [l.assigned, ME.name].forEach(n => { if (n && !staffNames.includes(n)) staffNames.push(n); });
  const w = can('leads', 'w'), msg = `Hi ${l.name.split(' ')[0]}, this is ${ME.name} from TripPartner regarding your enquiry for ${l.subject}.`;
  dwClose = () => { setHash('#/leads'); };
  openDrawer(l.name, `
   <div class="acts"><a class="btn g sm" href="tel:+91${digits(l.phone)}">${ic('phone')} Call</a><a class="btn wa sm" href="${wa(l.phone, msg)}" target="_blank" rel="noopener">${ic('wa')} WhatsApp</a>${l.email ? `<a class="btn g sm" href="mailto:${esc(l.email)}?subject=${encodeURIComponent('Your TripPartner enquiry — ' + l.subject)}">${ic('mail')} Email</a>` : ''}${w ? `<button class="btn o sm" id="conv">${ic('bag')} Convert to booking</button>` : ''}</div>
   ${dl([['Lead ID', `<span class="num">${esc(l.id)}</span>`], ['Interested in', esc(l.subject)], ['Mobile', `<span class="num">${esc(l.phone)}</span>`], ['Email', esc(l.email)], ['City', esc(l.city)], ['Travel month', esc(l.month)], ['Travellers', esc(l.pax)], ['Message', esc(l.msg)], ['Source', esc(l.source)], ['Received', fmtDT(l.created)]])}
   <form id="lup" class="sect"><h4>Pipeline</h4><div class="fg">${sel('Status', 'status', LEAD_ST, l.status, w ? '' : 'disabled')}${sel('Owner', 'assigned', [['', 'Unassigned'], ...staffNames], l.assigned, w ? '' : 'disabled')}${fld('Next follow-up', 'followup', l.followup, 'date', w ? '' : 'disabled')}${fld('Lost reason', 'lostReason', l.lostReason || '', 'text', (w ? '' : 'disabled ') + 'placeholder="Only if lost"')}</div>${w ? '<div class="acts"><button class="btn" type="submit">Save changes</button></div>' : ''}</form>
   <div class="sect"><h4>Notes &amp; calls</h4>${w ? `<form id="nf" class="acts" style="flex-wrap:nowrap"><input name="text" placeholder="e.g. Called — wants deluxe hotels, send quote" aria-label="Add note"><button class="btn g" type="submit">Add</button></form>` : ''}
    <ul class="tl">${(l.notes || []).slice().reverse().map(n => `<li>${esc(n.text)}<small>${esc(n.by)} · ${fmtDT(n.at)}</small></li>`).join('') || '<li class="muted">No notes yet.</li>'}</ul></div>
   ${ME.role === 'admin' ? `<div class="sect"><div class="acts"><button class="btn d sm" id="del">Delete lead</button></div></div>` : ''}`, root => {
    const up = $('#lup', root); if (w) up.onsubmit = async e => { e.preventDefault(); try { await api.update('leads', id, formData(up)); toast('Lead updated'); await load('leads'); redraw(); leadDrawer(id, redraw); } catch (err) { fail(err); } };
    const nf = $('#nf', root); if (nf) nf.onsubmit = async e => { e.preventDefault(); const t = nf.text.value.trim(); if (!t) return; try { await api.update('leads', id, { notes: [...(l.notes || []), { at: new Date().toISOString(), by: ME.name, text: t }], status: l.status === 'New' ? 'Contacted' : l.status }); await load('leads'); redraw(); leadDrawer(id, redraw); } catch (err) { fail(err); } };
    const cv = $('#conv', root); if (cv) cv.onclick = () => { const p = CAT.packages.find(x => x.title === l.subject || (l.pkg && x.id === l.pkg)); bookingForm({ name: l.name, phone: l.phone, email: l.email, pkg: p ? p.id : '', leadId: l.id, ad: parseInt(l.pax) || 2 }); };
    const del = $('#del', root); if (del) del.onclick = async () => { if (!confirmInline(del)) return; try { await api.remove('leads', id); toast('Lead deleted'); closeDrawer(); await load('leads'); redraw(); } catch (err) { fail(err); } };
  });
}
/* two-click confirm (avoids blocking browser dialogs) */
function confirmInline(btn) { if (btn.dataset.armed) return true; btn.dataset.armed = '1'; const t = btn.textContent; btn.textContent = 'Click again to confirm'; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = t; } }, 3500); return false; }

/* =====================================================================
   Bookings
   ===================================================================== */
const newRef = () => 'TP' + String(new Date().getFullYear()).slice(2) + Math.random().toString(36).slice(2, 7).toUpperCase().replace(/[^A-Z0-9]/g, 'X').padEnd(5, 'X');
PAGES.bookings = async id => {
  await load('bookings');
  const draw = () => {
    const f = F.bookings, s = f.q.toLowerCase(), sd = s.replace(/\D/g, '');
    const base = DATA.bookings.filter(b => !s || [b.id, b.name, b.email, b.pkgTitle, pkgTitle(b.pkg)].some(x => String(x || '').toLowerCase().includes(s)) || (sd.length >= 4 && digits(b.phone).includes(sd)));
    const tabs = [['all', 'All', base], ...STAGES.map((x, i) => [String(i + 1), x, base.filter(b => !b.cancelled && b.status === i + 1)]), ['bal', 'Balance due', base.filter(b => !b.cancelled && b.total - paid(b) > 0 && b.status < 5)], ['cx', 'Cancelled', base.filter(b => b.cancelled)]];
    const rows = (tabs.find(t => t[0] === f.tab) || tabs[0])[2];
    const sumT = rows.filter(b => !b.cancelled).reduce((a, b) => a + (+b.total || 0), 0), sumP = rows.filter(b => !b.cancelled).reduce((a, b) => a + paid(b), 0);
    $('#page').innerHTML = `
     <div class="toolbar"><div class="tabs" role="group" aria-label="Booking stage">${tabs.map(([k, l, r]) => `<button aria-pressed="${f.tab === k}" data-tab="${k}">${l}<small class="num">${r.length}</small></button>`).join('')}</div></div>
     <div class="toolbar"><input type="search" id="q" placeholder="Search ref, name, phone, package…" value="${esc(f.q)}" aria-label="Search bookings"><span class="muted num" style="font-size:13px">Total ${inr(sumT)} · collected ${inr(sumP)} · balance ${inr(sumT - sumP)}</span><span class="sp"></span>
      <button class="btn g" id="csv">${ic('dl')} CSV</button>${can('bookings', 'w') ? `<button class="btn" id="add">${ic('plus')} New booking</button>` : ''}</div>
     ${table({ id: 'bookings', rows, open: r => r.id, empty: 'No bookings here.', cols: [
       { k: 'id', label: 'Ref', sort: true, html: r => `<b class="num">${esc(r.id)}</b><small>${ago(r.created)}</small>` },
       { k: 'name', label: 'Lead traveller', sort: true, html: r => `<b>${esc(r.name)}</b><small class="num">${esc(r.phone)}</small>` },
       { k: 'pkg', label: 'Package', sort: r => pkgTitle(r.pkg, r.pkgTitle), html: r => `<span class="pkgc">${pkgImg(r.pkg)}<span><b>${esc(pkgTitle(r.pkg, r.pkgTitle))}</b><small>${esc(HOTEL[r.hotel] || '')}</small></span></span>` },
       { k: 'date', label: 'Departure', sort: true, html: r => `<span class="num">${fmtD(r.date)}</span>${r.date >= today() && !r.cancelled && r.status < 5 ? `<small>in ${daysTo(r.date)} days</small>` : ''}` },
       { k: 'pax', label: 'Pax', cls: 'r', sort: r => (+r.ad || 0) + (+r.ch || 0), html: r => `<span class="num">${(+r.ad || 0) + (+r.ch || 0) + (+r.inf || 0)}</span>` },
       { k: 'total', label: 'Total', cls: 'r', sort: true, html: r => `<b class="num">${inr(r.total)}</b>` },
       { k: 'bal', label: 'Balance', cls: 'r', sort: r => r.total - paid(r), html: r => { const b = r.total - paid(r); return b > 0 ? `<span class="num">${inr(b)}</span>` : `<span class="st ok">${ic('check')}Paid</span>`; } },
       { k: 'status', label: 'Stage', sort: r => r.cancelled ? 9 : r.status, html: stageChip }] })}`;
    const pg = $('#page');
    $$('[data-tab]', pg).forEach(b => b.onclick = () => { f.tab = b.dataset.tab; TBL.bookings && (TBL.bookings.page = 0); draw(); });
    $('#q').oninput = e => { f.q = e.target.value; clearTimeout(draw.t); draw.t = setTimeout(() => { draw(); const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
    $('#csv').onclick = () => csvDownload('bookings', DATA.bookings);
    const add = $('#add'); if (add) add.onclick = () => bookingForm({});
    bindTable(pg, 'bookings', draw, bid => { setHash('#/bookings/' + bid); bookingDrawer(bid, draw); });
  };
  PAGES.bookings.redraw = draw; draw();
  if (id) bookingDrawer(id, draw);
};
function bookingForm(pre) {
  const pk = PK(pre.pkg);
  openDrawer(pre.leadId ? 'Convert lead to booking' : 'New booking', `<form id="bfm" class="fg">
    <label class="fld full"><span>Package *</span><select name="pkg" required><option value="">Choose a package</option>${CAT.packages.map(p => `<option value="${esc(p.id)}" ${p.id === pre.pkg ? 'selected' : ''}>${esc(p.title)} · ${p.n}N · ${inr(p.price)}</option>`).join('')}</select></label>
    ${fld('Departure date *', 'date', pre.date || addDays(today(), 30), 'date', 'required')}${sel('Hotel category', 'hotel', Object.entries(HOTEL), pre.hotel || 'dlx')}
    ${fld('Adults', 'ad', pre.ad || 2, 'number', 'min="1" max="50"')}${fld('Children', 'ch', pre.ch || 0, 'number', 'min="0" max="20"')}
    ${fld('Lead traveller *', 'name', pre.name || '', 'text', 'required')}${fld('Mobile *', 'phone', pre.phone || '', 'tel', 'required')}${fld('Email', 'email', pre.email || '')}${fld('Starting city', 'from', pre.from || 'Delhi')}
    ${fld('Quoted total (₹) *', 'total', pre.total || (pk ? pk.price * (pre.ad || 2) : ''), 'number', 'min="0" required')}${fld('Advance required (₹)', 'adv', pre.adv || '', 'number', 'min="0" placeholder="25% if blank"')}
    ${fld('Notes for operations', 'notes', '', 'textarea')}
    <div class="full acts"><button class="btn" type="submit">Create booking</button><button class="btn g" type="button" data-close>Cancel</button></div></form>`, root => {
    const f = $('#bfm', root);
    f.pkg.onchange = f.ad.oninput = () => { const p = PK(f.pkg.value); if (p) f.total.value = Math.round(p.price * ({ std: 1, dlx: 1.25, prm: 1.6 }[f.hotel.value] || 1) * (+f.ad.value || 1) + p.price * .5 * (+f.ch.value || 0)); };
    f.hotel.onchange = f.ch.oninput = f.pkg.onchange;
    f.onsubmit = async e => { e.preventDefault(); const d = formData(f); if (!d.pkg || !d.name || digits(d.phone).length !== 10 || !d.total) return toast('Package, name, 10-digit mobile and total are required', true);
      const total = +d.total, adv = +d.adv || Math.round(total * .25 / 100) * 100;
      try { const r = await api.create('bookings', { ...d, id: newRef(), pkgTitle: pkgTitle(d.pkg), total, adv, inf: 0, addons: [], pay: 'adv', coupon: '', status: 1, payments: [], staffNotes: [], cancelled: false, source: pre.leadId ? 'Lead ' + pre.leadId : 'Admin' });
        if (pre.leadId) await api.update('leads', pre.leadId, { status: 'Won', bookingRef: r.id }).catch(() => {});
        toast('Booking ' + r.id + ' created'); closeDrawer(); location.hash = '#/bookings/' + r.id; } catch (err) { fail(err); } };
  });
}
async function bookingDrawer(id, redraw) {
  let b; try { b = await api.get('bookings', id); } catch (e) { return fail(e); }
  const w = can('bookings', 'w'), pd = paid(b), bal = (+b.total || 0) - pd, p = PK(b.pkg);
  const msg = `Hi ${b.name.split(' ')[0]}, update on your TripPartner booking ${b.id} (${pkgTitle(b.pkg, b.pkgTitle)}, ${fmtD(b.date)}): ${b.cancelled ? 'cancelled' : STAGES[b.status - 1]}. ${bal > 0 ? 'Balance due: ' + inr(bal) + '.' : 'Fully paid — thank you!'}`;
  const refresh = async () => { await load('bookings'); redraw && redraw(); bookingDrawer(id, redraw); };
  dwClose = () => { setHash('#/bookings'); };
  openDrawer('Booking ' + b.id, `
   <div class="pkgc">${pkgImg(b.pkg)}<span><b>${esc(pkgTitle(b.pkg, b.pkgTitle))}</b><small>${p ? `${p.n}N/${p.n + 1}D · ` : ''}${fmtD(b.date)} · ${esc(HOTEL[b.hotel] || b.hotel || '')}</small></span><span style="margin-left:auto">${stageChip(b)}</span></div>
   ${b.cancelled ? '<div class="notice" style="background:var(--red-soft)">This booking is cancelled.</div>' : `<div><div class="stepper" role="group" aria-label="Booking stage">${STAGES.map((s, i) => `<button type="button" class="${b.status > i + 1 ? 'done' : b.status === i + 1 ? 'cur' : ''}" data-stage="${i + 1}" ${w ? '' : 'disabled'} aria-pressed="${b.status === i + 1}"><i></i>${s}</button>`).join('')}</div></div>`}
   <div class="money"><div><small>Total</small><b class="num">${inr(b.total)}</b></div><div><small>Paid</small><b class="num" style="color:var(--green)">${inr(pd)}</b></div><div><small>Balance</small><b class="num" style="color:${bal > 0 ? 'var(--red)' : 'var(--green)'}">${inr(bal)}</b></div></div>
   <div class="acts"><a class="btn g sm" href="tel:+91${digits(b.phone)}">${ic('phone')} Call</a><a class="btn wa sm" href="${wa(b.phone, msg)}" target="_blank" rel="noopener">${ic('wa')} Send status on WhatsApp</a><button class="btn g sm" id="prt">Print summary</button></div>
   ${dl([['Lead traveller', `<b>${esc(b.name)}</b>`], ['Mobile', `<span class="num">${esc(b.phone)}</span>`], ['Email', esc(b.email)], ['Travellers', `${+b.ad || 0} adult(s)${+b.ch ? `, ${b.ch} child(ren)` : ''}${+b.inf ? `, ${b.inf} infant(s)` : ''}`], ['Names', esc(b.names)], ['From', esc(b.from)], ['Add-ons', esc((b.addons || []).join(', '))], ['Coupon', esc(b.coupon)], ['Customer note', esc(b.notes)], ['Advance asked', inr(b.adv)], ['Requested', fmtDT(b.created)], ['Source', esc(b.source || 'Website')]])}
   <div class="sect"><h4>Payment proofs from customer</h4>${(b.proofs || []).length ? `<div class="rows">${b.proofs.slice().reverse().map(x => `<a href="#/proofs/${esc(encodeURIComponent(b.id + '|' + x.id))}" data-pf="${esc(x.id)}"><span class="sp"><b class="num">${inr(x.approvedAmount || x.amount)}</b> · ${esc(x.mode)} · <span class="num">${esc(x.utr)}</span><small>${fmtDT(x.at)}${x.receipt ? ' · ' + esc(x.receipt) : ''}${x.reason ? ' · ' + esc(x.reason) : ''}</small></span>${proofChip(x.status)}</a>`).join('')}</div>` : '<p class="muted" style="font-size:13px">No proof uploaded yet.</p>'}
    ${!b.cancelled && bal > 0 ? `<div class="acts" style="margin-top:10px"><a class="btn wa sm" href="${wa(b.phone, `Hi ${b.name.split(' ')[0]}, please pay ${inr(pd ? bal : Math.min(bal, b.adv || bal))} for your TripPartner booking ${b.id} by UPI or bank transfer and upload the payment screenshot here: ${payLink(b.id)}`)}" target="_blank" rel="noopener">${ic('wa')} Send payment link</a><button class="btn g sm" type="button" id="cpl">Copy payment link</button></div>` : ''}</div>
   <div class="sect"><h4>Payments</h4><ul class="tl">${(b.payments || []).map(x => `<li><b class="num">${inr(x.amount)}</b> · ${esc(x.mode)}${x.ref ? ' · ' + esc(x.ref) : ''}<small>${esc(x.by || '')} · ${fmtD(x.at)}</small></li>`).join('') || '<li class="muted">No payments recorded yet.</li>'}</ul>
    ${w && !b.cancelled ? `<form id="pf" class="fg">${fld('Amount (₹)', 'amount', bal > 0 ? (pd ? bal : Math.min(bal, b.adv || bal)) : '', 'number', 'min="1" required')}${sel('Mode', 'mode', PAY_MODES, 'UPI')}${fld('Reference / UTR', 'ref')}${fld('Date received', 'at', today(), 'date')}<div class="full acts"><button class="btn" type="submit">${ic('plus')} Record payment</button></div></form>` : ''}</div>
   ${w ? `<form id="be" class="sect"><h4>Edit booking</h4><div class="fg">${fld('Departure date', 'date', b.date, 'date')}${sel('Hotel', 'hotel', Object.entries(HOTEL), b.hotel)}${fld('Adults', 'ad', b.ad, 'number', 'min="1"')}${fld('Children', 'ch', b.ch || 0, 'number', 'min="0"')}${fld('Total (₹)', 'total', b.total, 'number', 'min="0"')}${fld('Advance (₹)', 'adv', b.adv, 'number', 'min="0"')}${fld('Traveller names', 'names', b.names || '', 'textarea')}</div><div class="acts"><button class="btn" type="submit">Save</button></div></form>` : ''}
   <div class="sect"><h4>Internal notes</h4>${w ? `<form id="nf" class="acts" style="flex-wrap:nowrap"><input name="text" placeholder="e.g. Hotel confirmed — voucher pending" aria-label="Add note"><button class="btn g" type="submit">Add</button></form>` : ''}<ul class="tl">${(b.staffNotes || []).slice().reverse().map(n => `<li>${esc(n.text)}<small>${esc(n.by)} · ${fmtDT(n.at)}</small></li>`).join('') || '<li class="muted">No notes yet.</li>'}</ul></div>
   ${w ? `<div class="sect"><div class="acts">${b.cancelled ? '<button class="btn g sm" id="cx" data-v="0">Restore booking</button>' : '<button class="btn d sm" id="cx" data-v="1">Cancel booking</button>'}${ME.role === 'admin' ? '<button class="btn d sm" id="del">Delete</button>' : ''}</div></div>` : ''}`, root => {
    $$('[data-stage]', root).forEach(btn => btn.onclick = async () => { try { await api.update('bookings', id, { status: +btn.dataset.stage, staffNotes: [...(b.staffNotes || []), { at: new Date().toISOString(), by: ME.name, text: 'Stage → ' + STAGES[btn.dataset.stage - 1] }] }); toast('Stage updated'); refresh(); } catch (e) { fail(e); } });
    const pf = $('#pf', root); if (pf) pf.onsubmit = async e => { e.preventDefault(); const d = formData(pf); if (!(+d.amount > 0)) return toast('Enter an amount', true);
      const payments = [...(b.payments || []), { at: d.at || today(), amount: +d.amount, mode: d.mode, ref: d.ref, by: ME.name }], np = payments.reduce((a, x) => a + x.amount, 0);
      const patch = { payments }; if (b.status < 3 && np >= (+b.adv || 0)) patch.status = 3;
      try { await api.update('bookings', id, patch); toast('Payment recorded'); refresh(); } catch (err) { fail(err); } };
    const be = $('#be', root); if (be) be.onsubmit = async e => { e.preventDefault(); try { await api.update('bookings', id, formData(be)); toast('Booking saved'); refresh(); } catch (err) { fail(err); } };
    const nf = $('#nf', root); if (nf) nf.onsubmit = async e => { e.preventDefault(); const t = nf.text.value.trim(); if (!t) return; try { await api.update('bookings', id, { staffNotes: [...(b.staffNotes || []), { at: new Date().toISOString(), by: ME.name, text: t }] }); refresh(); } catch (err) { fail(err); } };
    const cx = $('#cx', root); if (cx) cx.onclick = async () => { if (cx.dataset.v === '1' && !confirmInline(cx)) return; try { await api.update('bookings', id, { cancelled: cx.dataset.v === '1' }); toast(cx.dataset.v === '1' ? 'Booking cancelled' : 'Booking restored'); refresh(); } catch (e) { fail(e); } };
    const del = $('#del', root); if (del) del.onclick = async () => { if (!confirmInline(del)) return; try { await api.remove('bookings', id); toast('Booking deleted'); closeDrawer(); await load('bookings'); redraw && redraw(); } catch (e) { fail(e); } };
    $('#prt', root).onclick = () => printBooking(b);
    const cpl = $('#cpl', root); if (cpl) cpl.onclick = () => { const u = payLink(b.id); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Payment link copied')).catch(() => toast(u)); };
    $$('[data-pf]', root).forEach(a => a.onclick = e => { e.preventDefault(); proofDrawer(b.id, a.dataset.pf, redraw, '#/bookings/' + b.id); });
  });
}
function printBooking(b) {
  const w = window.open('', '_blank'); if (!w) return toast('Allow pop-ups to print', true);
  const pd = paid(b);
  w.document.write(`<!doctype html><title>${esc(b.id)}</title><style>body{font:14px/1.5 system-ui,sans-serif;max-width:720px;margin:30px auto;color:#0f1d33}h1{font-size:22px}table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right}small{color:#5a6a80}</style>
   <img src="${location.href.replace(/#.*$/, '').replace(/[^/]*$/, '')}logo.png" height="44" alt="TripPartner"><h1>Booking summary — ${esc(b.id)}</h1><p><small>Generated ${new Date().toLocaleString('en-IN')} · not a tax invoice</small></p>
   <table><tr><td>Package</td><td>${esc(pkgTitle(b.pkg, b.pkgTitle))}</td></tr><tr><td>Departure</td><td>${fmtD(b.date)}</td></tr><tr><td>Hotel</td><td>${esc(HOTEL[b.hotel] || b.hotel || '')}</td></tr><tr><td>Lead traveller</td><td>${esc(b.name)} · ${esc(b.phone)}</td></tr><tr><td>Travellers</td><td>${+b.ad || 0} adult(s) ${+b.ch ? ', ' + b.ch + ' child(ren)' : ''}</td></tr><tr><td>Stage</td><td>${b.cancelled ? 'Cancelled' : STAGES[b.status - 1]}</td></tr><tr><td><b>Total</b></td><td><b>${inr(b.total)}</b></td></tr><tr><td>Paid</td><td>${inr(pd)}</td></tr><tr><td><b>Balance</b></td><td><b>${inr(b.total - pd)}</b></td></tr></table>
   <p><small>TripPartner · www.trippartner.com</small></p><script>onload=()=>print()<\/script>`);
  w.document.close();
}

/* =====================================================================
   Payment proofs — verify customer UPI / bank-transfer payments
   ===================================================================== */
F.proofs = { tab: 'Pending', q: '' };
PAGES.proofs = async id => {
  await load('bookings');
  const draw = () => {
    const f = F.proofs, s = f.q.toLowerCase(), all = allProofs().filter(({ b, p }) => !s || [b.id, b.name, p.utr, p.id, p.payer].some(x => String(x || '').toLowerCase().includes(s)));
    const tabs = [['Pending', 'To verify'], ['Approved', 'Approved'], ['Rejected', 'Rejected'], ['all', 'All']].map(([k, l]) => [k, l, k === 'all' ? all : all.filter(x => x.p.status === k)]);
    const rows = (tabs.find(t => t[0] === f.tab) || tabs[0])[2].map(({ b, p }) => ({ ...p, ref: b.id, name: b.name, phone: b.phone, pkg: b.pkg, pkgTitle: b.pkgTitle, bal: (+b.total || 0) - paid(b), key: b.id + '|' + p.id }));
    const pendSum = all.filter(x => x.p.status === 'Pending').reduce((a, x) => a + (+x.p.amount || 0), 0);
    $('#page').innerHTML = `<div class="notice" style="margin-bottom:14px">${ic('shield')} Customers pay by UPI / bank transfer on the website and upload a screenshot + UTR. <b>Check the amount and UTR in the bank statement before approving</b> — approval records the payment, issues a receipt and moves the booking to “Advance paid”.</div>
     <div class="toolbar"><div class="tabs" role="group" aria-label="Proof status">${tabs.map(([k, l, r]) => `<button aria-pressed="${f.tab === k}" data-tab="${k}">${l}<small class="num">${r.length}</small></button>`).join('')}</div><span class="muted num" style="font-size:13px">${inr(pendSum)} waiting for verification</span></div>
     <div class="toolbar"><input type="search" id="q" placeholder="Search booking ref, name, UTR…" value="${esc(f.q)}" aria-label="Search proofs"></div>
     ${table({ id: 'proofs', rows, open: r => r.key, empty: f.tab === 'Pending' ? 'No payment proofs waiting. 🎉' : 'Nothing here.', cols: [
       { k: 'at', label: 'Submitted', sort: true, html: r => `<span class="num">${fmtDT(r.at)}</span><small>${ago(r.at)}</small>` },
       { k: 'ref', label: 'Booking', sort: true, html: r => `<b class="num">${esc(r.ref)}</b><small>${esc(r.name)}</small>` },
       { k: 'pkg', label: 'Package', html: r => `<span class="pkgc">${pkgImg(r.pkg)}<span><b>${esc(pkgTitle(r.pkg, r.pkgTitle))}</b></span></span>` },
       { k: 'amount', label: 'Amount', cls: 'r', sort: true, html: r => `<b class="num">${inr(r.approvedAmount || r.amount)}</b>` },
       { k: 'mode', label: 'Mode / UTR', html: r => `${esc(r.mode)}<small class="num">${esc(r.utr)}</small>` },
       { k: 'status', label: 'Status', sort: true, html: r => proofChip(r.status) }] })}`;
    const pg = $('#page');
    $$('[data-tab]', pg).forEach(b => b.onclick = () => { f.tab = b.dataset.tab; TBL.proofs && (TBL.proofs.page = 0); draw(); });
    $('#q').oninput = e => { f.q = e.target.value; clearTimeout(draw.t); draw.t = setTimeout(() => { draw(); const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
    bindTable(pg, 'proofs', draw, key => { const [ref, pid] = key.split('|'); setHash('#/proofs/' + encodeURIComponent(key)); proofDrawer(ref, pid, draw); });
  };
  PAGES.proofs.redraw = draw; draw();
  if (id) { const [ref, pid] = id.split('|'); if (pid) proofDrawer(ref, pid, draw); }
};
async function proofDrawer(ref, pid, redraw, back) {
  let b; try { b = await api.get('bookings', ref); } catch (e) { return fail(e); }
  const p = (b.proofs || []).find(x => x.id === pid); if (!p) return toast('Proof not found', true);
  const w = can('bookings', 'w'), pd = paid(b), bal = (+b.total || 0) - pd, src = proofImg(b, p);
  const dupe = allProofs().filter(x => x.p.id !== p.id && String(x.p.utr) === String(p.utr) && x.p.status !== 'Rejected');
  const checks = [
    [p.amount <= bal + 1, `Amount ${inr(p.amount)} ${p.amount <= bal + 1 ? 'is within' : 'is MORE than'} the balance ${inr(bal)}`],
    [p.amount >= (+b.adv || 0) - pd || pd >= (+b.adv || 0), p.amount >= (+b.adv || 0) - pd || pd >= (+b.adv || 0) ? 'Covers the advance' : `Part payment — advance still short by ${inr((+b.adv || 0) - pd - p.amount)}`],
    [!dupe.length, dupe.length ? `Same UTR used on ${dupe.map(x => x.b.id).join(', ')}` : 'UTR not used on any other booking'],
    [!b.cancelled, b.cancelled ? 'Booking is cancelled' : 'Booking is active']];
  const done = () => { if (redraw) redraw(); };
  dwClose = () => { setHash(back || '#/proofs'); };
  openDrawer('Payment proof ' + p.id, `
   <div class="pkgc">${pkgImg(b.pkg)}<span><b>${esc(pkgTitle(b.pkg, b.pkgTitle))}</b><small><a href="#/bookings/${esc(b.id)}">${esc(b.id)}</a> · ${esc(b.name)} · ${esc(b.phone)}</small></span><span style="margin-left:auto">${proofChip(p.status)}</span></div>
   <div class="money"><div><small>Trip total</small><b class="num">${inr(b.total)}</b></div><div><small>Verified paid</small><b class="num" style="color:var(--green)">${inr(pd)}</b></div><div><small>Balance</small><b class="num" style="color:${bal > 0 ? 'var(--red)' : 'var(--green)'}">${inr(bal)}</b></div></div>
   <div class="pf-wrap"><div class="pf-img">${src ? (p.type === 'pdf' ? `<a class="btn g" href="${esc(src)}" target="_blank" rel="noopener">${ic('dl')} Open PDF receipt</a>` : `<a href="${esc(src)}" target="_blank" rel="noopener" title="Open full size"><img src="${esc(src)}" alt="Payment screenshot uploaded by the customer"></a>`) : '<p class="muted">Screenshot not available.</p>'}</div>
    <div>${dl([['Amount claimed', `<b class="num">${inr(p.amount)}</b>`], ['Mode', esc(p.mode) + (p.app ? ' · ' + esc(p.app) : '')], ['UTR / reference', `<b class="num">${esc(p.utr)}</b> <button class="btn g sm" type="button" id="cpu">Copy</button>`], ['Paid on', fmtD(p.paidAt)], ['Payer name', esc(p.payer)], ['Customer note', esc(p.note)], ['Submitted', fmtDT(p.at)], ['Decision', p.status !== 'Pending' ? `${esc(p.status)} by ${esc(p.by || '')} · ${fmtDT(p.decidedAt)}` : ''], ['Receipt no.', esc(p.receipt || '')], ['Reason', esc(p.reason || '')]])}
     <ul class="pf-checks">${checks.map(([ok, t]) => `<li class="${ok ? 'ok' : 'bad'}">${ic(ok ? 'check' : 'alert')}${esc(t)}</li>`).join('')}</ul></div></div>
   ${w && p.status === 'Pending' ? `<form id="apf" class="sect"><h4>Approve</h4><p class="muted" style="font-size:13px;margin-top:0">Approve only after you see this UTR and amount in the bank statement.</p><div class="fg">${fld('Amount received (₹)', 'amount', p.amount, 'number', 'min="1" required')}<label class="chk full"><input type="checkbox" name="seen" required> I have matched the UTR and amount in our bank statement</label></div><div class="acts"><button class="btn" type="submit">${ic('check')} Approve &amp; issue receipt</button></div></form>
    <form id="rjf" class="sect"><h4>Reject</h4><div class="fg">${sel('Reason', 'why', REJECT_WHY, REJECT_WHY[0])}${fld('Note to customer (optional)', 'extra', '', 'text', 'maxlength="120"')}</div><div class="acts"><button class="btn d" type="submit">${ic('x')} Reject proof</button></div></form>` : ''}
   <div class="sect"><div class="acts"><a class="btn wa sm" href="${wa(b.phone, p.status === 'Approved' ? `Hi ${b.name.split(' ')[0]}, we have received ${inr(p.approvedAmount || p.amount)} for your TripPartner booking ${b.id}. Receipt ${p.receipt}. View it in My Trips: ${payLink(b.id)}` : p.status === 'Rejected' ? `Hi ${b.name.split(' ')[0]}, we could not verify your payment proof for booking ${b.id} (${p.reason}). Please upload a correct proof here: ${payLink(b.id)}` : `Hi ${b.name.split(' ')[0]}, we have received your payment proof for booking ${b.id}. Our accounts team is verifying it.`)}" target="_blank" rel="noopener">${ic('wa')} Update customer on WhatsApp</a><a class="btn g sm" href="#/bookings/${esc(b.id)}">Open booking</a></div></div>`, root => {
    const cpu = $('#cpu', root); if (cpu) cpu.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(p.utr).then(() => toast('UTR copied')); };
    const apf = $('#apf', root); if (apf) apf.onsubmit = async e => { e.preventDefault(); const d = formData(apf); if (!d.seen) return toast('Confirm you matched the bank statement', true);
      try { const r = await http('POST', `bookings/${encodeURIComponent(b.id)}/proofs/${encodeURIComponent(p.id)}/decision`, { action: 'approve', amount: +d.amount }); toast('Approved — receipt ' + ((r.proofs || []).find(x => x.id === p.id) || {}).receipt); await load('bookings'); done(); counts(); proofDrawer(ref, pid, redraw, back); } catch (err) { fail(err); } };
    const rjf = $('#rjf', root); if (rjf) rjf.onsubmit = async e => { e.preventDefault(); const d = formData(rjf);
      try { await http('POST', `bookings/${encodeURIComponent(b.id)}/proofs/${encodeURIComponent(p.id)}/decision`, { action: 'reject', reason: d.why + (d.extra ? ' — ' + d.extra : '') }); toast('Proof rejected'); await load('bookings'); done(); counts(); proofDrawer(ref, pid, redraw, back); } catch (err) { fail(err); } };
  });
}

/* =====================================================================
   Departures
   ===================================================================== */
PAGES.departures = async id => {
  await load('departures');
  const draw = () => {
    const f = F.deps, t = today(), s = f.q.toLowerCase();
    const base = DATA.departures.filter(d => !s || pkgTitle(d.pkg, d.pkgTitle).toLowerCase().includes(s) || String(d.captain || '').toLowerCase().includes(s));
    const rows = (f.tab === 'upcoming' ? base.filter(d => d.date >= t && d.status !== 'Cancelled') : f.tab === 'past' ? base.filter(d => d.date < t) : f.tab === 'cx' ? base.filter(d => d.status === 'Cancelled') : base).slice().sort((a, b) => f.tab === 'past' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
    const up = base.filter(d => d.date >= t && d.status !== 'Cancelled'), seats = up.reduce((a, d) => a + (+d.seats || 0), 0), bk = up.reduce((a, d) => a + (+d.booked || 0), 0);
    $('#page').innerHTML = `
     <div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div class="kpi"><small>Upcoming departures</small><b class="num">${up.length}</b></div><div class="kpi"><small>Seats on sale</small><b class="num">${seats}</b></div><div class="kpi"><small>Seats booked</small><b class="num">${bk}</b></div><div class="kpi"><small>Average fill</small><b class="num">${seats ? Math.round(bk / seats * 100) : 0}%</b></div></div>
     <div class="toolbar"><div class="tabs">${[['upcoming', 'Upcoming'], ['past', 'Past'], ['cx', 'Cancelled'], ['all', 'All']].map(([k, l]) => `<button aria-pressed="${f.tab === k}" data-tab="${k}">${l}</button>`).join('')}</div><input type="search" id="q" placeholder="Search package or captain" value="${esc(f.q)}" aria-label="Search departures"><span class="sp"></span><button class="btn g" id="csv">${ic('dl')} CSV</button>${can('departures', 'w') ? `<button class="btn" id="add">${ic('plus')} Add departure</button>` : ''}</div>
     ${table({ id: 'deps', rows, open: r => r.id, empty: 'No departures.', cols: [
       { k: 'date', label: 'Date', sort: true, html: r => `<b class="num">${fmtD(r.date)}</b><small>${r.date >= t ? `in ${daysTo(r.date)} days` : 'departed'}</small>` },
       { k: 'pkg', label: 'Package', sort: r => pkgTitle(r.pkg, r.pkgTitle), html: r => `<span class="pkgc">${pkgImg(r.pkg)}<span><b>${esc(pkgTitle(r.pkg, r.pkgTitle))}</b><small>${esc((PK(r.pkg) || {}).destName || '')}</small></span></span>` },
       { k: 'fill', label: 'Seats', sort: r => r.seats ? r.booked / r.seats : 0, html: r => { const f2 = r.seats ? r.booked / r.seats : 0; return `<div style="display:flex;gap:8px;align-items:center"><span class="meter ${f2 >= .75 ? 'hi' : ''}" style="width:90px"><i style="width:${Math.round(f2 * 100)}%"></i></span><span class="num">${r.booked}/${r.seats}</span></div>`; } },
       { k: 'status', label: 'Status', sort: true, html: r => chip(r.status) },
       { k: 'captain', label: 'Trip captain', sort: true, html: r => esc(r.captain) || '<span class="muted">Not assigned</span>' }] })}
     <p class="muted" style="font-size:12.5px">Departures are shown on the website’s “Upcoming departures” table when the website is connected to this backend (see README → Connect the website).</p>`;
    const pg = $('#page');
    $$('[data-tab]', pg).forEach(b => b.onclick = () => { f.tab = b.dataset.tab; draw(); });
    $('#q').oninput = e => { f.q = e.target.value; clearTimeout(draw.t); draw.t = setTimeout(() => { draw(); const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
    $('#csv').onclick = () => csvDownload('departures', DATA.departures);
    const add = $('#add'); if (add) add.onclick = () => depDrawer(null, draw);
    bindTable(pg, 'deps', draw, did => { setHash('#/departures/' + did); depDrawer(did, draw); });
  };
  draw(); if (id) depDrawer(id, draw);
};
function depDrawer(id, redraw) {
  const d = id ? DATA.departures.find(x => x.id === id) : { pkg: '', date: addDays(today(), 30), seats: 20, booked: 0, status: 'Open', captain: '', note: '' };
  if (!d) return fail(new Error('Departure not found'));
  const w = can('departures', 'w'), dis = w ? '' : 'disabled';
  dwClose = () => setHash('#/departures');
  openDrawer(id ? 'Edit departure' : 'Add departure', `<form id="df" class="fg">
    <label class="fld full"><span>Package *</span><select name="pkg" required ${dis}><option value="">Choose a package</option>${CAT.packages.map(p => `<option value="${esc(p.id)}" ${p.id === d.pkg ? 'selected' : ''}>${esc(p.title)} · ${p.n}N</option>`).join('')}</select></label>
    ${fld('Departure date *', 'date', d.date, 'date', 'required ' + dis)}${sel('Status', 'status', DEP_ST, d.status, dis)}${fld('Total seats', 'seats', d.seats, 'number', 'min="1" ' + dis)}${fld('Seats booked', 'booked', d.booked, 'number', 'min="0" ' + dis)}
    ${fld('Trip captain', 'captain', d.captain, 'text', dis)}${fld('Meeting point / note', 'note', d.note, 'text', dis)}
    ${w ? `<div class="full acts"><button class="btn" type="submit">${id ? 'Save' : 'Add departure'}</button>${id && can('departures', 'd') ? '<button class="btn d" type="button" id="del">Delete</button>' : ''}</div>` : ''}</form>`, root => {
    const f = $('#df', root);
    f.onsubmit = async e => { e.preventDefault(); const x = formData(f); if (!x.pkg || !x.date) return toast('Package and date are required', true); if (+x.booked > +x.seats) return toast('Booked seats cannot exceed total seats', true);
      x.pkgTitle = pkgTitle(x.pkg); if (x.status !== 'Cancelled') x.status = +x.booked >= +x.seats ? 'Sold out' : x.status === 'Sold out' ? 'Open' : x.status;
      try { id ? await api.update('departures', id, x) : await api.create('departures', x); toast(id ? 'Departure saved' : 'Departure added'); closeDrawer(); await load('departures'); redraw(); } catch (err) { fail(err); } };
    const del = $('#del', root); if (del) del.onclick = async () => { if (!confirmInline(del)) return; try { await api.remove('departures', id); toast('Departure deleted'); closeDrawer(); await load('departures'); redraw(); } catch (err) { fail(err); } };
  });
}

/* =====================================================================
   Packages (website catalogue overrides)
   ===================================================================== */
PAGES.packages = async id => {
  await load('packages');
  const ov = id2 => DATA.packages.find(o => o.id === id2);
  const kind = p => p.fx ? 'festive' : p.wk ? 'weekend' : p.type;
  const draw = () => {
    const f = F.pkgs, s = f.q.toLowerCase();
    const base = CAT.packages.filter(p => !s || [p.title, p.destName, p.id, p.route].some(x => String(x || '').toLowerCase().includes(s)));
    const tabs = [['all', 'All'], ['india', 'India'], ['intl', 'International'], ['weekend', 'Weekend'], ['festive', 'Christmas & NY'], ['edited', 'Edited'], ['hidden', 'Hidden']];
    const flt = { all: () => true, edited: p => !!ov(p.id), hidden: p => ov(p.id) && ov(p.id).active === false };
    const rows = base.filter(flt[f.tab] || (p => kind(p) === f.tab));
    $('#page').innerHTML = `
     <div class="notice">These are the ${CAT.packages.length} packages from the website catalogue. Changing a price, tag or visibility here updates the live website once it is connected to this backend.${can('content', 'r') ? ` Full package editing (itinerary, images, themes) is in <a href="#/content/packages">Website content → Packages</a>.` : ''}</div>
     <div class="toolbar"><div class="tabs">${tabs.map(([k, l]) => `<button aria-pressed="${f.tab === k}" data-tab="${k}">${l}<small class="num">${base.filter(flt[k] || (p => kind(p) === k)).length}</small></button>`).join('')}</div></div>
     <div class="toolbar"><input type="search" id="q" placeholder="Search package or destination" value="${esc(f.q)}" aria-label="Search packages"><span class="sp"></span><button class="btn g" id="csv">${ic('dl')} CSV</button></div>
     ${table({ id: 'pkgs', rows, open: r => r.id, pageSize: 30, cols: [
       { k: 'title', label: 'Package', sort: true, html: r => `<span class="pkgc">${pkgImg(r.id)}<span><b>${esc(r.title)}</b><small>${esc(r.destName || '')} · ${r.n}N/${r.n + 1}D</small></span></span>` },
       { k: 'kind', label: 'Type', sort: kind, html: r => `<span class="pill">${{ india: 'India', intl: 'International', weekend: 'Weekend', festive: 'Festive' }[kind(r)] || ''}</span>` },
       { k: 'price', label: 'Site price', cls: 'r', sort: true, html: r => `<span class="num ${ov(r.id) && ov(r.id).price ? 'muted' : ''}" style="${ov(r.id) && ov(r.id).price ? 'text-decoration:line-through' : ''}">${inr(r.price)}</span>` },
       { k: 'live', label: 'Live price', cls: 'r', sort: r => (ov(r.id) || {}).price || r.price, html: r => `<b class="num">${inr((ov(r.id) || {}).price || r.price)}</b>` },
       { k: 'tag', label: 'Tag', html: r => esc((ov(r.id) || {}).tag || r.tag) || '<span class="muted">—</span>' },
       { k: 'vis', label: 'On website', sort: r => (ov(r.id) || {}).active !== false, html: r => (ov(r.id) || {}).active === false ? chip('Hidden') : chip('Active') },
       { k: 'upd', label: 'Edited', sort: r => (ov(r.id) || {}).updated || '', html: r => ov(r.id) ? `<small>${ago(ov(r.id).updated)}</small>` : '<span class="muted">—</span>' }] })}`;
    const pg = $('#page');
    $$('[data-tab]', pg).forEach(b => b.onclick = () => { f.tab = b.dataset.tab; TBL.pkgs && (TBL.pkgs.page = 0); draw(); });
    $('#q').oninput = e => { f.q = e.target.value; clearTimeout(draw.t); draw.t = setTimeout(() => { draw(); const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
    $('#csv').onclick = () => csvDownload('packages', CAT.packages.map(p => ({ id: p.id, title: p.title, destination: p.destName, nights: p.n, site_price: p.price, live_price: (ov(p.id) || {}).price || p.price, tag: (ov(p.id) || {}).tag || p.tag, active: (ov(p.id) || {}).active !== false })));
    bindTable(pg, 'pkgs', draw, pid => { setHash('#/packages/' + pid); pkgDrawer(pid, draw); });
  };
  const pkgDrawer = (pid, redraw) => {
    const p = PK(pid); if (!p) return; const o = ov(pid) || {}, w = can('packages', 'w'), dis = w ? '' : 'disabled';
    dwClose = () => setHash('#/packages');
    openDrawer(p.title, `<div class="pkgc">${pkgImg(p.id)}<span><b>${esc(p.title)}</b><small>${esc(p.route || '')}</small></span></div>
     ${dl([['Package ID', `<span class="num">${esc(p.id)}</span>`], ['Destination', esc(p.destName)], ['Duration', `${p.n}N/${p.n + 1}D`], ['Site price', inr(p.price) + ' per person'], ['Themes', esc((p.themes || []).join(', '))], p.fx ? ['Festive dates', `${fmtD(p.fx.dep)} → ${fmtD(p.fx.ret)}`] : ['', '']])}
     ${can('content', 'r') && MODE === 'live' ? `<div class="acts"><a class="btn g sm" href="#/content/packages/${encodeURIComponent(p.id)}">${ic('layout')} Edit itinerary, images &amp; themes</a></div>` : ''}
     <form id="pf" class="sect"><h4>Website overrides</h4><div class="fg">${fld('Live price per person (₹)', 'price', o.price || '', 'number', `min="0" placeholder="${p.price}" ${dis}`)}${fld('Tag / badge', 'tag', o.tag || '', 'text', `placeholder="${esc(p.tag || 'e.g. Bestseller')}" ${dis}`)}
      ${p.fx ? fld('Early-bird discount %', 'eb', o.eb != null ? o.eb : p.fx.eb, 'number', 'min="0" max="50" ' + dis) + fld('Seats left (shown on site)', 'seats', o.seats != null ? o.seats : p.fx.seats, 'number', 'min="0" ' + dis) : ''}
      <div class="full">${chk('Show this package on the website', 'active', o.active !== false)}</div>${fld('Internal note', 'note', o.note || '', 'textarea', dis)}</div>
      ${w ? `<div class="acts"><button class="btn" type="submit">Save overrides</button>${o.id ? '<button class="btn g" type="button" id="rst">Reset to site defaults</button>' : ''}</div>` : ''}</form>`, root => {
      const f = $('#pf', root); if (!w) $$('input', f).forEach(i => i.disabled = true);
      f.onsubmit = async e => { e.preventDefault(); const x = formData(f); const body = { title: p.title, price: +x.price || 0, tag: x.tag, active: x.active, note: x.note }; if (p.fx) { body.eb = x.eb === '' ? p.fx.eb : +x.eb; body.seats = x.seats === '' ? p.fx.seats : +x.seats; }
        try { o.id ? await api.update('packages', pid, body) : await api.create('packages', { ...body, id: pid }); toast('Package saved'); closeDrawer(); await load('packages'); redraw(); } catch (err) { fail(err); } };
      const r = $('#rst', root); if (r) r.onclick = async () => { if (!confirmInline(r)) return; try { await api.remove('packages', pid); toast('Reset to website defaults'); closeDrawer(); await load('packages'); redraw(); } catch (err) { fail(err); } };
    });
  };
  draw(); if (id) pkgDrawer(id, draw);
};

/* =====================================================================
   Travel Partner moderation
   ===================================================================== */
PAGES.partners = async () => {
  await load('partners', 'partner_requests', 'proposals');
  const draw = () => {
    const f = F.partners, w = can('partners', 'w');
    const tabs = [['profiles', 'Profiles', DATA.partners.length], ['requests', 'Partner requests', DATA.partner_requests.length], ['proposals', 'Joint booking proposals', DATA.proposals.length]];
    let body = '';
    if (f.tab === 'profiles') body = table({ id: 'prof', rows: DATA.partners, open: r => r.id, empty: 'No profiles yet.', cols: [
      { k: 'name', label: 'Traveller', sort: true, html: r => `<b>${esc(r.name)}</b><small>${esc(r.g === 'F' ? 'Female' : r.g === 'M' ? 'Male' : r.g || '')}${r.age ? ', ' + r.age : ''} · ${esc(r.city)}</small>` },
      { k: 'dest', label: 'Wants to go', sort: true, html: r => `${esc(DN(r.dest))}<small>${esc(r.month)} · ${esc(r.bud || '')}</small>` },
      { k: 'pref', label: 'Preferences', html: r => [r.seat && 'Seat together', r.share ? 'Open to sharing room' : 'Separate room', r.women && 'Women-only'].filter(Boolean).map(x => `<span class="pill">${x}</span>`).join(' ') },
      { k: 'status', label: 'Status', sort: true, html: r => chip(r.status) },
      { k: 'created', label: 'Joined', sort: true, html: r => ago(r.created) }] });
    if (f.tab === 'requests') body = table({ id: 'reqs', rows: DATA.partner_requests, open: r => 'rq:' + r.id, empty: 'No requests yet.', cols: [
      { k: 'from', label: 'From → To', html: r => `<b>${esc(r.from || 'Website user')}</b> → ${esc(r.to)}` }, { k: 'trip', label: 'Trip', sort: true, html: r => `${esc(r.trip)}<small>${esc(r.month)}</small>` },
      { k: 'room', label: 'Room', html: r => r.room === 'shared' ? '<span class="pill">Shared if both agree</span>' : '<span class="pill">Separate rooms</span>' }, { k: 'status', label: 'Status', sort: true, html: r => chip(r.status) }, { k: 'created', label: 'Sent', sort: true, html: r => ago(r.created) }] });
    if (f.tab === 'proposals') body = table({ id: 'props', rows: DATA.proposals, open: r => 'jp:' + r.id, empty: 'No proposals yet.', cols: [
      { k: 'pkg', label: 'Package', html: r => `<span class="pkgc">${pkgImg(r.pkg)}<span><b>${esc(pkgTitle(r.pkg))}</b><small>with ${esc(r.partner)} · ${esc(r.month)}</small></span></span>` },
      { k: 'pay', label: 'Payment', html: r => `<span class="pill">${{ split: 'Split 50/50', me: 'Proposer pays both', them: 'Partner pays both', each: 'Each pays own' }[r.pay] || esc(r.pay)}</span>` },
      { k: 'total', label: 'Total', cls: 'r', sort: true, html: r => `<b class="num">${inr(r.total)}</b>` }, { k: 'status', label: 'Status', sort: true, html: r => chip(r.status) }, { k: 'created', label: 'Created', sort: true, html: r => ago(r.created) }] });
    $('#page').innerHTML = `<div class="notice">${ic('shield')} Verify identity before marking a profile <b>Verified</b>. Room sharing is only arranged when <b>both</b> travellers have agreed in writing; otherwise book separate rooms.</div>
     <div class="toolbar"><div class="tabs">${tabs.map(([k, l, n]) => `<button aria-pressed="${f.tab === k}" data-tab="${k}">${l}<small class="num">${n}</small></button>`).join('')}</div><span class="sp"></span><button class="btn g" id="csv">${ic('dl')} CSV</button></div>${body}`;
    const pg = $('#page');
    $$('[data-tab]', pg).forEach(b => b.onclick = () => { f.tab = b.dataset.tab; draw(); });
    $('#csv').onclick = () => csvDownload({ profiles: 'partners', requests: 'partner_requests', proposals: 'proposals' }[f.tab], DATA[{ profiles: 'partners', requests: 'partner_requests', proposals: 'proposals' }[f.tab]]);
    const open = key => {
      const [kind, rid] = key.includes(':') ? key.split(':') : ['pf', key];
      const col = { pf: 'partners', rq: 'partner_requests', jp: 'proposals' }[kind], r = DATA[col].find(x => x.id === rid), STS = { pf: PARTNER_ST, rq: REQ_ST, jp: PROP_ST }[kind];
      const details = kind === 'pf' ? dl([['Name', esc(r.name)], ['Gender / age', `${esc(r.g)} · ${esc(r.age)}`], ['City', esc(r.city)], ['Mobile', `<span class="num">${esc(r.phone)}</span>`], ['Email', esc(r.email)], ['Destination', esc(DN(r.dest))], ['Month', esc(r.month)], ['Budget', esc(r.bud)], ['Looking for', esc(r.look)], ['About', esc(r.about)], ['Seat together', r.seat ? 'Yes' : 'No'], ['Room sharing', r.share ? 'Open to it (needs both to agree)' : 'Separate room'], ['Women-only', r.women ? 'Yes' : 'No'], ['Pace / food', esc([r.pace, r.diet, r.smoke ? 'Smoker' : (r.pace ? 'Non-smoker' : '')].filter(Boolean).join(' · '))], ['Travel style', esc((r.styles || []).join(', '))], ['Photo visible to', esc({ members: 'All verified members', accepted: 'Only after accepting a request', women: 'Only verified women' }[r.phvis] || '')], ['ID', r.idType ? `${esc({ aadhaar: 'Aadhaar (masked)', pan: 'PAN', passport: 'Passport', dl: 'Driving licence', voter: 'Voter ID' }[r.idType] || r.idType)} ••••${esc(r.idLast4 || '')}` : '']]) + docsBlock(r)
        : kind === 'rq' ? dl([['From', esc(r.from || 'Website user')], ['To', esc(r.to)], ['Trip', esc(r.trip)], ['Month', esc(r.month)], ['Message', esc(r.msg)], ['Seats together', r.seat ? 'Yes' : 'No'], ['Room', r.room === 'shared' ? 'Shared — only if both agree' : 'Separate']])
          : dl([['Package', esc(pkgTitle(r.pkg))], ['Partner', esc(r.partner)], ['Month', esc(r.month)], ['Hotel', esc(HOTEL[r.hotel] || r.hotel)], ['Seats together', r.seat ? 'Yes' : 'No'], ['Room', r.room === 'shared' ? 'Shared — only if both agree' : 'Separate'], ['Total', inr(r.total)], ['Proposer pays', inr(r.you)], ['Partner pays', inr(r.them)]]);
      openDrawer({ pf: 'Partner profile', rq: 'Partner request', jp: 'Joint booking proposal' }[kind], `${chip(r.status)}${details}
        ${w ? `<div class="sect"><h4>Update status</h4><div class="acts">${STS.map(s => `<button class="btn ${s === r.status ? '' : 'g'} sm" data-st="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>` : ''}
        ${kind === 'pf' && r.phone ? `<div class="acts"><a class="btn wa sm" href="${wa(r.phone, `Hi ${r.name.split(' ')[0]}, this is TripPartner verifying your Travel Partner profile.`)}" target="_blank" rel="noopener">${ic('wa')} Verify on WhatsApp</a></div>` : ''}
        ${kind === 'jp' && w && r.status === 'Both agreed' ? `<div class="acts"><button class="btn o sm" id="mk">${ic('bag')} Create booking</button></div>` : ''}
        ${ME.role === 'admin' ? '<div class="sect"><div class="acts"><button class="btn d sm" id="del">Delete</button></div></div>' : ''}`, root => {
        $$('[data-st]', root).forEach(b => b.onclick = async () => { try { await api.update(col, rid, { status: b.dataset.st }); toast('Status updated'); closeDrawer(); await load(col); draw(); } catch (e) { fail(e); } });
        const mk = $('#mk', root); if (mk) mk.onclick = async () => { try { await api.update(col, rid, { status: 'Converted to booking' }); } catch (e) { /* ignore */ } bookingForm({ pkg: r.pkg, ad: 2, total: r.total }); };
        const del = $('#del', root); if (del) del.onclick = async () => { if (!confirmInline(del)) return; try { await api.remove(col, rid); toast('Deleted'); closeDrawer(); await load(col); draw(); } catch (e) { fail(e); } };
      });
    };
    ['prof', 'reqs', 'props'].forEach(t => bindTable(pg, t, draw, open));
  };
  draw();
};

function docsBlock(r) {
  const L = { photo: 'Profile photo', idFront: 'ID — front', idBack: 'ID — back', selfie: 'Selfie' };
  const docs = r.docs || [], canSee = ['admin', 'ops'].includes(ME.role);
  if (MODE === 'demo') return `<div class="sect"><h4>Photo &amp; identity documents</h4><p class="muted" style="font-size:13px">${r.demo ? 'Sample profile — no documents in demo mode.' : 'Documents appear here when the website is connected to the backend.'} Uploaded ID images are visible to Admin and Operations only, and are deleted automatically when you mark the profile Verified or Rejected.</p></div>`;
  return `<div class="sect"><h4>Photo &amp; identity documents</h4>${docs.length ? (canSee ? `<div class="docs">${docs.map(d => `<a href="${API_BASE}partner-docs/${encodeURIComponent(r.id)}/${encodeURIComponent(d.file)}" target="_blank" rel="noopener"><img src="${API_BASE}partner-docs/${encodeURIComponent(r.id)}/${encodeURIComponent(d.file)}" alt="${esc(L[d.key] || d.key)}" loading="lazy"><span>${esc(L[d.key] || d.key)}</span></a>`).join('')}</div>` : '<p class="muted">Only Admin and Operations can view identity documents.</p>') : `<p class="muted" style="font-size:13px">${r.docsDeleted ? 'ID documents were deleted on ' + fmtDT(r.docsDeleted) + ' after the decision.' : 'No documents uploaded yet.'}</p>`}
   <p class="muted" style="font-size:12px">Check: name and photo on ID match the selfie, age 18+, ID not expired, Aadhaar is masked. ID images are deleted automatically when you choose Verified or Rejected; every view is logged.</p></div>`;
}

/* =====================================================================
   Coupons
   ===================================================================== */
PAGES.coupons = async () => {
  await load('coupons');
  const draw = () => {
    $('#page').innerHTML = `<div class="toolbar"><p class="muted" style="margin:0">Coupons are checked by the website’s booking form. Inactive or expired codes are rejected.</p><span class="sp"></span>${can('coupons', 'w') ? `<button class="btn" id="add">${ic('plus')} New coupon</button>` : ''}</div>
     ${table({ id: 'cps', rows: DATA.coupons, open: r => r.id, empty: 'No coupons.', cols: [
       { k: 'code', label: 'Code', sort: true, html: r => `<b class="num">${esc(r.code)}</b>` }, { k: 'pct', label: 'Discount', cls: 'r', sort: true, html: r => `<b class="num">${+r.pct || 0}%</b>` },
       { k: 'desc', label: 'Description', html: r => esc(r.desc) }, { k: 'rule', label: 'Rules', html: r => [r.maxDays ? `Departures within ${r.maxDays} days` : '', r.validTill ? `Valid till ${fmtD(r.validTill)}` : ''].filter(Boolean).join(' · ') || '<span class="muted">None</span>' },
       { k: 'active', label: 'Status', sort: r => !!r.active, html: r => r.validTill && r.validTill < today() ? chip('Expired') : chip(r.active ? 'Active' : 'Inactive') }] })}`;
    const add = $('#add'); if (add) add.onclick = () => cpDrawer(null);
    bindTable($('#page'), 'cps', draw, cpDrawer);
  };
  const cpDrawer = id => {
    const c = id ? DATA.coupons.find(x => x.id === id) : { code: '', pct: 5, desc: '', maxDays: 0, validTill: '', active: true }, w = can('coupons', 'w'), dis = w ? '' : 'disabled';
    openDrawer(id ? 'Coupon ' + c.code : 'New coupon', `<form id="cf" class="fg">${fld('Code *', 'code', c.code, 'text', `required style="text-transform:uppercase" ${id ? 'readonly' : ''} ${dis}`)}${fld('Discount %', 'pct', c.pct, 'number', 'min="1" max="50" required ' + dis)}${fld('Description (shown to customer)', 'desc', c.desc, 'text', dis)}${fld('Only for departures within (days)', 'maxDays', c.maxDays || '', 'number', 'min="0" placeholder="No limit" ' + dis)}${fld('Valid till', 'validTill', c.validTill, 'date', dis)}<div class="full">${chk('Active', 'active', c.active)}</div>
      ${w ? `<div class="full acts"><button class="btn" type="submit">Save</button>${id && ME.role === 'admin' ? '<button type="button" class="btn d" id="del">Delete</button>' : ''}</div>` : ''}</form>`, root => {
      const f = $('#cf', root); if (!w) $$('input', f).forEach(i => i.disabled = true);
      f.onsubmit = async e => { e.preventDefault(); const x = formData(f); x.code = x.code.toUpperCase(); x.pct = +x.pct; x.maxDays = +x.maxDays || 0; if (!/^[A-Z0-9]{3,20}$/.test(x.code)) return toast('Code: 3–20 letters/numbers', true);
        if (!id && DATA.coupons.some(o => o.code === x.code)) return toast('This code already exists', true);
        try { id ? await api.update('coupons', id, x) : await api.create('coupons', x); toast('Coupon saved'); closeDrawer(); await load('coupons'); draw(); } catch (err) { fail(err); } };
      const del = $('#del', root); if (del) del.onclick = async () => { if (!confirmInline(del)) return; try { await api.remove('coupons', id); toast('Coupon deleted'); closeDrawer(); await load('coupons'); draw(); } catch (err) { fail(err); } };
    });
  };
  draw();
};

/* =====================================================================
   Reviews
   ===================================================================== */
PAGES.reviews = async () => {
  await load('reviews');
  const draw = () => {
    $('#page').innerHTML = `<div class="notice">${ic('alert')} Publish only genuine reviews from real customers, with their permission. Published reviews are sent to the website when it is connected to this backend.</div>
     <div class="toolbar"><span class="sp"></span>${can('reviews', 'w') ? `<button class="btn" id="add">${ic('plus')} Add review</button>` : ''}</div>
     ${table({ id: 'revs', rows: DATA.reviews, open: r => r.id, empty: 'No reviews yet.', cols: [
       { k: 'name', label: 'Customer', sort: true, html: r => `<b>${esc(r.name)}</b><small>${esc(r.city)}</small>` }, { k: 'trip', label: 'Trip', sort: true, html: r => esc(r.trip || pkgTitle(r.pkg)) },
       { k: 'rating', label: 'Rating', sort: true, html: r => `<span class="stars" aria-label="${r.rating} out of 5">${'★'.repeat(+r.rating || 0)}${'☆'.repeat(5 - (+r.rating || 0))}</span>` },
       { k: 'text', label: 'Review', html: r => `<span style="display:block;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.text)}</span>` }, { k: 'status', label: 'Status', sort: true, html: r => chip(r.status) }] })}`;
    const add = $('#add'); if (add) add.onclick = () => rvDrawer(null);
    bindTable($('#page'), 'revs', draw, rvDrawer);
  };
  const rvDrawer = id => {
    const r = id ? DATA.reviews.find(x => x.id === id) : { name: '', city: '', pkg: '', rating: 5, text: '', status: 'Pending', bookingRef: '' }, w = can('reviews', 'w'), dis = w ? '' : 'disabled';
    openDrawer(id ? 'Review' : 'Add a customer review', `<form id="rf" class="fg">${fld('Customer name *', 'name', r.name, 'text', 'required ' + dis)}${fld('City', 'city', r.city, 'text', dis)}
      <label class="fld full"><span>Trip</span><select name="pkg" ${dis}><option value="">—</option>${CAT.packages.map(p => `<option value="${esc(p.id)}" ${p.id === r.pkg ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select></label>
      ${sel('Rating', 'rating', [5, 4, 3, 2, 1].map(n => [n, '★'.repeat(n)]), r.rating, dis)}${fld('Booking ref (for verification)', 'bookingRef', r.bookingRef || '', 'text', dis)}${fld('Review text *', 'text', r.text, 'textarea', 'required ' + dis)}${sel('Status', 'status', REV_ST, r.status, dis)}
      ${w ? `<div class="full acts"><button class="btn" type="submit">Save</button>${id && ME.role === 'admin' ? '<button type="button" class="btn d" id="del">Delete</button>' : ''}</div>` : ''}</form>`, root => {
      const f = $('#rf', root);
      f.onsubmit = async e => { e.preventDefault(); const x = formData(f); if (!x.name || !x.text) return toast('Name and review text are required', true); x.rating = +x.rating; x.trip = x.pkg ? pkgTitle(x.pkg) : '';
        try { id ? await api.update('reviews', id, x) : await api.create('reviews', x); toast('Review saved'); closeDrawer(); await load('reviews'); draw(); } catch (err) { fail(err); } };
      const del = $('#del', root); if (del) del.onclick = async () => { if (!confirmInline(del)) return; try { await api.remove('reviews', id); toast('Review deleted'); closeDrawer(); await load('reviews'); draw(); } catch (err) { fail(err); } };
    });
  };
  draw();
};

/* =====================================================================
   Staff
   ===================================================================== */
PAGES.staff = async () => {
  await load('staff');
  const ROLE = { admin: 'Admin — everything, incl. staff & settings', sales: 'Sales — leads & bookings', ops: 'Operations — bookings, departures, packages, partners, coupons, reviews' };
  const draw = () => {
    $('#page').innerHTML = `<div class="g2e">${Object.entries(ROLE).map(([k, v]) => `<div class="card" style="padding:12px 16px"><b style="text-transform:capitalize">${k}</b><p class="muted" style="margin:2px 0 0;font-size:13px">${v.split('— ')[1]}</p></div>`).join('')}</div>
     <div class="toolbar"><span class="sp"></span>${can('staff', 'w') ? `<button class="btn" id="add">${ic('plus')} Add staff</button>` : ''}</div>
     ${table({ id: 'staff', rows: DATA.staff, open: r => r.id, cols: [
       { k: 'name', label: 'Name', sort: true, html: r => `<div style="display:flex;gap:10px;align-items:center"><span class="av">${esc(initials(r.name))}</span><span><b>${esc(r.name)}</b>${r.id === ME.id ? ' <span class="pill">You</span>' : ''}<small>${esc(r.email)}</small></span></div>` },
       { k: 'role', label: 'Role', sort: true, html: r => `<span class="pill" style="text-transform:capitalize">${esc(r.role)}</span>` }, { k: 'phone', label: 'Phone', html: r => esc(r.phone) || '<span class="muted">—</span>' },
       { k: 'active', label: 'Status', sort: r => !!r.active, html: r => chip(r.active ? 'Active' : 'Inactive') }, { k: 'created', label: 'Added', sort: true, html: r => fmtD(r.created) }] })}`;
    const add = $('#add'); if (add) add.onclick = () => sDrawer(null);
    bindTable($('#page'), 'staff', draw, sDrawer);
  };
  const sDrawer = id => {
    const s = id ? DATA.staff.find(x => x.id === id) : { name: '', email: '', role: 'sales', phone: '', active: true };
    openDrawer(id ? s.name : 'Add staff member', `<form id="sf" class="fg">${fld('Full name *', 'name', s.name, 'text', 'required')}${fld('Email (login) *', 'email', s.email, 'email', `required ${id ? 'readonly' : ''}`)}${sel('Role', 'role', Object.entries(ROLE).map(([k, v]) => [k, v.split(' —')[0]]), s.role)}${fld('Phone', 'phone', s.phone)}
      ${fld(id ? 'Reset password (leave blank to keep)' : 'Temporary password * (8+ characters)', 'password', '', 'password', `autocomplete="new-password" ${id ? '' : 'required minlength="8"'}`)}${id ? `<div class="full">${chk('Account active (can log in)', 'active', s.active)}</div>` : ''}
      <div class="full acts"><button class="btn" type="submit">Save</button>${id && id !== ME.id ? '<button type="button" class="btn d" id="del">Delete</button>' : ''}</div></form>`, root => {
      const f = $('#sf', root);
      f.onsubmit = async e => { e.preventDefault(); const x = formData(f); if (!x.password) delete x.password; if (id) delete x.email;
        try { id ? await api.update('staff', id, x) : await api.create('staff', x); toast('Staff saved'); closeDrawer(); await load('staff'); draw(); } catch (err) { fail(err); } };
      const del = $('#del', root); if (del) del.onclick = async () => { if (!confirmInline(del)) return; try { await api.remove('staff', id); toast('Staff removed'); closeDrawer(); await load('staff'); draw(); } catch (err) { fail(err); } };
    });
  };
  draw();
};

/* =====================================================================
   Settings
   ===================================================================== */
PAGES.settings = async () => {
  let s = {}; try { s = await api.get('settings', 'site'); } catch (e) { s = { ...CAT.config }; }
  const w = can('settings', 'w'), dis = w ? '' : 'disabled';
  const siteURL = MODE === 'live' ? new URL('../api/', location.href).href.replace(/\/api\/$/, '') : 'https://your-backend.example.com';
  $('#page').innerHTML = `<div class="g2">
   <form class="card" id="sf"><h3>${ic('globe')} Website contact &amp; banner</h3><div class="fg">
    ${fld('Sales phone (shown on site)', 'phone', s.phone, 'text', dis)}${fld('WhatsApp number (digits, with 91)', 'whatsapp', s.whatsapp, 'text', 'inputmode="numeric" ' + dis)}${fld('Email', 'email', s.email, 'email', dis)}${fld('Support email', 'support', s.support, 'email', dis)}
    ${fld('Office address', 'address', s.address, 'text', 'class="full" ' + dis)}${fld('Working hours', 'hours', s.hours, 'text', dis)}
    ${fld('Announcement bar (leave blank to hide)', 'announcement', s.announcement || '', 'textarea', 'maxlength="160" placeholder="e.g. Christmas & New Year early-bird prices end 31 Oct" ' + dis)}</div>
    ${w ? '<div class="acts" style="margin-top:12px"><button class="btn" type="submit">Save settings</button></div>' : '<p class="muted">Only an admin can change site settings.</p>'}
    <h3 style="margin-top:20px">${ic('rupee')} Payment details (shown on the website’s Pay page)</h3><div class="fg">
    ${fld('UPI ID (VPA)', 'payUpi', s.payUpi || '', 'text', 'placeholder="e.g. trippartner@icici" ' + dis)}${fld('Name shown in UPI apps', 'payPayee', s.payPayee || '', 'text', 'placeholder="TripPartner" ' + dis)}
    ${fld('Bank account name', 'bankAcName', s.bankAcName || '', 'text', dis)}${fld('Account number', 'bankAcNo', s.bankAcNo || '', 'text', 'inputmode="numeric" ' + dis)}${fld('IFSC', 'bankIfsc', s.bankIfsc || '', 'text', 'style="text-transform:uppercase" ' + dis)}${fld('Bank name', 'bankName', s.bankName || '', 'text', dis)}${fld('Branch', 'bankBranch', s.bankBranch || '', 'text', dis)}${fld('Verification time promise', 'payTat', s.payTat || '', 'text', 'placeholder="2–4 working hours" ' + dis)}</div>
    ${!s.payUpi ? `<p class="notice" style="margin-top:12px;background:var(--amber-soft)">${ic('alert')} No UPI ID set — the website shows <b>sample</b> payment details. Add your business UPI ID and current account before taking payments.</p>` : ''}
    ${w ? '<div class="acts" style="margin-top:12px"><button class="btn" type="submit">Save settings</button></div>' : ''}
    ${String(s.phone || '').includes('00000') ? `<p class="notice" style="margin-top:12px;background:var(--amber-soft)">${ic('alert')} The phone and WhatsApp numbers are still placeholders. Add your real numbers before going live.</p>` : ''}</form>
   <div style="display:grid;gap:18px;align-content:start">
    <form class="card" id="pw"><h3>${ic('shield')} My password</h3><div class="fg">${fld('Current password', 'current', '', 'password', 'autocomplete="current-password" required')}${fld('New password (8+ characters)', 'next', '', 'password', 'autocomplete="new-password" required minlength="8"')}</div><div class="acts" style="margin-top:12px"><button class="btn g" type="submit">Change password</button></div></form>
    <div class="card"><h3>${ic('gear')} Connect the website</h3><p class="muted" style="font-size:13px;margin-top:0">In the website’s <code>src/data.js</code>, set the backend address and rebuild. Enquiries, bookings, partner profiles and coupons will then flow into this dashboard, and prices, departures and the announcement here will show on the site.</p>
     <pre style="background:var(--surface-2);padding:10px;border-radius:10px;overflow:auto;font-size:12.5px">CONFIG.api = '${esc(siteURL)}/api/public';</pre>
     <p class="muted" style="font-size:12.5px;margin:0">Status: ${MODE === 'live' ? '<span class="st ok">' + ic('check') + 'Backend connected</span>' : '<span class="st warn">' + ic('clock') + 'Demo mode — no backend</span>'}</p></div>
   </div></div>`;
  const sf = $('#sf'); if (w) sf.onsubmit = async e => { e.preventDefault(); const x = formData(sf); x.whatsapp = x.whatsapp.replace(/\D/g, ''); if (x.bankIfsc) x.bankIfsc = x.bankIfsc.toUpperCase(); if (x.payUpi && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(x.payUpi)) return toast('UPI ID looks wrong — it should look like name@bank', true); try { await api.update('settings', 'site', x); toast('Settings saved'); PAGES.settings(); } catch (err) { fail(err); } };
  $('#pw').onsubmit = async e => { e.preventDefault(); const x = formData(e.target); try { await http('POST', 'auth/password', x); toast('Password changed'); e.target.reset(); } catch (err) { fail(err); } };
};

/* =====================================================================
   Activity log
   ===================================================================== */
PAGES.activity = async () => {
  await load('activity');
  const draw = () => {
    const f = F.act, cols = [...new Set(DATA.activity.map(a => a.col))].sort(), rows = DATA.activity.filter(a => !f.col || a.col === f.col);
    $('#page').innerHTML = `<div class="toolbar"><select id="fc" aria-label="Filter by area"><option value="">All areas</option>${opt(cols, f.col)}</select><span class="muted" style="font-size:13px">Latest ${DATA.activity.length} events</span></div>
     ${table({ id: 'act', rows, pageSize: 40, cols: [{ k: 'created', label: 'When', sort: true, html: r => `<span class="num" title="${esc(r.created)}">${fmtDT(r.created)}</span>` }, { k: 'by', label: 'Who', sort: true, html: r => `<b>${esc(r.by)}</b><small style="text-transform:capitalize">${esc(r.role)}</small>` }, { k: 'action', label: 'Action', sort: true, html: r => esc(r.action) }, { k: 'col', label: 'Area', sort: true, html: r => `<span class="pill">${esc(r.col)}</span>` }, { k: 'ref', label: 'Record', html: r => `<span class="num">${esc(r.ref || '')}</span><small>${esc(r.note || '')}</small>` }] })}`;
    $('#fc').onchange = e => { f.col = e.target.value; draw(); };
    bindTable($('#page'), 'act', draw, () => {});
  };
  draw();
};

/* =====================================================================
   SEO & pSEO — page inventory, overrides, templates, redirects, publish
   ===================================================================== */
const SEO = { d: null, tab: 'overview', f: { q: '', type: '', issue: '', kind: '' } };
const scoreChip = n => `<span class="sc ${n >= 85 ? 'ok' : n >= 65 ? 'mid' : 'bad'}">${n}</span>`;
const seoDomain = () => String((SEO.d && SEO.d.settings && SEO.d.settings.domain) || (CAT.config || {}).domain || 'www.trippartner.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
async function seoLoad(force) {
  if (SEO.d && !force) return SEO.d;
  await load('seo_pages', 'seo_templates', 'redirects');
  const src = await http('GET', 'seo/data');
  let settings = {}; try { settings = await api.get('settings', 'seo'); } catch (e) { settings = { ...PSEO.DEFAULT_SETTINGS }; }
  SEO.d = { ...src, settings: { ...PSEO.DEFAULT_SETTINGS, ...settings } };
  seoInv(); return SEO.d;
}
function seoInv() {
  const d = SEO.d; d.inv = PSEO.inventory({ base: d.base, overrides: DATA.seo_pages || [], templates: DATA.seo_templates || [], data: d.data });
  const lp = d.settings.lastPublish; const changed = [...(DATA.seo_pages || []), ...(DATA.seo_templates || [])].some(x => !lp || x.updated > lp.at);
  d.dirty = changed; return d.inv;
}
const pageStatus = p => p.thin ? ['Thin — not published', 'bad'] : p.kind === 'template' && p.status !== 'Live' ? ['Draft template', 'warn'] : p.noindex ? ['Noindex', 'warn'] : p.canonical ? ['Canonical → other', 'warn'] : ['Indexable', 'ok'];
PAGES.seo = async sub => {
  const [tab, ...rest] = String(sub || 'overview').split('/'); SEO.tab = ['overview', 'pages', 'templates', 'redirects', 'publish'].includes(tab) ? tab : 'overview';
  await seoLoad();
  const tabs = [['overview', 'Overview'], ['pages', 'Pages'], ['templates', 'pSEO templates'], ['redirects', 'Redirects'], ['publish', 'Settings & publish']];
  const head = () => `<div class="toolbar seo-tabs"><div class="tabs" role="group" aria-label="SEO sections">${tabs.map(([k, l]) => `<button aria-pressed="${SEO.tab === k}" data-seotab="${k}">${l}${k === 'pages' ? `<small class="num">${SEO.d.inv.length}</small>` : k === 'templates' ? `<small class="num">${(DATA.seo_templates || []).length}</small>` : k === 'redirects' ? `<small class="num">${(DATA.redirects || []).length}</small>` : ''}</button>`).join('')}</div><span class="sp"></span>
    ${SEO.d.dirty ? `<span class="st warn">${ic('alert')}Changes not published</span>` : SEO.d.settings.lastPublish ? `<span class="st ok">${ic('check')}Published ${ago(SEO.d.settings.lastPublish.at)}</span>` : ''}
    ${['admin', 'ops'].includes(ME.role) ? `<button class="btn" id="seopub">${ic('globe')} Publish to website</button>` : ''}</div>`;
  const render = () => {
    $('#page').innerHTML = head() + `<div id="seob"></div>`;
    $$('[data-seotab]').forEach(b => b.onclick = () => { location.hash = '#/seo/' + b.dataset.seotab; });
    const pb = $('#seopub'); if (pb) pb.onclick = () => seoPublish(pb, render);
    ({ overview: seoOverview, pages: seoPages, templates: seoTemplates, redirects: seoRedirects, publish: seoSettings })[SEO.tab](render, rest.join('/'));
  };
  SEO.render = render; render();
};
async function seoPublish(btn, render) {
  btn.disabled = true; const t = btn.innerHTML; btn.textContent = 'Publishing…';
  try { const r = await http('POST', 'seo/publish', {}); toast(`Published: ${r.written} pSEO pages, ${r.patched} edited pages, sitemap ${r.sitemap} URLs`); SEO.d = null; await seoLoad(true); render(); }
  catch (e) { fail(e); btn.disabled = false; btn.innerHTML = t; }
}

/* ---------- overview ---------- */
function seoOverview() {
  const inv = SEO.d.inv, idx = inv.filter(p => pageStatus(p)[1] === 'ok'), tp = inv.filter(p => p.kind === 'template'), live = tp.filter(p => p.status === 'Live' && !p.thin);
  const avg = idx.length ? Math.round(idx.reduce((a, p) => a + p.score, 0) / idx.length) : 0;
  const issueCount = {}; idx.forEach(p => p.issues.forEach(i => { issueCount[i] = (issueCount[i] || 0) + 1; }));
  const types = {}; inv.forEach(p => { if (pageStatus(p)[1] === 'ok') types[p.type] = (types[p.type] || 0) + 1; });
  const lp = SEO.d.settings.lastPublish;
  $('#seob').innerHTML = `${!SEO.d.siteDir ? `<div class="notice" style="margin:12px 0;background:var(--amber-soft)">${ic('alert')} ${MODE === 'demo' ? 'Demo mode: publishing is simulated. On the live server it refreshes the website, its sitemap.xml and robots.txt.' : 'The website is not reachable from the backend, so the page list is empty and “Publish” is unavailable. Check that the Next.js website is running and <code>NEXT_URL</code> is set in the backend .env.'}</div>` : ''}
   <div class="kpis" style="margin-top:12px">
    <a class="kpi" href="#/seo/pages"><small>Indexable pages</small><b class="num">${idx.length}</b><em>in sitemap after publish</em></a>
    <a class="kpi" href="#/seo/templates"><small>pSEO pages ready</small><b class="num">${live.length}</b><em>from ${(DATA.seo_templates || []).filter(t => t.status === 'Live').length} live templates</em></a>
    <a class="kpi" href="#/seo/templates"><small>Thin pages held back</small><b class="num">${tp.filter(p => p.thin).length}</b><em>too few packages</em></a>
    <div class="kpi"><small>Average SEO score</small><b class="num">${avg}<span style="font-size:14px">/100</span></b><em>indexable pages</em></div>
    <a class="kpi" href="#/seo/pages"><small>Edited pages</small><b class="num">${(DATA.seo_pages || []).length}</b><em>custom title / meta / FAQ</em></a>
    <div class="kpi"><small>Last published</small><b style="font-size:17px">${lp ? ago(lp.at) : 'Never'}</b><em>${lp ? esc(lp.by) + ' · ' + lp.written + ' pSEO pages' : 'publish to go live'}</em></div></div>
   <div class="g2" style="margin-top:18px">
    <div class="card"><h3>${ic('alert')} Issues on indexable pages <span class="sp"></span><a href="#/seo/pages">Fix in Pages</a></h3>
     ${Object.keys(issueCount).length ? `<div class="rows">${Object.entries(issueCount).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<a href="#/seo/pages" data-goissue="${k}"><span class="sp"><b>${esc(PSEO.ISSUES[k][0])}</b><small>−${PSEO.ISSUES[k][1]} points each</small></span><b class="num">${n}</b></a>`).join('')}</div>` : '<p class="muted">No issues. 🎉</p>'}</div>
    <div class="card"><h3>${ic('box')} Indexable pages by type</h3>${hbars(Object.entries(types).sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, v })))}</div></div>
   <div class="card" style="margin-top:18px"><h3>${ic('globe')} pSEO templates <span class="sp"></span><a href="#/seo/templates">Manage</a></h3><div class="rows">${(DATA.seo_templates || []).map(t => { const ps = tp.filter(p => p.tpl === t.id); return `<a href="#/seo/templates/${esc(t.id)}"><span class="sp"><b>${esc(t.name)}</b><small>${esc((PSEO.TYPES[t.type] || {}).label || t.type)} · <span class="num">${esc(t.slug)}</span></small></span><span class="num muted" style="font-size:12.5px">${ps.filter(p => !p.thin).length} ready · ${ps.filter(p => p.thin).length} thin</span>${chip(t.status === 'Live' ? 'Live' : 'Draft')}</a>`; }).join('') || '<p class="muted">No templates yet.</p>'}</div></div>`;
  $$('[data-goissue]').forEach(a => a.onclick = () => { SEO.f.issue = a.dataset.goissue; SEO.f.kind = ''; });
}

/* ---------- pages ---------- */
function seoPages(render, openPath) {
  const f = SEO.f, inv = SEO.d.inv, types = [...new Set(inv.map(p => p.type))].sort();
  const draw = () => {
    const s = f.q.toLowerCase();
    const rows = inv.filter(p => (!s || p.path.includes(s) || (p.title || '').toLowerCase().includes(s)) && (!f.type || p.type === f.type) && (!f.issue || p.issues.includes(f.issue)) && (!f.kind || (f.kind === 'edited' ? p.overridden : f.kind === 'indexable' ? pageStatus(p)[1] === 'ok' : p.kind === f.kind)));
    $('#seob').innerHTML = `<div class="toolbar" style="margin-top:12px"><input type="search" id="sq" placeholder="Search URL or title…" value="${esc(f.q)}" aria-label="Search pages">
      <select id="sty" aria-label="Page type"><option value="">All types</option>${opt(types, f.type)}</select>
      <select id="sis" aria-label="Issue"><option value="">Any issue</option>${opt(Object.entries(PSEO.ISSUES).map(([k, v]) => [k, v[0]]), f.issue)}</select>
      <select id="skd" aria-label="Show"><option value="">All pages</option>${opt([['indexable', 'Indexable only'], ['built-in', 'Built-in pages'], ['template', 'pSEO pages'], ['edited', 'Edited pages']], f.kind)}</select>
      <span class="muted num" style="font-size:13px">${rows.length} pages</span></div>
     ${table({ id: 'seop', rows, pageSize: 30, open: r => r.path, empty: 'No pages match.', cols: [
       { k: 'title', label: 'Page', sort: true, html: r => `<b>${esc(r.title)}</b><small class="num">${esc(r.path)}</small>` },
       { k: 'type', label: 'Type', sort: true, html: r => `<span class="pill">${esc(r.type)}</span>${r.overridden ? ` <span class="pill" style="background:var(--blue-soft)">edited</span>` : ''}` },
       { k: 'score', label: 'Score', cls: 'r', sort: true, html: r => scoreChip(r.score) },
       { k: 'issues', label: 'Issues', sort: r => r.issues.length, html: r => r.issues.filter(i => i !== 'noindex').length ? `<small style="color:var(--red)">${esc(PSEO.ISSUES[r.issues.filter(i => i !== 'noindex')[0]][0])}${r.issues.filter(i => i !== 'noindex').length > 1 ? ` +${r.issues.filter(i => i !== 'noindex').length - 1}` : ''}</small>` : '<small class="muted">—</small>' },
       { k: 'st', label: 'Status', sort: r => pageStatus(r)[0], html: r => { const [t, c] = pageStatus(r); return `<span class="st ${c}">${esc(t)}</span>`; } }] })}`;
    const q = $('#sq'); q.oninput = () => { f.q = q.value; clearTimeout(draw.t); draw.t = setTimeout(() => { TBL.seop && (TBL.seop.page = 0); draw(); const n = $('#sq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
    [['#sty', 'type'], ['#sis', 'issue'], ['#skd', 'kind']].forEach(([id, k]) => { $(id).onchange = e => { f[k] = e.target.value; TBL.seop && (TBL.seop.page = 0); draw(); }; });
    bindTable($('#seob'), 'seop', draw, p => { setHash('#/seo/pages/' + encodeURIComponent(p)); seoPageDrawer(p, draw); });
  };
  draw(); if (openPath) seoPageDrawer(decodeURIComponent(openPath), draw);
}
function serp(title, meta, path) { return `<div class="serp" aria-label="Google preview"><small>${esc(seoDomain())} › ${esc(path.replace(/^\/|\/$/g, '').split('/').join(' › ') || '')}</small><b>${esc(title.length > 62 ? title.slice(0, 60) + '…' : title)}</b><p>${esc(meta.length > 160 ? meta.slice(0, 157) + '…' : meta)}</p></div>`; }
const faqEditor = (faqs, id) => `<div class="faqs" id="${id}">${(faqs || []).map((x, i) => faqRow(x, i)).join('')}</div><button type="button" class="btn g sm" data-addfaq="${id}">${ic('plus')} Add question</button>`;
const faqRow = x => `<div class="faq-r"><input data-fq placeholder="Question" value="${esc(x.q || '')}"><textarea data-fa placeholder="Answer" rows="2">${esc(x.a || '')}</textarea><button type="button" class="icon-btn" data-rmfaq aria-label="Remove question">${ic('x')}</button></div>`;
const readFaqs = box => $$('.faq-r', box).map(r => ({ q: $('[data-fq]', r).value.trim(), a: $('[data-fa]', r).value.trim() })).filter(x => x.q && x.a);
function bindFaqs(root) {
  root.addEventListener('click', e => { const a = e.target.closest('[data-addfaq]'); if (a) { $('#' + a.dataset.addfaq, root).insertAdjacentHTML('beforeend', faqRow({})); root.dispatchEvent(new Event('input')); } const r = e.target.closest('[data-rmfaq]'); if (r) { r.closest('.faq-r').remove(); root.dispatchEvent(new Event('input')); } });
}
function seoPageDrawer(path, redraw) {
  const p = SEO.d.inv.find(x => x.path === path); if (!p) return toast('Page not found', true);
  const ov = (DATA.seo_pages || []).find(o => o.path === path), w = can('seo_pages', 'w');
  dwClose = () => setHash('#/seo/pages');
  const cnt = (v, max, min) => `<span class="cnt ${v > max ? 'bad' : v < min ? 'mid' : 'ok'}">${v}/${max}</span>`;
  openDrawer('Edit SEO · ' + path, `<div id="spw">
   <div id="serpbox">${serp(p.title, p.meta || '', path)}</div>
   <div class="acts" style="margin:8px 0">${pageStatus(p)[1] === 'ok' ? `<span class="st ok">${ic('check')}Indexable</span>` : `<span class="st warn">${esc(pageStatus(p)[0])}</span>`}${scoreChip(p.score)}<span class="pill">${esc(p.type)}</span>${MODE === 'live' ? `<a class="btn g sm" href="https://${esc(seoDomain())}${esc(path)}" target="_blank" rel="noopener">${ic('globe')} View on site</a>` : ''}</div>
   ${p.kind === 'template' ? `<p class="notice" style="font-size:13px">Generated by template <b>${esc(p.tplName)}</b> (${p.items.length} packages). Edits here apply to this page only — change the template to update all its pages.</p>` : ''}
   <form id="spf" class="fg">
    <label class="fld full"><span>SEO title <span id="ct-t">${cnt(p.title.length, 60, 30)}</span></span><input name="title" value="${esc(p.title)}" maxlength="120" ${w ? '' : 'disabled'}></label>
    <label class="fld full"><span>Meta description <span id="ct-m">${cnt((p.meta || '').length, 160, 70)}</span></span><textarea name="meta" rows="3" maxlength="300" ${w ? '' : 'disabled'}>${esc(p.meta || '')}</textarea></label>
    <label class="fld full"><span>H1 heading</span><input name="h1" value="${esc(p.h1 || '')}" placeholder="${esc((p.orig || {}).h1 || '')}" ${w ? '' : 'disabled'}></label>
    <label class="fld full"><span>Intro / unique content (shown on the page · **bold** supported)</span><textarea name="intro" rows="5" ${w ? '' : 'disabled'}>${esc(p.intro || '')}</textarea></label>
    <div class="fld full"><span>FAQs (shown on the page + FAQ rich results in Google)</span>${faqEditor(p.faqs, 'pfq')}</div>
    <label class="fld full"><span>Canonical URL (only if this page duplicates another)</span><input name="canonical" value="${esc(p.canonical || '')}" placeholder="https://${esc(seoDomain())}/…" ${w ? '' : 'disabled'}></label>
    <label class="chk full"><input type="checkbox" name="noindex" ${ov && ov.noindex ? 'checked' : ''} ${w ? '' : 'disabled'}> Hide this page from Google (noindex)</label>
   </form>
   <div class="sect"><h4>Checklist</h4><ul class="pf-checks" id="spck">${checkList(p)}</ul></div>
   ${w ? `<div class="sect"><div class="acts"><button class="btn" id="sps">${ic('check')} Save</button>${ov ? `<button class="btn g" id="spr">Reset to default</button>` : ''}</div><p class="muted" style="font-size:12.5px;margin:0">Saved changes go live on the website when you click <b>Publish to website</b>${MODE === 'live' ? ' (title/meta also apply instantly while browsing the site)' : ''}.</p></div>` : ''}</div>`, dwRoot => {
    const root = $('#spw', dwRoot), fm = $('#spf', root); bindFaqs(root);
    const cur = () => { const d = formData(fm); return { ...p, title: d.title, meta: d.meta, h1: d.h1, intro: d.intro, canonical: d.canonical, noindex: !!d.noindex || (p.kind === 'template' && p.status !== 'Live'), faqs: readFaqs(root) }; };
    root.addEventListener('input', () => { const c = cur(); $('#serpbox', root).innerHTML = serp(c.title, c.meta, path); $('#ct-t', root).innerHTML = cnt(c.title.length, 60, 30); $('#ct-m', root).innerHTML = cnt(c.meta.length, 160, 70);
      const others = SEO.d.inv.filter(x => x.path !== path); PSEO.audit([...others, c]); $('#spck', root).innerHTML = checkList(c); });
    const sv = $('#sps', root); if (sv) sv.onclick = async () => {
      const c = cur(), o = p.orig || {}, body = { path, route: p.route || '', kind: p.kind, title: c.title !== o.title ? c.title : '', meta: c.meta !== o.meta ? c.meta : '', h1: c.h1 && c.h1 !== o.h1 ? c.h1 : '', intro: c.intro !== (o.intro || '') ? c.intro : '', faqs: JSON.stringify(c.faqs) !== JSON.stringify(o.faqs || []) ? c.faqs : [], noindex: !!formData(fm).noindex, canonical: c.canonical };
      try { if (ov) await api.update('seo_pages', ov.id, body); else await api.create('seo_pages', { ...body, id: PSEO.pid(path) }); await load('seo_pages'); seoInv(); toast('SEO saved — publish to update the website'); closeDrawer(); SEO.render(); } catch (e) { fail(e); } };
    const rs = $('#spr', root); if (rs) rs.onclick = async () => { if (!confirmInline(rs)) return; try { await api.remove('seo_pages', ov.id); await load('seo_pages'); seoInv(); toast('Reset to default'); closeDrawer(); SEO.render(); } catch (e) { if (/Only an admin/.test(e.message)) { await api.update('seo_pages', ov.id, { title: '', meta: '', h1: '', intro: '', faqs: [], noindex: false, canonical: '' }); await load('seo_pages'); seoInv(); closeDrawer(); SEO.render(); } else fail(e); } };
  });
}
const checkList = p => { const bad = new Set(p.issues); const items = [['title-missing', 'Has a title'], ['title-long', 'Title within 60–65 characters'], ['title-short', 'Title long enough to describe the page'], ['meta-missing', 'Has a meta description'], ['meta-long', 'Meta description within 160 characters'], ['meta-short', 'Meta description at least 70 characters'], ['dup-title', 'Title is unique'], ['dup-meta', 'Meta description is unique'], ['thin', 'Enough packages on the page']];
  return items.map(([k, t]) => `<li class="${bad.has(k) ? 'bad' : 'ok'}">${ic(bad.has(k) ? 'alert' : 'check')}${esc(bad.has(k) ? PSEO.ISSUES[k][0] : t)}</li>`).join('') + `<li class="${(p.faqs || []).length ? 'ok' : 'mid'}">${ic((p.faqs || []).length ? 'check' : 'dot')}${(p.faqs || []).length ? (p.faqs.length + ' FAQs — eligible for FAQ rich results') : 'Add 2–4 FAQs for richer Google results'}</li>`; };

/* ---------- templates ---------- */
function seoTemplates(render, openId) {
  const inv = SEO.d.inv, w = can('seo_templates', 'w');
  $('#seob').innerHTML = `<p class="notice" style="margin:12px 0">${ic('globe')} A template turns your packages into many search-focused landing pages — e.g. “Honeymoon packages in Kashmir”, “Kerala packages under ₹25,000”. Pages with too few packages are held back automatically so Google doesn’t see thin content.</p>
   <div class="toolbar">${w ? `<button class="btn" id="tnew">${ic('plus')} New template</button>` : ''}</div>
   <div class="tpl-grid">${(DATA.seo_templates || []).map(t => { const ps = inv.filter(p => p.tpl === t.id), ok = ps.filter(p => !p.thin); return `<div class="card tpl-c"><h3><span class="sp">${esc(t.name)}</span>${chip(t.status === 'Live' ? 'Live' : 'Draft')}</h3>
     <p class="muted" style="margin:0 0 6px;font-size:12.5px">${esc((PSEO.TYPES[t.type] || {}).label || t.type)}</p><code class="tpl-slug">${esc(t.slug)}</code>
     <div class="tpl-n"><div><b class="num">${ok.length}</b><small>pages ready</small></div><div><b class="num">${ps.length - ok.length}</b><small>thin (held back)</small></div><div><b class="num">${ok.length ? Math.round(ok.reduce((a, p) => a + p.score, 0) / ok.length) : '—'}</b><small>avg score</small></div></div>
     ${t.note ? `<p class="muted" style="font-size:12px;margin:8px 0 0">${ic('alert')} ${esc(t.note)}</p>` : ''}
     <div class="acts" style="margin-top:10px"><button class="btn g sm" data-tedit="${esc(t.id)}">${w ? 'Edit' : 'View'}</button>${w ? `<button class="btn g sm" data-ttog="${esc(t.id)}">${t.status === 'Live' ? 'Switch to draft' : 'Make live'}</button><button class="btn g sm" data-tdup="${esc(t.id)}">Duplicate</button>` : ''}</div></div>`; }).join('')}</div>`;
  const nb = $('#tnew'); if (nb) nb.onclick = () => tplDrawer(null);
  $$('[data-tedit]').forEach(b => b.onclick = () => tplDrawer(b.dataset.tedit));
  $$('[data-ttog]').forEach(b => b.onclick = async () => { const t = DATA.seo_templates.find(x => x.id === b.dataset.ttog); try { await api.update('seo_templates', t.id, { status: t.status === 'Live' ? 'Draft' : 'Live' }); await load('seo_templates'); seoInv(); toast('Template ' + (t.status === 'Live' ? 'switched to draft' : 'is live') + ' — publish to update the website'); render(); } catch (e) { fail(e); } });
  $$('[data-tdup]').forEach(b => b.onclick = async () => { const t = DATA.seo_templates.find(x => x.id === b.dataset.tdup); const { id, created, updated, ...rest } = t; try { await api.create('seo_templates', { ...rest, id: 'TPL-' + Math.random().toString(36).slice(2, 8).toUpperCase(), name: t.name + ' (copy)', status: 'Draft', slug: t.slug.replace(/\/$/, '-2/') }); await load('seo_templates'); seoInv(); toast('Template duplicated as draft'); render(); } catch (e) { fail(e); } });
  if (openId) tplDrawer(decodeURIComponent(openId));
}
function tplDrawer(id) {
  const t0 = id ? (DATA.seo_templates || []).find(x => x.id === id) : { name: '', type: 'theme-dest', status: 'Draft', minItems: 2, prio: 0.6, slug: '/{theme_slug}-packages-in-{dest_slug}/', title: '{theme} Packages in {dest} {year} — from {min_price}', meta: '', h1: '{theme} Packages in {dest}', lead: '', intro: '', faqs: [], scope: { destType: 'all', dests: [] } };
  if (!t0) return toast('Template not found', true);
  const w = can('seo_templates', 'w'), dis = w ? '' : 'disabled', data = SEO.d.data, sc = t0.scope || {};
  dwClose = () => setHash('#/seo/templates');
  const axis = type => (PSEO.TYPES[type] || { axes: [] }).axes;
  const scopeHtml = (type, s) => `${axis(type).includes('theme') ? `<div class="fld full"><span>Themes (none ticked = all)</span><div class="ckg">${data.themes.map(x => `<label class="chk"><input type="checkbox" data-sc="themes" value="${esc(x.id)}" ${(s.themes || []).includes(x.id) ? 'checked' : ''} ${dis}> ${esc(x.name)}</label>`).join('')}</div></div>` : ''}
    ${axis(type).includes('budget') ? fld('Budgets in ₹ (comma separated)', 'budgets', (s.budgets || [15000, 25000, 40000]).join(', '), 'text', 'class="full" ' + dis) : ''}
    ${axis(type).includes('days') ? fld('Trip lengths in days (comma separated)', 'days', (s.days || [3, 4, 5, 6, 7]).join(', '), 'text', dis) : ''}
    ${axis(type).includes('city') ? fld('Departure cities (comma separated)', 'cities', (s.cities || ['Delhi', 'Mumbai']).join(', '), 'text', 'class="full" ' + dis) : ''}
    ${axis(type).includes('month') ? `<div class="fld full"><span>Months</span><div class="ckg">${PSEO.MONTHS.map(m => `<label class="chk"><input type="checkbox" data-sc="months" value="${m}" ${(s.months || []).includes(m) ? 'checked' : ''} ${dis}> ${m.slice(0, 3)}</label>`).join('')}</div></div>` : ''}`;
  openDrawer(id ? 'Template · ' + t0.name : 'New pSEO template', `<div id="tpw"><form id="tpf" class="tpf">
   <div class="fg">${fld('Template name *', 'name', t0.name, 'text', 'required ' + dis)}${sel('Combines', 'type', Object.entries(PSEO.TYPES).map(([k, v]) => [k, v.label]), t0.type, dis)}
    ${sel('Status', 'status', [['Live', 'Live — publish its pages'], ['Draft', 'Draft — not published']], t0.status, dis)}${fld('Minimum packages per page', 'minItems', t0.minItems || 2, 'number', 'min="1" max="20" ' + dis)}
    ${sel('Destinations', 'destType', [['all', 'India + international'], ['india', 'India only'], ['intl', 'International only']], sc.destType || 'all', dis)}${fld('Sitemap priority (0.1–1.0)', 'prio', t0.prio || 0.6, 'number', 'min="0.1" max="1" step="0.1" ' + dis)}
    <div class="fld full"><span>Only these destinations (none ticked = all)</span><input type="search" id="dsq" placeholder="Filter destinations…" aria-label="Filter destinations"><div class="ckg dck">${data.dests.map(d => `<label class="chk" data-dn="${esc((d.short || d.name).toLowerCase())}"><input type="checkbox" data-sc="dests" value="${esc(d.id)}" ${(sc.dests || []).includes(d.id) ? 'checked' : ''} ${dis}> ${esc(d.short || d.name)}</label>`).join('')}</div></div>
    <div id="scx" class="fg full" style="grid-column:1/-1">${scopeHtml(t0.type, sc)}</div></div>
   <div class="sect"><h4>Page patterns</h4><p class="muted" style="font-size:12.5px;margin:0">Click a variable to insert it where your cursor is.</p><div class="vchips" id="vch"></div>
    <div class="fg">${fld('URL pattern *', 'slug', t0.slug, 'text', 'class="full mono" required ' + dis)}${fld('SEO title *', 'title', t0.title, 'text', 'class="full" required ' + dis)}${fld('Meta description', 'meta', t0.meta, 'textarea', 'rows="2" ' + dis)}${fld('H1 heading', 'h1', t0.h1, 'text', dis)}${fld('Hero line', 'lead', t0.lead, 'text', dis)}${fld('Intro (unique copy · **bold** supported)', 'intro', t0.intro, 'textarea', 'rows="5" ' + dis)}
     <div class="fld full"><span>FAQ patterns</span>${faqEditor(t0.faqs, 'tfq')}</div></div></div>
   <div class="sect"><h4>Live preview <span class="muted" id="tpcount" style="font:500 12.5px var(--f)"></span></h4><div id="tpprev"></div></div>
   ${w ? `<div class="sect"><div class="acts"><button class="btn" type="submit">${ic('check')} ${id ? 'Save template' : 'Create template'}</button>${id && ME.role === 'admin' ? '<button class="btn d" type="button" id="tdel">Delete</button>' : ''}</div></div>` : ''}</form></div>`, dwRoot => {
    const root = $('#tpw', dwRoot); setTimeout(() => { $('#dw-b').scrollTop = 0; }, 60);
    $('#dw-b').closest('.dw').classList.add('wide'); const prevClose = dwClose; dwClose = () => { $('.dw').classList.remove('wide'); prevClose && prevClose(); };
    const fm = $('#tpf', root); bindFaqs(root); let last = null;
    root.addEventListener('focusin', e => { if (e.target.matches('input[type=text],input:not([type]),textarea') && fm.contains(e.target) && !e.target.closest('.ckg')) last = e.target; });
    const read = () => { const d = formData(fm); const ck = k => $$(`[data-sc="${k}"]:checked`, fm).map(x => x.value); const nums = v => String(v || '').split(/[,\s]+/).map(Number).filter(n => n > 0);
      return { name: d.name, type: d.type, status: d.status, minItems: +d.minItems || 1, prio: Math.min(1, Math.max(0.1, +d.prio || 0.5)), slug: d.slug, title: d.title, meta: d.meta, h1: d.h1, lead: d.lead, intro: d.intro, faqs: readFaqs(root),
        scope: { destType: d.destType, dests: ck('dests'), themes: ck('themes'), months: ck('months'), budgets: d.budgets != null ? nums(d.budgets) : undefined, days: d.days != null ? nums(d.days) : undefined, cities: d.cities != null ? String(d.cities).split(',').map(s => s.trim()).filter(Boolean) : undefined } }; };
    const vars = () => { const ax = axis(fm.elements.type.value); return Object.keys(PSEO.VARS).filter(k => { const a = k.split('_')[0]; return !['theme', 'budget', 'days', 'nights', 'city', 'month'].includes(a) || ax.includes(a === 'nights' ? 'days' : a); }); };
    const drawVars = () => { $('#vch', root).innerHTML = vars().map(k => `<button type="button" class="vchip" data-var="${k}" title="${esc(PSEO.VARS[k])}">{${k}}</button>`).join(''); };
    const preview = () => { const t = { ...read(), id: id || 'NEW' }; const ps = PSEO.expand(t, data), ok = ps.filter(p => !p.thin);
      const all = SEO.d.inv.filter(p => p.tpl !== t.id); PSEO.audit([...all, ...ps.map(p => ({ ...p, kind: 'template' }))]);
      const clash = ps.filter(p => SEO.d.base.some(b => b.path === p.path)).length, dupPath = ps.length - new Set(ps.map(p => p.path)).size;
      $('#tpcount', root).textContent = `· ${ok.length} pages ready, ${ps.length - ok.length} thin${clash ? ` · ${clash} clash with existing URLs` : ''}${dupPath ? ` · ${dupPath} duplicate URLs` : ''}`;
      const s0 = ok[0];
      $('#tpprev', root).innerHTML = (s0 ? serp(s0.title, s0.meta, s0.path) : '<p class="muted">No pages would be published — widen the scope or lower the minimum packages.</p>') +
        `<div class="tw" style="margin-top:10px"><table><thead><tr><th>URL</th><th>Title</th><th class="r">Pkgs</th><th class="r">Score</th></tr></thead><tbody>${ps.slice(0, 40).map(p => `<tr><td class="num" style="font-size:12px">${esc(p.path)}</td><td style="font-size:12.5px">${esc(p.title)}<small>${p.title.length} chars</small></td><td class="r num">${p.items.length}${p.thin ? ' <span class="st bad">thin</span>' : ''}</td><td class="r">${scoreChip(p.score)}</td></tr>`).join('')}</tbody></table></div>${ps.length > 40 ? `<p class="muted" style="font-size:12px">…and ${ps.length - 40} more</p>` : ''}`; };
    drawVars(); preview();
    $('#vch', root).onclick = e => { const b = e.target.closest('[data-var]'); if (!b || !w) return; const el = last || fm.elements.title; const s = el.selectionStart ?? el.value.length, v = '{' + b.dataset.var + '}'; el.value = el.value.slice(0, s) + v + el.value.slice(el.selectionEnd ?? s); el.focus(); el.setSelectionRange(s + v.length, s + v.length); preview(); };
    fm.elements.type.onchange = () => { $('#scx', root).innerHTML = scopeHtml(fm.elements.type.value, {}); drawVars(); preview(); };
    $('#dsq', root).oninput = e => { const q = e.target.value.toLowerCase(); $$('[data-dn]', root).forEach(l => { l.hidden = !!q && !l.dataset.dn.includes(q); }); };
    root.addEventListener('input', () => { clearTimeout(preview.t); preview.t = setTimeout(preview, 200); }); root.addEventListener('change', () => preview());
    fm.onsubmit = async e => { e.preventDefault(); const t = read(); if (!t.name || !t.slug || !t.title) return toast('Name, URL pattern and title are required', true);
      if (!/\{\w+\}/.test(t.slug)) return toast('The URL pattern needs at least one variable, e.g. {dest_slug}', true);
      Object.keys(t.scope).forEach(k => t.scope[k] === undefined && delete t.scope[k]);
      try { if (id) await api.update('seo_templates', id, t); else await api.create('seo_templates', { ...t, id: 'TPL-' + Math.random().toString(36).slice(2, 8).toUpperCase() }); await load('seo_templates'); seoInv(); toast('Template saved — publish to update the website'); closeDrawer(); SEO.render(); } catch (err) { fail(err); } };
    const del = $('#tdel', root); if (del) del.onclick = async () => { if (!confirmInline(del)) return; try { await api.remove('seo_templates', id); await load('seo_templates'); seoInv(); toast('Template deleted — its pages are removed on the next publish'); closeDrawer(); SEO.render(); } catch (err) { fail(err); } };
  });
}

/* ---------- redirects ---------- */
function seoRedirects(render) {
  const w = can('redirects', 'w'), rows = (DATA.redirects || []).slice().sort((a, b) => (b.hits || 0) - (a.hits || 0));
  $('#seob').innerHTML = `<p class="notice" style="margin:12px 0">${ic('globe')} Send visitors and Google from old or changed URLs to the right page (301 = moved permanently, keeps SEO value). Redirects work when this server also serves the website; a copy can be exported for other hosting.</p>
   ${w ? `<div class="g2e"><form class="card" id="rdf"><h3>${ic('plus')} Add redirect</h3><div class="fg">${fld('From (old URL path) *', 'from', '', 'text', 'placeholder="/old-kashmir-page/" required')}${fld('To (new URL) *', 'to', '', 'text', 'placeholder="/destinations/kashmir/" required')}${sel('Type', 'code', [[301, '301 — permanent'], [302, '302 — temporary']], 301)}</div><div class="acts" style="margin-top:10px"><button class="btn" type="submit">Add redirect</button></div></form>
    <form class="card" id="rdb"><h3>${ic('box')} Bulk add</h3><label class="fld"><span>One per line: <code>/old-url/ /new-url/</code></span><textarea name="bulk" rows="5" placeholder="/kashmir-tour/ /destinations/kashmir/\n/goa-offer/ /deals/"></textarea></label><div class="acts" style="margin-top:10px"><button class="btn g" type="submit">Add all</button><button class="btn g" type="button" id="rdx">${ic('dl')} Export for .htaccess</button></div></form></div>` : ''}
   <div style="margin-top:16px">${table({ id: 'rdt', rows, pageSize: 40, empty: 'No redirects yet.', open: r => r.id, cols: [
     { k: 'from', label: 'From', sort: true, html: r => `<b class="num">${esc(r.from)}</b>` }, { k: 'to', label: 'To', sort: true, html: r => `<span class="num">${esc(r.to)}</span>` },
     { k: 'code', label: 'Type', html: r => `<span class="pill">${esc(r.code || 301)}</span>` }, { k: 'hits', label: 'Hits', cls: 'r', sort: r => +r.hits || 0, html: r => `<span class="num">${+r.hits || 0}</span><small>${r.lastHit ? ago(r.lastHit) : 'never'}</small>` },
     { k: 'active', label: 'Status', html: r => r.active === false ? chip('Paused') : `<span class="st ok">${ic('check')}Active</span>` }] })}</div>`;
  const add = async list => { let ok = 0; for (const r of list) { try { await api.create('redirects', { ...r, active: true, hits: 0 }); ok++; } catch (e) { toast(r.from + ': ' + e.message, true); } } await load('redirects'); if (ok) toast(ok + ' redirect' + (ok > 1 ? 's' : '') + ' added'); render(); };
  const f1 = $('#rdf'); if (f1) f1.onsubmit = e => { e.preventDefault(); const d = formData(f1); if (!d.from || !d.to) return; add([{ from: d.from, to: d.to, code: +d.code }]); };
  const f2 = $('#rdb'); if (f2) f2.onsubmit = e => { e.preventDefault(); const list = f2.bulk.value.split('\n').map(l => l.trim().split(/\s+/)).filter(x => x.length >= 2).map(([from, to, code]) => ({ from, to, code: +code || 301 })); if (!list.length) return toast('Nothing to add', true); add(list); };
  const ex = $('#rdx'); if (ex) ex.onclick = () => { const txt = (DATA.redirects || []).filter(r => r.active !== false).map(r => `Redirect ${r.code || 301} ${r.from} ${/^https?:/.test(r.to) ? r.to : 'https://' + seoDomain() + r.to}`).join('\n'); navigator.clipboard ? navigator.clipboard.writeText(txt).then(() => toast('Copied — paste into .htaccess')) : toast(txt); };
  bindTable($('#seob'), 'rdt', () => seoRedirects(render), rid => { const r = DATA.redirects.find(x => x.id === rid); if (!r) return;
    openDrawer('Redirect', `<form id="rde" class="fg">${fld('From', 'from', r.from, 'text', w ? '' : 'disabled')}${fld('To', 'to', r.to, 'text', w ? '' : 'disabled')}${sel('Type', 'code', [[301, '301 — permanent'], [302, '302 — temporary']], r.code || 301, w ? '' : 'disabled')}${chk('Active', 'active', r.active !== false)}</form>
      <p class="muted" style="font-size:13px">${+r.hits || 0} hits${r.lastHit ? ' · last ' + fmtDT(r.lastHit) : ''}</p>${w ? `<div class="acts"><button class="btn" id="rds">Save</button><button class="btn d" id="rdd">Delete</button></div>` : ''}`, root => {
      const s = $('#rds', root); if (s) s.onclick = async () => { const d = formData($('#rde', root)); try { await api.update('redirects', rid, { from: d.from, to: d.to, code: +d.code, active: d.active }); await load('redirects'); toast('Saved'); closeDrawer(); render(); } catch (e) { fail(e); } };
      const dd = $('#rdd', root); if (dd) dd.onclick = async () => { if (!confirmInline(dd)) return; try { await api.remove('redirects', rid); await load('redirects'); toast('Deleted'); closeDrawer(); render(); } catch (e) { fail(e); } }; }); });
}

/* ---------- settings & publish ---------- */
function seoSettings(render) {
  const s = SEO.d.settings, w = can('settings', 'w'), dis = w ? '' : 'disabled', lp = s.lastPublish;
  const sm = PSEO.sitemap(SEO.d.inv.filter(p => p.kind === 'built-in' || p.status === 'Live'), s.domain, today());
  $('#seob').innerHTML = `<div class="g2" style="margin-top:12px">
   <div style="display:grid;gap:18px;align-content:start">
    <div class="card"><h3>${ic('globe')} Publish to website</h3>
     <p class="muted" style="font-size:13px;margin-top:0">Publishing writes every live pSEO page (with package cards, FAQs and schema), applies your page edits, removes pages whose template was turned off, and regenerates <code>sitemap.xml</code> and <code>robots.txt</code>.</p>
     <p style="font-size:13px">${SEO.d.siteDir ? `<span class="st ok">${ic('check')}Connected to the website</span>` : `<span class="st warn">${ic('alert')}${MODE === 'demo' ? 'Demo — publish is simulated' : 'Website not reachable (check NEXT_URL)'}</span>`}</p>
     ${lp ? dl([['Last publish', fmtDT(lp.at) + ' · ' + esc(lp.by)], ['pSEO pages written', `<b class="num">${lp.written}</b>`], ['Edited pages applied', lp.patched], ['Old pages removed', lp.removed], ['Thin pages held back', lp.thin], ['Sitemap URLs', lp.sitemap], ['Time taken', (lp.ms || 0) + ' ms']]) : '<p class="muted">Not published yet.</p>'}
     ${(s.history || []).length > 1 ? `<details style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-size:13px">Publish history</summary><ul class="tl">${s.history.map(h => `<li><b>${h.written}</b> pSEO pages · ${h.patched} edited · sitemap ${h.sitemap}<small>${esc(h.by)} · ${fmtDT(h.at)}</small></li>`).join('')}</ul></details>` : ''}</div>
    <div class="card"><h3>${ic('box')} Sitemap preview <span class="sp"></span><span class="muted num" style="font:500 12.5px var(--f)">${sm.count} URLs</span></h3><pre class="smp">${esc(sm.xml.split('\n').slice(0, 14).join('\n'))}\n…</pre>${MODE === 'live' ? `<a class="btn g sm" href="https://${esc(seoDomain())}/sitemap.xml" target="_blank" rel="noopener">Open live sitemap.xml</a>` : ''}
     <p class="muted" style="font-size:12.5px">After the first publish, submit <b>https://${esc(seoDomain())}/sitemap.xml</b> in Google Search Console → Sitemaps.</p></div></div>
   <form class="card" id="ssf"><h3>${ic('gear')} SEO settings</h3><div class="fg">
    ${fld('Website domain', 'domain', s.domain, 'text', 'class="full" ' + dis)}${fld('Max pages per template', 'maxPerTemplate', s.maxPerTemplate, 'number', 'min="10" max="5000" ' + dis)}${sel('Default share image', 'ogImage', [...new Set(SEO.d.data.dests.map(d => d.img).filter(Boolean))], s.ogImage, dis)}
    ${fld('robots.txt', 'robots', s.robots, 'textarea', 'rows="6" class="mono" ' + dis)}</div>
    ${w ? '<div class="acts" style="margin-top:12px"><button class="btn" type="submit">Save SEO settings</button></div>' : '<p class="muted">Only an admin can change SEO settings.</p>'}</form></div>`;
  const f = $('#ssf'); if (w) f.onsubmit = async e => { e.preventDefault(); const d = formData(f); d.domain = String(d.domain).replace(/^https?:\/\//, '').replace(/\/.*$/, ''); try { await api.update('settings', 'seo', d); SEO.d = null; await seoLoad(true); toast('SEO settings saved'); render(); } catch (err) { fail(err); } };
}

/* =====================================================================
   Website content — generic editor driven by /api/content/_types
   (destinations, packages, themes, India guide, guides, visa, FAQs, media…)
   ===================================================================== */
const CT = { meta: null, lists: {}, q: {}, tab: '' };
const CT_GROUPS = ['Catalogue', 'India guide', 'Editorial', 'Media'];
const SITE_BASE = API_BASE.replace(/api\/?$/, '');
const ctType = k => CT.meta && CT.meta.types.find(t => t.key === k);
const humanize = n => { const s = String(n).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
const fLabel = f => f.label || humanize(f.name);
const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/, '');
const ctImg = (name, cls = '') => name ? `<img class="${cls}" loading="lazy" src="${esc(IMGB + name)}.jpg" alt="" onerror="this.style.visibility='hidden'">` : `<img class="${cls}" alt="" hidden>`;
const clip = v => v ? `<span class="ct-clip">${esc(v)}</span>` : '<span class="muted">—</span>';
const enumLabel = (t, name, v) => { const f = t.fields.find(x => x.name === name); return (f && f.labels && f.labels[v]) || v || ''; };
const prettyJson = v => {
  if (v == null) return '';
  const flat = x => x == null || typeof x !== 'object' || (Array.isArray(x) && x.every(y => y == null || typeof y !== 'object'));
  if (Array.isArray(v) && v.every(flat)) { const one = JSON.stringify(v); return one.length <= 70 || !v.length ? one : '[\n  ' + v.map(x => JSON.stringify(x)).join(',\n  ') + '\n]'; }
  return JSON.stringify(v, null, 2);
};
async function ctMeta() { if (!CT.meta) CT.meta = await http('GET', 'content/_types'); return CT.meta; }
async function ctList(k, force) { if (force || !CT.lists[k]) CT.lists[k] = await http('GET', 'content/' + k); return CT.lists[k]; }
const ctRefKeys = t => [...new Set([...t.fields, ...t.lists.map(l => l.scalar).filter(Boolean)].filter(f => f.kind === 'ref').map(f => f.ref))];
const ctName = (k, id) => { if (id == null || id === '') return ''; const t = ctType(k), r = (CT.lists[k] || []).find(x => x.id === id); return r && t ? (r[t.title] || id) : id; };
/* the Packages & prices screen and dropdowns read CAT (catalog.json, generated live by the server) */
async function refreshCat() { if (MODE !== 'live' || window.TP_CATALOG) return; try { const r = await fetch('catalog.json', { cache: 'no-store', credentials: 'include' }); if (r.ok) CAT = { ...CAT, ...(await r.json()) }; } catch (e) { /* keep the previous catalogue */ } }
const ctLink = (k, r) => { const p = { destinations: ['destinations', r.id], packages: ['packages', r.id], themes: ['themes', r.id], states: ['india', r.id], places: r.stateId ? ['india', r.stateId, r.id] : null, guides: ['guides', r.id] }[k]; return p ? SITE_BASE + p.map(encodeURIComponent).join('/') + '/' : ''; };
const ctCols = t => {
  const n = v => `<span class="num">${esc(v)}</span>`, dash = '<span class="muted">—</span>', nm = (k, id) => esc(ctName(k, id)) || dash;
  return ({
    destinations: [{ label: 'Type', html: r => `<span class="pill">${esc(enumLabel(t, 'type', r.type))}</span>` }, { label: 'Region', html: r => esc(r.region) || dash }, { label: 'From', cls: 'r', html: r => r.price ? `<b class="num">${inr(r.price)}</b>` : dash }],
    packages: [{ label: 'Destination', html: r => nm('destinations', r.destinationId) }, { label: 'Duration', html: r => n(`${r.nights}N/${r.nights + 1}D`) + (r.weekend ? ' <span class="pill">Weekend</span>' : '') + (r.festive ? ' <span class="pill">Festive</span>' : '') }, { label: 'Price', cls: 'r', html: r => `<b class="num">${inr(r.price)}</b>` }],
    themes: [{ label: 'Description', html: r => clip(r.description) }],
    states: [{ label: 'Capital', html: r => esc(r.capital) || dash }, { label: 'Kind', html: r => `<span class="pill">${r.isUnionTerritory ? 'Union territory' : 'State'}</span>` }],
    placeCategories: [{ label: 'Slug', html: r => n(r.slug) }, { label: 'Description', html: r => clip(r.description) }],
    places: [{ label: 'State', html: r => nm('states', r.stateId) }, { label: 'Destination', html: r => nm('destinations', r.destinationId) }, { label: 'Best time', html: r => esc(r.bestTime) || dash }],
    guides: [{ label: 'Category', html: r => esc(r.category) || dash }, { label: 'Read', html: r => r.readMinutes ? n(r.readMinutes + ' min') : dash }, { label: 'Sections', cls: 'r', html: r => n((r.sections || []).length) }],
    visa: [{ label: 'Group', html: r => `<span class="pill">${esc(enumLabel(t, 'group', r.group))}</span>` }, { label: 'Stay', html: r => esc(r.stay) || dash }],
    services: [{ label: 'Description', html: r => clip(r.description) }, { label: 'Included', cls: 'r', html: r => n((r.features || []).length) }],
    infoPages: [{ label: 'Sections', cls: 'r', html: r => n((r.sections || []).length) }],
    faqs: [{ label: 'Group', html: r => `<span class="pill">${esc(enumLabel(t, 'group', r.group))}</span>` }, { label: 'Answer', html: r => clip(r.answer) }],
    reels: [{ label: 'Destination', html: r => nm('destinations', r.destinationId) }, { label: 'Package', html: r => nm('packages', r.packageId) }, { label: 'Tag', html: r => esc(r.tag) || dash }],
    holidays: [{ label: 'Date', html: r => n(fmtD(r.date)) }, { label: 'Note', html: r => clip(r.note) }],
    samplePartners: [{ label: 'City', html: r => esc(r.city) || dash }, { label: 'Age', cls: 'r', html: r => n(r.age) }, { label: 'Style', html: r => clip(r.travelStyle) }],
  })[t.key] || [];
};

PAGES.content = async sub => {
  if (MODE === 'demo') { $('#page').innerHTML = `<div class="card"><h3>${ic('layout')} Website content</h3><p class="muted" style="margin:0">Editing destinations, packages, itineraries, guides and other website content needs the live server — this demo has no database behind it. Deploy the backend (see README) and log in there to use this screen.</p></div>`; return; }
  const s = String(sub || ''), i = s.indexOf('/'), key = i < 0 ? s : s.slice(0, i), rid = i < 0 ? '' : s.slice(i + 1);
  const meta = await ctMeta();
  const tab = key === 'site' ? 'site' : ctType(key) ? key : meta.types[0].key; CT.tab = tab;
  const groups = [...new Set([...CT_GROUPS, ...meta.types.map(t => t.group)])].filter(g => meta.types.some(t => t.group === g));
  $('#page').innerHTML = `<div class="notice">${ic('globe')} The website is built from this content. Saved changes appear on the website immediately — untick <b>Published</b> to hide a record without deleting it.</div>
   <div class="ct-nav" role="group" aria-label="Content types">${groups.map(g => `<div class="ct-grp"><small>${esc(g)}</small><div class="tabs">${meta.types.filter(t => t.group === g).map(t => `<button aria-pressed="${tab === t.key}" data-cttab="${esc(t.key)}">${esc(t.label)}</button>`).join('')}</div></div>`).join('')}
    <div class="ct-grp"><small>Settings</small><div class="tabs"><button aria-pressed="${tab === 'site'}" data-cttab="site">Site configuration</button></div></div></div>
   <div id="ctb"><p class="muted">Loading…</p></div>`;
  $$('[data-cttab]').forEach(b => b.onclick = () => { location.hash = '#/content/' + b.dataset.cttab; });
  if (tab === 'site') return ctSite();
  await ctTab(ctType(tab), rid);
};

async function ctTab(t, openId) {
  const k = t.key, w = can('content', 'w'), tid = 'ct-' + k;
  await Promise.all([ctList(k), ...ctRefKeys(t).map(r => ctList(r))]);
  CT.q[k] = CT.q[k] || '';
  const hasImg = t.fields.some(f => f.name === 'image' && f.kind === 'image'), tf = t.fields.find(f => f.name === t.title) || { name: t.title };
  const refFields = t.fields.filter(f => f.kind === 'ref');
  const draw = () => {
    const box = $('#ctb'); if (!box || CT.tab !== k) return;
    const all = CT.lists[k] || [], s = CT.q[k].toLowerCase().trim();
    const rows = !s ? all : all.filter(r => Object.values(r).some(v => (typeof v === 'string' || typeof v === 'number') && String(v).toLowerCase().includes(s)) || refFields.some(f => String(ctName(f.ref, r[f.name])).toLowerCase().includes(s)));
    const canMove = w && !s && all.length > 1;
    box.innerHTML = `<div class="toolbar"><input type="search" id="ctq" placeholder="Search ${esc(t.label.toLowerCase())}…" value="${esc(CT.q[k])}" aria-label="Search ${esc(t.label)}"><span class="muted num" style="font-size:13px">${s ? rows.length + ' of ' : ''}${all.length} ${all.length === 1 ? 'record' : 'records'}</span><span class="sp"></span>${w ? `<button class="btn" id="ctadd">${ic('plus')} Add</button>` : ''}</div>
     ${table({ id: tid, rows, pageSize: 50, open: r => r.id, empty: s ? 'No matches.' : 'Nothing here yet.', cols: [
       { k: 'title', label: esc(fLabel(tf)), html: r => `<span class="${hasImg ? 'pkgc' : ''}">${hasImg ? ctImg(r.image) : ''}<span><b>${esc(r[t.title] || r.id)}</b><small class="num">${esc(r.id)}</small></span></span>` },
       ...ctCols(t).map((c, i) => ({ k: 'c' + i, ...c })),
       { k: 'active', label: 'Status', html: r => chip(r.active ? 'Published' : 'Unpublished') },
       { k: 'acts', label: '<span class="sr">Actions</span>', cls: 'r', html: r => { const u = ctLink(k, r), i = all.indexOf(r); return `<span class="ct-acts">${u ? `<a class="icon-btn" href="${esc(u)}" target="_blank" rel="noopener" title="View on website" aria-label="View on website" data-stop>${ic('ext')}</a>` : ''}${canMove ? `<button type="button" class="icon-btn" data-mv="-1" data-id="${esc(r.id)}" title="Move up" aria-label="Move up" ${i > 0 ? '' : 'disabled'}>${ic('up')}</button><button type="button" class="icon-btn" data-mv="1" data-id="${esc(r.id)}" title="Move down" aria-label="Move down" ${i < all.length - 1 ? '' : 'disabled'}>${ic('down')}</button>` : ''}</span>`; } }] })}
     ${w && all.length > 1 ? `<p class="muted" style="font-size:12.5px;margin:0">${s ? 'Clear the search to change the display order.' : 'Use the arrows to change the order shown on the website.'}</p>` : ''}`;
    const q = $('#ctq', box); q.oninput = () => { CT.q[k] = q.value; clearTimeout(draw.t); draw.t = setTimeout(() => { if (TBL[tid]) TBL[tid].page = 0; draw(); const n = $('#ctq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
    const add = $('#ctadd', box); if (add) add.onclick = () => ctDrawer(t, null, draw);
    bindTable(box, tid, draw, id => { setHash('#/content/' + k + '/' + encodeURIComponent(id)); ctDrawer(t, id, draw); });
    $$('[data-stop]', box).forEach(a => { a.onclick = e => e.stopPropagation(); a.onkeydown = e => e.stopPropagation(); });
    $$('[data-mv]', box).forEach(b => { b.onkeydown = e => e.stopPropagation(); b.onclick = async e => {
      e.stopPropagation(); const list = CT.lists[k], id = b.dataset.id, dir = +b.dataset.mv, i = list.findIndex(x => x.id === id), j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      const next = list.slice(); [next[i], next[j]] = [next[j], next[i]]; b.disabled = true;
      try { await http('POST', `content/${k}/_reorder`, { ids: next.map(x => x.id) }); next.forEach((x, n) => { x.sortOrder = (n + 1) * 10; }); CT.lists[k] = next; draw(); toast('Order saved — live on the website'); refreshCat();
        const nb = $(`[data-mv="${dir}"][data-id="${CSS.escape(id)}"]`); if (nb && !nb.disabled) nb.focus(); }
      catch (err) { fail(err); draw(); } }; });
  };
  draw();
  if (openId) ctDrawer(t, openId, draw);
}

/* ---------- editor: one control per field kind ---------- */
const JSON_HINT = { table: 'Rows of cells; the first row is the header, e.g. [["", "Bali", "Maldives"], ["Best time", "Apr–Oct", "Nov–Apr"]]', languages: 'List of text, e.g. ["Hindi", "English"]', interests: 'List of text, e.g. ["Trekking", "Photography"]', verified: 'List of text, e.g. ["ID", "Phone", "Email"]', trips: 'List of [destination id, month] pairs, e.g. [["ladakh", "Jun 2027"]]' };
function ctField(f, v, attr, o = {}) {
  const dis = o.dis || '', lab = esc(fLabel(f)) + (f.required ? ' *' : ''), a = `${attr}="${esc(f.name)}"`;
  const wide = ['text', 'json', 'image'].includes(f.kind) || (f.kind === 'string' && (f.max || 0) >= 160);
  const cls = 'fld' + (wide ? ' full' : '');
  switch (f.kind) {
    case 'slug': return `<label class="${cls}"><span>${lab}</span><input ${a} value="${esc(v)}" maxlength="${f.max || 64}" autocomplete="off" spellcheck="false" class="mono" ${o.isNew ? dis : 'readonly'}><small class="ct-hint">${o.isNew ? 'Lower-case letters, digits and hyphens. Filled in from the name until you edit it.' : 'Part of the page URL — cannot be changed.'}</small></label>`;
    case 'text': return `<label class="${cls}"><span>${lab}</span><textarea ${a} rows="4" ${dis}>${esc(v)}</textarea></label>`;
    case 'int': case 'number': return `<label class="${cls}"><span>${lab}</span><input type="number" ${a} value="${v == null ? '' : esc(v)}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} step="${f.kind === 'int' ? 1 : 'any'}" ${dis}></label>`;
    case 'bool': return f.nullable ? `<label class="${cls}"><span>${lab}</span><select ${a} data-nb ${dis}>${opt([['', 'Not set'], ['true', 'Yes'], ['false', 'No']], v == null ? '' : String(!!v))}</select></label>`
      : `<label class="chk ${f.name === 'active' ? 'full' : ''}"><input type="checkbox" ${a} ${v ? 'checked' : ''} ${dis}> ${f.name === 'active' ? '<b>Published</b> — shown on the website' : lab}</label>`;
    case 'enum': return `<label class="${cls}"><span>${lab}</span><select ${a} ${dis}>${opt(f.values.map(x => [x, (f.labels && f.labels[x]) || x]), v)}</select></label>`;
    case 'ref': { const list = CT.lists[f.ref] || [], rt = ctType(f.ref), has = v && list.some(x => x.id === v);
      return `<label class="${cls}"><span>${lab}</span><select ${a} ${dis}>${f.required && v ? '' : `<option value="">${f.nullable || !f.required ? '— None —' : 'Choose…'}</option>`}${v && !has ? `<option value="${esc(v)}" selected>${esc(v)} (missing)</option>` : ''}${opt(list.map(x => [x.id, ((rt && x[rt.title]) || x.id) + (x.active === false ? ' (unpublished)' : '')]), v)}</select></label>`; }
    case 'date': return `<label class="${cls}"><span>${lab}</span><input type="date" ${a} value="${esc(v)}" ${dis}></label>`;
    case 'image': { const imgs = ((CT.meta && CT.meta.images) || []).slice(); if (v && !imgs.includes(v)) imgs.unshift(v);
      return `<div class="${cls}"><span>${lab}</span><div class="ct-img">${ctImg(v, 'ct-thumb')}<select ${a} data-img aria-label="${lab}" ${dis}><option value="">— No image —</option>${opt(imgs, v)}</select></div></div>`; }
    case 'color': return `<div class="${cls}"><span>${lab}</span><div class="ct-color"><input type="color" data-colorpick value="${esc(/^#[0-9a-f]{6}$/i.test(v || '') ? v : '#000000')}" aria-label="${lab} picker" ${dis}><input ${a} value="${esc(v)}" maxlength="7" placeholder="#rrggbb" class="mono" aria-label="${lab}" ${dis}></div></div>`;
    case 'json': { const txt = prettyJson(v); return `<label class="fld full"><span>${lab} <small class="muted">JSON</small></span><textarea ${a} data-json class="mono" spellcheck="false" rows="${Math.min(14, Math.max(3, txt.split('\n').length + 1))}" ${dis}>${esc(txt)}</textarea>${JSON_HINT[f.name] ? `<small class="ct-hint">${esc(JSON_HINT[f.name])}</small>` : ''}</label>`; }
    default: return `<label class="${cls}"><span>${lab}</span><input ${a} value="${esc(v)}" ${f.max ? `maxlength="${f.max}"` : ''} ${dis}></label>`;
  }
}
const rowWord = l => l.name === 'days' ? 'Day' : l.name === 'sections' ? 'Section' : 'Row';
const ctRow = (l, x, dis) => `<div class="ct-row"><div class="ct-row-h"><b class="ct-rn"></b><span class="sp"></span>${dis ? '' : `<button type="button" class="icon-btn" data-rmv="-1" title="Move up" aria-label="Move up">${ic('up')}</button><button type="button" class="icon-btn" data-rmv="1" title="Move down" aria-label="Move down">${ic('down')}</button><button type="button" class="icon-btn" data-rdel title="Remove" aria-label="Remove">${ic('x')}</button>`}</div><div class="fg">${l.fields.map(f => ctField(f, (x || {})[f.name], 'data-rf', { dis })).join('')}</div></div>`;
function ctListHtml(l, arr, dis) {
  if (l.scalar) {
    const sc = l.scalar;
    if (sc.kind === 'ref' || sc.kind === 'image') {
      const rt = sc.kind === 'ref' ? ctType(sc.ref) : null;
      const opts = sc.kind === 'ref' ? (CT.lists[sc.ref] || []).map(x => [x.id, (rt && x[rt.title]) || x.id]) : ((CT.meta && CT.meta.images) || []).map(x => [x, x]);
      const ids = new Set(opts.map(o => o[0])); arr.filter(v => !ids.has(v)).reverse().forEach(v => opts.unshift([v, v + ' (missing)']));
      return `<div class="fld full"><span>${esc(l.label)} <small class="muted" data-cnt>${arr.length} selected</small></span>${opts.length > 14 ? `<input type="search" data-ckq placeholder="Filter…" aria-label="Filter ${esc(l.label)}">` : ''}
        <div class="ckg${sc.kind === 'image' ? ' ct-imgs' : ''}" data-list="${esc(l.name)}" data-order="${esc(JSON.stringify(arr))}">${opts.map(([v, lab]) => `<label class="chk" data-fn="${esc(String(lab).toLowerCase())}"><input type="checkbox" value="${esc(v)}" ${arr.includes(v) ? 'checked' : ''} ${dis}>${sc.kind === 'image' ? ctImg(v, 'ct-mini') : ''} ${esc(lab)}</label>`).join('') || '<span class="muted">Nothing to choose from yet.</span>'}</div></div>`;
    }
    return `<label class="fld full"><span>${esc(l.label)} <small class="muted">one per line</small></span><textarea data-list="${esc(l.name)}" rows="${Math.min(12, Math.max(3, arr.length + 1))}" ${dis}>${esc(arr.join('\n'))}</textarea></label>`;
  }
  return `<div class="sect"><h4>${esc(l.label)}</h4><div class="ct-rows" data-rows="${esc(l.name)}" data-word="${rowWord(l)}">${arr.map(x => ctRow(l, x, dis)).join('')}</div>${arr.length || !dis ? '' : '<p class="muted" style="margin:0">None.</p>'}${dis ? '' : `<div><button type="button" class="btn g sm" data-addrow="${esc(l.name)}">${ic('plus')} Add ${rowWord(l).toLowerCase()}</button></div>`}</div>`;
}
const ctOneHtml = (o, v, dis) => `<div class="sect"><label class="chk"><input type="checkbox" data-has="${esc(o.name)}" ${v ? 'checked' : ''} ${dis}> <b>Has ${esc(o.label)}</b></label><fieldset class="fg ct-one" data-one="${esc(o.name)}" ${v ? '' : 'hidden'}><legend class="sr">${esc(o.label)}</legend>${o.fields.map(f => ctField(f, (v || {})[f.name], 'data-of', { dis })).join('')}</fieldset></div>`;
function ctBlank(t) {
  const r = {};
  t.fields.forEach(f => { if (f.name === 'sortOrder') return; r[f.name] = f.default !== undefined ? f.default : f.kind === 'bool' ? (f.nullable ? null : false) : f.kind === 'json' ? null : ''; });
  t.lists.forEach(l => { r[l.name] = []; }); t.ones.forEach(o => { r[o.name] = null; });
  if (t.key === 'packages') r.days = [{ title: '', details: '' }];
  return r;
}
function ctRead(f, el, errs, label) {
  if (!el) return undefined;
  if (f.kind === 'bool') return el.matches('[data-nb]') ? (el.value === '' ? null : el.value === 'true') : el.checked;
  if ((f.kind === 'int' || f.kind === 'number') && el.validity && el.validity.badInput) { errs.push(`${label} must be a number`); return undefined; }
  const s = el.value.trim();
  if (f.kind === 'int' || f.kind === 'number') return s === '' ? null : Number(s);
  if (f.kind === 'json') { if (!s) return null; try { return JSON.parse(s); } catch (e) { errs.push(`${label}: not valid JSON (${e.message})`); return undefined; } }
  if (f.kind === 'ref' || f.nullable) return s || null;
  return s;
}
const isBlank = v => v === '' || v == null;
function ctReadGroup(fields, scope, attr, errs, prefix) {
  const o = {}; fields.forEach(f => { const label = prefix + fLabel(f), v = ctRead(f, $(`[${attr}="${f.name}"]`, scope), errs, label); if (v === undefined) return; o[f.name] = v; }); return o;
}
const reqCheck = (fields, o, errs, prefix) => fields.forEach(f => { if (f.required && isBlank(o[f.name])) errs.push(`${prefix}${fLabel(f)} is required`); });
function ctSerialize(t, form) {
  const errs = [], out = ctReadGroup(t.fields, form, 'data-cf', errs, '');
  reqCheck(t.fields, out, errs, '');
  t.lists.forEach(l => {
    if (l.scalar) {
      const box = $(`[data-list="${l.name}"]`, form); if (!box) return;
      if (box.matches('textarea')) out[l.name] = box.value.split('\n').map(x => x.trim()).filter(Boolean);
      else { let orig = []; try { orig = JSON.parse(box.dataset.order || '[]'); } catch (e) { /* ignore */ } const on = $$('input:checked', box).map(i => i.value); out[l.name] = [...orig.filter(v => on.includes(v)), ...on.filter(v => !orig.includes(v))]; }
    } else {
      const rows = $$(`[data-rows="${l.name}"] > .ct-row`, form).map((row, i) => ctReadGroup(l.fields, row, 'data-rf', errs, `${l.label} #${i + 1}: `)).filter(o => Object.values(o).some(v => !isBlank(v)));
      rows.forEach((o, i) => reqCheck(l.fields, o, errs, `${rowWord(l)} ${i + 1}: `)); out[l.name] = rows;
    }
  });
  t.ones.forEach(o => {
    const cb = $(`[data-has="${o.name}"]`, form); if (!cb || !cb.checked) { out[o.name] = null; return; }
    const x = ctReadGroup(o.fields, $(`[data-one="${o.name}"]`, form), 'data-of', errs, o.label + ': '); reqCheck(o.fields, x, errs, o.label + ': '); out[o.name] = x;
  });
  return { out, errs };
}
function ctBind(form) {
  const renum = () => $$('.ct-rows', form).forEach(box => { const rows = $$(':scope > .ct-row', box); rows.forEach((r, i) => { $('.ct-rn', r).textContent = box.dataset.word + ' ' + (i + 1); const u = $('[data-rmv="-1"]', r), d = $('[data-rmv="1"]', r); if (u) u.disabled = i === 0; if (d) d.disabled = i === rows.length - 1; }); });
  renum();
  form.addEventListener('click', e => {
    const add = e.target.closest('[data-addrow]');
    if (add) { const t = ctType(CT.tab), l = t && t.lists.find(x => x.name === add.dataset.addrow); if (!l) return; const box = $(`[data-rows="${l.name}"]`, form); box.insertAdjacentHTML('beforeend', ctRow(l, {}, '')); renum(); const f = $('.ct-row:last-child input,.ct-row:last-child textarea', box); if (f) f.focus(); return; }
    const del = e.target.closest('[data-rdel]'); if (del) { del.closest('.ct-row').remove(); renum(); return; }
    const mv = e.target.closest('[data-rmv]');
    if (mv) { const row = mv.closest('.ct-row'); if (+mv.dataset.rmv < 0 && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling); else if (+mv.dataset.rmv > 0 && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row); renum(); if (!mv.disabled) mv.focus(); }
  });
  form.addEventListener('change', e => {
    const el = e.target;
    if (el.matches('[data-img]')) { const img = $('img', el.closest('.ct-img')); img.hidden = !el.value; img.style.visibility = ''; if (el.value) img.src = IMGB + el.value + '.jpg'; }
    if (el.matches('[data-has]')) { const fs = $(`[data-one="${el.dataset.has}"]`, form); fs.hidden = !el.checked; }
    if (el.closest('.ckg')) { const c = $('[data-cnt]', el.closest('.fld')); if (c) c.textContent = $$('input:checked', el.closest('.ckg')).length + ' selected'; }
  });
  form.addEventListener('input', e => {
    const el = e.target;
    if (el.matches('[data-colorpick]')) { const tx = el.nextElementSibling; tx.value = el.value; }
    else if (el.closest('.ct-color')) { const pk = $('[data-colorpick]', el.closest('.ct-color')); if (/^#[0-9a-f]{6}$/i.test(el.value.trim())) pk.value = el.value.trim(); }
    if (el.matches('[data-ckq]')) { const q = el.value.toLowerCase(); $$('[data-fn]', el.closest('.fld')).forEach(l => { l.hidden = !!q && !l.dataset.fn.includes(q); }); }
  });
}
async function ctDrawer(t, id, redraw) {
  const k = t.key, w = can('content', 'w'), cd = can('content', 'd'), dis = w ? '' : 'disabled';
  let r;
  try { r = id ? await http('GET', `content/${k}/${encodeURIComponent(id)}`) : ctBlank(t); await Promise.all(ctRefKeys(t).map(x => ctList(x))); } catch (e) { setHash('#/content/' + k); return fail(e); }
  const url = id ? ctLink(k, r) : '', name = r[t.title] || id;
  openDrawer(id ? `${t.label} · ${name}` : `Add to ${t.label}`, `<form id="ctf" class="ct-form" novalidate>
    ${!w ? `<p class="notice" style="margin:0">${ic('shield')} Read-only — your role can view website content but not change it.</p>` : ''}
    ${url ? `<div class="acts"><a class="btn g sm" href="${esc(url)}" target="_blank" rel="noopener">${ic('ext')} View on website</a></div>` : ''}
    <div class="fg">${t.fields.map(f => ctField(f, r[f.name], 'data-cf', { dis, isNew: !id })).join('')}</div>
    ${t.lists.map(l => ctListHtml(l, r[l.name] || [], dis)).join('')}
    ${t.ones.map(o => ctOneHtml(o, r[o.name], dis)).join('')}
    <div class="ct-err" id="cterr" role="alert" hidden></div>
    ${w ? `<div class="sect"><div class="acts"><button class="btn" type="submit" id="ctsave">${ic('check')} ${id ? 'Save' : 'Create'}</button>${id && cd ? '<button class="btn d" type="button" id="ctdel">Delete</button>' : ''}</div><p class="muted" style="font-size:12.5px;margin:0">Saved changes are live on the website immediately.</p></div>` : ''}</form>`, root => {
    const dw = $('#dw-b').closest('.dw'); dw.classList.add('wide');
    dwClose = () => { dw.classList.remove('wide'); setHash('#/content/' + k); };
    const form = $('#ctf', root), errBox = $('#cterr', root); ctBind(form);
    const showErr = (list, extra = '') => { errBox.hidden = !list.length && !extra; errBox.innerHTML = list.length ? `<b>Please fix:</b><ul>${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${extra}` : extra; if (!errBox.hidden) errBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
    const after = async msg => { toast(msg); closeDrawer(); try { await ctList(k, true); } catch (e) { fail(e); } redraw(); refreshCat(); };
    if (!id) { const sl = $('[data-cf="id"]', form), ti = $(`[data-cf="${t.title}"]`, form); if (sl && ti) { let auto = true; sl.addEventListener('input', () => { auto = !sl.value; }); ti.addEventListener('input', () => { if (auto) sl.value = slugify(ti.value); }); } }
    if (!w) return;
    form.onsubmit = async e => {
      e.preventDefault(); const { out, errs } = ctSerialize(t, form);
      if (!id && out.id && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(out.id)) errs.push('ID: use lower-case letters, digits and hyphens');
      showErr(errs); if (errs.length) return toast(errs[0], true);
      if (out.sortOrder == null) delete out.sortOrder;
      if (id) delete out.id;
      const btn = $('#ctsave', form); btn.disabled = true;
      try { if (id) await http('PATCH', `content/${k}/${encodeURIComponent(id)}`, out); else await http('POST', 'content/' + k, out); await after('Saved — live on the website'); }
      catch (err) { btn.disabled = false; showErr(err.fields && err.fields.length ? err.fields : [err.message]); fail(err); }
    };
    const del = $('#ctdel', form); if (del) del.onclick = async () => {
      if (!confirmInline(del)) return;
      try { await http('DELETE', `content/${k}/${encodeURIComponent(id)}`); await after('Deleted — removed from the website'); }
      catch (err) {
        if (err.status !== 409) return fail(err);
        showErr([], `<b>Cannot delete “${esc(name)}”.</b> ${esc(err.message)}${r.active ? `<div class="acts" style="margin-top:8px"><button type="button" class="btn g sm" id="ctunpub">Unpublish instead</button></div>` : ''}`); toast('Cannot delete — still in use', true);
        const up = $('#ctunpub', form); if (up) up.onclick = async () => { try { await http('PATCH', `content/${k}/${encodeURIComponent(id)}`, { active: false }); await after('Unpublished — hidden on the website'); } catch (e2) { fail(e2); } };
      }
    };
  });
}

/* ---------- site configuration (settings keys not on the Site settings screen) ---------- */
async function ctSite() {
  const w = can('settings', 'w'), dis = w ? '' : 'disabled';
  let site = {}, cont = {}, hasCont = true;
  try { site = await api.get('settings', 'site'); } catch (e) { fail(e); }
  try { cont = await api.get('settings', 'content'); } catch (e) { hasCont = false; }
  const box = $('#ctb'); if (!box || CT.tab !== 'site') return;
  const jf = (label, name, v, hint) => `<label class="fld full"><span>${label} <small class="muted">JSON</small></span><textarea name="${name}" class="mono" spellcheck="false" rows="${Math.min(14, Math.max(3, prettyJson(v).split('\n').length + 1))}" ${dis}>${esc(prettyJson(v))}</textarea><small class="ct-hint">${esc(hint)}</small></label>`;
  box.innerHTML = `<form class="card" id="csf" novalidate><h3>${ic('gear')} Site configuration</h3>
   <p class="muted" style="font-size:13px;margin-top:0">Brand, social links and homepage content used across the website. Phone, email, payment details and the announcement bar are in <a href="#/settings">Site settings</a>.</p>
   <div class="fg">
    ${fld('Brand name', 'brand', site.brand || '', 'text', 'maxlength="60" ' + dis)}${fld('Website domain', 'domain', site.domain || '', 'text', 'placeholder="www.trippartner.com" ' + dis)}
    ${fld('YouTube channel URL', 'youtube', site.youtube || '', 'text', 'placeholder="https://www.youtube.com/@…" ' + dis)}${fld('Instagram URL', 'instagram', site.instagram || '', 'text', 'placeholder="https://www.instagram.com/…" ' + dis)}
    ${fld('Travellers served (shown on the website)', 'travellers', site.travellers || 0, 'number', 'min="0" step="1" ' + dis)}
    <div class="fld" style="align-content:end">${chk('Show sample travel partner profiles', 'demo', site.demo)}</div>
    ${fld('Pickup points (one per line)', 'pickups', (site.pickups || []).join('\n'), 'textarea', 'rows="5" ' + dis)}
    ${fld('Homepage search suggestions (one per line)', 'searchHints', (cont.searchHints || []).join('\n'), 'textarea', 'rows="6" ' + dis)}
    ${jf('Press mentions', 'press', site.press || [], 'List of {"name", "logo", "url"} — e.g. [{"name": "The Hindu", "logo": "img/press-hindu.png", "url": "https://…"}]. Empty list = sample slots while sample profiles are on.')}
    ${jf('Accreditations', 'accreditations', site.accreditations || [], 'List of {"name", "logo"} — add only accreditations you actually hold.')}
    ${jf('Awards', 'awards', site.awards || [], 'List of awards, same shape as press mentions.')}
    ${jf('Homepage showreel', 'showreel', cont.showreel || { src: 'showreel', step: 2.3, chapters: [] }, 'Object: {"src": video name, "step": seconds per chapter, "chapters": [[image, label], …]}')}
   </div>
   ${w ? `<div class="acts" style="margin-top:12px"><button class="btn" type="submit">${ic('check')} Save site configuration</button></div>` : '<p class="muted">Only an admin can change site configuration.</p>'}</form>`;
  const f = $('#csf'); if (!w) { $$('input,select,textarea', f).forEach(i => i.disabled = true); return; }
  f.onsubmit = async e => {
    e.preventDefault(); const x = formData(f), errs = [], lines = s => String(s || '').split('\n').map(v => v.trim()).filter(Boolean);
    const pj = (name, label, want) => { const s = String(x[name] || '').trim(); if (!s) return want === 'array' ? [] : null; try { const v = JSON.parse(s); if (want === 'array' ? !Array.isArray(v) : (!v || typeof v !== 'object' || Array.isArray(v))) { errs.push(`${label} must be a JSON ${want === 'array' ? 'list [ … ]' : 'object { … }'}`); return undefined; } return v; } catch (er) { errs.push(`${label}: not valid JSON (${er.message})`); return undefined; } };
    const siteBody = { brand: x.brand, domain: String(x.domain).replace(/^https?:\/\//, '').replace(/\/.*$/, ''), pickups: lines(x.pickups), demo: !!x.demo, youtube: x.youtube, instagram: x.instagram, travellers: Math.max(0, Math.round(+x.travellers || 0)), press: pj('press', 'Press mentions', 'array'), accreditations: pj('accreditations', 'Accreditations', 'array'), awards: pj('awards', 'Awards', 'array') };
    const contBody = { searchHints: lines(x.searchHints), showreel: pj('showreel', 'Homepage showreel', 'object') };
    if (!siteBody.brand) errs.push('Brand name is required');
    if (errs.length) return toast(errs.join(' · '), true);
    if (contBody.showreel === null) delete contBody.showreel;
    try { await api.update('settings', 'site', siteBody); if (hasCont) await api.update('settings', 'content', contBody); else await api.create('settings', { id: 'content', ...contBody }); toast('Saved — live on the website'); refreshCat(); ctSite(); } catch (err) { fail(err); }
  };
}

/* =====================================================================
   Boot
   ===================================================================== */
function start() { shell(); route(); }
async function boot() {
  try { const t = localStorage.getItem('tp_admin_theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* ignore */ }
  try { CAT = { ...CAT, ...(window.TP_CATALOG || await (await fetch('catalog.json')).json()) }; } catch (e) { /* catalogue optional */ }
  try {
    if (window.TP_DEMO) throw new Error('demo');
    const r = await fetch(API_BASE + 'auth/me', { credentials: 'include' });
    if (!(r.headers.get('content-type') || '').includes('json')) throw new Error('no api');
    MODE = 'live'; if (r.ok) ME = (await r.json()).staff;
  } catch (e) { MODE = 'demo'; Mock.init(); }
  document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDrawer(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#drawer').hidden) closeDrawer(); });
  window.addEventListener('hashchange', route);
  ME ? start() : renderLogin();
}
boot();
})();
