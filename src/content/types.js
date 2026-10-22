/* =====================================================================
   Content type registry (metadata-driven data mapper)
   One definition per content type describes:
     - table + columns            → used by ContentRepository for SQL
     - DTO field names + kinds    → used by the validator and the admin editor (GET /api/content/_types)
     - child lists / 1:1 parts    → stored in child tables, replaced as a whole on save
     - toSite / fromSite          → mapping to/from the website's runtime data shapes (DEST, PKG, …)
   Field kinds: slug, string, text, int, number, bool, enum, ref, date, image, color, json
   Every type also gets sortOrder (sort_order) and active (active) automatically.
   ===================================================================== */

const f = (name, col, kind, opts = {}) => ({ name, col, kind, ...opts });
const id = (label = 'ID (URL slug)') => f('id', 'id', 'slug', { required: true, max: 64, label });
const nn = v => (v === undefined ? null : v);
const opt = (key, v) => (v === null || v === undefined ? {} : { [key]: v });

const TYPES = {
  destinations: {
    label: 'Destinations', table: 'destinations', title: 'name', group: 'Catalogue',
    fields: [
      id(), f('name', 'name', 'string', { required: true, max: 120 }), f('shortName', 'short_name', 'string', { max: 60, nullable: true, label: 'Short name' }),
      f('type', 'type', 'enum', { required: true, values: ['india', 'intl'], labels: { india: 'India', intl: 'International' } }),
      f('region', 'region', 'string', { max: 60 }), f('image', 'image', 'image'), f('price', 'price', 'int', { label: 'From price (₹)' }),
      f('tag', 'tag', 'string', { max: 160 }), f('bestTime', 'best_time', 'string', { max: 200, label: 'Best time' }),
      f('duration', 'duration', 'string', { max: 60 }), f('airport', 'airport', 'string', { max: 160 }), f('about', 'about', 'text'),
    ],
    lists: [
      { name: 'gallery', label: 'Gallery images', table: 'destination_images', fk: 'destination_id', scalar: f('image', 'image', 'image') },
      { name: 'highlights', label: 'Highlights', table: 'destination_highlights', fk: 'destination_id', scalar: f('text', 'text', 'string', { max: 300 }) },
    ],
    fromSite: o => ({ id: o.id, name: o.name, shortName: nn(o.short), type: o.type, region: o.region, image: o.img, price: o.price, tag: o.tag, bestTime: o.best, duration: o.dur, airport: o.air, about: o.about, gallery: o.gal || [], highlights: o.hl || [] }),
    toSite: d => ({ id: d.id, name: d.name, type: d.type, region: d.region, img: d.image, gal: d.gallery, price: d.price, tag: d.tag, best: d.bestTime, dur: d.duration, air: d.airport, about: d.about, hl: d.highlights, ...opt('short', d.shortName) }),
  },

  themes: {
    label: 'Themes', table: 'themes', title: 'name', group: 'Catalogue',
    fields: [id(), f('name', 'name', 'string', { required: true, max: 120 }), f('icon', 'icon', 'string', { max: 40 }), f('image', 'image', 'image'), f('description', 'description', 'text')],
    fromSite: o => ({ id: o.id, name: o.name, icon: o.icon, image: o.img, description: o.desc }),
    toSite: d => ({ id: d.id, name: d.name, icon: d.icon, img: d.image, desc: d.description }),
  },

  packages: {
    label: 'Packages', table: 'packages', title: 'title', group: 'Catalogue',
    fields: [
      id(), f('destinationId', 'destination_id', 'ref', { required: true, ref: 'destinations', label: 'Destination' }),
      f('title', 'title', 'string', { required: true, max: 160 }), f('nights', 'nights', 'int', { min: 0, max: 60 }),
      f('price', 'price', 'int', { label: 'Price per person (₹)' }), f('image', 'image', 'image'),
      f('route', 'route', 'string', { max: 200 }), f('tag', 'tag', 'string', { max: 80, nullable: true }),
    ],
    lists: [
      { name: 'themes', label: 'Themes', table: 'package_themes', fk: 'package_id', scalar: f('themeId', 'theme_id', 'ref', { ref: 'themes' }) },
      { name: 'days', label: 'Day-wise itinerary', table: 'package_days', fk: 'package_id', fields: [f('title', 'title', 'string', { required: true, max: 160 }), f('details', 'details', 'text')] },
    ],
    ones: [
      { name: 'weekend', label: 'Weekend getaway details', table: 'package_weekend', fk: 'package_id', fields: [
        f('distanceKm', 'distance_km', 'int', { label: 'Distance (km)' }), f('driveHours', 'drive_hours', 'number', { label: 'Drive (hours)' }),
        f('transport', 'transport', 'string', { max: 80 }), f('leaveAt', 'leave_at', 'string', { max: 40, label: 'Leaves' }),
        f('backAt', 'back_at', 'string', { max: 40, label: 'Back' }), f('vibe', 'vibe', 'enum', { values: ['adventure', 'mountains', 'spiritual', 'heritage', 'wildlife'] })] },
      { name: 'festive', label: 'Christmas / New Year departure', table: 'package_festive', fk: 'package_id', fields: [
        f('occasion', 'occasion', 'enum', { required: true, values: ['xmas', 'nye', 'both'], labels: { xmas: 'Christmas', nye: 'New Year', both: 'Christmas + New Year' } }),
        f('departureDate', 'departure_date', 'date', { required: true }), f('returnDate', 'return_date', 'date', { required: true }),
        f('highlight', 'highlight', 'string', { max: 300 }), f('earlyBirdPct', 'early_bird_pct', 'int', { min: 0, max: 90, label: 'Early-bird %' }), f('seats', 'seats', 'int')] },
    ],
    fromSite: o => ({
      id: o.id, destinationId: o.dest, title: o.title, nights: o.n, price: o.price, image: o.img, route: o.route, tag: nn(o.tag), themes: o.themes || [],
      days: (o.plan || []).map(s => { const i = s.indexOf('|'); return { title: s.slice(0, i), details: s.slice(i + 1) }; }),
      weekend: o.wk ? { distanceKm: o.wk.km, driveHours: o.wk.hrs, transport: o.wk.mode, leaveAt: o.wk.leave, backAt: o.wk.back, vibe: o.wk.vibe } : null,
      festive: o.fx ? { occasion: o.fx.occ, departureDate: o.fx.dep, returnDate: o.fx.ret, highlight: o.fx.hi, earlyBirdPct: o.fx.eb, seats: o.fx.seats } : null,
    }),
    toSite: d => ({
      id: d.id, dest: d.destinationId, title: d.title, n: d.nights, price: d.price, img: d.image, themes: d.themes, route: d.route, ...opt('tag', d.tag),
      plan: d.days.map(x => `${x.title}|${x.details}`),
      ...(d.weekend ? { wk: { km: d.weekend.distanceKm, hrs: d.weekend.driveHours, mode: d.weekend.transport, leave: d.weekend.leaveAt, back: d.weekend.backAt, vibe: d.weekend.vibe } } : {}),
      ...(d.festive ? { fx: { occ: d.festive.occasion, dep: d.festive.departureDate, ret: d.festive.returnDate, hi: d.festive.highlight, eb: d.festive.earlyBirdPct, seats: d.festive.seats } } : {}),
    }),
  },

  states: {
    label: 'States & UTs', table: 'states', title: 'name', group: 'India guide',
    fields: [id(), f('name', 'name', 'string', { required: true, max: 120 }), f('isUnionTerritory', 'is_union_territory', 'bool', { label: 'Union territory' }),
      f('capital', 'capital', 'string', { max: 160 }), f('image', 'image', 'image'), f('description', 'description', 'text')],
    fromSite: o => ({ id: o.s, name: o.n, isUnionTerritory: !!o.ut, capital: o.cap, image: o.img, description: o.d }),
    toSite: d => ({ s: d.id, n: d.name, ...(d.isUnionTerritory ? { ut: 1 } : {}), cap: d.capital, img: d.image, d: d.description }),
  },

  placeCategories: {
    label: 'Place categories', table: 'place_categories', title: 'title', group: 'India guide',
    fields: [id('Key'), f('slug', 'slug', 'string', { required: true, max: 120, label: 'Page URL slug' }), f('title', 'title', 'string', { required: true, max: 160 }), f('description', 'description', 'text')],
    fromSite: (o, k) => ({ id: k, slug: o[0], title: o[1], description: o[2] }),
    toSite: d => [d.slug, d.title, d.description],
  },

  places: {
    label: 'Places', table: 'places', title: 'name', group: 'India guide',
    fields: [
      id(), f('name', 'name', 'string', { required: true, max: 120 }), f('stateId', 'state_id', 'ref', { required: true, ref: 'states', label: 'State' }),
      f('destinationId', 'destination_id', 'ref', { ref: 'destinations', nullable: true, label: 'Linked destination' }),
      f('latitude', 'latitude', 'number'), f('longitude', 'longitude', 'number'), f('airport', 'airport', 'string', { max: 200 }), f('rail', 'rail', 'string', { max: 200 }),
      f('bestTime', 'best_time', 'string', { max: 120, label: 'Best time' }), f('days', 'days', 'string', { max: 40 }), f('altitudeM', 'altitude_m', 'int', { nullable: true, label: 'Altitude (m)' }),
      f('image', 'image', 'image'), f('description', 'description', 'text'),
    ],
    lists: [
      { name: 'categories', label: 'Categories', table: 'place_category_map', fk: 'place_id', scalar: f('categoryId', 'category_id', 'string', { max: 40 }) },
      { name: 'attractions', label: 'Attractions', table: 'place_items', fk: 'place_id', where: { kind: 'attraction' }, scalar: f('text', 'text', 'string', { max: 300 }) },
      { name: 'foods', label: 'Food to try', table: 'place_items', fk: 'place_id', where: { kind: 'food' }, scalar: f('text', 'text', 'string', { max: 300 }) },
      { name: 'shopping', label: 'What to buy', table: 'place_items', fk: 'place_id', where: { kind: 'shopping' }, scalar: f('text', 'text', 'string', { max: 300 }) },
    ],
    fromSite: o => ({ id: o.id, name: o.n, stateId: o.s, destinationId: o.dest || null, latitude: o.lat, longitude: o.lng, airport: o.air, rail: o.rail, bestTime: o.best, days: o.days, altitudeM: nn(o.alt), image: o.img, description: o.d, categories: o.t || [], attractions: o.a || [], foods: o.food || [], shopping: o.buy || [] }),
    toSite: d => ({ id: d.id, n: d.name, s: d.stateId, t: d.categories, lat: d.latitude, lng: d.longitude, air: d.airport, rail: d.rail, best: d.bestTime, days: d.days, ...opt('alt', d.altitudeM), dest: d.destinationId || '', img: d.image, d: d.description, a: d.attractions, food: d.foods, buy: d.shopping }),
  },

  guides: {
    label: 'Travel guides', table: 'guides', title: 'title', group: 'Editorial',
    fields: [
      id(), f('title', 'title', 'string', { required: true, max: 200 }), f('image', 'image', 'image'), f('category', 'category', 'string', { max: 60 }),
      f('readMinutes', 'read_minutes', 'int', { label: 'Read time (min)' }), f('intro', 'intro', 'text'),
      f('linkLabel', 'link_label', 'string', { max: 120, label: 'Call-to-action label' }), f('linkRoute', 'link_route', 'string', { max: 120, label: 'Call-to-action route (e.g. d-kashmir, t-honeymoon, visa)' }),
      f('table', 'comparison_table', 'json', { nullable: true, label: 'Comparison table (rows of cells)' }),
    ],
    lists: [{ name: 'sections', label: 'Sections', table: 'guide_sections', fk: 'guide_id', fields: [f('heading', 'heading', 'string', { required: true, max: 200 }), f('body', 'body', 'text')] }],
    fromSite: o => ({ id: o.id, title: o.title, image: o.img, category: o.cat, readMinutes: o.min, intro: o.intro, linkLabel: (o.link || [])[0] || '', linkRoute: (o.link || [])[1] || '', table: nn(o.table), sections: (o.body || []).map(([heading, body]) => ({ heading, body })) }),
    toSite: d => ({ id: d.id, title: d.title, img: d.image, cat: d.category, min: d.readMinutes, intro: d.intro, body: d.sections.map(s => [s.heading, s.body]), link: [d.linkLabel, d.linkRoute], ...opt('table', d.table) }),
  },

  visa: {
    label: 'Visa-easy countries', table: 'visa_countries', title: 'name', group: 'Editorial',
    fields: [
      id(), f('group', 'visa_group', 'enum', { required: true, values: ['free', 'voa'], labels: { free: 'Visa-free', voa: 'Visa on arrival / e-visa' } }),
      f('name', 'name', 'string', { required: true, max: 120 }), f('destinationId', 'destination_id', 'ref', { ref: 'destinations', nullable: true, label: 'Linked destination' }),
      f('note', 'note', 'string', { max: 200 }), f('subtitle', 'subtitle', 'string', { max: 200 }),
      f('colorPrimary', 'color_primary', 'color', { label: 'Flag colour 1' }), f('colorSecondary', 'color_secondary', 'color', { label: 'Flag colour 2' }),
      f('image', 'image', 'image'), f('stay', 'stay', 'string', { max: 120 }), f('tip', 'tip', 'string', { max: 200 }),
    ],
    fromSite: (o, x = {}) => ({ id: o.id, group: o.group, name: o.name, destinationId: nn(o.dest), note: o.note, subtitle: o.sub, colorPrimary: o.c1, colorSecondary: o.c2, image: x.img || '', stay: x.stay || '', tip: x.tip || '' }),
    toSite: d => ({ id: d.id, name: d.name, ...opt('dest', d.destinationId), note: d.note, sub: d.subtitle, c1: d.colorPrimary, c2: d.colorSecondary }),
  },

  services: {
    label: 'Services', table: 'services', title: 'name', group: 'Editorial',
    fields: [id(), f('name', 'name', 'string', { required: true, max: 120 }), f('icon', 'icon', 'string', { max: 40 }), f('description', 'description', 'text')],
    lists: [{ name: 'features', label: 'What is included', table: 'service_features', fk: 'service_id', scalar: f('text', 'text', 'string', { max: 300 }) }],
    fromSite: (o, features = []) => ({ id: o.id, name: o.name, icon: o.icon, description: o.desc, features }),
    toSite: d => ({ id: d.id, name: d.name, icon: d.icon, desc: d.description }),
  },

  infoPages: {
    label: 'Info pages (FAQ, policies)', table: 'info_pages', title: 'title', group: 'Editorial',
    fields: [id(), f('title', 'title', 'string', { required: true, max: 200 })],
    lists: [{ name: 'sections', label: 'Sections / questions', table: 'info_page_sections', fk: 'page_id', fields: [f('heading', 'heading', 'string', { required: true, max: 300 }), f('body', 'body', 'text')] }],
    fromSite: (o, k) => ({ id: k, title: o[0], sections: o[1].map(([heading, body]) => ({ heading, body })) }),
    toSite: d => [d.title, d.sections.map(s => [s.heading, s.body])],
  },

  faqs: {
    label: 'Feature FAQs', table: 'faqs', title: 'question', group: 'Editorial',
    fields: [id(), f('group', 'faq_group', 'enum', { required: true, values: ['partner', 'partner-safety'], labels: { partner: 'Travel Partner', 'partner-safety': 'Travel Partner — safety & verification' } }),
      f('question', 'question', 'string', { required: true, max: 300 }), f('answer', 'answer', 'text')],
    fromSite: (o, group, i) => ({ id: `${group}-${i + 1}`, group, question: o[0], answer: o[1] }),
    toSite: d => [d.question, d.answer],
  },

  reels: {
    label: 'Video reels', table: 'reels', title: 'title', group: 'Media',
    fields: [id(), f('destinationId', 'destination_id', 'ref', { required: true, ref: 'destinations', label: 'Destination' }),
      f('packageId', 'package_id', 'ref', { ref: 'packages', nullable: true, label: 'Linked package' }), f('title', 'title', 'string', { required: true, max: 200 }), f('tag', 'tag', 'string', { max: 120 })],
    fromSite: o => ({ id: o.id, destinationId: o.dest, packageId: nn(o.pkg), title: o.t, tag: o.tag }),
    toSite: d => ({ id: d.id, dest: d.destinationId, pkg: d.packageId, t: d.title, tag: d.tag }),
  },

  holidays: {
    label: 'Long weekends', table: 'holidays', title: 'label', group: 'Media',
    fields: [id(), f('date', 'holiday_date', 'date', { required: true }), f('label', 'label', 'string', { required: true, max: 80 }), f('note', 'note', 'string', { max: 300 })],
    fromSite: o => ({ id: 'lw-' + o[0], date: o[0], label: o[1], note: o[2] }),
    toSite: d => [d.date, d.label, d.note],
  },

  samplePartners: {
    label: 'Sample travel partners', table: 'sample_partners', title: 'name', group: 'Media',
    fields: [
      id(), f('name', 'name', 'string', { required: true, max: 80 }), f('gender', 'gender', 'enum', { values: ['Male', 'Female', 'Other'] }), f('age', 'age', 'int', { min: 18, max: 99 }),
      f('city', 'city', 'string', { max: 80 }), f('languages', 'languages', 'json', { label: 'Languages (list)' }), f('travelStyle', 'travel_style', 'string', { max: 160 }),
      f('trips', 'trips', 'json', { label: 'Planned trips ([destination, month] pairs)' }), f('about', 'about', 'text'),
      f('interests', 'interests', 'json', { label: 'Interests (list)' }), f('verified', 'verified', 'json', { label: 'Verified badges (list)' }),
      f('responseTime', 'response_time', 'string', { max: 80 }), f('budget', 'budget', 'string', { max: 40 }), f('pace', 'pace', 'string', { max: 40 }),
      f('diet', 'diet', 'string', { max: 40 }), f('smoker', 'smoker', 'bool'), f('drinks', 'drinks', 'string', { max: 40 }), f('homeCity', 'home_city', 'string', { max: 80, label: 'Travels from' }),
      f('selfieVerified', 'selfie_verified', 'bool', { nullable: true }), f('joined', 'joined', 'string', { max: 40 }), f('womenOnly', 'women_only', 'bool', { nullable: true, label: 'Women-only trips' }),
    ],
    fromSite: o => ({ id: o.id, name: o.name, gender: o.g, age: o.age, city: o.city, languages: o.lang, travelStyle: o.style, trips: o.trips, about: o.about, interests: o.int, verified: o.ver, responseTime: o.resp, budget: o.bud, pace: o.pace, diet: o.diet, smoker: !!o.smoke, drinks: o.drink, homeCity: o.from, selfieVerified: nn(o.selfie), joined: o.joined, womenOnly: nn(o.womenOnly) }),
    toSite: d => ({ id: d.id, name: d.name, g: d.gender, age: d.age, city: d.city, lang: d.languages, style: d.travelStyle, trips: d.trips, about: d.about, int: d.interests, ver: d.verified, resp: d.responseTime, bud: d.budget, pace: d.pace, diet: d.diet, smoke: d.smoker, drink: d.drinks, from: d.homeCity, ...opt('selfie', d.selfieVerified), joined: d.joined, ...opt('womenOnly', d.womenOnly) }),
  },
};

/* common columns */
for (const [key, t] of Object.entries(TYPES)) {
  t.key = key;
  t.lists = t.lists || []; t.ones = t.ones || [];
  t.fields.push(f('sortOrder', 'sort_order', 'int', { label: 'Display order' }), f('active', 'active', 'bool', { label: 'Published', default: true }));
}

module.exports = { TYPES };
