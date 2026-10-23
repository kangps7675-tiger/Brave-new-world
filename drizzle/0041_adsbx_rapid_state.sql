-- ADS-B Exchange (RapidAPI) 월 호출 수 + 지점별 마지막 호출 시각.
-- Worker(workers/cron-ingest/src/adsbxDensify.ts)가 월 한도를 넘기지 않으려고 센다. 테이블이 없으면 Worker 는 호출하지 않는다(fail-closed).
--   key = 'calls:YYYY-MM' → n = 그 달 호출 수
--   key = 'last:<pointId>' → at = 마지막 호출 시각
CREATE TABLE IF NOT EXISTS adsbx_rapid_state (
  key TEXT PRIMARY KEY,
  n INTEGER NOT NULL DEFAULT 0,
  at TEXT
);
