/* Exports the whole MySQL database as plain SQL (schema + data):
   npm run export-sql > trippartner-backup.sql          restore: mysql <database> < trippartner-backup.sql */
const db = require('../src/db/pool');
const { dumpSql } = require('../src/db/dump');
(async () => { await db.connect(); process.stdout.write(await dumpSql()); await db.close(); })().catch(e => { console.error(e.message); process.exit(1); });
