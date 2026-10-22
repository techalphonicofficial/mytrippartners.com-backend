/* =====================================================================
   TripPartner backend — website (server-rendered from MySQL) + dashboard + API
   Node.js 22.13+ · Express 4 · MySQL / MariaDB (mysql2)

   src/
     config/        environment configuration
     db/            connection pool, transactions, versioned migrations, seed data
     repositories/  data access (relational tables ↔ records / DTOs)
     content/       website content model: type registry, validation, website mapping
     services/      business rules (bookings, payments, partners, content, SEO, rendering, auth)
     controllers/   HTTP handlers (thin)
     routes/        URL table
     middleware/    security headers, CORS, rate limits, auth, errors
     render/        server-side rendering of the website's own page code

   Run:  npm install && npm start      (http://localhost:8080 · dashboard /admin)
   ===================================================================== */
const config = require('./src/config');
const db = require('./src/db/pool');
const { migrate } = require('./src/db/migrator');
const BootstrapService = require('./src/services/BootstrapService');
const { createApp } = require('./src/app');
const logger = require('./src/utils/logger');

/* connect → migrate → first-run setup; resolves when the app can serve requests */
async function init() {
  await db.connect();
  await migrate();
  await BootstrapService.run();
}

const app = createApp();
const ready = init();
const close = () => db.close();

if (require.main === module) {
  ready.then(async () => {
    const server = app.listen(config.port, () => logger.info(`TripPartner on http://localhost:${config.port}  (dashboard: /admin)  MySQL: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`));
    const shutdown = () => { logger.info('shutting down'); server.close(() => close().finally(() => process.exit(0))); setTimeout(() => process.exit(1), 10e3).unref(); };
    process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
  }).catch(e => { logger.error('startup failed: ' + e.message); process.exit(1); });
}

module.exports = { app, ready, close };
