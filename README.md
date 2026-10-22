# TripPartner — Dashboard & API

The backend for www.trippartner.com: the staff dashboard (`/admin`) and the API, on MySQL. The public website is the
Next.js app in [`../client`](../client), which reads all its content from this API (`GET /api/public/site`).

## What's inside

| Area | What staff can do |
|---|---|
| **Website content** | Edit everything shown on the website — destinations, packages and day-wise itineraries, themes, India states and place guides, travel guides, visa countries, services, FAQ/policy pages, reels, long weekends, sample travel partners, site configuration. Publish/unpublish, reorder, preview on the live site |
| **Overview** | New leads (7 days), open leads, active bookings, pipeline value, money collected (30 days), lead win rate, a leads-per-day chart, the lead pipeline, follow-ups due, departures in the next 30 days, balances to collect, booking value by destination, and recent activity |
| **Leads (CRM)** | All website enquiries and Plan-My-Trip requests in one place: status (New → Contacted → Quoted → Won/Lost), owner, follow-up date, notes/call log, one-click Call / WhatsApp / Email, **convert a lead to a booking**, add leads manually, CSV export |
| **Bookings** | Booking requests from the website (same `TP26XXXXX` reference the customer sees). You can: move the booking through 5 stages, record payments (UPI, bank, card, cash, cheque, with UTR), see total / paid / balance, edit the booking, add internal notes, cancel or restore, send a WhatsApp status update, print a summary, export to CSV |
| **Departures** | Group departure dates, seat inventory (booked / total), status (Open / Filling fast / Sold out / Cancelled), trip captain |
| **Packages & prices** | All 76 website packages. Override the live price, tag, early-bird % and seats (festive trips), or switch off online booking (the site then shows **Enquire** instead) |
| **Coupons** | Codes, % discount, "departures within N days" rule, validity date, on/off. The website checks every code against this list |
| **Reviews** | Add genuine customer reviews and Publish or Hide them. Published reviews appear on the home page |
| **Travel Partner** | Moderate profiles (Verify / Reject / Hide), partner requests and joint-booking proposals. Turn an agreed proposal into a booking |
| **Staff & roles** | Admin / Sales / Operations accounts, activate or deactivate staff, reset passwords |
| **Site settings** | Phone, WhatsApp, email, address, working hours and the announcement bar. Changes show on the website without a rebuild |
| **Activity log** | Who did what and when (logins, edits, exports, website submissions) |

**Roles**

| Role | Access |
|---|---|
| Admin | Everything |
| Sales | Read and edit leads and bookings; read everything else |
| Operations | Bookings, departures, packages, coupons, reviews and Travel Partner; read leads |

## Run it

You need Node.js **22.13+** and MySQL 8 / MariaDB 10.4+ (XAMPP works).

```bash
npm install
cp .env.example .env        # set MYSQL_* , ADMIN_EMAIL / ADMIN_PASSWORD, NEXT_URL + REVALIDATE_SECRET
npm start                   # http://localhost:8080  ·  dashboard: /admin
```

Then start the website: `cd ../client && npm install && npm run dev` → http://localhost:3000 (it proxies `/api` and
`/admin` to this server, so the dashboard is also at http://localhost:3000/admin).

On start the server creates the database (if the MySQL user may), applies pending migrations, loads the website content on
first run, and creates the first admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (a random password is printed if none is set).

Code layout and design: see [../ARCHITECTURE.md](../ARCHITECTURE.md).

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | 8080 | HTTP port |
| `NODE_ENV` | development | `production` = JSON logs |
| `MYSQL_HOST` / `MYSQL_PORT` | 127.0.0.1 / 3306 | Database server |
| `MYSQL_USER` / `MYSQL_PASSWORD` | root / (empty) | Database login |
| `MYSQL_DATABASE` | trippartner | Database name (created if missing) |
| `DATA_DIR` | `data/` | Uploaded payment proofs and partner documents (`DATA_DIR/uploads`) — back up with the database |
| `NEXT_URL` | — | The website's internal URL (e.g. `http://127.0.0.1:3000`): told to refresh when content changes; page list for the SEO module |
| `REVALIDATE_SECRET` | — | Shared secret for the website's `/api/revalidate` (same value in `client/.env.*`) |
| `IMAGES_DIR` | `../client/public/img` | Photos offered in the content editor's image picker |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | First admin account (first run only) |
| `SITE_ORIGIN` | trippartner.com domains | Other origins allowed to call `/api/public/*` (CORS) |
| `BACKUP_DIR` | `backups/` | Where `npm run backup` writes |
| `TRUST_PROXY` | loopback | Express trust-proxy setting (Nginx on the same machine) |
| `LOG_LEVEL` | info | debug / info / warn / error |

## How the website works now

- **All website content is in MySQL** and editable in **Dashboard → Website content**: destinations, packages (day-wise
  itinerary, themes, weekend/festive details), themes, states, places, place categories, travel guides, visa countries,
  services, FAQ/policy pages, feature FAQs, video reels, long weekends, sample travel partners and site configuration.
