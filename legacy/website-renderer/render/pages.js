/* =====================================================================
   Built-in page catalogue (formerly the static build in prerender.js).
   buildPageIndex(X, domain) → Map(path → page) where page =
     { path, route, title, desc, img, prio, type, body(): html, jsonld(): [] }
   Titles/descriptions are computed eagerly (cheap); bodies are rendered on request.
   ===================================================================== */

const TYPE = { '': 'Home', destinations: 'Destination', packages: 'Package', guides: 'Guide', themes: 'Theme', videos: 'Videos', 'weekend-getaways-from-delhi': 'Collection', 'christmas-new-year-packages': 'Collection' };
const pageType = urlPath => {
  const seg = urlPath.split('/')[1] || '';
  if (seg === 'india') return urlPath.split('/').length > 4 ? 'Place guide' : urlPath === '/india/' ? 'India index' : 'State / category';
  return TYPE[seg] || 'Page';
};

function buildPageIndex(X, DOMAIN) {
  const pages = new Map();
  const Y = new Date().getFullYear();
  const crumbs = list => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: DOMAIN + u })) });
  const site = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'TripPartner', url: DOMAIN + '/', potentialAction: { '@type': 'SearchAction', target: DOMAIN + '/#search?q={search_term_string}', 'query-input': 'required name=search_term_string' } };
  const add = (path, route, title, desc, body, jsonld, img, prio) => pages.set(path, { path, route, title, desc, img: img || 'group-lake', prio: prio || 0.6, type: pageType(path), body, jsonld });

  add('/', 'home', 'TripPartner — Holiday Packages, Pilgrimage Yatras, Group Tours & Travel Partner',
    `Plan holidays across India and abroad with TripPartner: ${X.PLACES.length}+ India travel guides, ${X.PKG.length} tour packages, Char Dham yatras, group tours and verified travel partners.`,
    () => X.home(), () => [site], 'group-lake', 1.0);

  add('/india/', 'places', `${X.PLACES.length}+ Tourist Places in India (${Y}): State-wise Travel Guide | TripPartner`,
    `Explore ${X.PLACES.length}+ tourist places in India across ${X.STATES.length} states and UTs — best time, how to reach, itineraries, food and tour packages.`,
    () => X.placesIndex(), () => [crumbs([['Home', '/'], ['India', '/india/']]), { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: X.STATES.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${DOMAIN}/india/${s.s}/`, name: s.n })) }], 'taj', 0.9);

  for (const st of X.STATES) {
    const l = X.PLACES.filter(p => p.s === st.s);
    add(`/india/${st.s}/`, `state-${st.s}`, `${st.n} Tourism ${Y}: ${l.length} Best Places to Visit, Best Time & Packages | TripPartner`,
      `${st.n} travel guide: ${l.slice(0, 4).map(p => p.n).join(', ')} and more. Best time to visit, how to reach, itineraries and ${st.n} tour packages.`,
      () => X.statePage(st.s), () => [crumbs([['Home', '/'], ['India', '/india/'], [st.n, `/india/${st.s}/`]]), { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: l.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${DOMAIN}/india/${st.s}/${p.id}/`, name: p.n })) }], st.img, 0.8);
  }
  for (const p of X.PLACES) {
    const m = X.placeMeta(p);
    add(m.path, `place-${p.id}`, m.title, m.desc, () => X.placePage(p.id), () => X.placeJsonLd(p), X.placeImg(p), 0.8);
  }
  for (const k of Object.keys(X.CATS)) {
    const [slug, h, d] = X.CATS[k]; const l = X.PLACES.filter(p => p.t.includes(k)); if (!l.length) continue;
    add(`/india/${slug}/`, `cat-${slug}`, `${l.length} Best ${h} (${Y}) — Places, Best Time & Packages | TripPartner`, `${d} Compare ${l.length} places with best time, how to reach and trip ideas.`,
      () => X.catPage(slug), () => [crumbs([['Home', '/'], ['India', '/india/'], [h, `/india/${slug}/`]])], X.placeImg(l[0]), 0.7);
  }
  for (const d of X.DEST) {
    add(`/destinations/${d.id}/`, `d-${d.id}`, `${d.name} Tour Packages ${Y} from ${X.inr(d.price)} | TripPartner`,
      `${d.name} holiday packages: ${d.hl.slice(0, 3).join(', ')}. Best time ${d.best}. Customisable itineraries with hotels and transfers.`,
      () => X.destPage(d.id), () => [crumbs([['Home', '/'], [d.name, `/destinations/${d.id}/`]])], d.img, 0.8);
  }
  for (const p of X.PKG) {
    const d = X.D(p.dest) || { id: p.dest, name: p.dest };
    add(`/packages/${p.id}/`, `p-${p.id}`, `${p.title} — ${p.n}N/${p.n + 1}D from ${X.inr(p.price)} | TripPartner`,
      `${p.title}: ${p.route}. Day-wise itinerary, hotels, inclusions and prices. Book online or get a custom quote.`,
      () => X.pkgPage(p.id), () => [crumbs([['Home', '/'], [d.name, `/destinations/${d.id}/`], [p.title, `/packages/${p.id}/`]]), { '@context': 'https://schema.org', '@type': 'TouristTrip', name: p.title, description: p.route, touristType: p.themes, itinerary: { '@type': 'ItemList', itemListElement: p.plan.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: `Day ${i + 1}: ${x.split('|')[0]}` })) }, offers: { '@type': 'Offer', price: p.price, priceCurrency: 'INR', availability: 'https://schema.org/InStock' } }], p.img, 0.7);
  }
  for (const g of X.GUIDES) {
    add(`/guides/${g.id}/`, `g-${g.id}`, `${g.title} | TripPartner`, g.intro, () => X.guidePage(g.id),
      () => [{ '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.intro, author: { '@type': 'Organization', name: 'TripPartner' }, publisher: { '@type': 'Organization', name: 'TripPartner' } }], g.img, 0.6);
  }
  for (const t of X.THEMES) {
    const items = X.PKG.filter(p => p.themes.includes(t.id));
    add(`/themes/${t.id}/`, `t-${t.id}`, `${t.name} Holiday Packages ${Y} | TripPartner`, `${t.desc} ${items.length} packages across India and abroad.`,
      () => X.listPage({ title: `${t.name} Holidays`, lead: t.desc, img: t.img, crumbs: t.name, items, eyebrow: 'Holiday theme' }).replace('<div class="grid g3" id="plist"></div>', `<div class="grid g3" id="plist">${items.map(p => X.card(p.id)).join('')}</div>`),
      () => [], t.img, 0.6);
  }
  add('/videos/', 'videos', 'TripPartner TV — Travel Videos & Reels | TripPartner', 'Watch TripPartner travel reels and films: Kashmir, Kerala, Goa, Ladakh, Bali, Char Dham, Rajasthan and Andaman.',
    () => X.videosPage(), () => [{ '@context': 'https://schema.org', '@type': 'VideoObject', name: 'TripPartner showreel', description: 'Destinations across India and abroad', thumbnailUrl: DOMAIN + '/video/showreel.jpg', contentUrl: DOMAIN + '/video/showreel.mp4', uploadDate: new Date().toISOString().slice(0, 10) }], 'group-lake', 0.6);
  if (X.WEEKEND.length) {
    add('/weekend-getaways-from-delhi/', 'weekend', `Weekend Getaways from Delhi NCR (${Y}): ${X.WEEKEND.length} Trips from ${X.inr(Math.min(...X.WEEKEND.map(p => p.price)))} | TripPartner`,
      'Weekend trips from Delhi, Noida and Gurugram: Rishikesh, Mussoorie, Nainital, Jaipur, Agra, Shimla, Jim Corbett and more. Leave Friday, back Sunday.',
      () => X.weekendPage(), () => [{ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: X.WEEKEND.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${DOMAIN}/packages/${p.id}/`, name: p.title })) }], 'rafting', 0.9);
  }
  if (X.FESTIVE.length) {
    add('/christmas-new-year-packages/', 'christmas-new-year', `Christmas & New Year Packages 2026–27: ${X.FESTIVE.length} Festive Trips | TripPartner`,
      'Christmas and New Year 2026–27 holiday packages: Goa NYE party, white Christmas in Manali, Gulmarg snow, Udaipur, Jaisalmer desert camp, Dubai fireworks, Thailand, Bali, Singapore and Europe Christmas markets.',
      () => X.festivePage(), () => [{ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: X.FESTIVE.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${DOMAIN}/packages/${p.id}/`, name: p.title })) }], 'kashmir-snow', 0.9);
  }
  return pages;
}

module.exports = { buildPageIndex };
