-- 선박 신원 — aisstream ShipStaticData(정적 메시지)의 IMO·호출부호·선종.
-- ais_vessels 는 위치 스냅샷이라 IMO 를 안 들고 있어서 별도 표로 둔다 (MMSI 당 1행, 최신값으로 덮어씀).
-- 피격 확인(/strikes)에서 "이 MMSI = 이 IMO" 를 붙이는 데 쓴다.

CREATE TABLE IF NOT EXISTS vessel_identity (
  mmsi TEXT PRIMARY KEY NOT NULL,
  imo TEXT,
  call_sign TEXT,
  ship_name TEXT,
  ship_type INTEGER,
  source TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vessel_identity_imo ON vessel_identity (imo);
