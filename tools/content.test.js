/* Content model tests (no database): every seeded record passes validation, the website mapping round-trips
   exactly, and plain-text rules hold. */
const test = require('node:test'), assert = require('node:assert');
const { TYPES } = require('../src/content/types');
const { validate } = require('../src/content/validate');
const { fromSiteModel, settingsFromSiteModel, toSiteModel } = require('../src/content/siteModel');
const X = require('../src/db/seeds/content.json');

test('every seeded content record passes validation (so it can be re-saved in the dashboard)', () => {
  const d = fromSiteModel(X); let n = 0;
  for (const [k, rows] of Object.entries(d)) for (const r of rows) { validate(TYPES[k], r); n++; }
  assert.ok(n > 400);
});

test('website data → DTOs → website data is lossless', () => {
  const d = fromSiteModel(X), s = settingsFromSiteModel(X);
  const coupons = Object.entries(X.CONFIG.coupons).map(([code, c]) => ({ code, ...c, active: true }));
  const M = toSiteModel(d, { site: s.site, content: s.content, departures: X.DEPARTURES.map(([pkg, date]) => ({ pkg, date, status: 'Open' })), coupons });
  for (const k of Object.keys(X)) assert.deepStrictEqual(JSON.parse(JSON.stringify(M[k])), X[k], k);
});

test('validation rejects HTML, bad ids, bad references and wrong types', () => {
  const bad = (t, o) => assert.throws(() => validate(TYPES[t], o), e => e.status === 400);
  bad('themes', { id: 'ok', name: 'x <script>' });
  bad('themes', { id: 'Not A Slug', name: 'x' });
  bad('packages', { id: 'p', title: 'x', destinationId: '', nights: 2 });
  bad('packages', { id: 'p', title: 'x', destinationId: 'goa', nights: 'many' });
  bad('holidays', { id: 'h', date: '25/12/2026', label: 'x' });
  bad('guides', { id: 'g', title: 'x', table: '[["<b>"]]' });
  const ok = validate(TYPES.packages, { id: 'p', title: 'x', destinationId: 'goa', themes: ['family'], days: [{ title: 'Day', details: 'd' }], weekend: null });
  assert.equal(ok.active, true); assert.deepStrictEqual(ok.days, [{ title: 'Day', details: 'd' }]);
  assert.deepStrictEqual(Object.keys(validate(TYPES.packages, { price: 9 }, { partial: true })), ['price']);
});
