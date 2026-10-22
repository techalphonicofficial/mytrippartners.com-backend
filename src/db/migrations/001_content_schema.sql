-- Website content (was hard-coded in the website's JavaScript). Every list keeps its display order in sort_order / position.

CREATE TABLE IF NOT EXISTS destinations (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  short_name VARCHAR(60) NULL,
  type ENUM('india','intl') NOT NULL,
  region VARCHAR(60) NOT NULL DEFAULT '',
  image VARCHAR(80) NOT NULL DEFAULT '',
  price INT UNSIGNED NOT NULL DEFAULT 0,
  tag VARCHAR(160) NOT NULL DEFAULT '',
  best_time VARCHAR(200) NOT NULL DEFAULT '',
  duration VARCHAR(60) NOT NULL DEFAULT '',
  airport VARCHAR(160) NOT NULL DEFAULT '',
  about TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_destinations_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS destination_images (
  destination_id VARCHAR(64) NOT NULL,
  position SMALLINT NOT NULL,
  image VARCHAR(80) NOT NULL,
  PRIMARY KEY (destination_id, position),
  CONSTRAINT fk_destination_images FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS destination_highlights (
  destination_id VARCHAR(64) NOT NULL,
  position SMALLINT NOT NULL,
  text VARCHAR(300) NOT NULL,
  PRIMARY KEY (destination_id, position),
  CONSTRAINT fk_destination_highlights FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS themes (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  icon VARCHAR(40) NOT NULL DEFAULT '',
  image VARCHAR(80) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS packages (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  destination_id VARCHAR(64) NOT NULL,
  title VARCHAR(160) NOT NULL,
  nights TINYINT UNSIGNED NOT NULL DEFAULT 0,
  price INT UNSIGNED NOT NULL DEFAULT 0,
  image VARCHAR(80) NOT NULL DEFAULT '',
  route VARCHAR(200) NOT NULL DEFAULT '',
  tag VARCHAR(80) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_packages_destination (destination_id),
  KEY ix_packages_order (sort_order),
  CONSTRAINT fk_packages_destination FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS package_themes (
  package_id VARCHAR(64) NOT NULL,
  position SMALLINT NOT NULL,
  theme_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (package_id, position),
  UNIQUE KEY ux_package_theme (package_id, theme_id),
  KEY ix_package_themes_theme (theme_id),
  CONSTRAINT fk_package_themes_package FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_package_themes_theme FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS package_days (
  package_id VARCHAR(64) NOT NULL,
  position SMALLINT NOT NULL,
  title VARCHAR(160) NOT NULL,
  details TEXT NOT NULL,
  PRIMARY KEY (package_id, position),
  CONSTRAINT fk_package_days FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- weekend getaway details (packages listed on /weekend-getaways-from-delhi/)
CREATE TABLE IF NOT EXISTS package_weekend (
  package_id VARCHAR(64) NOT NULL PRIMARY KEY,
  distance_km SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  drive_hours DECIMAL(4,1) NOT NULL DEFAULT 0,
  transport VARCHAR(80) NOT NULL DEFAULT '',
  leave_at VARCHAR(40) NOT NULL DEFAULT '',
  back_at VARCHAR(40) NOT NULL DEFAULT '',
  vibe VARCHAR(40) NOT NULL DEFAULT '',
  CONSTRAINT fk_package_weekend FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Christmas / New Year departures (packages listed on /christmas-new-year-packages/)
CREATE TABLE IF NOT EXISTS package_festive (
  package_id VARCHAR(64) NOT NULL PRIMARY KEY,
  occasion ENUM('xmas','nye','both') NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  highlight VARCHAR(300) NOT NULL DEFAULT '',
  early_bird_pct TINYINT UNSIGNED NOT NULL DEFAULT 0,
  seats SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_package_festive FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS states (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  is_union_territory TINYINT(1) NOT NULL DEFAULT 0,
  capital VARCHAR(160) NOT NULL DEFAULT '',
  image VARCHAR(80) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- place types / categories (hill, beach, pilgrimage …) with their landing page under /india/<slug>/
CREATE TABLE IF NOT EXISTS place_categories (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_place_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS places (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  state_id VARCHAR(64) NOT NULL,
  destination_id VARCHAR(64) NULL,
  latitude DECIMAL(9,5) NOT NULL DEFAULT 0,
  longitude DECIMAL(9,5) NOT NULL DEFAULT 0,
  airport VARCHAR(200) NOT NULL DEFAULT '',
  rail VARCHAR(200) NOT NULL DEFAULT '',
  best_time VARCHAR(120) NOT NULL DEFAULT '',
  days VARCHAR(40) NOT NULL DEFAULT '',
  altitude_m INT NULL,
  image VARCHAR(80) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_places_state (state_id),
  KEY ix_places_destination (destination_id),
  CONSTRAINT fk_places_state FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_places_destination FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS place_category_map (
  place_id VARCHAR(64) NOT NULL,
  position SMALLINT NOT NULL,
  category_id VARCHAR(40) NOT NULL,
  PRIMARY KEY (place_id, position),
  KEY ix_place_category (category_id),
  CONSTRAINT fk_place_category_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- attractions / food / shopping lists of a place guide
CREATE TABLE IF NOT EXISTS place_items (
  place_id VARCHAR(64) NOT NULL,
  kind ENUM('attraction','food','shopping') NOT NULL,
  position SMALLINT NOT NULL,
  text VARCHAR(300) NOT NULL,
  PRIMARY KEY (place_id, kind, position),
  CONSTRAINT fk_place_items FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS guides (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  image VARCHAR(80) NOT NULL DEFAULT '',
  category VARCHAR(60) NOT NULL DEFAULT '',
  read_minutes TINYINT UNSIGNED NOT NULL DEFAULT 0,
  intro TEXT NOT NULL,
  link_label VARCHAR(120) NOT NULL DEFAULT '',
  link_route VARCHAR(120) NOT NULL DEFAULT '',
  comparison_table JSON NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS guide_sections (
  guide_id VARCHAR(64) NOT NULL,
  position SMALLINT NOT NULL,
  heading VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (guide_id, position),
  CONSTRAINT fk_guide_sections FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visa_countries (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  visa_group ENUM('free','voa') NOT NULL,
  name VARCHAR(120) NOT NULL,
  destination_id VARCHAR(64) NULL,
  note VARCHAR(200) NOT NULL DEFAULT '',
  subtitle VARCHAR(200) NOT NULL DEFAULT '',
  color_primary CHAR(7) NOT NULL DEFAULT '#000000',
  color_secondary CHAR(7) NOT NULL DEFAULT '#000000',
  image VARCHAR(80) NOT NULL DEFAULT '',
  stay VARCHAR(120) NOT NULL DEFAULT '',
  tip VARCHAR(200) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_visa_destination FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  icon VARCHAR(40) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_features (
  service_id VARCHAR(64) NOT NULL,
  position SMALLINT NOT NULL,
  text VARCHAR(300) NOT NULL,
  PRIMARY KEY (service_id, position),
  CONSTRAINT fk_service_features FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FAQ, privacy, terms, cancellation …
CREATE TABLE IF NOT EXISTS info_pages (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS info_page_sections (
  page_id VARCHAR(64) NOT NULL,
  position SMALLINT NOT NULL,
  heading VARCHAR(300) NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (page_id, position),
  CONSTRAINT fk_info_page_sections FOREIGN KEY (page_id) REFERENCES info_pages(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- grouped FAQs shown inside features (e.g. Travel Partner)
CREATE TABLE IF NOT EXISTS faqs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  faq_group VARCHAR(40) NOT NULL,
  question VARCHAR(300) NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_faqs_group (faq_group, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reels (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  destination_id VARCHAR(64) NOT NULL,
  package_id VARCHAR(64) NULL,
  title VARCHAR(200) NOT NULL,
  tag VARCHAR(120) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reels_destination FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reels_package FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- long weekends shown on the weekend getaways page
CREATE TABLE IF NOT EXISTS holidays (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  holiday_date DATE NOT NULL,
  label VARCHAR(80) NOT NULL,
  note VARCHAR(300) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- example Travel Partner profiles shown while the community is in demo mode
CREATE TABLE IF NOT EXISTS sample_partners (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  gender VARCHAR(20) NOT NULL DEFAULT '',
  age TINYINT UNSIGNED NOT NULL DEFAULT 18,
  city VARCHAR(80) NOT NULL DEFAULT '',
  languages JSON NOT NULL,
  travel_style VARCHAR(160) NOT NULL DEFAULT '',
  trips JSON NOT NULL,
  about TEXT NOT NULL,
  interests JSON NOT NULL,
  verified JSON NOT NULL,
  response_time VARCHAR(80) NOT NULL DEFAULT '',
  budget VARCHAR(40) NOT NULL DEFAULT '',
  pace VARCHAR(40) NOT NULL DEFAULT '',
  diet VARCHAR(40) NOT NULL DEFAULT '',
  smoker TINYINT(1) NOT NULL DEFAULT 0,
  drinks VARCHAR(40) NOT NULL DEFAULT '',
  home_city VARCHAR(80) NOT NULL DEFAULT '',
  selfie_verified TINYINT(1) NULL,
  joined VARCHAR(40) NOT NULL DEFAULT '',
  women_only TINYINT(1) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- key/value site configuration (contact details, payment details, social links, homepage settings, SEO settings …)
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  data JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
