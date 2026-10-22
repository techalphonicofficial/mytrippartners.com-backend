/* Runs the website's own page code (assets/app.js) in an isolated VM context, with the content
   globals from the database, so the server renders exactly the HTML the browser would. */
const vm = require('vm');
const { SITE_GLOBALS } = require('../content/siteModel');

/* safe to embed inside <script>: no "</script>", no JS line separators */
const LINE_SEPARATORS = new RegExp('[' + String.fromCharCode(0x2028, 0x2029) + ']', 'g');
const BS = String.fromCharCode(92); /* backslash */
const jsonForScript = v => JSON.stringify(v).replace(/</g, BS + "u003c").replace(LINE_SEPARATORS, c => BS + "u" + c.charCodeAt(0).toString(16));

/* the script served at /assets/content.js — defines the content globals before app.js runs */
const contentScript = model => '/* TripPartner content — generated from the database */\n' + SITE_GLOBALS.map(k => `const ${k}=${jsonForScript(model[k])};`).join('\n') + '\n';

const EXPORTS = ['festivePage', 'FESTIVE', 'weekendPage', 'WEEKEND', 'videosPage', 'home', 'header', 'drawer', 'footer', 'bottomNav', 'placePage', 'statePage', 'catPage', 'placesIndex',
  'destPage', 'pkgPage', 'guidePage', 'listPage', 'PLACES', 'STATES', 'CATS', 'DEST', 'PKG', 'GUIDES', 'THEMES', 'PLC', 'ST', 'placeMeta', 'placeJsonLd', 'staticHref', 'CONFIG',
  'D', 'P', 'T', 'G', 'inr', 'esc', 'dname', 'placeImg', 'pseoPage', 'pseoExtra', 'pseoFaqLd', 'pkgCard'];

function browserStub() {
  const noop = () => {};
  const el = () => ({ style: {}, setAttribute: noop, getAttribute: () => null, appendChild: noop, addEventListener: noop, querySelectorAll: () => [], querySelector: () => null, classList: { add: noop, remove: noop, toggle: noop, contains: () => false } });
  const ctx = {
    console: { log: noop, info: noop, warn: noop, error: noop, debug: noop }, Math, Date, JSON, Intl, Number, String, Array, Object, Set, Map, Promise, setTimeout, clearTimeout, setInterval, clearInterval,
    isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, URL,
    document: { querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: el, createRange: el, documentElement: el(), head: el(), body: el(), title: '' },
    localStorage: { getItem: () => null, setItem: noop }, sessionStorage: { getItem: () => null, setItem: noop }, matchMedia: () => ({ matches: false, addEventListener: noop }),
    navigator: {}, location: { hash: '', pathname: '/', href: 'https://localhost/' }, addEventListener: noop, getSelection: () => ({ removeAllRanges: noop, addRange: noop }),
    requestAnimationFrame: noop, scrollTo: noop, fetch: () => Promise.reject(new Error('offline')),
  };
  ctx.window = ctx; ctx.self = ctx; ctx.TP_STATIC = true;
  return ctx;
}

/* returns the website runtime: page functions + content globals */
function createSite(appJs, model) {
  const code = contentScript(model) + '\n;\n' + appJs.replace(/;\s*boot\(\);\s*$/, '') + `\n;globalThis.__X={${EXPORTS.join(',')}};`;
  const ctx = browserStub();
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: 'site-bundle.js' });
  const X = ctx.__X;
  X.card = id => vm.runInContext(`pkgCard(P(${JSON.stringify(id)}))`, ctx);
  return X;
}

module.exports = { createSite, contentScript, jsonForScript };
