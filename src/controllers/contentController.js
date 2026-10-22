/* Dashboard endpoints for website content (/api/content/*). */
const ContentService = require('../services/ContentService');

module.exports = {
  types: (req, res) => res.json({ types: ContentService.types(), images: ContentService.images() }),
  list: async (req, res) => res.json(await ContentService.list(req.staff, req.params.type)),
  get: async (req, res) => res.json(await ContentService.get(req.staff, req.params.type, req.params.id)),
  create: async (req, res) => res.json(await ContentService.create(req.staff, req.params.type, req.body)),
  update: async (req, res) => res.json(await ContentService.update(req.staff, req.params.type, req.params.id, req.body)),
  remove: async (req, res) => res.json(await ContentService.remove(req.staff, req.params.type, req.params.id)),
  reorder: async (req, res) => res.json(await ContentService.reorder(req.staff, req.params.type, (req.body || {}).ids)),
  /* dashboard catalogue (packages/destinations/themes/departures/coupons). The live SEO module gets the website's
     page list from /api/seo/data; seoPages here only feeds the offline demo mode, so it is left empty. */
  async adminCatalog(req, res) {
    res.set('Cache-Control', 'no-store');
    res.json(await ContentService.adminCatalog([]));
  },
};
