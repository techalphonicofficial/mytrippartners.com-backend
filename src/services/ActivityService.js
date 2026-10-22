/* Audit trail: who did what, when. Never throws (logging must not break the request). */
const { repos } = require('../repositories/RecordRepository');
const logger = require('../utils/logger');

const ActivityService = {
  async log(staff, action, col, ref, note, conn) {
    try {
      await repos.activity.create({ by: staff ? staff.name : 'Website', role: staff ? staff.role : 'public', action, col, ref: ref || '', note: note || '' }, null, conn);
    } catch (e) { logger.warn('activity log failed', { action, error: e.message }); }
  },
  list: limit => repos.activity.list({ limit: limit || 300 }),
};

module.exports = ActivityService;
