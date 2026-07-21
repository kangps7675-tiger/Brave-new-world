-- Conflict View D1 schema — FIRMS + GDELT ingest snapshots
-- Apply: npm run cf:d1:migrate:remote   (or :local)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS firms_fires (
  id TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  frp REAL,
  brightness REAL,
  confidence TEXT,
  acq_date TEXT,
  acq_time TEXT,
  satellite TEXT,
  daynight TEXT,
  source TEXT NOT NULL DEFAULT 'VIIRS_SNPP_NRT',
  theater TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_firms_ingested ON firms_fires (ingested_at);
CREATE INDEX IF NOT EXISTS idx_firms_theater ON firms_fires (theater);
CREATE INDEX IF NOT EXISTS idx_firms_geo ON firms_fires (lat, lng);

CREATE TABLE IF NOT EXISTS gdelt_points (
  id TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  name TEXT,
  url TEXT,
  mention_count INTEGER,
  share_image TEXT,
  query_tag TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gdelt_ingested ON gdelt_points (ingested_at);
CREATE INDEX IF NOT EXISTS idx_gdelt_tag ON gdelt_points (query_tag);
CREATE INDEX IF NOT EXISTS idx_gdelt_geo ON gdelt_points (lat, lng);

CREATE TABLE IF NOT EXISTS news_stream_snapshots (
  cache_key TEXT PRIMARY KEY,
  packages TEXT,
  lang TEXT NOT NULL DEFAULT 'ko',
  payload_json TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  tier1_count INTEGER NOT NULL DEFAULT 0,
  tier2_count INTEGER NOT NULL DEFAULT 0,
  tier3_count INTEGER NOT NULL DEFAULT 0,
  fetched_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_snap_fetched ON news_stream_snapshots (fetched_at);
CREATE INDEX IF NOT EXISTS idx_news_snap_lang ON news_stream_snapshots (lang);

CREATE TABLE IF NOT EXISTS news_stream_items (
  id TEXT PRIMARY KEY,
  cache_key TEXT NOT NULL,
  item_id TEXT NOT NULL,
  trust_tier INTEGER NOT NULL,
  theater TEXT,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  source TEXT,
  publisher TEXT,
  pub_date TEXT,
  feed_topic TEXT,
  econ_genre TEXT,
  category TEXT,
  image_url TEXT,
  summary TEXT,
  role TEXT NOT NULL DEFAULT 'verified',
  ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_items_cache ON news_stream_items (cache_key);
CREATE INDEX IF NOT EXISTS idx_news_items_tier ON news_stream_items (trust_tier);
CREATE INDEX IF NOT EXISTS idx_news_items_theater ON news_stream_items (theater);
CREATE INDEX IF NOT EXISTS idx_news_items_ingested ON news_stream_items (ingested_at);

CREATE TABLE IF NOT EXISTS telegram_alerts (
  id TEXT PRIMARY KEY,
  channel_username TEXT NOT NULL,
  channel_title TEXT,
  region TEXT NOT NULL DEFAULT 'global',
  text TEXT NOT NULL,
  message_url TEXT,
  received_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tg_received ON telegram_alerts (received_at);
CREATE INDEX IF NOT EXISTS idx_tg_ingested ON telegram_alerts (ingested_at);
CREATE INDEX IF NOT EXISTS idx_tg_region ON telegram_alerts (region);

CREATE TABLE IF NOT EXISTS ingest_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  firms_count INTEGER DEFAULT 0,
  gdelt_count INTEGER DEFAULT 0,
  ok INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  detail_json TEXT
);

CREATE TABLE IF NOT EXISTS living_timeline_entries (
  id TEXT NOT NULL PRIMARY KEY,
  conflict_id TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  headline_ko TEXT NOT NULL,
  headline_en TEXT NOT NULL,
  source_urls_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_living_timeline_conflict_date
  ON living_timeline_entries (conflict_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_living_timeline_date
  ON living_timeline_entries (entry_date);

CREATE TABLE IF NOT EXISTS bunker_sentiment_votes (
  vote_date TEXT NOT NULL,
  device_id TEXT NOT NULL,
  pick TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (vote_date, device_id)
);

CREATE INDEX IF NOT EXISTS idx_bunker_sentiment_date
  ON bunker_sentiment_votes (vote_date);

CREATE TABLE IF NOT EXISTS air_raid_alerts (
  id TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL,
  theater_id TEXT NOT NULL,
  region TEXT,
  title TEXT,
  severity INTEGER NOT NULL DEFAULT 3,
  alert_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  detail_json TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_air_raid_theater_at
  ON air_raid_alerts (theater_id, alert_at);

CREATE INDEX IF NOT EXISTS idx_air_raid_source_at
  ON air_raid_alerts (source, alert_at);

CREATE INDEX IF NOT EXISTS idx_air_raid_ingested
  ON air_raid_alerts (ingested_at);

CREATE TABLE IF NOT EXISTS theater_signal_daily (
  signal_date TEXT NOT NULL,
  theater_id TEXT NOT NULL,
  mentions REAL NOT NULL DEFAULT 0,
  points REAL NOT NULL DEFAULT 0,
  fire_count REAL NOT NULL DEFAULT 0,
  telegram_count REAL NOT NULL DEFAULT 0,
  air_raid_score REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (signal_date, theater_id)
);

CREATE INDEX IF NOT EXISTS idx_theater_signal_daily_theater
  ON theater_signal_daily (theater_id, signal_date);

CREATE TABLE IF NOT EXISTS ukmto_incidents (
  id TEXT PRIMARY KEY NOT NULL,
  incident_number INTEGER,
  incident_type_name TEXT NOT NULL,
  incident_type_level INTEGER,
  pin_colour TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  region TEXT,
  place TEXT,
  vessel_name TEXT,
  vessel_type TEXT,
  vessel_under_pirate_control INTEGER NOT NULL DEFAULT 0,
  crew_held INTEGER,
  detail TEXT,
  utc_date_of_incident TEXT,
  utc_date_created TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ukmto_geo
  ON ukmto_incidents (lat, lng);

CREATE INDEX IF NOT EXISTS idx_ukmto_date
  ON ukmto_incidents (utc_date_of_incident);

