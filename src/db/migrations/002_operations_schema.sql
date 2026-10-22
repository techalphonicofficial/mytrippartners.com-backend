-- Operational data: staff, CRM, bookings & payments, departures, Travel Partner, reviews, SEO, audit log.
-- Timestamps are UTC DATETIME(3). `extra` keeps any additional attributes the dashboard sends that have no column yet.

CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL,
  role ENUM('admin','sales','ops') NOT NULL DEFAULT 'sales',
  phone VARCHAR(30) NOT NULL DEFAULT '',
  active TINYINT(1) NOT NULL DEFAULT 1,
  password_hash VARCHAR(255) NOT NULL,
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY ux_staff_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_sessions (
  token CHAR(64) NOT NULL PRIMARY KEY,
  staff_id VARCHAR(32) NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  KEY ix_sessions_staff (staff_id),
  KEY ix_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  subject VARCHAR(160) NOT NULL DEFAULT '',
  name VARCHAR(80) NOT NULL,
  phone VARCHAR(20) NOT NULL DEFAULT '',
  phone_digits VARCHAR(10) NOT NULL DEFAULT '',
  email VARCHAR(120) NOT NULL DEFAULT '',
  travel_month VARCHAR(40) NOT NULL DEFAULT '',
  pax VARCHAR(60) NOT NULL DEFAULT '',
  message TEXT NULL,
  source VARCHAR(40) NOT NULL DEFAULT 'Website',
  status VARCHAR(20) NOT NULL DEFAULT 'New',
  assigned_to VARCHAR(120) NOT NULL DEFAULT '',
  followup_date DATE NULL,
  lost_reason VARCHAR(200) NULL,
  booking_ref VARCHAR(32) NULL,
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY ix_leads_status (status),
  KEY ix_leads_source (source),
  KEY ix_leads_assigned (assigned_to),
  KEY ix_leads_followup (followup_date),
  KEY ix_leads_phone (phone_digits),
  KEY ix_leads_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lead_notes (
  lead_id VARCHAR(32) NOT NULL,
  position SMALLINT NOT NULL,
  noted_at VARCHAR(30) NOT NULL DEFAULT '',
  by_name VARCHAR(120) NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  PRIMARY KEY (lead_id, position),
  CONSTRAINT fk_lead_notes FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(16) NOT NULL PRIMARY KEY,
  package_id VARCHAR(80) NOT NULL DEFAULT '',
  package_title VARCHAR(160) NOT NULL DEFAULT '',
  departure_date DATE NULL,
  from_city VARCHAR(60) NOT NULL DEFAULT '',
  hotel VARCHAR(10) NOT NULL DEFAULT '',
  adults TINYINT UNSIGNED NOT NULL DEFAULT 1,
  children TINYINT UNSIGNED NOT NULL DEFAULT 0,
  infants TINYINT UNSIGNED NOT NULL DEFAULT 0,
  name VARCHAR(80) NOT NULL,
  phone VARCHAR(20) NOT NULL DEFAULT '',
  phone_digits VARCHAR(10) NOT NULL DEFAULT '',
  email VARCHAR(120) NOT NULL DEFAULT '',
  traveller_names TEXT NULL,
  customer_note TEXT NULL,
  pay_option VARCHAR(12) NOT NULL DEFAULT '',
  coupon VARCHAR(20) NOT NULL DEFAULT '',
  total INT UNSIGNED NOT NULL DEFAULT 0,
  advance INT UNSIGNED NOT NULL DEFAULT 0,
  stage TINYINT UNSIGNED NOT NULL DEFAULT 1,
  cancelled TINYINT(1) NOT NULL DEFAULT 0,
  source VARCHAR(60) NULL,
  quote_confirmed TINYINT(1) NULL,
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY ix_bookings_stage (stage, cancelled),
  KEY ix_bookings_date (departure_date),
  KEY ix_bookings_package (package_id),
  KEY ix_bookings_phone (phone_digits),
  KEY ix_bookings_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_addons (
  booking_id VARCHAR(16) NOT NULL,
  position SMALLINT NOT NULL,
  addon VARCHAR(30) NOT NULL,
  PRIMARY KEY (booking_id, position),
  CONSTRAINT fk_booking_addons FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_payments (
  booking_id VARCHAR(16) NOT NULL,
  position SMALLINT NOT NULL,
  paid_at VARCHAR(30) NOT NULL DEFAULT '',
  amount INT UNSIGNED NOT NULL DEFAULT 0,
  mode VARCHAR(30) NOT NULL DEFAULT '',
  reference VARCHAR(80) NOT NULL DEFAULT '',
  reference_norm VARCHAR(80) NOT NULL DEFAULT '',
  by_name VARCHAR(120) NOT NULL DEFAULT '',
  proof_id VARCHAR(16) NULL,
  receipt VARCHAR(30) NULL,
  extra JSON NULL,
  PRIMARY KEY (booking_id, position),
  KEY ix_payments_reference (reference_norm),
  KEY ix_payments_paid_at (paid_at),
  CONSTRAINT fk_booking_payments FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- customer-submitted payment proofs (UPI / bank screenshots), verified by staff
CREATE TABLE IF NOT EXISTS payment_proofs (
  booking_id VARCHAR(16) NOT NULL,
  position SMALLINT NOT NULL,
  id VARCHAR(16) NOT NULL,
  amount INT UNSIGNED NOT NULL DEFAULT 0,
  mode VARCHAR(30) NOT NULL DEFAULT 'UPI',
  utr VARCHAR(40) NOT NULL DEFAULT '',
  paid_on VARCHAR(10) NOT NULL DEFAULT '',
  payer VARCHAR(80) NOT NULL DEFAULT '',
  app VARCHAR(30) NOT NULL DEFAULT '',
  note VARCHAR(300) NOT NULL DEFAULT '',
  file VARCHAR(80) NOT NULL DEFAULT '',
  size INT UNSIGNED NOT NULL DEFAULT 0,
  file_type VARCHAR(10) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  submitted_at VARCHAR(30) NOT NULL DEFAULT '',
  approved_amount INT UNSIGNED NULL,
  receipt VARCHAR(30) NULL,
  decided_by VARCHAR(120) NULL,
  decided_at VARCHAR(30) NULL,
  reason VARCHAR(200) NULL,
  extra JSON NULL,
  PRIMARY KEY (booking_id, position),
  UNIQUE KEY ux_payment_proofs_id (id),
  KEY ix_payment_proofs_utr (utr),
  KEY ix_payment_proofs_status (status),
  CONSTRAINT fk_payment_proofs FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_notes (
  booking_id VARCHAR(16) NOT NULL,
  position SMALLINT NOT NULL,
  noted_at VARCHAR(30) NOT NULL DEFAULT '',
  by_name VARCHAR(120) NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  PRIMARY KEY (booking_id, position),
  CONSTRAINT fk_booking_notes FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- fixed group departures (seat inventory)
CREATE TABLE IF NOT EXISTS departures (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  package_id VARCHAR(80) NOT NULL,
  package_title VARCHAR(160) NOT NULL DEFAULT '',
  departure_date DATE NULL,
  seats SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  booked SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Open',
  captain VARCHAR(120) NOT NULL DEFAULT '',
  note VARCHAR(300) NOT NULL DEFAULT '',
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY ix_departures_date (departure_date),
  KEY ix_departures_status (status),
  KEY ix_departures_package (package_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- dashboard price/visibility controls per package ("Packages & prices"); a row exists only when edited
CREATE TABLE IF NOT EXISTS package_overrides (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(160) NOT NULL DEFAULT '',
  price INT UNSIGNED NOT NULL DEFAULT 0,
  tag VARCHAR(80) NOT NULL DEFAULT '',
  active TINYINT(1) NOT NULL DEFAULT 1,
  note VARCHAR(500) NOT NULL DEFAULT '',
  early_bird_pct TINYINT UNSIGNED NULL,
  seats SMALLINT UNSIGNED NULL,
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  code VARCHAR(30) NOT NULL,
  pct TINYINT UNSIGNED NOT NULL DEFAULT 0,
  description VARCHAR(200) NOT NULL DEFAULT '',
  max_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  valid_till DATE NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY ux_coupons_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL DEFAULT '',
  city VARCHAR(80) NOT NULL DEFAULT '',
  package_id VARCHAR(80) NOT NULL DEFAULT '',
  trip VARCHAR(160) NOT NULL DEFAULT '',
  rating TINYINT UNSIGNED NOT NULL DEFAULT 5,
  text TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  booking_ref VARCHAR(32) NOT NULL DEFAULT '',
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY ix_reviews_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Travel Partner community
CREATE TABLE IF NOT EXISTS partners (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  gender VARCHAR(20) NOT NULL DEFAULT '',
  city VARCHAR(80) NOT NULL DEFAULT '',
  phone VARCHAR(20) NOT NULL DEFAULT '',
  phone_digits VARCHAR(10) NOT NULL DEFAULT '',
  email VARCHAR(120) NOT NULL DEFAULT '',
  destination_id VARCHAR(64) NOT NULL DEFAULT '',
  travel_month VARCHAR(40) NOT NULL DEFAULT '',
  budget VARCHAR(40) NOT NULL DEFAULT '',
  looking_for VARCHAR(20) NOT NULL DEFAULT '',
  about TEXT NULL,
  pace VARCHAR(20) NOT NULL DEFAULT '',
  diet VARCHAR(20) NOT NULL DEFAULT '',
  photo_visibility VARCHAR(20) NOT NULL DEFAULT '',
  id_type VARCHAR(20) NOT NULL DEFAULT '',
  id_last4 VARCHAR(4) NOT NULL DEFAULT '',
  age TINYINT UNSIGNED NOT NULL DEFAULT 18,
  needs_seat TINYINT(1) NOT NULL DEFAULT 0,
  share_room TINYINT(1) NOT NULL DEFAULT 0,
  women_only TINYINT(1) NOT NULL DEFAULT 0,
  smoker TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'Verification pending',
  docs_at VARCHAR(30) NULL,
  docs_deleted_at VARCHAR(30) NULL,
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY ix_partners_status (status),
  KEY ix_partners_phone (phone_digits)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partner_styles (
  partner_id VARCHAR(32) NOT NULL,
  position SMALLINT NOT NULL,
  style VARCHAR(30) NOT NULL,
  PRIMARY KEY (partner_id, position),
  CONSTRAINT fk_partner_styles FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- photo + identity documents (files live outside the web root; ID files are deleted after a decision)
CREATE TABLE IF NOT EXISTS partner_documents (
  partner_id VARCHAR(32) NOT NULL,
  position SMALLINT NOT NULL,
  doc_key VARCHAR(20) NOT NULL,
  file VARCHAR(80) NOT NULL,
  size INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (partner_id, position),
  CONSTRAINT fk_partner_documents FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partner_requests (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  to_member VARCHAR(40) NOT NULL DEFAULT '',
  trip VARCHAR(80) NOT NULL DEFAULT '',
  travel_month VARCHAR(30) NOT NULL DEFAULT '',
  message VARCHAR(400) NOT NULL DEFAULT '',
  needs_seat TINYINT(1) NOT NULL DEFAULT 0,
  room VARCHAR(10) NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'Awaiting response',
  from_phone VARCHAR(20) NOT NULL DEFAULT '',
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY ix_partner_requests_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- joint booking proposals between two travel partners
CREATE TABLE IF NOT EXISTS proposals (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  package_id VARCHAR(80) NOT NULL DEFAULT '',
  partner VARCHAR(40) NOT NULL DEFAULT '',
  travel_month VARCHAR(30) NOT NULL DEFAULT '',
  hotel VARCHAR(10) NOT NULL DEFAULT '',
  needs_seat TINYINT(1) NOT NULL DEFAULT 0,
  room VARCHAR(10) NOT NULL DEFAULT '',
  pay_split VARCHAR(12) NOT NULL DEFAULT '',
  total INT UNSIGNED NOT NULL DEFAULT 0,
  you_pay INT UNSIGNED NOT NULL DEFAULT 0,
  partner_pays INT UNSIGNED NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'Waiting for partner',
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY ix_proposals_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEO: per-URL overrides, programmatic page templates, redirects
CREATE TABLE IF NOT EXISTS seo_pages (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  path VARCHAR(255) NOT NULL,
  route VARCHAR(120) NOT NULL DEFAULT '',
  kind VARCHAR(20) NOT NULL DEFAULT 'built-in',
  title VARCHAR(300) NOT NULL DEFAULT '',
  meta VARCHAR(500) NOT NULL DEFAULT '',
  h1 VARCHAR(300) NOT NULL DEFAULT '',
  intro TEXT NULL,
  noindex TINYINT(1) NOT NULL DEFAULT 0,
  canonical VARCHAR(500) NOT NULL DEFAULT '',
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY ux_seo_pages_path (path),
  KEY ix_seo_pages_route (route)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seo_page_faqs (
  page_id VARCHAR(191) NOT NULL,
  position SMALLINT NOT NULL,
  question VARCHAR(500) NOT NULL DEFAULT '',
  answer TEXT NULL,
  PRIMARY KEY (page_id, position),
  CONSTRAINT fk_seo_page_faqs FOREIGN KEY (page_id) REFERENCES seo_pages(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seo_templates (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL DEFAULT '',
  type VARCHAR(30) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'Draft',
  min_items SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  priority DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  slug VARCHAR(255) NOT NULL DEFAULT '',
  title VARCHAR(300) NOT NULL DEFAULT '',
  meta VARCHAR(500) NOT NULL DEFAULT '',
  h1 VARCHAR(300) NOT NULL DEFAULT '',
  lead TEXT NULL,
  intro TEXT NULL,
  scope JSON NULL,
  note VARCHAR(500) NULL,
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seo_template_faqs (
  template_id VARCHAR(40) NOT NULL,
  position SMALLINT NOT NULL,
  question VARCHAR(500) NOT NULL DEFAULT '',
  answer TEXT NULL,
  PRIMARY KEY (template_id, position),
  CONSTRAINT fk_seo_template_faqs FOREIGN KEY (template_id) REFERENCES seo_templates(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS redirects (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  from_path VARCHAR(300) NOT NULL,
  to_url VARCHAR(500) NOT NULL,
  code SMALLINT UNSIGNED NOT NULL DEFAULT 301,
  active TINYINT(1) NOT NULL DEFAULT 1,
  hits INT UNSIGNED NOT NULL DEFAULT 0,
  last_hit_at VARCHAR(30) NULL,
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY ux_redirects_from (from_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- audit trail (append-only)
CREATE TABLE IF NOT EXISTS activity_log (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  by_name VARCHAR(120) NOT NULL DEFAULT '',
  role VARCHAR(20) NOT NULL DEFAULT '',
  action VARCHAR(80) NOT NULL DEFAULT '',
  collection VARCHAR(40) NOT NULL DEFAULT '',
  ref VARCHAR(191) NOT NULL DEFAULT '',
  note VARCHAR(500) NOT NULL DEFAULT '',
  extra JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY ix_activity_created (created_at),
  KEY ix_activity_collection (collection)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
