-- Investigation case files (append-only revisions + current snapshot cache)

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  event_type TEXT NOT NULL,
  verdict TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_updated
  ON cases (updated_at);

CREATE INDEX IF NOT EXISTS idx_cases_verdict
  ON cases (verdict, updated_at);

CREATE TABLE IF NOT EXISTS case_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  case_id TEXT NOT NULL,
  rev INTEGER NOT NULL,
  at TEXT NOT NULL,
  op TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  reason TEXT,
  UNIQUE (case_id, rev)
);

CREATE INDEX IF NOT EXISTS idx_case_revisions_case_rev
  ON case_revisions (case_id, rev);
