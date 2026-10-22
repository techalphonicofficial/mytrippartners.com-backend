/* Route table: URL → middleware → controller. */
const express = require('express');
const { asyncHandler: h, rateLimit, authenticate } = require('../middleware');
const auth = require('../controllers/authController');
const pub = require('../controllers/publicController');
const admin = require('../controllers/adminController');
const content = require('../controllers/contentController');

/* /api/public — called by the website (rate-limited, no login) */
function publicRoutes() {
  const r = express.Router();
  r.get('/site', h(pub.site)); /* cached, read-only: not rate-limited (the Next.js server fetches it for every visitor) */
  r.get('/site/version', h(pub.siteVersion)); /* tiny: lets the website keep the full data in memory until it changes */
  r.get('/redirects', h(pub.redirects)); /* read by the website's proxy (cached) */
  r.post('/redirects/hit', h(pub.redirectHit)); /* hit counter for a served redirect */
  r.use(rateLimit(30, 60e3));
  r.post('/leads', h(pub.createLead));
  r.post('/bookings', h(pub.createBooking));
  r.get('/booking/:ref', h(pub.bookingStatus));
  r.post('/bookings/:ref/proof', rateLimit(12, 10 * 60e3, 'proof:'), h(pub.submitProof));
  r.post('/partners', h(pub.createPartner));
  r.post('/partners/:id/docs', h(pub.uploadPartnerDocs));
  r.get('/partners/:id/photo', h(pub.partnerPhoto));
  r.post('/partner-requests', h(pub.createPartnerRequest));
  r.post('/proposals', h(pub.createProposal));
  r.post('/coupon', h(pub.coupon));
  r.get('/catalog', h(pub.catalog));
  return r;
}

/* /api — staff dashboard (login required except /auth/login) */
function apiRoutes() {
  const r = express.Router();
  r.use('/public', publicRoutes());
  r.post('/auth/login', rateLimit(10, 60e3), h(auth.login));
  r.use(authenticate);
  r.post('/auth/logout', h(auth.logout));
  r.get('/auth/me', h(auth.me));
  r.post('/auth/password', h(auth.changePassword));

  /* website content */
  r.get('/content/_types', h(content.types));
  r.get('/content/_catalog', h(content.adminCatalog));
  r.get('/content/:type', h(content.list));
  r.post('/content/:type', h(content.create));
  r.post('/content/:type/_reorder', h(content.reorder));
  r.get('/content/:type/:id', h(content.get));
  r.patch('/content/:type/:id', h(content.update));
  r.delete('/content/:type/:id', h(content.remove));

  /* SEO */
  r.get('/seo/data', h(admin.seoData));
  r.post('/seo/publish', h(admin.seoPublish));

  /* files + payment proofs */
  r.get('/export/:col.csv', h(admin.exportCsv));
  r.get('/partner-docs/:id/:file', h(admin.partnerDoc));
  r.get('/payment-proofs/:ref/:file', h(admin.paymentProof));
  r.post('/bookings/:ref/proofs/:pid/decision', h(admin.decideProof));

  /* generic collections */
  r.get('/:col', h(admin.list));
  r.get('/:col/:id', h(admin.get));
  r.post('/:col', h(admin.create));
  r.patch('/:col/:id', h(admin.update));
  r.delete('/:col/:id', h(admin.remove));
  return r;
}

module.exports = { apiRoutes };
