-- Global Trade Alert (GTA) — 무역정책 조치
--
-- License: CC BY 4.0 · 비상업 무료 · https://globaltradealert.org
-- API:     POST https://api.globaltradealert.org/api/v1/data/
--          Authorization: APIKey <GTA_API_KEY>
--
-- ⚠️ GTA 레코드에는 **위경도가 없다.** 관할권(UN country code) · HS 품목코드 ·
--    CPC 섹터코드뿐이다. 지구본에는 좌표점이 아니라
--    implementer 중심 → affected 중심 **호(arc)** 로 렌더한다.
--    (src/lib/gtaTradePaths.ts · briTradePaths 와 같은 패턴)
--
-- 접근 등급:
--   basic — 셀프서비스 API 키로 즉시 사용 가능
--   full  — description / source_note / 관세율 prior·new. 별도 승인 필요.
--           승인 전에는 아래 컬럼이 NULL 로 남는다 (스키마는 미리 파둔다).

CREATE TABLE IF NOT EXISTS gta_interventions (
  intervention_id      INTEGER PRIMARY KEY NOT NULL,
  state_act_id         INTEGER,
  title                TEXT NOT NULL,
  -- GTA 자체 평가. Red=유해 · Amber=불투명 · Green=자유화.
  -- 객관적 사실이 아니라 **GTA 연구진의 판단**이다. UI 에서 반드시 귀속 표기할 것.
  evaluation           TEXT NOT NULL,
  intervention_type    TEXT,
  mast_chapter         TEXT,
  mast_subchapter      TEXT,
  implementation_level TEXT,
  eligible_firm        TEXT,
  inferred_jurisdictions TEXT,
  date_announced       TEXT,
  date_published       TEXT,
  date_implemented     TEXT,
  date_removed         TEXT,
  is_in_force          INTEGER NOT NULL DEFAULT 0,
  intervention_url     TEXT,
  state_act_url        TEXT,
  -- ↓ full access 승인 시 채워진다
  description          TEXT,
  source_note          TEXT,
  is_official_source   INTEGER,
  access_level         TEXT NOT NULL DEFAULT 'basic',
  ingested_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gta_in_force
  ON gta_interventions (is_in_force, date_implemented);
CREATE INDEX IF NOT EXISTS idx_gta_eval
  ON gta_interventions (evaluation, date_announced);
CREATE INDEX IF NOT EXISTS idx_gta_announced
  ON gta_interventions (date_announced);

-- 다대다: 하나의 EU 조치가 implementer 27개국 × affected 100개국을 갖는다.
CREATE TABLE IF NOT EXISTS gta_jurisdictions (
  intervention_id INTEGER NOT NULL,
  un_code         INTEGER NOT NULL,
  iso3            TEXT NOT NULL,
  name            TEXT,
  -- implementer = 조치를 시행한 쪽 · affected = 영향을 받은 쪽
  role            TEXT NOT NULL,
  PRIMARY KEY (intervention_id, un_code, role)
);

CREATE INDEX IF NOT EXISTS idx_gta_j_iso
  ON gta_jurisdictions (iso3, role);
CREATE INDEX IF NOT EXISTS idx_gta_j_intervention
  ON gta_jurisdictions (intervention_id);

-- HS 품목 — GEM 시설 레이어와 이어붙이는 핵심 키.
--   72   철강      → gem-steel
--   2601 철광석    → gem-iron-ore
--   2523 시멘트    → gem-cement
--   27   광물연료  → gem-oil-gas-* · lng-terminals
--   28–29 화학     → gem-chemicals
CREATE TABLE IF NOT EXISTS gta_products (
  intervention_id INTEGER NOT NULL,
  hs_code         INTEGER NOT NULL,
  -- hs_code 앞 2자리. 레이어 매핑 조인 키라서 별도 컬럼으로 둔다.
  hs_chapter      INTEGER NOT NULL,
  prior_level     TEXT,
  new_level       TEXT,
  level_unit      TEXT,
  PRIMARY KEY (intervention_id, hs_code)
);

CREATE INDEX IF NOT EXISTS idx_gta_p_chapter
  ON gta_products (hs_chapter);

-- CPC 섹터 (품목보다 거친 단위 — 섹터 필터 칩용)
CREATE TABLE IF NOT EXISTS gta_sectors (
  intervention_id INTEGER NOT NULL,
  cpc_code        INTEGER NOT NULL,
  PRIMARY KEY (intervention_id, cpc_code)
);

CREATE INDEX IF NOT EXISTS idx_gta_s_cpc
  ON gta_sectors (cpc_code);

-- 수집 감사 (ingest_runs 와 같은 역할, GTA 전용)
CREATE TABLE IF NOT EXISTS gta_ingest_runs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  started_at        TEXT NOT NULL,
  finished_at       TEXT,
  access_level      TEXT,
  fetched_count     INTEGER DEFAULT 0,
  upserted_count    INTEGER DEFAULT 0,
  since_date        TEXT,
  ok                INTEGER NOT NULL DEFAULT 0,
  error             TEXT
);
