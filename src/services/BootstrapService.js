/* First-run setup: admin account, default settings and SEO templates. Safe to run on every start. */
const crypto = require('crypto');
const config = require('../config');
const PSEO = require('../../admin/pseo-shared.js');
const { repos } = require('../repositories/RecordRepository');
const AuthService = require('./AuthService');
const logger = require('../utils/logger');

const BootstrapService = {
  async run() {
    const staff = await repos.staff.list();
    if (!staff.length) {
      const pw = config.admin.password || crypto.randomBytes(9).toString('base64url');
      await repos.staff.create({ name: 'Admin', email: config.admin.email, role: 'admin', active: true, pass: AuthService.hashPw(pw) });
      logger.info(`\n  First run: admin account created\n  Email:    ${config.admin.email}\n  Password: ${pw}\n  Change it after login (Staff page).\n`);
    }
    if (!(await repos.settings.get('site'))) await repos.settings.create({ phone: '+91 00000 00000', whatsapp: '910000000000', email: 'info@trippartner.com', support: 'support@trippartner.com', address: 'Noida, Uttar Pradesh, India', hours: 'Mon–Sat, 9:30 AM – 7:30 PM IST', announcement: '' }, 'site');
    if (!(await repos.settings.get('seo'))) await repos.settings.create({ ...PSEO.DEFAULT_SETTINGS }, 'seo');
    if (!(await repos.seo_templates.list()).length) for (const t of PSEO.DEFAULT_TEMPLATES) await repos.seo_templates.create(t, t.id);
    await AuthService.purgeExpiredSessions();
  },
};

module.exports = BootstrapService;
