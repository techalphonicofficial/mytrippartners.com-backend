/* =====================================================================
   TripPartner pSEO — shared logic (browser: window.PSEO, Node: require)
   Used by the admin (live preview, audit, demo) and by the server publisher,
   so a page looks exactly the same in the preview and on the live site.
   ===================================================================== */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.PSEO = factory(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const YEAR = () => new Date().getFullYear();
const inr = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const kfmt = n => n >= 100000 ? (n / 100000 + '-lakh') : Math.round(n / 1000) + 'k';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* ---------- template types: which data they combine and which packages match ---------- */
const TYPES = {
  'theme-dest': { label: 'Theme × destination', axes: ['theme', 'dest'], hint: 'e.g. Honeymoon packages in Kashmir' },
  'budget-dest': { label: 'Destination × budget', axes: ['dest', 'budget'], hint: 'e.g. Kerala packages under ₹25,000' },
  'days-dest': { label: 'Destination × trip length', axes: ['dest', 'days'], hint: 'e.g. 5 days Goa tour packages' },
  'dest-city': { label: 'Destination × departure city', axes: ['dest', 'city'], hint: 'e.g. Kashmir tour packages from Delhi' },
  'month-dest': { label: 'Destination × month', axes: ['dest', 'month'], hint: 'e.g. Ladakh in June' },
};
const VARS = {
  dest: 'Destination name', dest_slug: 'Destination in URL form', dest_type: 'India / International', region: 'Region', best_time: 'Best time to visit', airport: 'Nearest airport',
  highlights: 'Top 3 highlights', about: 'Destination description', theme: 'Theme name', theme_l: 'theme in lowercase', theme_slug: 'Theme in URL form',
  budget: 'Budget (₹25,000)', budget_k: 'Budget for URL (25k)', days: 'Days', nights: 'Nights', city: 'Departure city', city_slug: 'City in URL form',
  month: 'Month', month_slug: 'month for URL', year: 'Current year', count: 'Matching packages', min_price: 'Lowest price', max_price: 'Highest price', top_pkgs: 'Top 2 package names', durations: 'Trip lengths on offer',
};

/* ---------- ready-made templates (edit freely in the admin) ---------- */
const FAQ_COMMON = [
  { q: 'Can I customise these {dest} packages?', a: 'Yes. Every itinerary can be changed — hotels, number of nights, sightseeing and transfers. Share your dates and a TripPartner expert sends a revised quote, usually within a few hours.' },
  { q: 'What is included in the package price?', a: 'Prices include hotel stay, daily breakfast and the transfers and sightseeing listed in the itinerary. Flights or trains, lunch and personal expenses are quoted separately unless mentioned.' },
];
const DEFAULT_TEMPLATES = [
  { id: 'TPL-THEME-DEST', name: 'Theme packages in destination', type: 'theme-dest', status: 'Live', minItems: 2, prio: 0.7,
    slug: '/{theme_slug}-packages-in-{dest_slug}/', title: '{theme} Packages in {dest} {year} — {count} Trips from {min_price}',
    meta: '{count} {theme_l} tour packages for {dest}, including {top_pkgs}. Best time: {best_time}. Hotels, transfers and sightseeing — customise with a TripPartner expert.',
    h1: '{theme} Packages in {dest}', lead: '{count} {theme_l} itineraries in {dest} from {min_price} per person.',
    intro: 'Planning a {theme_l} trip to {dest}? These {count} itineraries are built around what {theme_l} travellers ask us for most, with hand-checked hotels and private or shared transfers.\n\n**Why {dest}:** {about}\n\n**Best time to go:** {best_time}. Trip lengths on offer: {durations}.',
    faqs: [{ q: 'What is the best time for a {theme_l} trip to {dest}?', a: '{best_time}. Your trip expert can suggest dates that suit your plans and budget.' }, { q: 'How much does a {theme_l} package to {dest} cost?', a: 'Packages start at {min_price} per person and go up to {max_price}, depending on hotels, duration and season.' }, ...FAQ_COMMON],
    scope: { destType: 'all', dests: [], themes: [] } },
  { id: 'TPL-BUDGET-DEST', name: 'Destination packages under a budget', type: 'budget-dest', status: 'Live', minItems: 2, prio: 0.6,
    slug: '/{dest_slug}-tour-packages-under-{budget_k}/', title: '{dest} Tour Packages Under {budget} ({year}) — {count} Options',
    meta: 'Budget {dest} trips under {budget} per person: {count} packages from {min_price}, including {top_pkgs}. Best time {best_time}.',
    h1: '{dest} Packages Under {budget}', lead: '{count} {dest} trips that cost {budget} or less per person.',
    intro: 'Want to see {dest} without overspending? Every package below costs **{budget} or less per person** on twin sharing, with hotels, breakfast and the listed sightseeing included.\n\nHighlights you can cover: {highlights}.',
    faqs: [{ q: 'Can I visit {dest} under {budget}?', a: 'Yes — {count} of our {dest} packages are priced at {budget} or less per person, starting at {min_price}.' }, { q: 'How can I make a {dest} trip cheaper?', a: 'Travel outside peak season, choose standard hotels, and book 3–4 weeks ahead. Group departures are often the best value.' }, ...FAQ_COMMON],
    scope: { destType: 'all', dests: [], budgets: [15000, 25000, 40000, 60000, 100000] } },
  { id: 'TPL-DAYS-DEST', name: 'Trip length in destination', type: 'days-dest', status: 'Live', minItems: 1, prio: 0.6,
    slug: '/{days}-days-{dest_slug}-tour-packages/', title: '{days} Days {dest} Tour Packages ({nights}N/{days}D) from {min_price}',
    meta: '{nights} nights / {days} days in {dest}: {count} day-wise itineraries from {min_price}, including {top_pkgs}. Hotels, transfers and sightseeing included.',
    h1: '{days} Days {dest} Tour Packages', lead: '{nights}-night {dest} itineraries with hotels, transfers and sightseeing.',
    intro: 'A {days}-day plan is a comfortable way to see {dest}. Each package below has a day-wise itinerary you can tweak.\n\n**Don’t miss:** {highlights}.\n\n**Getting there:** nearest airport {airport}.',
    faqs: [{ q: 'Are {days} days enough for {dest}?', a: '{days} days covers the main sights of {dest} at a relaxed pace. Most travellers spend {durations} days.' }, ...FAQ_COMMON],
    scope: { destType: 'all', dests: [], days: [3, 4, 5, 6, 7, 8, 10] } },
  { id: 'TPL-DEST-CITY', name: 'Destination packages from a city', type: 'dest-city', status: 'Draft', minItems: 2, prio: 0.5,
    slug: '/{dest_slug}-tour-packages-from-{city_slug}/', title: '{dest} Tour Packages from {city} {year} — from {min_price}',
    meta: '{dest} holidays from {city}: {count} packages from {min_price} with hotels and sightseeing. Flights or trains from {city} quoted at the best fare.',
    h1: '{dest} Tour Packages from {city}', lead: 'Holidays to {dest} for travellers starting from {city}.',
    intro: 'Travelling from {city}? Pick any {dest} itinerary below and we add flights or trains from {city} at the best available fare.\n\n**Nearest airport in {dest}:** {airport}. **Best time:** {best_time}.',
    faqs: [{ q: 'How do I reach {dest} from {city}?', a: 'Most travellers fly from {city} to {airport}. Your trip expert compares flight and train options and adds the best one to your quote.' }, ...FAQ_COMMON],
    scope: { destType: 'all', dests: [], cities: ['Delhi', 'Mumbai', 'Bengaluru', 'Kolkata', 'Lucknow', 'Patna'] },
    note: 'Pages differ mainly by city name — keep this to a few cities and add city-specific notes, or Google may treat them as duplicates.' },
  { id: 'TPL-MONTH-DEST', name: 'Destination in a month', type: 'month-dest', status: 'Draft', minItems: 2, prio: 0.5,
    slug: '/{dest_slug}-in-{month_slug}/', title: '{dest} in {month} {year}: Trip Ideas & Packages',
    meta: 'Visiting {dest} in {month}? {count} packages from {min_price}. Best time to visit {dest}: {best_time}.',
    h1: '{dest} in {month}', lead: 'Plan a {month} holiday to {dest}.',
    intro: 'Thinking of {dest} in {month}? The best time to visit is **{best_time}** — your trip expert will tell you what {month} is like and adjust the plan.\n\nTop experiences: {highlights}.',
    faqs: [{ q: 'Is {month} a good time to visit {dest}?', a: 'The best time to visit {dest} is {best_time}. Ask our trip expert about weather and crowds in {month} for your exact dates.' }, ...FAQ_COMMON],
    scope: { destType: 'all', dests: [], months: ['October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June'] } },
];
const DEFAULT_SETTINGS = { domain: 'www.trippartner.com', titleSuffix: ' | TripPartner', ogImage: 'group-lake', robots: 'User-agent: *\nAllow: /\nDisallow: /#admin\n\nSitemap: https://{domain}/sitemap.xml', maxPerTemplate: 400 };

/* ---------- variables ---------- */
const fill = (s, v) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : ''));
function destVars(d, items) {
  const prices = items.map(p => +p.price || 0).filter(Boolean), lens = [...new Set(items.map(p => (+p.n || 0) + 1))].sort((a, b) => a - b);
  return { dest: d.short || d.name, dest_slug: slug(d.short || d.name), dest_type: d.type === 'intl' ? 'International' : 'India', region: d.region || '', best_time: d.best || 'all year', airport: d.air || 'the nearest airport',
    highlights: (d.hl || []).slice(0, 3).join(', ') || (d.short || d.name), about: d.about || '', count: items.length, min_price: prices.length ? inr(Math.min(...prices)) : '', max_price: prices.length ? inr(Math.max(...prices)) : '',
    top_pkgs: items.slice().sort((a, b) => (b.tag ? 1 : 0) - (a.tag ? 1 : 0)).slice(0, 2).map(p => p.title).join(' and '), durations: lens.length ? (lens.length > 1 ? lens[0] + '–' + lens[lens.length - 1] : lens[0]) : '' };
}
const normPath = p => { p = '/' + String(p || '').split('/').map(s => slug(s)).filter(Boolean).join('/') + '/'; return p === '//' ? '/' : p; };

