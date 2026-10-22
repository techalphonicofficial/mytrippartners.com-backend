/* Role-based access policy: r = read, w = create/update, d = delete. Admin can do everything. */
const PERM = {
  admin: '*',
  sales: { leads: 'rw', bookings: 'rw', departures: 'r', packages: 'r', coupons: 'r', partners: 'r', partner_requests: 'r', proposals: 'r', reviews: 'r', settings: 'r', activity: 'r', seo_pages: 'r', seo_templates: 'r', redirects: 'r', content: 'r' },
  ops: { leads: 'r', bookings: 'rw', departures: 'rwd', packages: 'rw', coupons: 'rw', partners: 'rw', partner_requests: 'rw', proposals: 'rw', reviews: 'rw', settings: 'r', activity: 'r', seo_pages: 'rw', seo_templates: 'rw', redirects: 'rwd', content: 'rwd' },
};

/* collections exposed through the generic dashboard API (/api/:col) */
const COLS = ['leads', 'bookings', 'departures', 'packages', 'coupons', 'partners', 'partner_requests', 'proposals', 'reviews', 'staff', 'settings', 'activity', 'seo_pages', 'seo_templates', 'redirects'];

const can = (staff, area, op) => {
  const p = staff && PERM[staff.role];
  if (p === '*') return true;
  return !!(p && p[area] && p[area].includes(op));
};

module.exports = { PERM, COLS, can };
