-- 사건 조사용 위치 이력. ais_vessels / adsb_aircraft 는 대상당 최신 1행만 남기므로
-- "그 시각 그 근처에 있었는가"와 "신호가 끊긴 구간"을 답하려면 별도 이력이 필요하다.
-- 30분 버킷당 대상 1행 (id = 대상:버킷) — 같은 버킷 재수집은 무시.

CREATE TABLE IF NOT EXISTS ais_position_history (
  id TEXT PRIMARY KEY NOT NULL,
  mmsi TEXT NOT NULL,
  ship_name TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  sog REAL,
  cog REAL,
  category TEXT,
  sampled_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ais_hist_geo_at
  ON ais_position_history (lat, lng, sampled_at);

CREATE INDEX IF NOT EXISTS idx_ais_hist_mmsi_at
  ON ais_position_history (mmsi, sampled_at);

CREATE INDEX IF NOT EXISTS idx_ais_hist_ingested
  ON ais_position_history (ingested_at);

-- 군용기만 (민간은 양이 많고 사건 근거 가치가 낮음)
CREATE TABLE IF NOT EXISTS adsb_track_history (
  id TEXT PRIMARY KEY NOT NULL,
  hex TEXT NOT NULL,
  callsign TEXT,
  registration TEXT,
  type TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  altitude REAL,
  ground_speed REAL,
  track REAL,
  squawk TEXT,
  sampled_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_adsb_hist_geo_at
  ON adsb_track_history (lat, lng, sampled_at);

CREATE INDEX IF NOT EXISTS idx_adsb_hist_hex_at
  ON adsb_track_history (hex, sampled_at);

CREATE INDEX IF NOT EXISTS idx_adsb_hist_ingested
  ON adsb_track_history (ingested_at);
