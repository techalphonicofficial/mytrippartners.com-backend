/* =====================================================================
   pSEO publisher — writes the programmatic SEO pages into the website folder (SITE_DIR)
   - loads the website's own code (assets/app.js) so pages use the same design and package cards
   - template pages  → <SITE_DIR>/<path>/index.html   (tracked in assets/pseo-manifest.json; stale ones removed)
   - SEO overrides   → patched into the built-in page (original kept in .pseo-orig/, restored if the override is removed)
   - sitemap.xml + robots.txt regenerated; never touches files it did not create, except patched built-in pages
   ===================================================================== */
const fs = require('fs'), path = require('path'), vm = require('vm');
const PSEO = require('./admin/pseo-shared.js');
const MARK = '<meta name="tp-pseo" content="1">';
const escA = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escH = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const jsonScript = o => JSON.stringify(o).replace(/</g, '\\u003c');

let cache = { mtime: 0, X: null };
function loadSite(siteDir) {
  const f = path.join(siteDir, 'assets', 'app.js'); const st = fs.statSync(f);
  if (cache.X && cache.mtime === st.mtimeMs && cache.dir === siteDir) return cache.X;
  const code = fs.readFileSync(f, 'utf8').replace(/;\s*boot\(\);\s*$/, '') + '\n;globalThis.__X={pseoPage,pseoExtra,pseoFaqLd,pkgCard,P,D,DEST,PKG,THEMES,staticHref,CONFIG,inr};';
  const noop = () => {}, el = () => ({ style: {}, setAttribute: noop, getAttribute: () => null, appendChild: noop, addEventListener: noop, querySelectorAll: () => [], querySelector: () => null, classList: { add: noop, remove: noop, toggle: noop, contains: () => false } });
  const ctx = { console, Math, Date, JSON, Intl, Number, String, Array, Object, Set, Map, Promise, setTimeout, clearTimeout, setInterval, clearInterval, isFinite, parseInt, encodeURIComponent, decodeURIComponent, URL,
    document: { querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: el, createRange: el, documentElement: el(), head: el(), body: el(), title: '' },
    localStorage: { getItem: () => null, setItem: noop }, sessionStorage: { getItem: () => null, setItem: noop }, matchMedia: () => ({ matches: false, addEventListener: noop }), navigator: {}, location: { hash: '', pathname: '/', href: 'https://x/' }, addEventListener: noop,
    getSelection: () => ({ removeAllRanges: noop, addRange: noop }), requestAnimationFrame: noop, scrollTo: noop, fetch: () => Promise.reject(new Error('offline')) };
  ctx.window = ctx; ctx.self = ctx; ctx.window.TP_STATIC = true; vm.createContext(ctx); vm.runInContext(code, ctx);
  cache = { mtime: st.mtimeMs, dir: siteDir, X: ctx.__X }; return ctx.__X;
}
/* website data in the shape pseo-shared expects; dashboard prices / hidden packages applied */
function siteData(X, pkgOverrides = []) {
  const ov = Object.fromEntries(pkgOverrides.map(o => [o.id, o]));
  X.PKG.forEach(p => { const o = ov[p.id]; if (o && +o.price > 0) p.price = +o.price; });
  return {
    dests: X.DEST.map(d => ({ id: d.id, name: d.name, short: d.short, type: d.type, region: d.region, img: d.img, best: d.best, hl: d.hl, about: d.about, air: d.air, price: d.price })),
    packages: X.PKG.filter(p => !(ov[p.id] && ov[p.id].active === false)).map(p => ({ id: p.id, title: p.title, dest: p.dest, n: p.n, price: p.price, img: p.img, themes: p.themes || [], tag: p.tag || '' })),
    themes: X.THEMES.map(t => ({ id: t.id, name: t.name })),
  };
}
function setHead(h, o) {
  const D = o.domain;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${escH(o.title)}</title>`);
  h = h.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escA(o.desc)}">`);
  h = h.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escA(o.title)}">`);
  h = h.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escA(o.desc)}">`);
  if (o.path) { h = h.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${D}${o.path}">`); h = h.replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${D}/img/${escA(o.img || 'group-lake')}.jpg">`); }
  h = h.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${escA(o.canonical || D + o.path)}">`);
  h = h.replace(/<meta name="robots"[^>]*>/, `<meta name="robots" content="${o.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">`);
  if (o.jsonld) { h = h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, ''); h = h.replace('</head>', o.jsonld.filter(Boolean).map(j => `<script type="application/ld+json">${jsonScript(j)}</script>`).join('\n') + '\n</head>'); }
  else if (o.addLd) h = h.replace('</head>', o.addLd.filter(Boolean).map(j => `<script type="application/ld+json">${jsonScript(j)}</script>`).join('\n') + '\n</head>');
  if (!h.includes(MARK)) h = h.replace('</head>', MARK + '\n</head>');
  return h;
}
const rel = p => p.replace(/^\/+|\/+$/g, '');
const fileOf = (siteDir, p) => path.join(siteDir, rel(p), 'index.html');
const inside = (siteDir, f) => path.resolve(f).startsWith(path.resolve(siteDir) + path.sep);

