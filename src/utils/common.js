/* Small shared helpers: ids, time, input sanitising. */
const crypto = require('crypto');

const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
/* 8 random upper-case characters (same format the dashboard has always used) */
const uid = (prefix = '') => prefix + crypto.randomBytes(6).toString('base64url').toUpperCase().replace(/[-_]/g, 'X');

/* ISO-8601 (UTC) ↔ MySQL DATETIME(3) */
const isoToDb = iso => { const d = iso ? new Date(iso) : new Date(); return (isNaN(d) ? new Date() : d).toISOString().replace('T', ' ').replace('Z', ''); };
const dbToIso = v => (v ? String(v).replace(' ', 'T') + (String(v).length === 19 ? '.000Z' : 'Z') : '');
const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));

/* input sanitising used by public endpoints */
const S = (v, max = 300) => String(v == null ? '' : v).slice(0, max).trim();
const N = (v, min = 0, max = 1e9) => Math.max(min, Math.min(max, Math.round(+v || 0)));
const digits10 = v => String(v || '').replace(/\D/g, '').slice(-10);
const phoneOk = p => /^[6-9]\d{9}$/.test(digits10(p));
const samePhone = (a, b) => digits10(a) === digits10(b) && String(b || '').replace(/\D/g, '').length >= 10;
const mask = v => { v = String(v || ''); return v.length > 4 ? '•'.repeat(Math.min(8, v.length - 4)) + v.slice(-4) : v; };
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');

module.exports = { now, today, uid, isoToDb, dbToIso, isDate, S, N, digits10, phoneOk, samePhone, mask, inr };
