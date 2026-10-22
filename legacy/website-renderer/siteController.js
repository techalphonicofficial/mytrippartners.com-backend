/* Public website: server-rendered pages, generated assets (content.js, sitemap, robots), redirects, 404. */
const RenderService = require('../services/RenderService');
const SeoService = require('../services/SeoService');

const isPagePath = p => !/\.[a-z0-9]{2,5}$/i.test(p); /* /destinations/goa/ yes, /img/goa.jpg no */

const send = (req, res, type, body, version, maxAge = 300) => {
  const etag = `"${version}"`;
  res.set({ 'Content-Type': type, ETag: etag, 'Cache-Control': `public, max-age=${maxAge}` });
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  res.send(body);
};

module.exports = {
  /* old URLs → new URLs (managed in SEO → Redirects) */
  async redirects(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const r = await SeoService.redirectFor(req.path); if (!r) return next();
    SeoService.countHit(r);
    res.redirect(r.code || 301, r.to);
  },
  async contentJs(req, res) {
    const s = await RenderService.snapshot();
    send(req, res, 'application/javascript; charset=utf-8', s.contentJs, s.contentVersion, req.query.v === s.contentVersion ? 31536000 : 60);
  },
  async sitemap(req, res) { const s = await RenderService.snapshot(); const sm = s.renderer.sitemap(); send(req, res, 'application/xml; charset=utf-8', sm.xml, s.id, 3600); },
  async robots(req, res) { const s = await RenderService.snapshot(); send(req, res, 'text/plain; charset=utf-8', s.renderer.robots(), s.id, 3600); },
  async page(req, res, next) {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || !isPagePath(req.path)) return next();
    /* canonical URLs end with a slash */
    if (!req.path.endsWith('/')) return res.redirect(301, req.path + '/' + (req.url.slice(req.path.length) || ''));
    let urlPath; try { urlPath = decodeURIComponent(req.path); } catch (e) { return next(); } /* malformed URL → 404 */
    const s = await RenderService.snapshot();
    const out = s.renderer.render(urlPath);
    if (!out) return next();
    res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', ETag: `"${s.id}"` });
    if (req.headers["if-none-match"] === `"${s.id}"`) return res.status(304).end();
    res.status(out.status).send(out.html);
  },
  async notFound(req, res, next) {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    const s = await RenderService.snapshot();
    res.status(404).set('Content-Type', 'text/html; charset=utf-8').send(s.renderer.notFound());
  },
};
