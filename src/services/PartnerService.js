/* Travel Partner community: profiles, identity documents, partner requests and joint proposals. */
const { repos } = require('../repositories/RecordRepository');
const { now, S, N, phoneOk } = require('../utils/common');
const { badRequest, notFound, forbidden } = require('../utils/errors');
const Activity = require('./ActivityService');
const FileStorage = require('./FileStorage');

const ID_TYPES = ['aadhaar', 'pan', 'passport', 'dl', 'voter'];
const DOC_KEYS = ['photo', 'idFront', 'idBack', 'selfie'];
const UPLOAD_WINDOW_MS = 2 * 3600e3;

const PartnerService = {
  async createProfile(b) {
    if (!S(b.name) || !phoneOk(b.phone) || N(b.age) < 18) throw badRequest('Name, valid mobile and age 18+ are required.');
    const p = await repos.partners.create({
      ...Object.fromEntries(['name', 'g', 'city', 'phone', 'email', 'dest', 'month', 'bud', 'look', 'about', 'pace', 'diet', 'phvis'].map(k => [k, S(b[k], 400)])),
      styles: (Array.isArray(b.styles) ? b.styles : []).map(x => S(x, 30)).slice(0, 5),
      idType: ID_TYPES.includes(b.idType) ? b.idType : '', idLast4: /^[0-9A-Za-z]{4}$/.test(b.idLast4 || '') ? String(b.idLast4).toUpperCase() : '',
      age: N(b.age, 18, 99), seat: !!b.seat, share: !!b.share, women: !!b.women, smoke: !!b.smoke, status: 'Verification pending', docs: [],
    });
    await Activity.log(null, 'new partner profile', 'partners', p.id, p.name);
    return { ok: true, id: p.id };
  },

  /* photo + ID: accepted once, within 2 hours of creating the profile */
  async uploadDocuments(id, b) {
    const p = await repos.partners.get(id);
    if (!p || p.status !== 'Verification pending' || (p.docs || []).length || Date.now() - new Date(p.created) > UPLOAD_WINDOW_MS) throw forbidden('Documents can no longer be uploaded for this profile. Please contact support.');
    if (!b.idFront || !b.selfie || !b.photo) throw badRequest('Photo, ID front and selfie are required.');
    const files = DOC_KEYS.filter(k => b[k]).map(k => ({ key: k, ...FileStorage.decodeDataUri(b[k], { typeError: 'Images must be JPG, PNG or WebP.', sizeError: 'Each image must be under 3 MB.' }) }));
    const saved = files.map(f => { const file = f.key + '.' + f.ext; FileStorage.save('partners', p.id, file, f.buf); return { key: f.key, file, size: f.buf.length }; });
    await repos.partners.update(p.id, { docs: saved, idType: ID_TYPES.includes(b.idType) ? b.idType : p.idType, idLast4: /^[0-9A-Za-z]{4}$/.test(b.idLast4 || '') ? String(b.idLast4).toUpperCase() : p.idLast4, docsAt: now() });
    await Activity.log(null, 'partner documents uploaded', 'partners', p.id, saved.map(x => x.key).join(', '));
    return { ok: true };
  },

  /* profile photo is public only once the profile is verified */
  async publicPhoto(id) {
    const p = await repos.partners.get(id); const d = p && p.status === 'Verified' && (p.docs || []).find(x => x.key === 'photo');
    if (!d) throw notFound();
    return FileStorage.pathOf('partners', p.id, d.file);
  },

  async documentFile(staff, id, file) {
    const p = await repos.partners.get(id); const d = p && (p.docs || []).find(x => x.file === file);
    if (!d) throw notFound('Not found (documents are deleted after a decision).');
    await Activity.log(staff, 'viewed identity document', 'partners', p.id, d.key);
    return FileStorage.pathOf('partners', p.id, d.file);
  },

  /* when a profile is verified or rejected the ID files are deleted (the photo is kept for verified profiles) */
  async applyDecision(id, patch) {
    if (!['Verified', 'Rejected'].includes(patch.status)) return patch;
    const cur = await repos.partners.get(id);
    if (cur && (cur.docs || []).some(x => x.key !== 'photo')) {
      (cur.docs || []).filter(x => x.key !== 'photo' || patch.status === 'Rejected').forEach(x => FileStorage.remove('partners', id, x.file));
      patch.docs = patch.status === 'Rejected' ? [] : (cur.docs || []).filter(x => x.key === 'photo');
      patch.docsDeleted = now();
    }
    return patch;
  },

  async createRequest(b) {
    const r = await repos.partner_requests.create({ to: S(b.b, 40), trip: S(b.trip, 80), month: S(b.month, 30), msg: S(b.msg, 400), seat: !!b.seat, room: S(b.room, 10), status: 'Awaiting response', fromPhone: S(b.phone, 20) });
    await Activity.log(null, 'partner request', 'partner_requests', r.id);
    return { ok: true, id: r.id };
  },

  async createProposal(b) {
    const r = await repos.proposals.create({ pkg: S(b.pkg, 80), partner: S(b.b, 40), month: S(b.month, 30), hotel: S(b.hotel, 10), seat: !!b.seat, room: S(b.room, 10), pay: S(b.pay, 12), total: N(b.total), you: N(b.you), them: N(b.them), status: 'Waiting for partner' });
    await Activity.log(null, 'joint booking proposal', 'proposals', r.id);
    return { ok: true, id: r.id };
  },
};

module.exports = PartnerService;
