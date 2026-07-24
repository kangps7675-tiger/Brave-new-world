-- Daily theater tension + chokepoint supply-chain stress rankings
-- Cron upserts UTC daily snapshot; prev_rank/delta_* enable Threads "▲2 / ▼1" cards.
CREATE TABLE IF NOT EXISTS daily_entity_ranks (
  rank_date TEXT NOT NULL,
  kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  label_ko TEXT NOT NULL,
  label_en TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL,
  prev_rank INTEGER,
  delta_rank INTEGER,
  delta_score REAL,
  detail_json TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (rank_date, kind, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_ranks_date_kind_rank
  ON daily_entity_ranks (rank_date, kind, rank);

CREATE INDEX IF NOT EXISTS idx_daily_ranks_updated
  ON daily_entity_ranks (updated_at);
