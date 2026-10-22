/* Endpoints called by the public website (/api/public/*). */
const BookingService = require('../services/BookingService');
const PartnerService = require('../services/PartnerService');
const CatalogService = require('../services/CatalogService');
const SiteDataService = require('../services/SiteDataService');
const SeoService = require('../services/SeoService');

module.exports = {
  createLead: async (req, res) => res.json(await BookingService.createLead(req.body || {})),
  createBooking: async (req, res) => res.json(await BookingService.createBooking(req.body || {})),
  bookingStatus: async (req, res) => res.json(await BookingService.statusFor(req.params.ref, req.query.phone)),
  submitProof: async (req, res) => res.json(await BookingService.submitProof(req.params.ref, req.body || {})),
  createPartner: async (req, res) => res.json(await PartnerService.createProfile(req.body || {})),
  uploadPartnerDocs: async (req, res) => res.json(await PartnerService.uploadDocuments(req.params.id, req.body || {})),
  async partnerPhoto(req, res) { const file = await PartnerService.publicPhoto(req.params.id); res.set('Cache-Control', 'public, max-age=3600'); res.sendFile(file); },
  createPartnerRequest: async (req, res) => res.json(await PartnerService.createRequest(req.body || {})),
  createProposal: async (req, res) => res.json(await PartnerService.createProposal(req.body || {})),
  async coupon(req, res) { const r = await BookingService.validateCoupon((req.body || {}).code, (req.body || {}).date); res.status(r.status).json(r.body); },
  /* all website data for the Next.js site (cached; ETag = content version) */
  async site(req, res) {
    const s = await SiteDataService.get(), etag = `"${s.version}"`;
    res.set({ 'Content-Type': 'application/json; charset=utf-8', ETag: etag, 'Cache-Control': 'public, max-age=30' });
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.send(s.json);
  },
  async siteVersion(req, res) { res.set('Cache-Control', 'no-store'); res.json({ version: (await SiteDataService.get()).version }); },
  async redirects(req, res) { res.set('Cache-Control', 'public, max-age=30'); res.json(await SeoService.publicRedirects()); },
  redirectHit: async (req, res) => res.json(await SeoService.hitByPath((req.body || {}).from)),
  async catalog(req, res) { res.set('Cache-Control', 'public, max-age=60'); res.json(await CatalogService.publicCatalog()); },
};
