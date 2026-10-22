/* Applies pending database migrations without starting the server: npm run migrate */
const db = require('../src/db/pool');
const { migrate } = require('../src/db/migrator');
(async () => { await db.connect(); const ran = await migrate(); console.log(ran.length ? 'Applied: ' + ran.join(', ') : 'Database is up to date.'); await db.close(); })().catch(e => { console.error(e.message); process.exit(1); });
