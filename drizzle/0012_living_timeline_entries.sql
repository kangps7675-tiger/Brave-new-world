-- 진행형 분쟁 타임라인 (대만해협 등). Cron 휴리스틱 큐레이션.
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
