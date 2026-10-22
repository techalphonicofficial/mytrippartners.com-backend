/* Staff authentication: scrypt password hashes, opaque session tokens stored in MySQL. */
const crypto = require('crypto');
const config = require('../config');
const { getPool } = require('../db/pool');
const { repos } = require('../repositories/RecordRepository');
const { isoToDb } = require('../utils/common');
const { badRequest, unauthorized } = require('../utils/errors');
const Activity = require('./ActivityService');

const hashPw = (pw, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
const checkPw = (pw, stored) => {
  const [salt, h] = String(stored || '').split(':'); if (!salt || !h) return false;
  const a = Buffer.from(h, 'hex'), b = crypto.scryptSync(pw, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const publicStaff = s => s && (({ pass, ...r }) => r)(s);

const AuthService = {
  hashPw, checkPw, publicStaff,

  async login(email, password) {
    const s = await repos.staff.findBy('email', String(email || '').toLowerCase().trim());
    if (!s || !s.active || !checkPw(String(password || ''), s.pass)) throw unauthorized('Email or password is incorrect.');
    const token = crypto.randomBytes(32).toString('hex');
    await getPool().query('INSERT INTO staff_sessions (token,staff_id,expires_at,created_at) VALUES (?,?,?,?)', [token, s.id, Date.now() + config.session.ttlMs, isoToDb()]);
    await Activity.log(s, 'login', 'staff', s.id);
    return { token, staff: publicStaff(s) };
  },

  async logout(token) { if (token) await getPool().query('DELETE FROM staff_sessions WHERE token=?', [token]); },

  /* token → active staff member (or throws 401) */
  async authenticate(token) {
    if (!token) throw unauthorized();
    const [rows] = await getPool().query('SELECT staff_id, expires_at FROM staff_sessions WHERE token=?', [token]);
    if (!rows.length || Number(rows[0].expires_at) < Date.now()) throw unauthorized();
    const staff = await repos.staff.get(rows[0].staff_id);
    if (!staff || !staff.active) throw unauthorized('Account disabled.');
    return staff;
  },

  async changePassword(staff, current, next) {
    if (!checkPw(String(current || ''), staff.pass)) throw badRequest('Current password is incorrect.');
    if (String(next || '').length < 8) throw badRequest('New password must be at least 8 characters.');
    await repos.staff.update(staff.id, { pass: hashPw(String(next)) });
    await Activity.log(staff, 'changed password', 'staff', staff.id);
  },

  async purgeExpiredSessions() { await getPool().query('DELETE FROM staff_sessions WHERE expires_at < ?', [Date.now()]); },
};

module.exports = AuthService;