/* ---------- expand one template into pages ---------- */
function expand(tpl, data, opt = {}) {
  const sc = tpl.scope || {}, out = [], max = opt.max || DEFAULT_SETTINGS.maxPerTemplate;
  const dests = (data.dests || []).filter(d => (sc.destType === 'india' ? d.type === 'india' : sc.destType === 'intl' ? d.type === 'intl' : true) && (!(sc.dests || []).length || sc.dests.includes(d.id)));
  const pk = data.packages || [], year = YEAR();
  const add = (d, items, extra) => {
    if (out.length >= max) return;
    items = items.slice().sort((a, b) => a.price - b.price);
    const v = { ...destVars(d, items), ...extra, year };
    const path = normPath(fill(tpl.slug, v));
    out.push({ id: path, path, tpl: tpl.id, dest: d.id, vars: v, items: items.map(p => p.id), img: d.img || (items[0] || {}).img,
      title: fill(tpl.title, v).trim(), meta: fill(tpl.meta, v).trim(), h1: fill(tpl.h1, v).trim(), lead: fill(tpl.lead, v).trim(), intro: fill(tpl.intro, v).trim(),
      faqs: (tpl.faqs || []).map(f => ({ q: fill(f.q, v).trim(), a: fill(f.a, v).trim() })).filter(f => f.q && f.a), thin: items.length < (+tpl.minItems || 1), prio: +tpl.prio || 0.5 });
  };
  for (const d of dests) {
    const dp = pk.filter(p => p.dest === d.id);
    if (tpl.type === 'theme-dest') for (const t of (data.themes || []).filter(t => !(sc.themes || []).length || sc.themes.includes(t.id))) add(d, dp.filter(p => (p.themes || []).includes(t.id)), { theme: t.name, theme_l: t.name.toLowerCase(), theme_slug: slug(t.name) });
    if (tpl.type === 'budget-dest') for (const b of (sc.budgets || []).map(Number).filter(Boolean)) add(d, dp.filter(p => p.price <= b), { budget: inr(b), budget_k: kfmt(b) });
    if (tpl.type === 'days-dest') for (const n of (sc.days || []).map(Number).filter(Boolean)) add(d, dp.filter(p => (+p.n || 0) + 1 === n), { days: n, nights: n - 1 });
    if (tpl.type === 'dest-city') for (const c of (sc.cities || []).map(s => String(s).trim()).filter(Boolean)) add(d, dp, { city: c, city_slug: slug(c) });
    if (tpl.type === 'month-dest') for (const m of (sc.months || []).filter(m => MONTHS.includes(m))) add(d, dp, { month: m, month_slug: m.toLowerCase() });
  }
  /* internal links: sibling pages for the same destination + the destination page */
  const byDest = {}; out.filter(p => !p.thin).forEach(p => { (byDest[p.dest] = byDest[p.dest] || []).push(p); });
  out.forEach(p => { p.links = (byDest[p.dest] || []).filter(x => x.path !== p.path).slice(0, 8).map(x => ({ t: x.h1, u: x.path })); p.links.unshift({ t: 'All ' + p.vars.dest + ' packages', u: '/destinations/' + p.dest + '/' }); });
  return out;
}
function expandAll(templates, data, opt) { return (templates || []).flatMap(t => expand(t, data, opt).map(p => ({ ...p, status: t.status }))); }

