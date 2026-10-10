-- Air-raid investigation history (append / interval) — not soft-rank snapshots.
-- Soft-rank continues to use air_raid_alerts; these tables keep searchable trails.

CREATE TABLE IF NOT EXISTS neptun_threat_samples (
  id TEXT PRIMARY KEY NOT NULL,
  threat_id TEXT NOT NULL,
  threat_type TEXT,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  heading REAL,
  speed_kmh REAL,
  confidence TEXT,
  source_count INTEGER,
  uncertainty_km REAL,
  sampled_at TEXT NOT NULL,
  trail_json TEXT,
  detail_json TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_neptun_threat_samples_threat_at
  ON neptun_threat_samples (threat_id, sampled_at);

CREATE INDEX IF NOT EXISTS idx_neptun_threat_samples_at
  ON neptun_threat_samples (sampled_at);

CREATE INDEX IF NOT EXISTS idx_neptun_threat_samples_geo_at
  ON neptun_threat_samples (lat, lon, sampled_at);

CREATE TABLE IF NOT EXISTS air_raid_alert_intervals (
  id TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL,
  theater_id TEXT NOT NULL,
  region_key TEXT NOT NULL,
  region_name TEXT,
  title TEXT,
  category INTEGER,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  last_seen_at TEXT NOT NULL,
  detail_json TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_air_raid_intervals_source_region
  ON air_raid_alert_intervals (source, region_key, started_at);

CREATE INDEX IF NOT EXISTS idx_air_raid_intervals_open
  ON air_raid_alert_intervals (source, ended_at, last_seen_at);

CREATE INDEX IF NOT EXISTS idx_air_raid_intervals_theater_at
  ON air_raid_alert_intervals (theater_id, started_at);
