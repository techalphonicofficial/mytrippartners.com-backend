/* Express middleware: async wrapper, security headers + CORS, rate limiting, authentication, errors. */
const config = require('../config');
const logger = require('../utils/logger');
const AuthService = require('../services/AuthService');
const { tooMany } = require('../utils/errors');

/* lets route handlers be async functions; rejected promises go to the error handler */
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function securityHeaders(req, res, next) {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' });
  const o = req.headers.origin;
  if (o && config.origins.includes(o) && req.path.startsWith('/api/public/')) {
    res.set({ 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST', Vary: 'Origin' });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
}

/* sliding-window rate limit per IP + path (in memory; one process) */
const hits = new Map();
setInterval(() => { const cut = Date.now() - 3600e3; for (const [k, a] of hits) if (!a.length || a[a.length - 1] < cut) hits.delete(k); }, 600e3).unref();
const rateLimit = (n, ms, tag = '') => (req, res, next) => {
  const k = tag + req.ip + req.path, t = Date.now();
  const a = (hits.get(k) || []).filter(x => x > t - ms);
  if (a.length >= n) return next(tooMany());
  a.push(t); hits.set(k, a); next();
};

const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(x => x[0]));
const tokenOf = req => (req.headers.authorization || '').replace(/^Bearer /, '') || cookies(req)[config.session.cookie] || '';

const authenticate = asyncHandler(async (req, res, next) => { req.staff = await AuthService.authenticate(tokenOf(req)); req.token = tokenOf(req); next(); });

/* JSON body limits: document uploads get more room */
const bodyLimits = express => {
  const small = express.json({ limit: '200kb' }), docs = express.json({ limit: '9mb' }), content = express.json({ limit: '2mb' });
  return (req, res, next) => (/^\/api\/public\/(partners\/[^/]+\/docs|bookings\/[^/]+\/proof)$/.test(req.path) ? docs : req.path.startsWith('/api/content') ? content : small)(req, res, next);
};

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'The upload is too large.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  if (err.expose && err.status) return res.status(err.status).json({ error: err.message, ...(err.extra || {}) });
  logger.error('request failed', { method: req.method, path: req.path, error: err.message, stack: config.env === 'production' ? undefined : err.stack });
  res.status(500).json({ error: 'Something went wrong.' });
}

module.exports = { asyncHandler, securityHeaders, rateLimit, authenticate, tokenOf, bodyLimits, errorHandler };
