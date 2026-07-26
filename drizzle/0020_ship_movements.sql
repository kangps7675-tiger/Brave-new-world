CREATE TABLE IF NOT EXISTS ship_movement_reports (
  id TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL,
  source_label TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ko TEXT NOT NULL,
  title_en TEXT NOT NULL,
  summary_ko TEXT,
  summary_en TEXT,
  published_at TEXT,
  week_start TEXT,
  content_hash TEXT NOT NULL,
  raw_excerpt TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ship_move_reports_source
  ON ship_movement_reports (source, published_at);

CREATE INDEX IF NOT EXISTS idx_ship_move_reports_week
  ON ship_movement_reports (week_start);

CREATE TABLE IF NOT EXISTS ship_movement_observations (
  id TEXT PRIMARY KEY NOT NULL,
  report_id TEXT NOT NULL,
  vessel_key TEXT NOT NULL,
  vessel_name TEXT,
  hull_number TEXT,
  navy_code TEXT,
  navy_label_ko TEXT,
  navy_label_en TEXT,
  title_ko TEXT NOT NULL,
  title_en TEXT NOT NULL,
  summary_ko TEXT,
  summary_en TEXT,
  location_label_ko TEXT,
  location_label_en TEXT,
  missing_location_note_ko TEXT,
  missing_location_note_en TEXT,
  observed_at TEXT,
  location_status TEXT NOT NULL,
  confidence TEXT NOT NULL,
  vessel_confidence TEXT NOT NULL DEFAULT 'low',
  method TEXT NOT NULL DEFAULT 'none',
  map_eligible INTEGER NOT NULL DEFAULT 0,
  lat REAL,
  lng REAL,
  precision_km REAL,
  place_id TEXT,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT,
  reviewed_at TEXT,
  week_start TEXT,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ship_move_obs_review
  ON ship_movement_observations (review_status, updated_at);

CREATE INDEX IF NOT EXISTS idx_ship_move_obs_week
  ON ship_movement_observations (week_start);

CREATE INDEX IF NOT EXISTS idx_ship_move_obs_vessel
  ON ship_movement_observations (vessel_key);

CREATE INDEX IF NOT EXISTS idx_ship_move_obs_geo
  ON ship_movement_observations (lat, lng);

CREATE INDEX IF NOT EXISTS idx_ship_move_obs_report
  ON ship_movement_observations (report_id);
