/* Domain events (in-process). Writers announce changes; the renderer listens and refreshes its snapshot. */
const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(50);

/* collections whose changes affect what the public website shows */
const SITE_COLLECTIONS = new Set(['packages', 'departures', 'coupons', 'reviews', 'settings', 'seo_pages', 'seo_templates', 'redirects']);

const changed = (scope, id) => bus.emit('changed', { scope, id });

module.exports = { bus, changed, SITE_COLLECTIONS };
