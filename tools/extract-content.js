/* One-time extraction of the website content that used to be hard-coded in the website's JavaScript.
   Runs the original source files in a sandbox and writes their data to src/db/seeds/content.json,
   which the database migration 003 loads into the relational content tables.
   Usage: node tools/extract-content.js <path-to-original-website-source/src> [out.json]
   (Needs the ORIGINAL source — the current website code no longer contains the data.) */
const vm = require('vm'), fs = require('fs'), path = require('path');
const SRC = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'legacy', 'website-source', 'src'));
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '..', 'src', 'db', 'seeds', 'content.json'));
const FILES = ['data.js', 'places-data.js', 'weekend-data.js', 'festive-data.js', 'packages2-data.js', 'app.js', 'extra.js', 'detail.js', 'partner.js', 'system.js', 'improve.js', 'design.js', 'places.js', 'video.js', 'home2.js', 'weekend.js', 'header2.js', 'festive.js', 'partner2.js', 'polish.js', 'fit.js', 'next.js', 'api.js', 'qr-lib.js', 'payproof.js', 'seo.js'];
const NAMES = ['CONFIG', 'DEST', 'THEMES', 'PKG', 'VISA', 'VISA_X', 'SERVICES', 'SVC_DETAIL', 'STATIC', 'DEPARTURES', 'GUIDES', 'STATES', 'PLACES', 'CATS', 'BUDDIES', 'PFAQ', 'PFAQ2', 'REELS', 'SHOWREEL', 'LONG_WEEKENDS', 'HS_HINTS'];

const code = FILES.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n;\n') + `;globalThis.__X={${NAMES.join(',')}}`;
const noop = () => {};
const el = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : el()), apply: () => el() });
const ctx = { console: { log: noop, warn: noop, error: noop }, Math, Date, JSON, Intl, Number, String, Array, Object, Set, Map, Promise, setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
  document: { querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: el, createRange: el, documentElement: el(), head: el(), body: el(), title: '' },
  localStorage: { getItem: () => null, setItem: noop }, matchMedia: () => ({ matches: false, addEventListener: noop }), navigator: {}, location: { hash: '', pathname: '/' }, addEventListener: noop,
  getSelection: () => ({ removeAllRanges: noop, addRange: noop }), requestAnimationFrame: noop, scrollTo: noop, fetch: () => Promise.reject(new Error('offline')) };
ctx.window = ctx; ctx.TP_STATIC = true;
vm.createContext(ctx); vm.runInContext(code, ctx);
const X = JSON.parse(JSON.stringify(ctx.__X));
/* the festive module appends festive departure dates at load time; the seed keeps the merged list */
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(X, null, 1));
console.log(`Wrote ${OUT}: ${NAMES.map(n => `${n}=${Array.isArray(X[n]) ? X[n].length : typeof X[n]}`).join(' ')}`);
