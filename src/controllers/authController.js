const config = require('../config');
const AuthService = require('../services/AuthService');

const cookie = (req, token, maxAge) => `${config.session.cookie}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${req.secure ? '; Secure' : ''}`;

module.exports = {
  async login(req, res) {
    const { email = '', password = '' } = req.body || {};
    const r = await AuthService.login(email, password);
    res.set('Set-Cookie', cookie(req, r.token, config.session.ttlMs / 1000));
    res.json(r);
  },
  async logout(req, res) {
    await AuthService.logout(req.token);
    res.set('Set-Cookie', cookie(req, '', 0));
    res.json({ ok: true });
  },
  me: (req, res) => res.json({ staff: AuthService.publicStaff(req.staff) }),
  async changePassword(req, res) {
    const { current, next } = req.body || {};
    await AuthService.changePassword(req.staff, current, next);
    res.json({ ok: true });
  },
};
