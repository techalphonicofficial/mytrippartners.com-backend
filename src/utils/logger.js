/* Minimal structured logger (JSON lines in production, readable text in development). */
const config = require('../config');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const min = LEVELS[process.env.LOG_LEVEL] || (config.env === 'test' ? LEVELS.warn : LEVELS.info);

function write(level, msg, meta) {
  if (LEVELS[level] < min) return;
  const out = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  if (config.env === 'production') out.write(JSON.stringify({ t: new Date().toISOString(), level, msg, ...meta }) + '\n');
  else out.write(`${level.toUpperCase().padEnd(5)} ${msg}${meta && Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}\n`);
}

module.exports = {
  debug: (m, x) => write('debug', m, x),
  info: (m, x) => write('info', m, x),
  warn: (m, x) => write('warn', m, x),
  error: (m, x) => write('error', m, x),
};
