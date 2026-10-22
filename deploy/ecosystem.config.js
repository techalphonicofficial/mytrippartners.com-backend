/* PM2 process file (both apps):  pm2 start deploy/ecosystem.config.js && pm2 save && pm2 startup
   - trippartner      the API + staff dashboard (Express, port 8080)
   - trippartner-web  the public website (Next.js, port 3000) — build it first: cd ../client && npm ci && npm run build */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'trippartner',
      cwd: path.join(__dirname, '..'),
      script: 'server.js',
      node_args: '--env-file-if-exists=.env',
      instances: 1,               // one instance: rate limits + website-data cache are in memory
      exec_mode: 'fork',
      max_memory_restart: '400M',
      time: true,
    },
    {
      name: 'trippartner-web',
      cwd: path.join(__dirname, '..', '..', 'client'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',   // reads client/.env.production / .env.local (BACKEND_URL, REVALIDATE_SECRET)
      instances: 1,               // one instance: the website data is cached in this process
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '700M',
      time: true,
    },
  ],
};
