/* =====================================================================
   Operational collections: mapping between the dashboard's record shape (documents with
   camelCase keys, arrays for notes/payments/…) and the relational tables.
   Field kinds:
     str   → VARCHAR/TEXT ('' when NULL)          int/num → numbers ('' from forms → 0)
     bool  → TINYINT(1)                           date    → DATE ('' ↔ NULL)
     json  → JSON column                          opt: true → key omitted from the record when NULL
   Arrays live in child tables (`children`): replaced as a whole when the record is saved.
   Unknown keys are kept in the `extra` JSON column so no submitted data is lost.
   ===================================================================== */
const digits = v => String(v || '').replace(/\D/g, '').slice(-10);

const F = (key, col, kind = 'str', o = {}) => ({ key, col, kind, ...o });
const notes = table => ({ table, fk: table === 'lead_notes' ? 'lead_id' : 'booking_id', fields: [F('at', 'noted_at'), F('by', 'by_name'), F('text', 'text')] });

const COLLECTIONS = {
  staff: {
    table: 'staff',
    fields: [F('name', 'name'), F('email', 'email'), F('role', 'role'), F('phone', 'phone'), F('active', 'active', 'bool', { def: true }), F('pass', 'password_hash')],
  },
  leads: {
    table: 'leads',
    fields: [F('subject', 'subject'), F('name', 'name'), F('phone', 'phone'), F('email', 'email'), F('month', 'travel_month'), F('pax', 'pax'), F('msg', 'message'),
      F('source', 'source', 'str', { def: 'Website' }), F('status', 'status', 'str', { def: 'New' }), F('assigned', 'assigned_to'), F('followup', 'followup_date', 'date'),
      F('lostReason', 'lost_reason', 'str', { opt: true }), F('bookingRef', 'booking_ref', 'str', { opt: true })],
    derived: { phone_digits: d => digits(d.phone) },
    children: { notes: notes('lead_notes') },
  },
  bookings: {
    table: 'bookings',
    fields: [F('pkg', 'package_id'), F('pkgTitle', 'package_title'), F('date', 'departure_date', 'date'), F('from', 'from_city'), F('hotel', 'hotel'),
      F('ad', 'adults', 'int', { def: 1 }), F('ch', 'children', 'int'), F('inf', 'infants', 'int'), F('name', 'name'), F('phone', 'phone'), F('email', 'email'),
      F('names', 'traveller_names'), F('notes', 'customer_note'), F('pay', 'pay_option'), F('coupon', 'coupon'), F('total', 'total', 'int'), F('adv', 'advance', 'int'),
      F('status', 'stage', 'int', { def: 1 }), F('cancelled', 'cancelled', 'bool'), F('source', 'source', 'str', { opt: true }), F('quoteConfirmed', 'quote_confirmed', 'bool', { opt: true })],
    derived: { phone_digits: d => digits(d.phone) },
    children: {
      addons: { table: 'booking_addons', fk: 'booking_id', scalar: F('addon', 'addon') },
      payments: { table: 'booking_payments', fk: 'booking_id', extra: true, fields: [F('at', 'paid_at'), F('amount', 'amount', 'int'), F('mode', 'mode'), F('ref', 'reference'), F('by', 'by_name'),
        F('proof', 'proof_id', 'str', { opt: true }), F('receipt', 'receipt', 'str', { opt: true })], derived: { reference_norm: p => String(p.ref || '').toUpperCase().replace(/[\s-]/g, '') } },
      proofs: { table: 'payment_proofs', fk: 'booking_id', extra: true, fields: [F('id', 'id'), F('amount', 'amount', 'int'), F('mode', 'mode'), F('utr', 'utr'), F('paidAt', 'paid_on'),
        F('payer', 'payer'), F('app', 'app'), F('note', 'note'), F('file', 'file'), F('size', 'size', 'int'), F('type', 'file_type'), F('status', 'status', 'str', { def: 'Pending' }), F('at', 'submitted_at'),
        F('approvedAmount', 'approved_amount', 'int', { opt: true }), F('receipt', 'receipt', 'str', { opt: true }), F('by', 'decided_by', 'str', { opt: true }),
        F('decidedAt', 'decided_at', 'str', { opt: true }), F('reason', 'reason', 'str', { opt: true })] },
      staffNotes: notes('booking_notes'),
    },
  },
  departures: {
    table: 'departures',
    fields: [F('pkg', 'package_id'), F('pkgTitle', 'package_title'), F('date', 'departure_date', 'date'), F('seats', 'seats', 'int'), F('booked', 'booked', 'int'),
      F('status', 'status', 'str', { def: 'Open' }), F('captain', 'captain'), F('note', 'note')],
  },
  packages: {
    table: 'package_overrides',
    fields: [F('title', 'title'), F('price', 'price', 'int'), F('tag', 'tag'), F('active', 'active', 'bool', { def: true }), F('note', 'note'),
      F('eb', 'early_bird_pct', 'int', { opt: true }), F('seats', 'seats', 'int', { opt: true })],
  },
  coupons: {
    table: 'coupons',
    fields: [F('code', 'code'), F('pct', 'pct', 'int'), F('desc', 'description'), F('maxDays', 'max_days', 'int'), F('validTill', 'valid_till', 'date'), F('active', 'active', 'bool', { def: true })],
  },
  reviews: {
    table: 'reviews',
    fields: [F('name', 'name'), F('city', 'city'), F('pkg', 'package_id'), F('trip', 'trip'), F('rating', 'rating', 'int', { def: 5 }), F('text', 'text'),
      F('status', 'status', 'str', { def: 'Pending' }), F('bookingRef', 'booking_ref')],
  },
  partners: {
    table: 'partners',
    fields: [F('name', 'name'), F('g', 'gender'), F('city', 'city'), F('phone', 'phone'), F('email', 'email'), F('dest', 'destination_id'), F('month', 'travel_month'),
      F('bud', 'budget'), F('look', 'looking_for'), F('about', 'about'), F('pace', 'pace'), F('diet', 'diet'), F('phvis', 'photo_visibility'), F('idType', 'id_type'),
      F('idLast4', 'id_last4'), F('age', 'age', 'int', { def: 18 }), F('seat', 'needs_seat', 'bool'), F('share', 'share_room', 'bool'), F('women', 'women_only', 'bool'),
      F('smoke', 'smoker', 'bool'), F('status', 'status', 'str', { def: 'Verification pending' }), F('docsAt', 'docs_at', 'str', { opt: true }), F('docsDeleted', 'docs_deleted_at', 'str', { opt: true })],
    derived: { phone_digits: d => digits(d.phone) },
    children: {
      styles: { table: 'partner_styles', fk: 'partner_id', scalar: F('style', 'style') },
      docs: { table: 'partner_documents', fk: 'partner_id', fields: [F('key', 'doc_key'), F('file', 'file'), F('size', 'size', 'int')] },
    },
  },
  partner_requests: {
    table: 'partner_requests',
    fields: [F('to', 'to_member'), F('trip', 'trip'), F('month', 'travel_month'), F('msg', 'message'), F('seat', 'needs_seat', 'bool'), F('room', 'room'),
      F('status', 'status', 'str', { def: 'Awaiting response' }), F('fromPhone', 'from_phone')],
  },
  proposals: {
    table: 'proposals',
    fields: [F('pkg', 'package_id'), F('partner', 'partner'), F('month', 'travel_month'), F('hotel', 'hotel'), F('seat', 'needs_seat', 'bool'), F('room', 'room'),
      F('pay', 'pay_split'), F('total', 'total', 'int'), F('you', 'you_pay', 'int'), F('them', 'partner_pays', 'int'), F('status', 'status', 'str', { def: 'Waiting for partner' })],
  },
  settings: {
    table: 'settings', document: true, /* key/value configuration: whole record kept in `data` */
  },
  activity: {
    table: 'activity_log',
    fields: [F('by', 'by_name'), F('role', 'role'), F('action', 'action'), F('col', 'collection'), F('ref', 'ref'), F('note', 'note')],
  },
  seo_pages: {
    table: 'seo_pages',
    fields: [F('path', 'path'), F('route', 'route'), F('kind', 'kind', 'str', { def: 'built-in' }), F('title', 'title'), F('meta', 'meta'), F('h1', 'h1'), F('intro', 'intro'),
      F('noindex', 'noindex', 'bool'), F('canonical', 'canonical')],
    children: { faqs: { table: 'seo_page_faqs', fk: 'page_id', fields: [F('q', 'question'), F('a', 'answer')] } },
  },
  seo_templates: {
    table: 'seo_templates',
    fields: [F('name', 'name'), F('type', 'type'), F('status', 'status', 'str', { def: 'Draft' }), F('minItems', 'min_items', 'int', { def: 1 }), F('prio', 'priority', 'num', { def: 0.5 }),
      F('slug', 'slug'), F('title', 'title'), F('meta', 'meta'), F('h1', 'h1'), F('lead', 'lead'), F('intro', 'intro'), F('scope', 'scope', 'json', { def: {} }), F('note', 'note', 'str', { opt: true })],
    children: { faqs: { table: 'seo_template_faqs', fk: 'template_id', fields: [F('q', 'question'), F('a', 'answer')] } },
  },
  redirects: {
    table: 'redirects',
    fields: [F('from', 'from_path'), F('to', 'to_url'), F('code', 'code', 'int', { def: 301 }), F('active', 'active', 'bool', { def: true }), F('hits', 'hits', 'int'), F('lastHit', 'last_hit_at', 'str', { opt: true })],
  },
};

for (const [name, c] of Object.entries(COLLECTIONS)) { c.name = name; c.fields = c.fields || []; c.children = c.children || {}; c.derived = c.derived || {}; }

module.exports = { COLLECTIONS };
