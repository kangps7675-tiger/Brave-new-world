-- 매일 동일 문제 — 긴장도 UP/DOWN (지표만, 인명·공습 예측 금지)
CREATE TABLE IF NOT EXISTS daily_prompts (
  target_date TEXT NOT NULL PRIMARY KEY,
  /** theater | chokepoint | world */
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  label_ko TEXT NOT NULL,
  label_en TEXT NOT NULL,
  baseline_score REAL NOT NULL DEFAULT 0,
  question_ko TEXT NOT NULL,
  question_en TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_prompts_created
  ON daily_prompts (created_at);
