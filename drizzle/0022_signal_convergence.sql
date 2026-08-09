-- 컨버전스 감지 — 다채널 동시 이상 발화 기록 + 시장 반응 추적
--
-- 설계 원칙
--  1) append-only. 발화는 절대 수정·삭제하지 않는다. 트랙레코드가 곧 상품이다.
--  2) 판정만이 아니라 **판정의 입력**을 함께 저장한다.
--     알고리즘을 바꿔도 과거를 재채점할 수 있어야 한다.
--  3) algo_version 을 키에 포함한다. v1 발화와 v2 발화를 섞어서 적중률을 말하면 사기다.
--  4) "추천" 컬럼은 만들지 않는다. 사실과 통계만 저장한다.
--     (자본시장법: 개별 조언·양방향 유료는 투자자문업 등록 대상)

-- ─────────────────────────────────────────────────────────────
-- 1. 발화 기록
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS convergence_events (
  id TEXT PRIMARY KEY NOT NULL,          -- `${signal_date}:${theater_id}:${algo_version}`
  signal_date TEXT NOT NULL,             -- YYYY-MM-DD (UTC)
  theater_id TEXT NOT NULL,
  algo_version TEXT NOT NULL,

  channel_count INTEGER NOT NULL,        -- 동시 발화한 독립 채널 수
  score REAL NOT NULL,                   -- 발화 채널 z 합
  peak_z REAL NOT NULL,                  -- 최대 채널 z
  fired_channels TEXT NOT NULL,          -- CSV: "gdelt,telegram,airraid"

  -- 재채점용 원자료: 채널별 { value, median, mad, z, fired, floor }
  channels_json TEXT NOT NULL,
  baseline_days INTEGER NOT NULL,        -- 베이스라인 표본 일수
  baseline_gap_days INTEGER NOT NULL,    -- 최근 N일 제외 (오염 방지)

  created_at TEXT NOT NULL,
  UNIQUE (signal_date, theater_id, algo_version)
);

CREATE INDEX IF NOT EXISTS idx_convergence_theater_date
  ON convergence_events (theater_id, signal_date);
CREATE INDEX IF NOT EXISTS idx_convergence_date
  ON convergence_events (signal_date);
CREATE INDEX IF NOT EXISTS idx_convergence_algo
  ON convergence_events (algo_version, signal_date);

-- ─────────────────────────────────────────────────────────────
-- 2. 시장 일별 종가 — 우리가 직접 보관한다
--    FRED(미 정부, 퍼블릭 도메인)는 과거를 주지만, 지수·운임은 그렇지 않다.
--    상품이 될 시계열은 남의 API에 의존하지 않는다.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_daily (
  series_id TEXT NOT NULL,               -- DCOILWTICO / DCOILBRENTEU / VIXCLS / DTWEXBGS ...
  obs_date TEXT NOT NULL,                -- YYYY-MM-DD
  value REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'fred',
  ingested_at TEXT NOT NULL,
  PRIMARY KEY (series_id, obs_date)
);

CREATE INDEX IF NOT EXISTS idx_market_daily_date
  ON market_daily (obs_date);

-- ─────────────────────────────────────────────────────────────
-- 3. 발화 이후 시장 반응
--    발화 당일에는 채울 수 없다. D+1/2/5 가 지난 뒤 cron 이 채운다.
--    pct_change 만으로는 의미가 없어 z_change(평시 변동성 대비)를 함께 둔다.
--    "3% 움직였다"보다 "평소 일변동 0.8% 대비 3.7σ"가 훨씬 정직하다.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS convergence_outcomes (
  event_id TEXT NOT NULL,
  series_id TEXT NOT NULL,
  horizon_days INTEGER NOT NULL,         -- 1 / 2 / 5

  base_date TEXT NOT NULL,               -- 발화일 직전 거래일
  base_value REAL NOT NULL,
  end_date TEXT NOT NULL,
  end_value REAL NOT NULL,

  pct_change REAL NOT NULL,
  z_change REAL,                         -- 직전 90거래일 일간수익률 표준편차 대비
  measured_at TEXT NOT NULL,

  PRIMARY KEY (event_id, series_id, horizon_days)
);

CREATE INDEX IF NOT EXISTS idx_outcome_series
  ON convergence_outcomes (series_id, horizon_days);

-- ─────────────────────────────────────────────────────────────
-- 4. 파이프라인 건강 체크 — 조용히 끊기는 것이 최악이다
--    매일 한 행. 스냅샷 누락을 즉시 감지하기 위한 것.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_heartbeat (
  check_date TEXT PRIMARY KEY NOT NULL,
  theater_signal_rows INTEGER NOT NULL DEFAULT 0,
  market_series_rows INTEGER NOT NULL DEFAULT 0,
  convergence_events INTEGER NOT NULL DEFAULT 0,
  gap_days INTEGER NOT NULL DEFAULT 0,   -- 직전 스냅샷과의 간격 (1이 정상)
  healthy INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  created_at TEXT NOT NULL
);
