/* Dashboard endpoints: generic collections, files, payment-proof decisions, CSV export, SEO. */
const RecordService = require('../services/RecordService');
const BookingService = require('../services/BookingService');
const PartnerService = require('../services/PartnerService');
const SeoService = require('../services/SeoService');
const Activity = require('../services/ActivityService');
const { can } = require('../services/policy');
const { forbidden } = require('../utils/errors');

const privateFile = (res, file) => { res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }); res.sendFile(file); };

module.exports = {
  list: async (req, res) => res.json(await RecordService.list(req.staff, req.params.col, { limit: req.query.limit })),
  get: async (req, res) => res.json(await RecordService.get(req.staff, req.params.col, req.params.id)),
  create: async (req, res) => res.json(await RecordService.create(req.staff, req.params.col, req.body)),
  update: async (req, res) => res.json(await RecordService.update(req.staff, req.params.col, req.params.id, req.body)),
  remove: async (req, res) => res.json(await RecordService.remove(req.staff, req.params.col, req.params.id)),

  async exportCsv(req, res) {
    const r = await RecordService.exportCsv(req.staff, req.params.col);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${r.filename}"` });
    res.send(r.body);
  },
  async partnerDoc(req, res) {
    if (!['admin', 'ops'].includes(req.staff.role)) throw forbidden('Only admin or operations can view identity documents.');
    privateFile(res, await PartnerService.documentFile(req.staff, req.params.id, req.params.file));
  },
  async paymentProof(req, res) {
    if (!can(req.staff, 'bookings', 'r')) throw forbidden();
    const r = await BookingService.proofFile(req.params.ref, req.params.file);
    await Activity.log(req.staff, 'viewed payment proof', 'bookings', r.booking.id, r.proof.id);
    privateFile(res, r.path);
  },
  async decideProof(req, res) {
    if (!can(req.staff, 'bookings', 'w')) throw forbidden();
    res.json(await BookingService.decideProof(req.staff, req.params.ref, req.params.pid, req.body || {}));
  },
  seoData: async (req, res) => res.json(await SeoService.data(req.staff)),
  seoPublish: async (req, res) => res.json(await SeoService.publish(req.staff)),
};
