-- AIS 초크포인트 게이트 통과(진입/이탈) 이벤트 로그
-- ais_vessels는 MMSI당 최신 위치 1행만 유지(upsert)하므로 여기가 유일한 시계열이다.
-- 크론이 매 실행마다 "이전 ais_vessels 행" vs "새로 받은 위치"를 비교해 게이트를
-- 넘었으면 한 행씩 쌓는다 (workers/cron-ingest/src/aisZones.ts 참고).
-- Apply: npm run cf:d1:migrate:remote (또는 :local)

CREATE TABLE IF NOT EXISTS ais_zone_crossings (
  id TEXT PRIMARY KEY NOT NULL,
  zone_id TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'enter' | 'exit'
  mmsi TEXT NOT NULL,
  ship_name TEXT,
  category TEXT,
  ship_type_label TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  sog REAL,
  cog REAL,
  detected_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ais_zone_crossings_zone
  ON ais_zone_crossings (zone_id, detected_at);

CREATE INDEX IF NOT EXISTS idx_ais_zone_crossings_mmsi
  ON ais_zone_crossings (mmsi, detected_at);

CREATE INDEX IF NOT EXISTS idx_ais_zone_crossings_detected
  ON ais_zone_crossings (detected_at);
