CREATE TABLE IF NOT EXISTS reference_monitor_items (
  id TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL,
  source_label TEXT NOT NULL,
  channel TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  author TEXT,
  categories_json TEXT NOT NULL DEFAULT '[]',
  topics_json TEXT NOT NULL DEFAULT '[]',
  relevance INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  updated_at TEXT,
  first_seen_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reference_monitor_source
  ON reference_monitor_items (source, published_at);

CREATE INDEX IF NOT EXISTS idx_reference_monitor_updated
  ON reference_monitor_items (updated_at);

CREATE INDEX IF NOT EXISTS idx_reference_monitor_relevance
  ON reference_monitor_items (relevance, published_at);

CREATE INDEX IF NOT EXISTS idx_reference_monitor_first_seen
  ON reference_monitor_items (first_seen_at);
