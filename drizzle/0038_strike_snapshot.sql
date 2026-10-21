-- 피격 사건마다 한 번: 그 지점 Datalastic 스냅샷 + 후보 선박 이력 보강 기록.
-- 적재: workers/cron-ingest/src/strikeSnapshot.ts (5분 크론). 이 테이블이 없으면 Worker 는 사건 스냅샷을 하지 않는다.
-- 선행: 0037_datalastic_usage (월 크레딧 집계를 같이 쓴다)

CREATE TABLE IF NOT EXISTS strike_snapshot (
  incident_id TEXT PRIMARY KEY,         -- ukmto_incidents.id
  stage INTEGER NOT NULL DEFAULT 1,     -- 1=지점 스냅샷 완료, 2=후보 선박 이력 보강 완료
  snapshot_at TEXT NOT NULL,
  radius_nm INTEGER NOT NULL,
  vessel_count INTEGER NOT NULL DEFAULT 0,
  credits INTEGER NOT NULL DEFAULT 0,   -- 스냅샷에 쓴 크레딧 (근처 사건과 공유하면 0)
  candidates TEXT NOT NULL DEFAULT '[]',-- 이력 보강 대상 [{mmsi,name,imo,distNm}]
  history_at TEXT,
  history_credits INTEGER NOT NULL DEFAULT 0,
  history_tries INTEGER NOT NULL DEFAULT 0,
  note TEXT
);
