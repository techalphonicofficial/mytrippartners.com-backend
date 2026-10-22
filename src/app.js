/* Express application (no listening, no DB connect — see server.js).
   Serves the API and the dashboard. The public website is the Next.js app (client/), which reads
   /api/public/* and proxies /api and /admin here. */
const express = require('express');
const path = require('path');
const config = require('./config');
const { securityHeaders, bodyLimits, errorHandler, asyncHandler: h } = require('./middleware');
const { apiRoutes } = require('./routes');
const content = require('./controllers/contentController');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  /* behind Nginx/Apache on the same machine: real visitor IPs for rate limits, Secure cookies over HTTPS */
  app.set('trust proxy', config.trustProxy);
  app.use(securityHeaders);
  app.use(bodyLimits(express));

  /* API */
  app.use('/api', apiRoutes());
  app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown endpoint.' }));

  /* dashboard (catalogue is generated live from the database) */
  app.get('/admin/catalog.json', h(content.adminCatalog)); /* public website data only (as the old static file) */
  app.use('/admin', express.static(config.adminDir, { index: 'index.html' }));

  /* the website itself is served by Next.js */
  app.get('/', (req, res) => (config.next.url ? res.redirect(config.next.url + '/') : res.redirect('/admin/')));

  app.use(errorHandler);
  return app;
}

module.exports = { createApp, adminDir: path.resolve(config.adminDir) };
