/* =====================================================================
   Website data for the Next.js frontend (GET /api/public/site).
   One cached JSON payload: published content in the website's data shapes, dashboard price/visibility
   overrides, published reviews and SEO data (overrides, templates, settings).
   Rebuilt after any change; the Next.js site is told to revalidate (on-demand ISR).
   ===================================================================== */
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { repos } = require('../repositories/RecordRepository');
const ContentService = require('./ContentService');
const { bus } = require('./events');
const PSEO = require('../../admin/pseo-shared.js');

let cached = null, building = null;

async function build() {
  const { model, blocked } = await ContentService.siteModel();
  const [reviews, overrides, templates, seo] = await Promise.all([repos.reviews.list(), repos.seo_pages.list(), repos.seo_templates.list(), repos.settings.get('seo')]);
  const { history, lastPublish, ...seoSettings } = seo || {};
  /* programmatic SEO pages from the Live templates (rendered by the Next.js site at their path) */
  const data = {
    dests: model.DEST.map(d => ({ id: d.id, name: d.name, short: d.short, type: d.type, region: d.region, img: d.img, best: d.best, hl: d.hl, about: d.about, air: d.air, price: (ps => (ps.length ? Math.min(...ps) : d.price))(model.PKG.filter(p => p.dest === d.id).map(p => p.price)) })), /* from-price = cheapest package (as the site shows) */
    packages: model.PKG.filter(p => !blocked.has(p.id)).map(p => ({ id: p.id, title: p.title, dest: p.dest, n: p.n, price: p.price, img: p.img, themes: p.themes || [], tag: p.tag || '' })),
    themes: model.THEMES.map(t => ({ id: t.id, name: t.name })),
  };
  const live = templates.filter(t => t.status === 'Live');
  const pages = PSEO.expandAll(live, data, { max: +seoSettings.maxPerTemplate || PSEO.DEFAULT_SETTINGS.maxPerTemplate });
  const body = {
    model,
    blocked: [...blocked],
    reviews: reviews.filter(r => r.status === 'Published').map(({ phone, created, updated, ...r }) => r),
    seo: {
      settings: { ...seoSettings, id: undefined, created: undefined, updated: undefined },
      overrides: overrides.map(({ created, updated, ...o }) => o),
      templates: live.map(({ created, updated, ...t }) => t),
      pages,
    },
  };
  const json = JSON.stringify(body);
  const version = crypto.createHash('sha1').update(json).digest('hex').slice(0, 12);
  return { version, json: `{"version":"${version}",${json.slice(1)}` , seoData: data, seo: body.seo };
}

/* tell the Next.js site that content changed (debounced; failures are logged, never thrown) */
let pending = null;
function notifyNext() {
  if (!config.next.url || !config.next.revalidateSecret) return;
  clearTimeout(pending);
  pending = setTimeout(async () => {
    try {
      const r = await fetch(`${config.next.url}/api/revalidate`, { method: 'POST', headers: { 'x-revalidate-secret': config.next.revalidateSecret } });
      if (!r.ok) logger.warn('Next.js revalidation failed', { status: r.status });
    } catch (e) { logger.warn('Next.js revalidation failed', { error: e.message }); }
  }, 300);
}

const SiteDataService = {
  async get() {
    if (cached) return cached;
    if (!building) building = build().then(s => { cached = s; return s; }).finally(() => { building = null; });
    return building;
  },
  invalidate() { cached = null; notifyNext(); },
};

bus.on('changed', () => SiteDataService.invalidate());

module.exports = SiteDataService;
