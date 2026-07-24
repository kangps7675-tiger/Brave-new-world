-- SITREP change log — verification flips / meaningful score deltas (±8)
-- Append-only; written by cron-ingest after daily_entity_ranks upsert.
CREATE TABLE IF NOT EXISTS sitrep_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  rank_date TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  label_ko TEXT NOT NULL,
  label_en TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message_ko TEXT NOT NULL,
  message_en TEXT NOT NULL,
  delta_score REAL,
  prev_verification TEXT,
  next_verification TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sitrep_created
  ON sitrep_events (created_at);
