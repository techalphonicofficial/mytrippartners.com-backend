/* Central configuration — every environment variable is read here and nowhere else. */
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const env = process.env;
const list = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);

const config = Object.freeze({
  env: env.NODE_ENV || 'development',
  port: +env.PORT || 8080,
  trustProxy: env.TRUST_PROXY || 'loopback',
  rootDir: ROOT,
  dataDir: path.resolve(ROOT, env.DATA_DIR || 'data'),
  backupDir: path.resolve(ROOT, env.BACKUP_DIR || 'backups'),
  /* photos the content editor can pick from (the website's public images) */
  imagesDir: path.resolve(ROOT, env.IMAGES_DIR || '../client/public/img'),
  adminDir: path.join(ROOT, 'admin'),
  origins: list(env.SITE_ORIGIN || 'https://www.trippartner.com,https://trippartner.com,http://localhost:8765'),
  admin: { email: (env.ADMIN_EMAIL || 'admin@trippartner.com').toLowerCase(), password: env.ADMIN_PASSWORD || '' },
  session: { ttlMs: 12 * 3600e3, cookie: 'tp_admin' },
  db: {
    host: env.MYSQL_HOST || '127.0.0.1',
    port: +env.MYSQL_PORT || 3306,
    user: env.MYSQL_USER || 'root',
    password: env.MYSQL_PASSWORD || '',
    database: env.MYSQL_DATABASE || 'trippartner',
    connectionLimit: +env.MYSQL_POOL || 10,
  },
  render: { cacheMax: +env.RENDER_CACHE_MAX || 2000 },
  /* Next.js website (client/): told to refresh its cached content whenever content changes */
  next: { url: (env.NEXT_URL || '').replace(/\/$/, ''), revalidateSecret: env.REVALIDATE_SECRET || '' },
});

module.exports = config;