/* ---------- audit ---------- */
const ISSUES = {
  'title-long': ['Title longer than 65 characters (gets cut in Google)', 8], 'title-short': ['Title shorter than 25 characters', 6], 'title-missing': ['No title', 30],
  'meta-missing': ['No meta description', 20], 'meta-long': ['Meta description longer than 160 characters', 5], 'meta-short': ['Meta description shorter than 70 characters', 5],
  'h1-missing': ['No H1 heading', 12], 'dup-title': ['Same title as another page', 15], 'dup-meta': ['Same meta description as another page', 8],
  'thin': ['Thin page — fewer matching packages than the minimum (not published)', 30], 'no-intro': ['No intro text — add unique copy', 6], 'noindex': ['Hidden from Google (noindex)', 0],
};
function audit(pages) {
  const cT = {}, cM = {};
  pages.forEach(p => { if (p.noindex || p.thin) return; const t = (p.title || '').toLowerCase(), m = (p.meta || '').toLowerCase(); if (t) cT[t] = (cT[t] || 0) + 1; if (m) cM[m] = (cM[m] || 0) + 1; });
  pages.forEach(p => {
    const i = [], tl = (p.title || '').length, ml = (p.meta || '').length;
    if (!tl) i.push('title-missing'); else if (tl > 65) i.push('title-long'); else if (tl < 25) i.push('title-short');
    if (!ml) i.push('meta-missing'); else if (ml > 160) i.push('meta-long'); else if (ml < 70) i.push('meta-short');
    if (p.h1 === '') i.push('h1-missing');
    if (!p.noindex && !p.thin && tl && cT[(p.title || '').toLowerCase()] > 1) i.push('dup-title');
    if (!p.noindex && !p.thin && ml && cM[(p.meta || '').toLowerCase()] > 1) i.push('dup-meta');
    if (p.thin) i.push('thin'); if (p.kind === 'template' && !p.intro) i.push('no-intro'); if (p.noindex) i.push('noindex');
    p.issues = i; p.score = Math.max(0, 100 - i.reduce((a, k) => a + ISSUES[k][1], 0));
  });
  return pages;
}

