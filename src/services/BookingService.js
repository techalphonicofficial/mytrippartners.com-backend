/* Enquiries (leads), booking requests, customer booking status and payment proofs. */
const { transaction } = require('../db/pool');
const { repos } = require('../repositories/RecordRepository');
const { now, uid, S, N, phoneOk, samePhone, mask, inr } = require('../utils/common');
const { badRequest, notFound, conflict } = require('../utils/errors');
const Activity = require('./ActivityService');
const FileStorage = require('./FileStorage');

const PROOF_MODES = ['UPI', 'Bank transfer', 'Other'];
const NOT_FOUND = 'Booking not found. Check the booking reference and the mobile number used for booking.';
const normUtr = v => String(v || '').toUpperCase().replace(/[\s-]/g, '');
const paidOf = b => (b.payments || []).reduce((a, p) => a + (+p.amount || 0), 0);

/* what the customer may see about their booking */
const publicBooking = b => ({
  ref: b.id, status: b.status, paid: paidOf(b), total: b.total, adv: b.adv, pkg: b.pkg, pkgTitle: b.pkgTitle, date: b.date, from: b.from, hotel: b.hotel,
  ad: b.ad, ch: b.ch, inf: b.inf, name: String(b.name || '').split(' ')[0], cancelled: !!b.cancelled,
  proofs: (b.proofs || []).map(p => ({ id: p.id, amount: p.amount, approved: p.approvedAmount, mode: p.mode, utr: mask(p.utr), paidAt: p.paidAt, at: p.at, status: p.status, reason: p.reason || '', receipt: p.receipt || '' })),
  payments: (b.payments || []).map(p => ({ amount: p.amount, mode: p.mode, at: p.at, ref: mask(p.ref), receipt: p.receipt || '' })),
});

/* a UTR may be used once across all bookings (non-rejected proofs and recorded payments) — index lookups */
async function utrUsed(utr, conn) {
  const [a] = await conn.query("SELECT 1 FROM payment_proofs WHERE utr=? AND status<>'Rejected' LIMIT 1", [utr]);
  if (a.length) return true;
  const [b] = await conn.query('SELECT 1 FROM booking_payments WHERE reference_norm=? LIMIT 1', [utr]);
  return b.length > 0;
}

