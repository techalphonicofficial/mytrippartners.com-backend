/* =====================================================================
   RenderService — owns the current website snapshot (SiteRenderer).
   - Built lazily on first request; rebuilt after any content / SEO / catalogue change
     (debounced), when the website bundle is rebuilt, and at midnight (dates on pages).
   - Requests always see a complete snapshot: a rebuild swaps it atomically.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { repos } = require('../repositories/RecordRepository');
const ContentService = require('./ContentService');
const { SiteRenderer } = require('../render/SiteRenderer');
const { contentScript } = require('../render/sandbox');
const { bus } = require('./events');

let current = null;      /* { renderer, contentJs, contentVersion, day, stamp } */
let building = null;
let dirty = true;

const assetsDir = () => path.join(config.siteDir, 'assets');
const today = () => new Date().toISOString().slice(0, 10);
const bundleStamp = () => { try { return fs.statSync(path.join(assetsDir(), 'app.js')).mtimeMs; } catch (e) { return 0; } };

async function build() {
  const t0 = Date.now();
  const appJs = fs.readFileSync(path.join(assetsDir(), 'app.js'), 'utf8');
  const shell = fs.readFileSync(path.join(assetsDir(), 'shell.html'), 'utf8');
  let assetVersion = 'dev'; try { assetVersion = JSON.parse(fs.readFileSync(path.join(assetsDir(), 'build.json'), 'utf8')).hash; } catch (e) { /* not built with build.js */ }
  const { model, blocked } = await ContentService.siteModel();
  const [overrides, templates, settings] = await Promise.all([repos.seo_pages.list(), repos.seo_templates.list(), repos.settings.get('seo')]);
  const contentJs = contentScript(model);
  const contentVersion = crypto.createHash('sha1').update(contentJs).digest('hex').slice(0, 10);
  const renderer = new SiteRenderer({ appJs, shell, model, blocked, assetVersion, contentVersion, cacheMax: config.render.cacheMax, seo: { overrides, templates, settings: settings || {} } });
  logger.info(`website snapshot built in ${Date.now() - t0} ms (${renderer.pages.size} pages, content ${contentVersion})`);
  return { renderer, contentJs, contentVersion, id: contentVersion + '-' + assetVersion + '-' + Date.now().toString(36), day: today(), stamp: bundleStamp() };
}

const RenderService = {
  enabled: () => !!config.siteDir && fs.existsSync(path.join(assetsDir(), 'app.js')) && fs.existsSync(path.join(assetsDir(), 'shell.html')),

  async snapshot() {
    if (current && !dirty && current.day === today() && current.stamp === bundleStamp()) return current;
    if (!building) {
      dirty = false;
      building = build().then(s => { current = s; return s; }).finally(() => { building = null; });
    }
    /* a rebuild takes well under a second; wait for it so an edit is visible on the very next request.
       If it fails, keep serving the last good snapshot. */
    try { return await building; } catch (e) { if (current) { logger.error('website snapshot rebuild failed', { error: e.message }); dirty = true; return current; } throw e; }
  },
  invalidate() { dirty = true; },
  async refreshNow() { dirty = true; if (building) await building; return this.snapshot(); },
};

/* content / SEO / catalogue changes → rebuild on the next request (writes in bursts collapse into one rebuild) */
bus.on('changed', () => RenderService.invalidate());

module.exports = RenderService;