- **The website (Next.js, `../client`) renders pages from `GET /api/public/site`**: all published content plus
  `Packages & prices` overrides, departures, coupons, reviews, site settings, SEO overrides and the generated pSEO pages,
  cached with a content version (ETag; `GET /api/public/site/version`).
- Every change made in the dashboard emits a domain event; the backend then calls the website's `POST /api/revalidate`
  (`NEXT_URL`, `REVALIDATE_SECRET`) and the affected pages are re-rendered within seconds — no rebuild, no upload.
- Prices and SEO tags are in the server-rendered HTML search engines see.

## API summary

**Public** (called by the website, rate-limited)
- `POST /api/public/leads`, `POST /api/public/bookings`, `GET /api/public/booking/:ref?phone=`
- `POST /api/public/bookings/:ref/proof` (payment proof)
- `POST /api/public/partners`, `POST /api/public/partners/:id/docs`, `GET /api/public/partners/:id/photo`
- `POST /api/public/partner-requests`, `POST /api/public/proposals`, `POST /api/public/coupon`, `GET /api/public/catalog`
- Not rate-limited (read by the website server): `GET /api/public/site` (all website data), `GET /api/public/site/version`,
  `GET /api/public/redirects`, `POST /api/public/redirects/hit`

**Staff** (login cookie or Bearer token)
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/password`
- Records: `GET/POST/PATCH/DELETE /api/:collection[/:id]` for `leads`, `bookings`, `departures`, `packages` (price overrides),
  `coupons`, `partners`, `partner_requests`, `proposals`, `reviews`, `staff`, `settings`, `activity`, `seo_pages`,
  `seo_templates`, `redirects`; `GET /api/export/:collection.csv`
- Website content: `GET /api/content/_types` (field metadata + image list), `GET/POST /api/content/:type`,
  `GET/PATCH/DELETE /api/content/:type/:id`, `POST /api/content/:type/_reorder {ids}`
- Payments: `POST /api/bookings/:ref/proofs/:pid/decision`, files under `/api/payment-proofs/…` and `/api/partner-docs/…`
- SEO: `GET /api/seo/data`, `POST /api/seo/publish` (refreshes the website and records the report)

## Maintenance

- `npm test` — end-to-end tests on a temporary MySQL database (`trippartner_test`).
- `npm run migrate` — apply pending database migrations without starting the server.
- `npm run backup` — SQL dump + uploads into `BACKUP_DIR/<timestamp>/` (keeps 30). `npm run export-sql > file.sql` — SQL dump to stdout.
- **Security:** scrypt password hashes; 12-hour HttpOnly SameSite=Strict session cookie; rate-limited logins and public forms;
  role checks on every endpoint; every change written to the activity log; uploads stored outside the web root; CSV exports
  protected against formula injection; parameterised SQL everywhere.

## Before go-live checklist

1. Set a strong admin password and create separate staff accounts. Don't share logins.
2. Replace the placeholder phone and WhatsApp numbers in **Site settings**.
3. Use HTTPS only and set `SITE_ORIGIN` to your real domain(s).
4. Set up daily database backups.
5. Payments: the dashboard *records* payments. To take money online, connect a payment gateway (Razorpay, PayU or CCAvenue) and post its webhook into the booking's payments.
6. Travel Partner: do ID verification (for example DigiLocker) before marking a profile **Verified**. Arrange room sharing only when both travellers have agreed in writing.
7. Publish only genuine reviews, with the customer's permission.
8. Have the privacy policy updated for storing customer data (DPDP Act 2023), and keep access limited by role.

## SEO & pSEO (admin → Marketing → SEO & pSEO)
- **Overview** – indexable pages, pSEO pages ready, thin pages held back, average SEO score, issues to fix, last publish.
- **Pages** – every page of the site (390 built-in + all pSEO pages) with score, issues and status. Open a page to edit its
  SEO title, meta description, H1, intro copy, FAQs (FAQ rich results), canonical and noindex, with a live Google preview.
- **pSEO templates** – generate landing pages from your packages: Theme × destination, Destination × budget,
  Destination × trip length, Destination × departure city, Destination × month. Variables like `{dest}`, `{count}`,
  `{min_price}`, `{best_time}`; live preview with page count, scores and duplicate/clash checks. Pages with fewer packages
  than the minimum are held back automatically (no thin content). 3 templates are live by default, 2 are drafts.
- **Redirects** – 301/302 from old URLs, bulk add, hit counter, export for .htaccess.
- **Settings & publish** – domain, robots.txt, share image, max pages per template. The website renders pages, pSEO pages,
  sitemap.xml and robots.txt from this data, so SEO edits and Live templates appear within seconds; **Publish to website**
  refreshes the website, checks the template pages and records the report.

The SEO module needs the website running (`NEXT_URL`): its page list (titles and rendered H1s) comes from the website's
`/api/seo-pages`.
#   m y t r i p p a r t n e r s . c o m - b a c k e n d  
 #   m y t r i p p a r t n e r s . c o m - b a c k e n d  
 