/* ---------- build the full page inventory: built-in pages + overrides + template pages ---------- */
function inventory({ base = [], overrides = [], templates = [], data = {} }) {
  const ov = Object.fromEntries(overrides.map(o => [o.path, o]));
  const pages = base.map(b => { const o = ov[b.path] || {}; return { kind: 'built-in', type: b.type, path: b.path, route: b.route, img: b.img, prio: b.prio,
    title: o.title || b.title, meta: o.meta || b.desc, h1: o.h1 || b.h1 || null, intro: o.intro || '', faqs: o.faqs || [], noindex: !!o.noindex, canonical: o.canonical || '', overridden: !!ov[b.path], orig: { title: b.title, meta: b.desc, h1: b.h1, intro: '', faqs: [] } }; });
  const seen = new Set(pages.map(p => p.path));
  templates.forEach(t => expand(t, data).forEach(p => {
    if (seen.has(p.path)) return; seen.add(p.path); const o = ov[p.path] || {};
    pages.push({ ...p, kind: 'template', type: 'pSEO: ' + (TYPES[t.type] || {}).label, tplName: t.name, status: t.status, title: o.title || p.title, meta: o.meta || p.meta, h1: o.h1 || p.h1, intro: o.intro || p.intro, faqs: (o.faqs && o.faqs.length) ? o.faqs : p.faqs,
      noindex: !!o.noindex || t.status !== 'Live', canonical: o.canonical || '', overridden: !!ov[p.path], orig: { title: p.title, meta: p.meta, h1: p.h1, intro: p.intro, faqs: p.faqs } });
  }));
  return audit(pages);
}
function sitemap(pages, domain, today) {
  const D = 'https://' + String(domain || DEFAULT_SETTINGS.domain).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const live = pages.filter(p => !p.noindex && !p.thin && !p.canonical);
  return { count: live.length, xml: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${live.map(p => `  <url><loc>${D}${p.path}</loc><lastmod>${today}</lastmod><priority>${(+p.prio || 0.5).toFixed(1)}</priority></url>`).join('\n')}\n</urlset>\n` };
}
const pid = p => (String(p || '/').replace(/^\/+|\/+$/g, '').replace(/\//g, '__') || 'home');
return { pid, TYPES, VARS, ISSUES, MONTHS, DEFAULT_TEMPLATES, DEFAULT_SETTINGS, slug, fill, expand, expandAll, audit, inventory, sitemap, normPath, inr };
});
