-- Guest daily prediction: pick tomorrow's theater tension #1
CREATE TABLE IF NOT EXISTS daily_rank_predictions (
  target_date TEXT NOT NULL,
  kind TEXT NOT NULL,
  device_id TEXT NOT NULL,
  pick_entity_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (target_date, kind, device_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_pred_date_kind
  ON daily_rank_predictions (target_date, kind);

-- Aggregated settle result for "어제 맞춘 N%"
CREATE TABLE IF NOT EXISTS daily_prediction_stats (
  target_date TEXT NOT NULL,
  kind TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  correct_pct REAL NOT NULL DEFAULT 0,
  winner_entity_id TEXT,
  resolved_at TEXT NOT NULL,
  PRIMARY KEY (target_date, kind)
);
