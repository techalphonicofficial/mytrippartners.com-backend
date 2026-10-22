/* Live data the website applies in the browser (/api/public/catalog): contact details, package
   price/visibility overrides, departures, published reviews and SEO overrides. */
const { repos } = require('../repositories/RecordRepository');

const noMeta = ({ created, updated, ...r }) => r;

const CatalogService = {
  async publicCatalog() {
    const [site, packages, departures, reviews, seo] = await Promise.all([repos.settings.get('site'), repos.packages.list(), repos.departures.list(), repos.reviews.list(), repos.seo_pages.list()]);
    const s = { ...(site || {}) }; ['id', 'created', 'updated'].forEach(k => delete s[k]);
    return {
      settings: s,
      packages: packages.map(noMeta),
      departures: departures.filter(d => d.status !== 'Cancelled').map(noMeta),
      reviews: reviews.filter(r => r.status === 'Published').map(({ phone, created, updated, ...r }) => r),
      seo: Object.fromEntries(seo.filter(o => o.route).map(o => [o.route, { title: o.title || '', meta: o.meta || '', h1: o.h1 || '', intro: o.intro || '', faqs: o.faqs || [] }])),
    };
  },
};

module.exports = CatalogService;
