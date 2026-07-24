-- Air-raid alert snapshots (Tzeva Adom / NEPTUN) for soft rank signals
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

-- Durable daily theater signal aggregates for 90d baseline (survives FIRMS/GDELT prune)
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
