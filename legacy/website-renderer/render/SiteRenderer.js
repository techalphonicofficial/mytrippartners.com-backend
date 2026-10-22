/* =====================================================================
   SiteRenderer — one immutable snapshot of the website (code + content + SEO settings).
   Renders full HTML documents on request:
     - built-in pages (home, destinations, packages, places, guides, themes, collections)
     - pSEO template pages (Live templates from the dashboard)
     - SEO overrides (title/meta/h1/intro/FAQ/canonical/noindex) applied to built-in pages
     - sitemap.xml, robots.txt, 404
   A new snapshot is created by RenderService whenever content or SEO data changes.
   ===================================================================== */
const PSEO = require('../../admin/pseo-shared.js');
const { createSite, jsonForScript } = require('./sandbox');
const { buildPageIndex } = require('./pages');

const escA = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escH = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const strip = s => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const MARK = '<meta name="tp-pseo" content="1">';
/* String.replace with a literal replacement (no $-pattern expansion) */
const rep = (h, find, val) => h.replace(find, () => val);

class SiteRenderer {
  /* opts: { appJs, shell, model, assetVersion, contentVersion, seo: { overrides, templates, settings } } */
  constructor(opts) {
    this.o = opts;
    this.X = createSite(opts.appJs, opts.model);
    this.domain = 'https://' + this.X.CONFIG.domain;
    this.pages = buildPageIndex(this.X, this.domain);
    const rew = html => this.rewrite(html);
    this.chrome = { HEAD: rew(this.X.header()), FOOT: rew(this.X.footer()), DRAW: rew(this.X.drawer()), BNAV: rew(this.X.bottomNav()) };
    this.cache = new Map();
    this._meta = null; this._inv = null;
  }
  rewrite(html) { return html.replace(/href="(#[^"]*)"/g, (m, h) => `href="${this.X.staticHref(h)}"`); }

