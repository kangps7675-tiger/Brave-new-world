-- Strait event causal replay (PortWatch traffic + FRED outcomes)
CREATE TABLE IF NOT EXISTS strait_event_history (
  id TEXT PRIMARY KEY NOT NULL,
  strait_id TEXT NOT NULL,
  occurred_on TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  title_ko TEXT NOT NULL,
  title_en TEXT NOT NULL,
  kind TEXT NOT NULL,
  source_urls TEXT NOT NULL,
  curated_by TEXT NOT NULL DEFAULT 'human',
  reviewed INTEGER NOT NULL DEFAULT 0,
  is_synthetic INTEGER NOT NULL DEFAULT 0,
  baseline_window_days INTEGER NOT NULL DEFAULT 28,
  ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_strait_event_strait_date
  ON strait_event_history (strait_id, occurred_on);

CREATE INDEX IF NOT EXISTS idx_strait_event_kind
  ON strait_event_history (strait_id, kind);

CREATE INDEX IF NOT EXISTS idx_strait_event_reviewed
  ON strait_event_history (reviewed);

CREATE TABLE IF NOT EXISTS strait_traffic_daily (
  strait_id TEXT NOT NULL,
  date TEXT NOT NULL,
  vessel_count REAL NOT NULL,
  tanker_count REAL,
  capacity_dwt REAL,
  source_vintage TEXT NOT NULL,
  PRIMARY KEY (strait_id, date)
);

CREATE INDEX IF NOT EXISTS idx_strait_traffic_date
  ON strait_traffic_daily (date);

CREATE TABLE IF NOT EXISTS event_outcome (
  event_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  horizon TEXT NOT NULL,
  baseline_value REAL,
  observed_value REAL,
  delta_pct REAL,
  sample_note TEXT,
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, metric, horizon)
);

CREATE INDEX IF NOT EXISTS idx_event_outcome_metric
  ON event_outcome (metric, horizon);

CREATE TABLE IF NOT EXISTS fred_daily (
  series_id TEXT NOT NULL,
  date TEXT NOT NULL,
  value REAL NOT NULL,
  source_vintage TEXT NOT NULL,
  PRIMARY KEY (series_id, date)
);