const BookingService = {
  publicBooking, paidOf,

  async createLead(b) {
    if (!S(b.name) || !phoneOk(b.phone)) throw badRequest('Name and a valid mobile number are required.');
    const l = await repos.leads.create({ subject: S(b.subject, 160), name: S(b.name, 80), phone: S(b.phone, 20), email: S(b.email, 120), month: S(b.month, 40), pax: S(b.pax, 60), msg: S(b.msg, 1000), source: S(b.source || 'Website', 40), status: 'New', assigned: '', followup: '', notes: [] }, 'EQ' + uid());
    await Activity.log(null, 'new lead', 'leads', l.id, l.subject);
    return { ok: true, id: l.id };
  },

  async createBooking(b) {
    if (!S(b.name) || !phoneOk(b.phone) || !S(b.pkg)) throw badRequest('Package, name and a valid mobile number are required.');
    const ref = /^TP\d{2}[A-Z0-9]{5}$/.test(b.ref || '') && !(await repos.bookings.exists(b.ref)) ? b.ref : 'TP' + String(new Date().getFullYear()).slice(2) + uid().slice(0, 5);
    const bk = await repos.bookings.create({
      pkg: S(b.pkg, 80), pkgTitle: S(b.pkgTitle, 160), date: S(b.date, 10), from: S(b.from, 60), hotel: S(b.hotel, 10), ad: N(b.ad, 1, 50), ch: N(b.ch, 0, 20), inf: N(b.inf, 0, 10),
      name: S(b.name, 80), phone: S(b.phone, 20), email: S(b.email, 120), names: S(b.names, 1000), addons: (Array.isArray(b.addons) ? b.addons : []).map(x => S(x, 30)).slice(0, 10),
      notes: S(b.notes, 1000), pay: S(b.pay, 10), coupon: S(b.coupon, 20), total: N(b.total), adv: N(b.adv), status: 1, cancelled: false, payments: [], proofs: [], staffNotes: [], quoteConfirmed: false,
    }, ref);
    await Activity.log(null, 'new booking request', 'bookings', bk.id, bk.pkgTitle);
    return { ok: true, ref: bk.id };
  },

  async statusFor(ref, phone) {
    const b = await repos.bookings.get(String(ref).toUpperCase());
    if (!b || !samePhone(b.phone, phone)) throw notFound(NOT_FOUND);
    return publicBooking(b);
  },

  /* customer uploads a UPI / bank-transfer screenshot + UTR; staff verify it before it counts as paid */
  async submitProof(ref, x) {
    const id = 'PF' + uid().slice(0, 8);
    let file, saved;
    const result = await transaction(async conn => {
      const b = await repos.bookings.get(String(ref).toUpperCase(), conn, { lock: true });
      if (!b || !samePhone(b.phone, x.phone)) throw notFound(NOT_FOUND);
      if (b.cancelled) throw badRequest('This booking is cancelled. Please contact support before paying.');
      const proofs = b.proofs || [], pend = proofs.filter(p => p.status === 'Pending');
      if (pend.length >= 3) throw badRequest('You already have 3 proofs under verification. Please wait for our team to verify them.');
      const mode = PROOF_MODES.includes(x.mode) ? x.mode : 'UPI', utr = normUtr(x.utr);
      if (mode === 'UPI' ? !/^\d{12}$/.test(utr) : !/^[A-Z0-9]{6,22}$/.test(utr)) throw badRequest(mode === 'UPI' ? 'UPI transaction ID (UTR) must be 12 digits.' : 'Enter the bank reference / UTR (6–22 letters or digits).');
      if (await utrUsed(utr, conn)) throw conflict('This transaction ID has already been submitted. If you think this is a mistake, contact support.');
      const amount = N(x.amount, 0, 1e8), bal = (+b.total || 0) - paidOf(b) - pend.reduce((a, p) => a + (+p.amount || 0), 0);
      if (amount < 1) throw badRequest('Enter the amount you paid.');
      if (+b.total > 0 && amount > bal + 1) throw badRequest(`The amount is more than the balance due (₹${Math.max(0, bal).toLocaleString('en-IN')}).`);
      const paidAt = S(x.paidAt, 10), today = new Date(Date.now() + 14 * 3600e3).toISOString().slice(0, 10) /* any Indian calendar date */, oldest = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt) || paidAt > today || paidAt < oldest) throw badRequest('Enter the payment date (within the last 90 days).');
      const { buf, ext } = FileStorage.decodeDataUri(x.file, { pdf: true, typeError: 'Attach the payment screenshot (JPG, PNG, WebP) or bank receipt (PDF).', sizeError: 'The file must be under 3 MB.' });
      file = id + '.' + ext;
      FileStorage.save('payments', b.id, file, buf); saved = b.id;
      const pr = { id, amount, mode, utr, paidAt, payer: S(x.payer, 80), app: S(x.app, 30), note: S(x.note, 300), file, size: buf.length, type: ext, status: 'Pending', at: now() };
      const upd = await repos.bookings.update(b.id, { proofs: [...proofs, pr] }, conn);
      await Activity.log(null, 'payment proof submitted', 'bookings', b.id, `${inr(amount)} · ${mode} · UTR ${mask(utr)}`, conn);
      return { ok: true, id, booking: publicBooking(upd) };
    }).catch(e => { if (saved) FileStorage.remove('payments', saved, file); throw e; });
    return result;
  },

  /* staff decision on a proof: approve → payment + receipt no. (+ stage "Advance paid"), reject → reason */
  async decideProof(staff, ref, pid, x) {
    return transaction(async conn => {
      const b = await repos.bookings.get(ref, conn, { lock: true }); if (!b) throw notFound('Booking not found.');
      const proofs = (b.proofs || []).map(p => ({ ...p })), pr = proofs.find(p => p.id === pid);
      if (!pr) throw notFound('Proof not found.');
      if (pr.status !== 'Pending') throw badRequest(`This proof is already ${pr.status.toLowerCase()}.`);
      const at = now(), patch = { proofs }, notes = [...(b.staffNotes || [])];
      if (x.action === 'approve') {
        const amt = N(x.amount || pr.amount, 1, 1e8), receipt = 'TPR-' + at.slice(2, 4) + at.slice(5, 7) + '-' + uid().slice(0, 5);
        Object.assign(pr, { status: 'Approved', approvedAmount: amt, receipt, by: staff.name, decidedAt: at });
        patch.payments = [...(b.payments || []), { at: pr.paidAt, amount: amt, mode: pr.mode, ref: pr.utr, by: staff.name, proof: pr.id, receipt }];
        const np = patch.payments.reduce((a, p) => a + (+p.amount || 0), 0);
        if (!b.cancelled && b.status < 3 && np >= (+b.adv || 0)) patch.status = 3;
        notes.push({ at, by: staff.name, text: `Payment proof ${pr.id} approved — ₹${amt.toLocaleString('en-IN')} (${receipt})` });
      } else if (x.action === 'reject') {
        const reason = S(x.reason, 200); if (!reason) throw badRequest('Give a reason so the customer knows what to fix.');
        Object.assign(pr, { status: 'Rejected', reason, by: staff.name, decidedAt: at });
        notes.push({ at, by: staff.name, text: `Payment proof ${pr.id} rejected — ${reason}` });
      } else throw badRequest('Choose approve or reject.');
      patch.staffNotes = notes;
      const d = await repos.bookings.update(b.id, patch, conn);
      await Activity.log(staff, x.action === 'approve' ? 'approved payment proof' : 'rejected payment proof', 'bookings', b.id, pr.id + (pr.receipt ? ' · ' + pr.receipt : '') + (pr.reason ? ' · ' + pr.reason : ''), conn);
      return d;
    });
  },

  async proofFile(ref, file) {
    const b = await repos.bookings.get(ref); const p = b && (b.proofs || []).find(x => x.file === file);
    if (!p) throw notFound();
    return { booking: b, proof: p, path: FileStorage.pathOf('payments', b.id, p.file) };
  },

  async validateCoupon(code, date) {
    const c = await repos.coupons.findBy('code', S(code, 30).toUpperCase());
    if (!c || !c.active) return { status: 404, body: { ok: false, msg: 'This code is not valid.' } };
    if (c.validTill && c.validTill < new Date().toISOString().slice(0, 10)) return { status: 200, body: { ok: false, msg: 'This code has expired.' } };
    if (c.maxDays) { const d = Math.round((new Date(S(date, 10) + 'T00:00:00') - new Date()) / 864e5); if (!(d <= c.maxDays)) return { status: 200, body: { ok: false, msg: `Valid only for departures within ${c.maxDays} days.` } }; }
    return { status: 200, body: { ok: true, pct: c.pct, desc: c.desc } };
  },
};

module.exports = BookingService;