  /* ---------- document assembly (same markup as the former static build) ---------- */
  document({ path, route, title, desc, body, jsonld, img, robots = 'index,follow,max-image-preview:large' }) {
    const { HEAD, FOOT, DRAW, BNAV } = this.chrome, D = this.domain, canonical = D + path;
    let h = this.o.shell;
    h = rep(h, /<title>[\s\S]*?<\/title>/, `<title>${escA(title)}</title>`);
    h = rep(h, /<meta name="description"[^>]*>/, `<meta name="description" content="${escA(desc)}">`);
    h = rep(h, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escA(title)}">`);
    h = rep(h, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escA(desc)}">`);
    h = rep(h, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}"><meta property="og:image" content="${D}/img/${img || 'group-lake'}.jpg"><meta name="twitter:card" content="summary_large_image"><meta name="robots" content="${robots}">`);
    h = rep(h, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}">`);
    if (jsonld && jsonld.length) h = rep(h, '</style>', '</style>\n' + jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n'));
    h = rep(h, /<style>[\s\S]*?\/\*CSS\*\/[\s\S]*?<\/style>/, `<link rel="stylesheet" href="/assets/app.css?v=${this.o.assetVersion}">\n<base href="/">`);
    h = rep(h, '<header class="site-head" id="head"></header>', `<header class="site-head" id="head">${HEAD}</header>`);
    h = rep(h, '<div class="drawer" id="drawer"></div>', `<div class="drawer" id="drawer">${DRAW}</div>`);
    h = rep(h, '<main id="app"></main>', `<main id="app">${this.rewrite(body)}</main>`);
    h = rep(h, '<footer class="foot" id="foot"></footer>', `<footer class="foot" id="foot">${FOOT}</footer>`);
    h = rep(h, '<nav class="bnav" id="bnav" aria-label="Quick navigation"></nav>', `<nav class="bnav" id="bnav" aria-label="Quick navigation">${BNAV}</nav>`);
    h = rep(h, /<script>\s*\/\*DATA\*\/[\s\S]*?<\/script>/, `<script>window.TP_STATIC=true;window.TP_ROUTE=${JSON.stringify(route)};</script>\n<script src="/assets/content.js?v=${this.o.contentVersion}" defer></script>\n<script src="/assets/app.js?v=${this.o.assetVersion}" defer></script>`);
    return '<!doctype html>\n<html lang="en-IN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + h.replace('<a class="skip"', '</head>\n<body>\n<a class="skip"') + '\n</body>\n</html>\n';
  }
  builtIn(p) { return this.document({ path: p.path, route: p.route, title: p.title, desc: p.desc, body: p.body(), jsonld: p.jsonld(), img: p.img }); }

  /* ---------- SEO data ---------- */
  /* page list for the SEO dashboard (formerly assets/pages.json) */
  pagesMeta() {
    if (!this._meta) this._meta = [...this.pages.values()].map(p => { const m = String(p.body()).match(/<h1[^>]*>([\s\S]*?)<\/h1>/); return { path: p.path, route: p.route, title: p.title, desc: p.desc, img: p.img, prio: p.prio, type: p.type, h1: m ? strip(m[1]) : '' }; });
    return this._meta;
  }
  /* website data in the shape pseo-shared expects */
  siteData() {
    const X = this.X;
    return {
      dests: X.DEST.map(d => ({ id: d.id, name: d.name, short: d.short, type: d.type, region: d.region, img: d.img, best: d.best, hl: d.hl, about: d.about, air: d.air, price: d.price })),
      packages: X.PKG.filter(p => !(this.o.blocked || new Set()).has(p.id)).map(p => ({ id: p.id, title: p.title, dest: p.dest, n: p.n, price: p.price, img: p.img, themes: p.themes || [], tag: p.tag || '' })),
      themes: X.THEMES.map(t => ({ id: t.id, name: t.name })),
    };
  }
  inventory() {
    if (!this._inv) {
      const { overrides = [], templates = [] } = this.o.seo || {};
      this._inv = PSEO.inventory({ base: this.pagesMeta(), overrides, templates, data: this.siteData() });
      this._invByPath = new Map(this._inv.map(p => [p.path, p]));
    }
    return this._inv;
  }
  settings() { return { ...PSEO.DEFAULT_SETTINGS, ...((this.o.seo || {}).settings || {}) }; }

  setHead(h, o) {
    const D = this.domain;
    h = rep(h, /<title>[\s\S]*?<\/title>/, `<title>${escH(o.title)}</title>`);
    h = rep(h, /<meta name="description"[^>]*>/, `<meta name="description" content="${escA(o.desc)}">`);
    h = rep(h, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escA(o.title)}">`);
    h = rep(h, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escA(o.desc)}">`);
    if (o.path) { h = rep(h, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${D}${o.path}">`); h = rep(h, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${D}/img/${escA(o.img || 'group-lake')}.jpg">`); }
    h = rep(h, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${escA(o.canonical || D + o.path)}">`);
    h = rep(h, /<meta name="robots"[^>]*>/, `<meta name="robots" content="${o.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">`);
    if (o.jsonld) { h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, ''); h = rep(h, '</head>', o.jsonld.filter(Boolean).map(j => `<script type="application/ld+json">${jsonForScript(j)}</script>`).join('\n') + '\n</head>'); }
    else if (o.addLd) h = rep(h, '</head>', o.addLd.filter(Boolean).map(j => `<script type="application/ld+json">${jsonForScript(j)}</script>`).join('\n') + '\n</head>');
    if (!h.includes(MARK)) h = rep(h, '</head>', MARK + '\n</head>');
    return h;
  }

  /* built-in page with its dashboard SEO override applied */
  withOverride(page, html) {
    const o = ((this.o.seo || {}).overrides || []).find(x => x.path === page.path);
    if (!o) return html;
    this.inventory(); const b = this._invByPath.get(page.path) || {};
    let h = this.setHead(html, { path: page.path, title: b.title, desc: b.meta, img: b.img, canonical: o.canonical, noindex: o.noindex, addLd: [this.X.pseoFaqLd(o.faqs)] });
    if (o.h1) h = h.replace(/(<main id="app">[\s\S]*?<h1[^>]*>)[\s\S]*?(<\/h1>)/, (m, a, z) => `${a}${escH(o.h1)}${z}`);
    if (o.intro || (o.faqs || []).length) h = h.replace(/(<main id="app">[\s\S]*?<\/section>)/, (m, a) => a + this.X.pseoExtra({ intro: o.intro, faqs: o.faqs }));
    const ovd = { title: o.title || '', meta: o.meta || '', h1: o.h1 || '', intro: o.intro || '', faqs: o.faqs || [] };
    return h.replace(/(window\.TP_ROUTE="[^"]*";)/, (m, a) => `${a}window.TP_SEO_OV=${jsonForScript(ovd)};`);
  }

  /* programmatic SEO page from a Live template */
  templatePage(p) {
    const X = this.X, D = this.domain;
    const d = X.D(p.dest) || {}, dn = d.short || d.name || p.vars.dest;
    const pd = { h1: p.h1, lead: p.lead, intro: p.intro, faqs: p.faqs, items: p.items, img: p.img, eyebrow: (p.vars.dest_type === 'International' ? 'International' : 'India') + ' holidays', links: p.links, vars: p.vars,
      crumbs: `<a href="#d-${escA(p.dest)}">${escH(dn)}</a><span>/</span>${escH(p.h1)}` };
    let body = X.pseoPage(pd).replace('<div class="grid g3" id="plist"></div>', () => `<div class="grid g3" id="plist">${p.items.map(id => X.P(id)).filter(Boolean).map(X.pkgCard).join('')}</div>`);
    body = this.rewrite(body);
    const crumbsLd = list => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: D + u })) });
    const ld = [crumbsLd([['Home', '/'], [dn, `/destinations/${p.dest}/`], [p.h1, p.path]]), { '@context': 'https://schema.org', '@type': 'ItemList', name: p.h1, itemListElement: p.items.slice(0, 20).map((id, i) => ({ '@type': 'ListItem', position: i + 1, url: `${D}/packages/${id}/` })) }, X.pseoFaqLd(p.faqs)];
    let h = this.setHead(this.skeleton(), { path: p.path, title: p.title, desc: p.meta, img: p.img, canonical: p.canonical, noindex: p.noindex, jsonld: ld });
    h = h.replace(/<main id="app">[\s\S]*<\/main>/, () => `<main id="app">${body}</main>`);
    return h.replace(/window\.TP_ROUTE="[^"]*";/, () => `window.TP_ROUTE="pseo";window.TP_PSEO=${jsonForScript(pd)};`);
  }
  skeleton() { if (!this._skel) this._skel = this.builtIn(this.pages.get('/')); return this._skel; }

  /* ---------- public API ---------- */
  /* → { status, html } or null when the path is not a page */
  render(path) {
    if (this.cache.has(path)) return this.cache.get(path);
    let out = null;
    const page = this.pages.get(path);
    if (page) out = { status: 200, html: this.withOverride(page, this.builtIn(page)) };
    else {
      this.inventory(); const p = this._invByPath.get(path);
      if (p && p.kind === 'template' && p.status === 'Live' && !p.thin) out = { status: 200, html: this.templatePage(p) };
    }
    if (out) { if (this.cache.size >= (this.o.cacheMax || 2000)) this.cache.delete(this.cache.keys().next().value); this.cache.set(path, out); }
    return out;
  }
  notFound() {
    if (!this._404) {
      const home = this.pages.get('/');
      this._404 = this.document({ path: '/', route: '404', title: home.title, desc: home.desc, body: home.body(), jsonld: home.jsonld(), img: home.img, robots: 'noindex' });
    }
    return this._404;
  }
  /* live pages for the sitemap (built-in + Live, non-thin template pages) */
  livePages() { return this.inventory().filter(p => p.kind === 'built-in' || (p.status === 'Live' && !p.thin)); }
  sitemap() { const s = this.settings(); return PSEO.sitemap(this.livePages(), s.domain || this.X.CONFIG.domain, new Date().toISOString().slice(0, 10)); }
  robots() { const s = this.settings(); return PSEO.fill(s.robots, { domain: String(s.domain || this.X.CONFIG.domain).replace(/^https?:\/\//, '') }).trim() + '\n'; }
}

module.exports = { SiteRenderer };