function publish({ siteDir, overrides = [], templates = [], settings = {}, pkgOverrides = [] }) {
  const t0 = Date.now(), report = { written: 0, removed: 0, patched: 0, restored: 0, skipped: [], sitemap: 0, thin: 0, errors: [] };
  if (!siteDir || !fs.existsSync(path.join(siteDir, 'assets', 'app.js'))) throw new Error('Website folder not found. Start the backend with SITE_DIR pointing at the built website (the folder with index.html and assets/).');
  const S = { ...PSEO.DEFAULT_SETTINGS, ...settings }, domain = 'https://' + String(S.domain).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const X = loadSite(siteDir), data = siteData(X, pkgOverrides);
  const base = JSON.parse(fs.readFileSync(path.join(siteDir, 'assets', 'pages.json'), 'utf8'));
  const inv = PSEO.inventory({ base, overrides, templates, data });
  const ORIG = path.join(siteDir, '.pseo-orig');
  /* pristine copy of a built-in page (a fresh website build replaces it) */
  const original = p => { const f = fileOf(siteDir, p), o = path.join(ORIG, rel(p), 'index.html'); if (!fs.existsSync(f)) return null; const cur = fs.readFileSync(f, 'utf8');
    if (!cur.includes(MARK)) { fs.mkdirSync(path.dirname(o), { recursive: true }); fs.writeFileSync(o, cur); return cur; } return fs.existsSync(o) ? fs.readFileSync(o, 'utf8') : cur; };
  const skeleton = original('/'); if (!skeleton) throw new Error('index.html missing in the website folder.');
  const manPath = path.join(siteDir, 'assets', 'pseo-manifest.json'); let man = { pages: [], patched: [] }; try { man = JSON.parse(fs.readFileSync(manPath, 'utf8')); } catch (e) { /* first publish */ }
  const baseSet = new Set(base.map(b => b.path)), newPages = [], patched = [];
  const crumbsLd = list => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: domain + u })) });

  /* 1. template pages */
  for (const p of inv.filter(x => x.kind === 'template')) {
    if (p.status !== 'Live') continue;
    if (p.thin) { report.thin++; continue; }
    const f = fileOf(siteDir, p.path);
    if (!inside(siteDir, f) || baseSet.has(p.path) || (fs.existsSync(f) && !man.pages.includes(p.path))) { report.skipped.push(p.path); continue; }
    try {
      const d = X.D(p.dest) || {}, dn = d.short || d.name || p.vars.dest;
      const pd = { h1: p.h1, lead: p.lead, intro: p.intro, faqs: p.faqs, items: p.items, img: p.img, eyebrow: (p.vars.dest_type === 'International' ? 'International' : 'India') + ' holidays', links: p.links, vars: p.vars,
        crumbs: `<a href="#d-${escA(p.dest)}">${escH(dn)}</a><span>/</span>${escH(p.h1)}` };
      let body = X.pseoPage(pd).replace('<div class="grid g3" id="plist"></div>', `<div class="grid g3" id="plist">${p.items.map(id => X.P(id)).filter(Boolean).map(X.pkgCard).join('')}</div>`);
      body = body.replace(/href="(#[^"]*)"/g, (m, h) => `href="${X.staticHref(h)}"`);
      const ld = [crumbsLd([['Home', '/'], [dn, `/destinations/${p.dest}/`], [p.h1, p.path]]), { '@context': 'https://schema.org', '@type': 'ItemList', name: p.h1, itemListElement: p.items.slice(0, 20).map((id, i) => ({ '@type': 'ListItem', position: i + 1, url: `${domain}/packages/${id}/` })) }, X.pseoFaqLd(p.faqs)];
      let h = setHead(skeleton, { domain, path: p.path, title: p.title, desc: p.meta, img: p.img, canonical: p.canonical, noindex: p.noindex, jsonld: ld });
      h = h.replace(/<main id="app">[\s\S]*<\/main>/, `<main id="app">${body}</main>`);
      h = h.replace(/window\.TP_ROUTE="[^"]*";/, `window.TP_ROUTE="pseo";window.TP_PSEO=${jsonScript(pd)};`);
      fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, h); newPages.push(p.path); report.written++;
    } catch (e) { report.errors.push(p.path + ': ' + e.message); }
  }
  /* 2. remove template pages that are no longer generated */
  for (const old of man.pages || []) if (!newPages.includes(old) && !baseSet.has(old)) { const f = fileOf(siteDir, old); if (inside(siteDir, f) && fs.existsSync(f)) { fs.unlinkSync(f); try { fs.rmdirSync(path.dirname(f)); } catch (e) { /* not empty */ } report.removed++; } }
  /* 3. overrides on built-in pages (+ restore pages whose override was removed) */
  const ovMap = Object.fromEntries(overrides.filter(o => baseSet.has(o.path)).map(o => [o.path, o]));
  for (const b of inv.filter(x => x.kind === 'built-in')) {
    const o = ovMap[b.path], f = fileOf(siteDir, b.path);
    if (!o) { if ((man.patched || []).includes(b.path)) { const orig = path.join(ORIG, rel(b.path), 'index.html'); if (fs.existsSync(orig)) { fs.writeFileSync(f, fs.readFileSync(orig)); report.restored++; } } continue; }
    const src = original(b.path); if (!src) continue;
    let h = setHead(src, { domain, path: b.path, title: b.title, desc: b.meta, img: b.img, canonical: o.canonical, noindex: o.noindex, addLd: [X.pseoFaqLd(o.faqs)] });
    if (o.h1) h = h.replace(/(<main id="app">[\s\S]*?<h1[^>]*>)[\s\S]*?(<\/h1>)/, `$1${escH(o.h1)}$2`);
    if (o.intro || (o.faqs || []).length) h = h.replace(/(<main id="app">[\s\S]*?<\/section>)/, `$1${X.pseoExtra({ intro: o.intro, faqs: o.faqs })}`);
    const ovd = { title: o.title || '', meta: o.meta || '', h1: o.h1 || '', intro: o.intro || '', faqs: o.faqs || [] };
    h = h.replace(/(window\.TP_ROUTE="[^"]*";)/, `$1window.TP_SEO_OV=${jsonScript(ovd)};`);
    fs.writeFileSync(f, h); patched.push(b.path); report.patched++;
  }
  /* 4. sitemap + robots */
  const today = new Date().toISOString().slice(0, 10);
  const live = inv.filter(p => p.kind === 'built-in' || (p.status === 'Live' && newPages.includes(p.path)));
  const sm = PSEO.sitemap(live, S.domain, today); fs.writeFileSync(path.join(siteDir, 'sitemap.xml'), sm.xml); report.sitemap = sm.count;
  fs.writeFileSync(path.join(siteDir, 'robots.txt'), PSEO.fill(S.robots, { domain: String(S.domain).replace(/^https?:\/\//, '') }).trim() + '\n');
  fs.writeFileSync(manPath, JSON.stringify({ at: new Date().toISOString(), pages: newPages, patched }));
  report.ms = Date.now() - t0; report.total = inv.length; return report;
}
/* inventory for the admin (live mode) */
function adminData(siteDir, pkgOverrides) {
  if (!siteDir || !fs.existsSync(path.join(siteDir, 'assets', 'pages.json'))) return null;
  const X = loadSite(siteDir);
  return { base: JSON.parse(fs.readFileSync(path.join(siteDir, 'assets', 'pages.json'), 'utf8')), data: siteData(X, pkgOverrides), manifest: (() => { try { return JSON.parse(fs.readFileSync(path.join(siteDir, 'assets', 'pseo-manifest.json'), 'utf8')); } catch (e) { return null; } })() };
}
module.exports = { publish, adminData, loadSite };
