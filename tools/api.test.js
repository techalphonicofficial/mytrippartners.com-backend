/* npm test — runs the app on a temporary MySQL database (trippartner_test, dropped afterwards) and checks the main flows:
   dashboard API, public website API, payments, Travel Partner, SEO, website content editing and the website data API
   (the website itself is the Next.js app in client/, which renders pages from GET /api/public/site). */
const test = require('node:test'), assert = require('node:assert'), os = require('os'), path = require('path'), fs = require('fs');
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-'));
process.env.MYSQL_DATABASE = 'trippartner_test';
process.env.NEXT_URL = ''; /* no website during tests: nothing is notified, SEO publish reports it */
process.env.ADMIN_EMAIL = 'admin@test.local'; process.env.ADMIN_PASSWORD = 'Admin@12345';
const mysql = require('mysql2/promise'), config = require('../src/config');
const dropTestDb = async () => { const { database, connectionLimit, ...server } = config.db; const c = await mysql.createConnection(server); await c.query('DROP DATABASE IF EXISTS `trippartner_test`'); await c.end(); };
let app, ready, close, base, srv, H;
const j = async (m, p, body, h = {}) => { const r = await fetch(base + p, { method: m, headers: { 'Content-Type': 'application/json', ...h }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, b: await r.json().catch(() => null) }; };
const site = async () => (await j('GET', '/api/public/site')).b;
const html = async p => { const r = await fetch(base + p, { redirect: 'manual' }); return { s: r.status, t: await r.text(), r }; };
test.before(async () => { await dropTestDb(); ({ app, ready, close } = require('../server.js')); await ready; await new Promise(r => { srv = app.listen(0, r); }); base = `http://127.0.0.1:${srv.address().port}`; });
test.after(async () => { srv.close(); await close(); await dropTestDb(); });
test('login', async () => {
  assert.equal((await j('POST', '/api/auth/login', { email: 'admin@test.local', password: 'nope' })).s, 401);
  const r = await j('POST', '/api/auth/login', { email: 'admin@test.local', password: 'Admin@12345' }); assert.equal(r.s, 200); H = { Authorization: 'Bearer ' + r.b.token };
  assert.equal((await j('GET', '/api/leads')).s, 401);
});
test('website lead + booking reach the dashboard', async () => {
  assert.equal((await j('POST', '/api/public/leads', { name: 'A', phone: '123' })).s, 400);
  const l = await j('POST', '/api/public/leads', { name: 'Asha', phone: '9876543210', subject: 'Goa' }); assert.ok(l.b.id);
  const b = await j('POST', '/api/public/bookings', { name: 'Asha', phone: '9876543210', pkg: 'goa-getaway', total: 30000, adv: 7500 }); assert.match(b.b.ref, /^TP\d{2}/);
  const st = await j('GET', `/api/public/booking/${b.b.ref}?phone=9876543210`); assert.equal(st.b.status, 1);
  assert.equal((await j('GET', `/api/public/booking/${b.b.ref}?phone=9000000000`)).s, 404);
  assert.ok((await j('GET', '/api/leads', null, H)).b.some(x => x.name === 'Asha'));
});
test('coupons + catalogue', async () => {
  await j('POST', '/api/coupons', { code: 'test10', pct: 10, active: true }, H);
  assert.equal((await j('POST', '/api/public/coupon', { code: 'TEST10' })).b.pct, 10);
  assert.equal((await j('POST', '/api/public/coupon', { code: 'NOPE' })).s, 404);
  await j('PATCH', '/api/settings/site', { announcement: 'Hello' }, H);
  assert.equal((await j('GET', '/api/public/catalog')).b.settings.announcement, 'Hello');
});
test('roles', async () => {
  await j('POST', '/api/staff', { name: 'S', email: 's@test.local', password: 'Sales@1234', role: 'sales' }, H);
  const r = await j('POST', '/api/auth/login', { email: 's@test.local', password: 'Sales@1234' }); const S = { Authorization: 'Bearer ' + r.b.token };
  assert.equal((await j('GET', '/api/leads', null, S)).s, 200);
  assert.equal((await j('GET', '/api/staff', null, S)).s, 403);
  assert.equal((await j('PATCH', '/api/settings/site', { phone: 'x' }, S)).s, 403);
  assert.equal((await j('DELETE', '/api/leads/x', null, S)).s, 403);
});
test('partner photo + ID upload, staff-only view, deleted after decision', async () => {
  const img = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex').toString('base64');
  const p = await j('POST', '/api/public/partners', { name: 'Riya', phone: '9876543210', age: 26, idType: 'pan', idLast4: '1234', styles: ['Snow'] });
  assert.ok(p.b.id);
  assert.equal((await j('POST', `/api/public/partners/${p.b.id}/docs`, { photo: img })).s, 400);
  assert.equal((await j('POST', `/api/public/partners/${p.b.id}/docs`, { photo: img, idFront: img, selfie: img })).s, 200);
  assert.equal((await j('POST', `/api/public/partners/${p.b.id}/docs`, { photo: img, idFront: img, selfie: img })).s, 403);
  const doc = await fetch(`${base}/api/partner-docs/${p.b.id}/idFront.png`); assert.equal(doc.status, 401);
  const ok = await fetch(`${base}/api/partner-docs/${p.b.id}/idFront.png`, { headers: H }); assert.equal(ok.status, 200);
  assert.equal((await fetch(`${base}/api/public/partners/${p.b.id}/photo`)).status, 404);
  await j('PATCH', `/api/partners/${p.b.id}`, { status: 'Verified' }, H);
  assert.equal((await fetch(`${base}/api/partner-docs/${p.b.id}/idFront.png`, { headers: H })).status, 404);
  assert.equal((await fetch(`${base}/api/public/partners/${p.b.id}/photo`)).status, 200);
});
test('payment proof: submit, validation, duplicate UTR, approve → payment + receipt + stage, reject', async () => {
  const img = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex').toString('base64');
  const b = await j('POST', '/api/public/bookings', { name: 'Ravi Kumar', phone: '9812345678', pkg: 'goa-getaway', total: 40000, adv: 10000 }); const ref = b.b.ref;
  const d = new Date().toISOString().slice(0, 10), base0 = { phone: '9812345678', amount: 10000, mode: 'UPI', utr: '123456789012', paidAt: d, file: img };
  assert.equal((await j('POST', `/api/public/bookings/${ref}/proof`, { ...base0, phone: '9000000000' })).s, 404);
  assert.equal((await j('POST', `/api/public/bookings/${ref}/proof`, { ...base0, utr: '12345' })).s, 400);
  assert.equal((await j('POST', `/api/public/bookings/${ref}/proof`, { ...base0, amount: 90000 })).s, 400);
  assert.equal((await j('POST', `/api/public/bookings/${ref}/proof`, { ...base0, file: '' })).s, 400);
  const ok = await j('POST', `/api/public/bookings/${ref}/proof`, base0); assert.equal(ok.s, 200); assert.equal(ok.b.booking.proofs[0].status, 'Pending');
  assert.equal(ok.b.booking.proofs[0].utr.slice(-4), '9012'); assert.ok(!ok.b.booking.proofs[0].utr.includes('1234567'));
  assert.equal((await j('POST', `/api/public/bookings/${ref}/proof`, base0)).s, 409);
  const bk = (await j('GET', `/api/bookings/${ref}`, null, H)).b, pr = bk.proofs[0];
  assert.equal((await fetch(`${base}/api/payment-proofs/${ref}/${pr.file}`)).status, 401);
  assert.equal((await fetch(`${base}/api/payment-proofs/${ref}/${pr.file}`, { headers: H })).status, 200);
  const ap = await j('POST', `/api/bookings/${ref}/proofs/${pr.id}/decision`, { action: 'approve' }, H); assert.equal(ap.s, 200);
  assert.equal(ap.b.status, 3); assert.equal(ap.b.payments[0].amount, 10000); assert.match(ap.b.payments[0].receipt, /^TPR-/);
  assert.equal((await j('POST', `/api/bookings/${ref}/proofs/${pr.id}/decision`, { action: 'reject', reason: 'x' }, H)).s, 400);
  const st = (await j('GET', `/api/public/booking/${ref}?phone=9812345678`)).b; assert.equal(st.paid, 10000); assert.equal(st.proofs[0].status, 'Approved'); assert.ok(st.proofs[0].receipt);
  const p2 = await j('POST', `/api/public/bookings/${ref}/proof`, { ...base0, amount: 30000, mode: 'Bank transfer', utr: 'HDFCN52026101912' }); assert.equal(p2.s, 200);
  assert.equal((await j('POST', `/api/bookings/${ref}/proofs/${p2.b.id}/decision`, { action: 'reject' }, H)).s, 400);
  const rj = await j('POST', `/api/bookings/${ref}/proofs/${p2.b.id}/decision`, { action: 'reject', reason: 'Amount not received yet' }, H); assert.equal(rj.s, 200);
  assert.equal((await j('GET', `/api/public/booking/${ref}?phone=9812345678`)).b.proofs[1].reason, 'Amount not received yet');
  assert.equal((await j('POST', `/api/public/bookings/${ref}/proof`, { ...base0, amount: 30000, mode: 'Bank transfer', utr: 'HDFCN52026101912' })).s, 200); /* rejected UTR can be re-submitted */
});
test('SEO: templates seeded, overrides, redirects validation, catalog carries overrides', async () => {
  const t = await j('GET', '/api/seo_templates', null, H); assert.ok(t.b.length >= 5);
  assert.equal((await j('GET', '/api/seo/data', null, H)).s, 200);
  const o = await j('POST', '/api/seo_pages', { path: '/destinations/goa/', route: 'd-goa', title: 'Goa Packages 2026', meta: 'Custom meta' }, H); assert.equal(o.s, 200); assert.equal(o.b.id, 'destinations__goa');
  assert.equal((await j('POST', '/api/seo_pages', { path: '/destinations/goa/' }, H)).s, 400);
  assert.equal((await j('GET', '/api/public/catalog')).b.seo['d-goa'].title, 'Goa Packages 2026');
  assert.equal((await j('POST', '/api/redirects', { from: '/x/', to: 'javascript:alert(1)' }, H)).s, 400);
  assert.equal((await j('POST', '/api/redirects', { from: '/x/', to: '/x/' }, H)).s, 400);
  assert.equal((await j('POST', '/api/redirects', { from: '/old/', to: '/destinations/goa/' }, H)).s, 200);
  assert.equal((await j('POST', '/api/redirects', { from: '/old/', to: '/deals/' }, H)).s, 400);
  /* publishing needs the Next.js website (its page list); without it the dashboard gets a clear message */
  const pub = await j('POST', '/api/seo/publish', {}, H); assert.equal(pub.s, 400); assert.match(pub.b.error, /website is not reachable/);
  /* the override reaches the website data; the redirect is published for the website's proxy */
  const s = await site(); const ov = s.seo.overrides.find(x => x.path === '/destinations/goa/'); assert.equal(ov.title, 'Goa Packages 2026'); assert.equal(ov.meta, 'Custom meta');
  assert.ok(s.seo.pages.length > 100); /* programmatic SEO pages expanded from the Live templates */
  const rds = await j('GET', '/api/public/redirects'); assert.deepEqual(rds.b.find(r => r.from === '/old/'), { from: '/old/', to: '/destinations/goa/', code: 301 });
  assert.equal((await j('POST', '/api/public/redirects/hit', { from: '/old/' })).b.ok, true);
  assert.equal((await j('GET', '/api/redirects', null, H)).b.find(r => r.from === '/old/').hits, 1);
});

test('website data API: everything the Next.js site renders from', async () => {
  const r = await fetch(base + '/api/public/site'); assert.equal(r.status, 200); const etag = r.headers.get('etag'); assert.ok(etag);
  const s = await r.json();
  for (const k of ['CONFIG', 'DEST', 'THEMES', 'PKG', 'STATIC', 'GUIDES', 'STATES', 'PLACES', 'BUDDIES', 'REELS']) assert.ok(s.model[k], 'model has ' + k);
  const pkg = s.model.PKG.find(p => p.id === 'kashmir-paradise'); assert.equal(pkg.title, 'Kashmir Paradise'); assert.ok(pkg.plan && pkg.plan.length >= 5);
  assert.ok(s.model.PKG.length > 100); assert.ok(Array.isArray(s.blocked)); assert.ok(Array.isArray(s.reviews));
  /* unchanged content: 304 for the same version; the version document matches */
  assert.equal((await fetch(base + '/api/public/site', { headers: { 'If-None-Match': etag } })).status, 304);
  assert.equal('"' + (await j('GET', '/api/public/site/version')).b.version + '"', etag);
  /* the website is not served here any more */
  assert.equal((await html('/packages/kashmir-paradise/')).s, 404);
  assert.equal((await html('/')).s, 302);
  const cat = await j('GET', '/admin/catalog.json'); assert.ok(cat.b.packages.length > 100); assert.deepEqual(cat.b.seoPages, []); /* page list comes from the website when it runs */
});
test('content editing: validation, roles, publish/unpublish, website data update', async () => {
  const types = await j('GET', '/api/content/_types', null, H); assert.equal(types.s, 200); assert.ok(types.b.types.find(t => t.key === 'packages')); assert.ok(types.b.images.includes('goa-beach'));
  assert.equal((await j('GET', '/api/content/packages')).s, 401);
  const list = await j('GET', '/api/content/packages', null, H); assert.ok(list.b.length > 100);
  const p = (await j('GET', '/api/content/packages/kashmir-paradise', null, H)).b; assert.equal(p.destinationId, 'kashmir'); assert.ok(p.days.length >= 5);
  /* validation */
  assert.equal((await j('POST', '/api/content/packages', { id: 'Bad Id', title: '' }, H)).s, 400);
  assert.equal((await j('POST', '/api/content/packages', { id: 'x-pkg', title: 'X', destinationId: 'nowhere' }, H)).s, 400);
  assert.equal((await j('POST', '/api/content/packages', { ...p, id: 'kashmir-paradise' }, H)).s, 409);
  assert.equal((await j('DELETE', '/api/content/destinations/kashmir', null, H)).s, 409); /* still used by packages */
  /* create a package → it is in the website data immediately (new version) */
  const v0 = (await j('GET', '/api/public/site/version')).b.version;
  const np = await j('POST', '/api/content/packages', { id: 'test-kashmir-escape', destinationId: 'kashmir', title: 'Test Kashmir Escape', nights: 3, price: 12345, image: 'kashmir-lake', route: 'Srinagar 3N', themes: ['family'], days: [{ title: 'Arrive', details: 'Pickup' }, { title: 'Gulmarg', details: 'Gondola' }, { title: 'Depart', details: 'Drop' }] }, H);
  assert.equal(np.s, 200); assert.equal(np.b.days.length, 3);
  const sp = p => site().then(s => s.model.PKG.find(x => x.id === p));
  const pg = await sp('test-kashmir-escape'); assert.equal(pg.title, 'Test Kashmir Escape'); assert.equal(pg.price, 12345); assert.equal(pg.plan.length, 3);
  assert.notEqual((await j('GET', '/api/public/site/version')).b.version, v0);
  /* edit → data changes; unpublish → gone from the website */
  assert.equal((await j('PATCH', '/api/content/packages/test-kashmir-escape', { title: 'Renamed Escape' }, H)).s, 200);
  assert.equal((await sp('test-kashmir-escape')).title, 'Renamed Escape');
  assert.equal((await j('PATCH', '/api/content/packages/test-kashmir-escape', { active: false }, H)).s, 200);
  assert.equal(await sp('test-kashmir-escape'), undefined);
  /* reorder + delete */
  assert.equal((await j('POST', '/api/content/themes/_reorder', { ids: ['beach', 'family'] }, H)).s, 200);
  assert.equal((await j('GET', '/api/content/themes', null, H)).b[0].id, 'beach');
  assert.equal((await j('DELETE', '/api/content/packages/test-kashmir-escape', null, H)).s, 200);
  /* sales staff can read but not edit content */
  const r = await j('POST', '/api/auth/login', { email: 's@test.local', password: 'Sales@1234' }); const S = { Authorization: 'Bearer ' + r.b.token };
  assert.equal((await j('GET', '/api/content/destinations', null, S)).s, 200);
  assert.equal((await j('PATCH', '/api/content/destinations/goa', { tag: 'x' }, S)).s, 403);
  /* dashboard price override reaches the website data; "not bookable" is listed */
  await j('POST', '/api/packages', { id: 'kashmir-paradise', title: 'Kashmir Paradise', price: 15555, tag: '', active: true, note: '' }, H);
  assert.equal((await sp('kashmir-paradise')).price, 15555);
  assert.equal((await j('PATCH', '/api/packages/kashmir-paradise', { active: false }, H)).s, 200);
  assert.ok((await site()).blocked.includes('kashmir-paradise'));
});
