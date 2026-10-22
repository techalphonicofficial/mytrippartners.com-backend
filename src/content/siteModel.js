/* =====================================================================
   Website runtime model  ↔  content DTOs
   The website (Next.js, client/) works with the content shapes of the original page code:
   DEST, PKG, THEMES, PLACES … These are built from the database by toSiteModel() and
   delivered in GET /api/public/site (SiteDataService).
   ===================================================================== */
const { TYPES } = require('./types');

/* CONFIG keys that live in the `site` settings record (everything except derived keys) */
const CONFIG_DEFAULTS = {
  brand: 'TripPartner', domain: 'www.trippartner.com', phone: '', whatsapp: '', email: '', support: '', address: '', hours: '',
  pickups: [], demo: true, youtube: '', instagram: '', press: [], accreditations: [], awards: [], travellers: 0, pay: {},
};
const CONTACT_KEYS = ['phone', 'whatsapp', 'email', 'support', 'address', 'hours'];

/* legacy globals (seed file) → DTO lists per content type */
function fromSiteModel(X) {
  const order = (list, i) => list.map((d, n) => ({ ...d, sortOrder: (n + 1) * 10, active: true }));
  const visa = [...X.VISA.free.map(v => ({ ...v, group: 'free' })), ...X.VISA.voa.map(v => ({ ...v, group: 'voa' }))];
  return {
    destinations: order(X.DEST.map(TYPES.destinations.fromSite)),
    themes: order(X.THEMES.map(TYPES.themes.fromSite)),
    packages: order(X.PKG.map(TYPES.packages.fromSite)),
    states: order(X.STATES.map(TYPES.states.fromSite)),
    placeCategories: order(Object.entries(X.CATS).map(([k, v]) => TYPES.placeCategories.fromSite(v, k))),
    places: order(X.PLACES.map(TYPES.places.fromSite)),
    guides: order(X.GUIDES.map(TYPES.guides.fromSite)),
    visa: order(visa.map(v => TYPES.visa.fromSite(v, X.VISA_X[v.id]))),
    services: order(X.SERVICES.map(s => TYPES.services.fromSite(s, X.SVC_DETAIL[s.id] || []))),
    infoPages: order(Object.entries(X.STATIC).map(([k, v]) => TYPES.infoPages.fromSite(v, k))),
    faqs: order([...X.PFAQ.map((q, i) => TYPES.faqs.fromSite(q, 'partner', i)), ...X.PFAQ2.map((q, i) => TYPES.faqs.fromSite(q, 'partner-safety', i))]),
    reels: order(X.REELS.map(TYPES.reels.fromSite)),
    holidays: order(X.LONG_WEEKENDS.map(TYPES.holidays.fromSite)),
    samplePartners: order(X.BUDDIES.map(TYPES.samplePartners.fromSite)),
  };
}

/* settings records seeded from the legacy CONFIG + homepage constants */
function settingsFromSiteModel(X) {
  const { api, coupons, announcement, ...cfg } = X.CONFIG;
  return { site: { ...CONFIG_DEFAULTS, ...cfg, announcement: announcement || '' }, content: { searchHints: X.HS_HINTS, showreel: X.SHOWREEL } };
}

/* DTO lists + settings + live departures/coupons/overrides → website globals.
   c = { destinations:[], themes:[], … }  (active records only, in display order) */
function toSiteModel(c, { site = {}, content = {}, departures = [], coupons = [] } = {}) {
  const T = TYPES;
  const PKG = c.packages.map(T.packages.toSite);
  const cfg = { ...CONFIG_DEFAULTS, ...site };
  const CONFIG = {
    brand: cfg.brand, domain: cfg.domain, phone: cfg.phone, whatsapp: cfg.whatsapp, email: cfg.email, support: cfg.support, address: cfg.address, hours: cfg.hours,
    api: '/api/public', pickups: cfg.pickups, demo: cfg.demo, ...(cfg.announcement ? { announcement: cfg.announcement } : {}),
    coupons: Object.fromEntries(coupons.filter(k => k.active).map(k => [k.code, { pct: k.pct, maxDays: k.maxDays, desc: k.desc }])),
    youtube: cfg.youtube, instagram: cfg.instagram, press: cfg.press, accreditations: cfg.accreditations, awards: cfg.awards, travellers: cfg.travellers, pay: cfg.pay,
  };
  return {
    CONFIG,
    DEST: c.destinations.map(T.destinations.toSite),
    THEMES: c.themes.map(T.themes.toSite),
    PKG,
    WEEKEND: PKG.filter(p => p.wk),
    FESTIVE: PKG.filter(p => p.fx),
    VISA: { free: c.visa.filter(v => v.group === 'free').map(T.visa.toSite), voa: c.visa.filter(v => v.group === 'voa').map(T.visa.toSite) },
    VISA_X: Object.fromEntries(c.visa.map(v => [v.id, { img: v.image, stay: v.stay, tip: v.tip }])),
    SERVICES: c.services.map(T.services.toSite),
    SVC_DETAIL: Object.fromEntries(c.services.map(s => [s.id, s.features])),
    STATIC: Object.fromEntries(c.infoPages.map(p => [p.id, T.infoPages.toSite(p)])),
    DEPARTURES: departures.filter(d => d.status !== 'Cancelled' && d.pkg && d.date).map(d => [d.pkg, d.date]),
    GUIDES: c.guides.map(T.guides.toSite),
    STATES: c.states.map(T.states.toSite),
    PLACES: c.places.map(T.places.toSite),
    CATS: Object.fromEntries(c.placeCategories.map(k => [k.id, T.placeCategories.toSite(k)])),
    BUDDIES: c.samplePartners.map(T.samplePartners.toSite),
    PFAQ: c.faqs.filter(q => q.group === 'partner').map(T.faqs.toSite),
    PFAQ2: c.faqs.filter(q => q.group === 'partner-safety').map(T.faqs.toSite),
    REELS: c.reels.map(T.reels.toSite),
    SHOWREEL: content.showreel || { src: 'showreel', step: 2.3, chapters: [] },
    LONG_WEEKENDS: c.holidays.map(T.holidays.toSite),
    HS_HINTS: content.searchHints || [],
  };
}

const SITE_GLOBALS = ['CONFIG', 'DEST', 'THEMES', 'PKG', 'WEEKEND', 'FESTIVE', 'VISA', 'VISA_X', 'SERVICES', 'SVC_DETAIL', 'STATIC', 'DEPARTURES', 'GUIDES', 'STATES', 'PLACES', 'CATS', 'BUDDIES', 'PFAQ', 'PFAQ2', 'REELS', 'SHOWREEL', 'LONG_WEEKENDS', 'HS_HINTS'];

module.exports = { fromSiteModel, settingsFromSiteModel, toSiteModel, SITE_GLOBALS, CONTACT_KEYS, CONFIG_DEFAULTS };
