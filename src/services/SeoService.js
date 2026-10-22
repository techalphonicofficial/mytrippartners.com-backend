/* SEO dashboard data, "publish" and redirects.
   The website is the Next.js app (client/): it renders pages, pSEO pages, sitemap.xml and robots.txt from the
   site data. The dashboard's page list (titles + rendered H1s) comes from the website's /api/seo-pages. */
const config = require('../config');
const PSEO = require('../../admin/pseo-shared.js');
const { repos } = require('../repositories/RecordRepository');
const { now } = require('../utils/common');
const { forbidden, badRequest } = require('../utils/errors');
const { can } = require('./policy');
const Activity = require('./ActivityService');
const SiteDataService = require('./SiteDataService');
const { bus } = require('./events');
const logger = require('../utils/logger');

let rdCache = null;
bus.on('changed', e => { if (e.scope === 'redirects') rdCache = null; });

/* built-in pages of the website: [{ path, route, title, desc, img, prio, type, h1 }] (null when the website is unreachable) */
async function websitePages() {
  if (!config.next.url) return null;
  try {
    const r = await fetch(`${config.next.url}/api/seo-pages`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(180e3) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch (e) { logger.warn('website page list unavailable', { error: e.message }); return null; }
}

const SeoService = {
  websitePages,
  async data(staff) {
    if (!can(staff, 'seo_pages', 'r')) throw forbidden();
    const [base, site] = await Promise.all([websitePages(), SiteDataService.get()]);
    return { base: base || [], data: site.seoData, manifest: null, siteDir: !!base };
  },

  /* pages are rendered on request, so publishing = refresh the website's cache + record what is live */
  async publish(staff) {
    if (!['admin', 'ops'].includes(staff.role)) throw forbidden('Only admin or operations can publish.');
    const t0 = Date.now();
    SiteDataService.invalidate();
    const [base, site] = await Promise.all([websitePages(), SiteDataService.get()]);
    if (!base) throw badRequest('The website is not reachable. Check that the Next.js site is running and NEXT_URL is set in the backend .env.');
    const [overrides, templates, settings] = await Promise.all([repos.seo_pages.list(), repos.seo_templates.list(), repos.settings.get('seo')]);
    const inv = PSEO.inventory({ base, overrides, templates, data: site.seoData });
    const S = { ...PSEO.DEFAULT_SETTINGS, ...(settings || {}) };
    const builtIn = new Set(base.map(b => b.path));
    const tpl = inv.filter(p => p.kind === 'template' && p.status === 'Live');
    const live = inv.filter(p => p.kind === 'built-in' || (p.status === 'Live' && !p.thin));
    const report = { written: tpl.filter(p => !p.thin).length, removed: 0, patched: overrides.filter(o => builtIn.has(o.path)).length, restored: 0, skipped: [], sitemap: PSEO.sitemap(live, S.domain, now().slice(0, 10)).count, thin: tpl.filter(p => p.thin).length, errors: [], ms: Date.now() - t0, total: inv.length };
    const seo = (await repos.settings.get('seo')) || {};
    const hist = [{ at: now(), by: staff.name, ...report, skipped: 0, errors: [] }, ...(seo.history || [])].slice(0, 20);
    await repos.settings.update('seo', { lastPublish: hist[0], history: hist });
    await Activity.log(staff, 'published SEO pages', 'seo_pages', '', `${report.written} pSEO pages · ${report.patched} overrides · sitemap ${report.sitemap}`);
    return report;
  },

  /* old URL → redirect record (cached map; invalidated when redirects change) */
  async redirectFor(urlPath) {
    if (!rdCache || Date.now() - rdCache.at > 30e3) rdCache = { at: Date.now(), map: new Map((await repos.redirects.list()).filter(r => r.active !== false && r.from).map(r => [String(r.from).replace(/\/+$/, '') || '/', r])) };
    return rdCache.map.get(urlPath.replace(/\/+$/, '') || '/') || null;
  },
  /* active redirects for the website's proxy: [{ from, to, code }] */
  async publicRedirects() { await SeoService.redirectFor('/'); return [...rdCache.map.values()].map(r => ({ from: r.from, to: r.to, code: r.code || 301 })); },
  async hitByPath(from) { const r = await SeoService.redirectFor(String(from || '')); if (r) await SeoService.countHit(r); return { ok: !!r }; },
  async countHit(r) {
    r.hits = (+r.hits || 0) + 1;
    try { await repos.redirects.update(r.id, { hits: r.hits, lastHit: now() }); } catch (e) { /* counting is best-effort */ }
  },
};

module.exports = SeoService;
