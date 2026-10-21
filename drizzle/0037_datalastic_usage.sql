-- Datalastic 크레딧 월 집계 + 구역별 마지막 폴링 시각.
-- 적재: workers/cron-ingest/src/datalastic.ts. 이 테이블이 없으면 Worker 는 Datalastic 을 호출하지 않는다(예산 가드 fail-closed).

CREATE TABLE IF NOT EXISTS datalastic_usage (
  month TEXT PRIMARY KEY,            -- UTC "YYYY-MM"
  credits INTEGER NOT NULL DEFAULT 0, -- 이번 달 소모 추정 (선박 1척 = 1크레딧)
  calls INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS datalastic_zone_poll (
  zone_id TEXT PRIMARY KEY,
  polled_at TEXT NOT NULL,
  vessel_count INTEGER NOT NULL DEFAULT 0
);
