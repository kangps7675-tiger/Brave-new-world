-- 뉴스에서 뽑은 "맞은 배 이름" 후보와 AIS 위치 검증 결과.
-- 적재: workers/cron-ingest/src/strikeNames.ts (5분 크론). 읽기: src/lib/strikeMatch/server.ts (verified 만 선명 일치에 쓴다).
-- 선행: 0037_datalastic_usage, 0038_strike_snapshot

CREATE TABLE IF NOT EXISTS strike_news_poll (
  incident_id TEXT PRIMARY KEY,
  tries INTEGER NOT NULL DEFAULT 0,
  last_try TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strike_named (
  incident_id TEXT NOT NULL,           -- ukmto_incidents.id
  name_key TEXT NOT NULL,              -- 정규화한 선명 (M/V·기호 제거, 대문자)
  name TEXT NOT NULL,                  -- 기사 표기
  imo TEXT,                            -- 기사에 IMO 가 있었고 체크섬이 맞을 때만
  outlets INTEGER NOT NULL DEFAULT 1,  -- 같은 이름을 낸 서로 다른 매체 수
  sources TEXT NOT NULL DEFAULT '[]',  -- [{url,outlet,headline,publishedAt}] 최대 3 — 원문은 저장하지 않는다
  status TEXT NOT NULL DEFAULT 'new',  -- new | verified | rejected | unresolved
  mmsi TEXT,
  dist_km REAL,                        -- 사건 시각 추정 위치와 사건 지점 거리
  offset_min INTEGER,                  -- 위치 표본과 사건 시각 차이
  tries INTEGER NOT NULL DEFAULT 0,
  checked_at TEXT,
  note TEXT,
  PRIMARY KEY (incident_id, name_key)
);
