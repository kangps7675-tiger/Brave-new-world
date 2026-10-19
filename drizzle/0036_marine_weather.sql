-- 해상 기상 — NOAA GFS-Wave(WAVEWATCH III) 해역 대표 지점별 예보 (cycle 1개 = 0~72시간, 6시간 간격).
-- 적재: workers/cron-ingest/src/marineWeather.ts. 지점 정의: src/lib/marineWeather/zones.ts
-- 퍼블릭 도메인(미국 정부 자료). 항해용 예보가 아니라 우회·대기 판단 참고용.

CREATE TABLE IF NOT EXISTS marine_weather (
  cycle TEXT NOT NULL,          -- 모델 사이클 "YYYYMMDDHH" (UTC)
  fhour INTEGER NOT NULL,       -- 예보 시간 (0 = 분석값)
  valid_time TEXT NOT NULL,     -- 예보 대상 시각 ISO
  point_id TEXT NOT NULL,
  region TEXT NOT NULL,         -- red-sea | hormuz | black-sea | taiwan-strait | malacca
  grid_lat REAL NOT NULL,       -- 실제로 값을 읽은 격자점 (요청 좌표가 육지 격자면 옆 바다 격자)
  grid_lng REAL NOT NULL,
  offset_cells REAL NOT NULL DEFAULT 0,
  hs_m REAL,                    -- 유의파고
  period_s REAL,                -- 주파 주기
  dir_deg REAL,                 -- 주파 방향(오는 방향)
  wind_ms REAL,
  wind_dir_deg REAL,
  swell_m REAL,                 -- 1차 너울
  wind_wave_m REAL,             -- 풍랑
  ingested_at TEXT NOT NULL,
  PRIMARY KEY (cycle, fhour, point_id)
);

CREATE INDEX IF NOT EXISTS idx_marine_weather_region_valid
  ON marine_weather (region, valid_time);

-- 사이클·예보시간별 처리 상태 (증분 수집·재시도용)
CREATE TABLE IF NOT EXISTS marine_weather_files (
  cycle TEXT NOT NULL,
  fhour INTEGER NOT NULL,
  status TEXT NOT NULL,         -- ok | error
  attempts INTEGER NOT NULL DEFAULT 1,
  detail TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (cycle, fhour)
);
