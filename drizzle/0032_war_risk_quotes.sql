-- 보도 기준 전쟁위험(war risk) 보험료 — 기사 1건 = 1행 (id = 기사 링크 해시).
-- 공개 시세가 아니라 언론 보도 수치다. 원문은 저장하지 않고 근거 구절 + 링크만.

CREATE TABLE IF NOT EXISTS war_risk_quotes (
  id TEXT PRIMARY KEY NOT NULL,
  region TEXT NOT NULL,
  rate_pct REAL,
  rate_high_pct REAL,
  rate_prev_pct REAL,
  usd_per_voyage REAL,
  direction TEXT,
  confidence TEXT NOT NULL,
  quote TEXT NOT NULL,
  headline TEXT NOT NULL,
  url TEXT NOT NULL,
  outlet TEXT,
  feed TEXT NOT NULL,
  published_at TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_war_risk_region_pub
  ON war_risk_quotes (region, published_at);

-- 폴링 스로틀용 1행 테이블 (매칭 0건이어도 마지막 확인 시각을 남긴다)
CREATE TABLE IF NOT EXISTS war_risk_poll (
  id INTEGER PRIMARY KEY NOT NULL,
  checked_at TEXT NOT NULL,
  scanned INTEGER NOT NULL DEFAULT 0,
  matched INTEGER NOT NULL DEFAULT 0
);
