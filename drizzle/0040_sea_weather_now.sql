-- 해역 대표 지점별 "현재" 해상·기상 (Datalastic /weather). 화면은 이 테이블만 읽는다 — 페이지 조회가 크레딧을 쓰지 않게.
-- 적재: workers/cron-ingest/src/seaWeatherNow.ts (5분 크론 안에서 지점별 6시간 간격으로 스스로 스로틀).
-- 실패하면 값은 그대로 두고 checked_at·error 만 갱신 → 실패한 API 를 5분마다 두드리지 않는다.
-- 선행: 0037_datalastic_usage (월 크레딧 집계를 같이 쓴다). 이 테이블이 없으면 Worker 는 호출하지 않는다.

CREATE TABLE IF NOT EXISTS sea_weather_now (
  point_id TEXT PRIMARY KEY,        -- src/lib/marineWeather/zones.ts 의 MARINE_POINTS.id
  region TEXT NOT NULL,
  checked_at TEXT NOT NULL,         -- 마지막으로 호출을 시도한 시각
  error TEXT,                       -- 마지막 시도가 실패했으면 사유 (예: http 429)
  fetched_at TEXT,                  -- 마지막으로 성공한 시각
  at TEXT,                          -- 응답이 말하는 기준 시각 (UTC)
  wave_height_m REAL,
  wave_period_s REAL,
  swell_height_m REAL,
  wind_kn REAL,
  wind_dir_deg REAL,
  visibility_km REAL,
  pressure_hpa REAL,
  sea_temp_c REAL
);
CREATE INDEX IF NOT EXISTS idx_sea_weather_now_region ON sea_weather_now (region);
