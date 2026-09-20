# Globe Episode + History DB Design

**Date:** 2026-09-19  
**Status:** Validated (brainstorming)  
**Product:** Brave New World (멋진 신세계) — Korea-first **지정학 + 지경학** explainer

---

## 1. Product identity

**One formula, two domains.** Domain Gate(지정학 / 지경학) already exists in the product; this plan **wires the same episode + history + Korea lens into both**, instead of treating economy as a leftover layer panel.

Flow (both domains):

```
news (today) → history DB (why) → episode (animated understanding) → korea_closing
```

Three product pieces:

1. **Episodes** — globe animation + sidebar step narration (core experience)
2. **History DB** — event graph (moat) — shared store, domain-tagged
3. **News geotagging** — intake → match nodes → surface related episode/insight

**MVP out (not built now):** CCTV grids, RECON/port-scan toolkit, 40-layer dashboard as the product face.  
**Ads:** not Liveuamap-style on the explainer. If ads ever appear: list / post-complete / optional 지정학 tools chrome only — **never inside episode steps, deepen, or 역사 timeline**. B2B embeds = ad-free.

**Deferred — long-term:** prediction games, futures-style insights, Polymarket-type markets (after core ships).

**Layer ambition:** **중상+** — episode stage kits on 지정학/지경학; **역사 토글만** Cliopatria timeline fills; FIRMS stays where it already lives (not history-only).

**Editorial lens:** **한국 원툴** — every issue/episode (conflict *or* econ) must show Korea impact or it is out.

**Top chrome = 3 toggles:**

| # | Toggle | What loads |
|---|--------|------------|
| 1 | **역사** | Context · today’s link · episode deepen · **Cliopatria year fills only here** |
| 2 | **라이브** (`satellite`) | Cesium · LIVEUAMAP 전전선 ingest · **S급 고충격만** 양피지 타전 · ADS-B/AIS prefs · 시세 |
| 3 | **지경학** | Economy realtime + econ episodes / kits |

지정학(전선 MapLibre)은 상단에서 빠지고 라이브·역사「오늘 링크」·인텔 시트로 이어 간다. **주간 함선 라이브(하단 독)는 삭제.**

Ant적(live air) prefs may still nest under 라이브 tools; not a fourth top toggle.

---

## 1b. Dual domain — how the plan maps

| | **지정학 (Conflict)** | **지경학 (Economy)** |
|--|----------------------|----------------------|
| Question | 누가·어디서·왜 싸우고 긴장하나 | 뭐가 막히고·비싸고·공급이 흔들리나 |
| History Root | 갈등 계보 · 근원 종점 · NG | **제도·충격·초크 계보** (예: 운하·제재 라운드·산업정책) · 근원 · NG |
| Episode feel | 전선·동맹·긴장 존 | 항로·초크·에너지·칩·물류 |
| `korea_closing` | 안보·동맹·방산·시장 반응 | 수출·운임·유가·반도체·환율/지수 감각 |
| Default toggle | **지정학** | **지경학** |
| Shared | Same JSON engine; **역사** toggle for timeline + Cliopatria (not mixed into C/E fills) | |

Cross-links allowed: a Conflict episode may end on a market beat; an Economy episode may `rooted_in` a security event. Nodes carry `domains[]`: `conflict` | `economy` | both.

**Do not** maintain two separate products — one graph, one engine, two entry lenses.

---

## 2. Moat

| Asset | Moat strength |
|-------|----------------|
| Globe UI / animation shell | Weak (copyable) |
| Episode count alone | None (AI-era) |
| **History relation graph + origin/NG (both domains)** | **Primary moat** |
| Trust brand (cross-check, corrections) | Secondary |
| School / press embed lock-in | Later lock |

AI may draft; humans **accept/reject nodes, wire edges, set origin + NG**.

---

## 3. History DB model

### 3.1 Layers

| Layer | Role | Density |
|-------|------|---------|
| **Focal** | Recent events for news match + main episode path | Majority of seed |
| **Root** | Genealogy of **this issue** (conflict *or* econ shock), not encyclopedia | Sparse; depth unbounded |

All theaters / corridors. Roots are **issue-scoped**.

### 3.2 Issue (사안)

- `domains[]`: `conflict` | `economy`
- Focal path, `rooted_in` chain
- `origin_node_id` + `ng_rules[]` (time / topic / misuse)
- Origin research + NG always paired

### 3.3 Node

- `id`, `title`, `date_start`, `date_end`
- `layer`: `focal` | `root`
- `domains[]`
- `locations[]`, `actors[]`
- `type` (conflict, sanction, shipping, diplomacy, trade_regime, energy_shock, industrial_policy, …)
- `summary`, `sources[]`, `issue_ids[]`
- `korea_impact` (**required** for MVP episode nodes)

### 3.4 Edges

- `cause` / `follows` · `rooted_in` (same issue) · `similar`
- Optional later: `spills_to` (conflict → econ or reverse) for cross-domain hints

### 3.5 Seed scope (MVP)

- ~**50 events** covering the MVP issues below (both domains represented)
- Ukraine etc.: later, still Korea-lens

---

## 4. Episode engine

Same for both domains — JSON scripts, not one-off code.

```
episode:
  id, issue_id, title
  domains[]: conflict | economy
  korea_closing: string   # required
  steps[]:
    - id, title, body, refs[]
    - camera, layers[], arrows[]
    - node_id
    - deeper_node_id?
```

**Deepen UX = C:** per-step “한 단계 더 깊이” (one hop); origin shows NG line.  
**Copyright:** own summaries + source links only; no article reprint; Telegram → LLM policy unchanged.

---

## 5. MVP episode slate (dual-domain)

First shippable URL: **3 episodes**, each tagged; together they cover both lenses.

| # | Issue | Primary domain | Also serves | Korea angle |
|---|--------|----------------|-------------|-------------|
| 1 | Korean Peninsula | **Conflict** | Market closing | Direct security + markets |
| 2 | Taiwan Strait | **Both** | Chip/supply | Semiconductors, US–China, trade |
| 3 | Red Sea / Houthis | **Economy** | Security root | Export shipping, freight, schedules |

**Next (post-MVP):** Ukraine (conflict+energy); dedicated econ issues (e.g. Hormuz/oil, CHIPS/IRA-style industrial policy) as Economy-primary episodes.

Domain Gate: Conflict home surfaces #1–2 first; Economy home surfaces #2–3 first; same underlying episodes.

---

## 6. Layer kit — 중상+

### 6.1 Relationship

```
History graph → why
Episode engine → understand
Layer kit → see it
korea_closing → Korea so-what
```

Default entry = episode (by domain), not layer playground.

### 6.2 Tier

| Tier | Us |
|------|-----|
| **중상+** | C/E episode kits + **역사** Cliopatria scrubber + FIRMS | **Target** |
| Full GEV/Osiris as product face | **Out** |

### 6.3 References (steal wiring only)

| Source | Wire into |
|--------|-----------|
| WarWatch market beat | `korea_closing` (esp. Economy episodes) |
| God's Eye share / camera / credits | scene URL · step camera · attribution |
| Osiris progressive load / chokepoints | step `layers[]` fetch · Red Sea kit |

### 6.4 Kits by episode

| Episode | Kit highlight | Primary toggle |
|---------|----------------|----------------|
| Peninsula (C) | War/tension zones, blocs, ROK/US bases context, curated pins | 지정학 (+ 역사 for deepen/timeline) |
| Taiwan (C+E) | Strait, lanes, ports/critical nodes, cables (step-limited), chip points | 지정학 / 지경학 |
| Red Sea (E) | Chokepoints, shipping lanes, logistics risk, ports | 지경학 |

**Keep:** FIRMS on live conflict/econ views as today.  
**Air traffic / satellite:** optional tools **under 지정학**, not a 4th top toggle.  
**Out of MVP:** CCTV, RECON, NEPTUN always-on, Palantir positioning.

### 6.5 Step hooks

Each step may declare `layers[]` / `arrows[]` / `camera`. Engine turns them on for that step. Deepen = one hop. Credits always visible.

### 6.6 Top chrome — exactly 3 toggles

| Toggle | Loads | Does **not** load |
|--------|-------|-------------------|
| **지정학** | Conflict realtime, conflict episode kits | Cliopatria year fills |
| **역사** | Today’s link, episode/context, deepen, **Cliopatria + historical-basemaps** (+ KR overlay when ready) | C/E firehose as the face |
| **지경학** | Econ realtime, econ episode kits | Cliopatria year fills |

Default entry for “why” narrative: **역사**. Domain Gate can still land on 지정학/지경학 first for browse.

### 6.7 Worldwide historical territory (history toggle only)

| Layer | Role | Source | License |
|-------|------|--------|---------|
| **Cliopatria** | Polity fills (primary, **KR excluded**) | [Seshat Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) | CC BY 4.0 |
| **Korea overlay** | Peninsula polities / sites / battles | `korean_history_geo.geojson` (authored KR pipeline) | **mixed per-feature** (CC BY clips, GPL fragments, authored) — see `korea/CREDITS.md` |
| **historical-basemaps** | Cultural / colonial basemap + `BORDERPRECISION` | [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps) | **GPL-3.0** |
| Wikidata | Metadata links on Cliopatria / KR features | [Wikidata](https://www.wikidata.org/) | CC0 structured |
| OHM (live vtiles) | Historic OSM roads/places/detail | [OpenHistoricalMap](https://www.openhistoricalmap.org/) vtiles + [maplibre-gl-dates](https://github.com/OpenHistoricalMap/maplibre-gl-dates) | ODbL-style DB; always attribute |

**Build:**
- `npm run historical:cliopatria:build`
- `npm run historical:basemaps:build`
- `npm run historical:ohm:build` (config only — **no planet download**)
- `npm run historical:korea:build` (`--source=` optional; defaults to `public/data/historical/korea/korean_history_geo.geojson`)
- or `npm run historical:build` for all four

**OHM notes:**
- Tiles: `https://vtiles.openhistoricalmap.org/maps/ohm/{z}/{x}/{y}.pbf`
- Style: `https://www.openhistoricalmap.org/map-styles/main/main.json`
- Scrubber year → `filterByDate` via `@openhistoricalmap/maplibre-gl-dates` (`src/lib/historical/ohmConfig.ts`)
- Planet S3 dumps often Glacier — **do not mirror into git**; live vtiles only
- Mount: **역사 토글 only**, under Cliopatria/basemaps as detail

**Cross-check (basemaps vs Cliopatria):**
- Name-normalized overlap report → `basemaps/crosscheck-vs-cliopatria.json`
- Modern years (~1880+) overlap ~0.45–0.71 (ontology differs; not auto-“wrong”)
- Known upstream issues tracked in build (`issues/52` Turkey 1930/1938 — **verified fixed** in current upstream: Republic of Turkey present, 1938 not fragmented)
- `issues/47` Umayyad/Abbasid — caution + blur via `borderPrecision`; prefer Cliopatria fills when both on
- Pre-1648: fuzzy expected (basemaps README)

**Korea:** excluded from Cliopatria / worldwide basemaps builds; **owned by Korea overlay** (`public/data/historical/korea/`, same scrubber years). Paint via `selectKoreaTerritoryFeatures` — prefer textbook / `*-final` / main over min/max stacks. **Balhae peak** uses `bh-ext-830-textbook` (Liaodong + **Primorye mid-coast** / Olga; south-only `bh-ext-830-final` is secondary). Chinese/neighbor context paints when `uiDefault` (e.g. Tang holding Liaodong eras).  
**Mount:** **역사 토글 only** — never paint while 지정학/지경학 active.  
**Stack paint order:** Cliopatria fill → Korea overlay → optional basemaps → OHM detail.  
**GPL note:** basemaps GeoJSON + any KR features tagged GPL redistributed with LICENSE; do not strip GPL obligations.

#### Playback pacing (배경 스크러버 / autoplay)

**Rule:** calendar-even from antiquity → present; **modern slightly boosted** (international-affairs product). Snapshot count ≠ screen time.

| Band | Calendar | Background playtime share |
|------|----------|---------------------------|
| Pre-modern (−3000 → 1900) | ~97.5% of span | **~78%** — still calendar-linear *inside* the band (고대 not crushed) |
| Modern (1900 → now) | ~2.5% of span | **~22%** (“조금 더”; not 40%+ snapshot density) |

- Implement: `src/lib/historical/historyPlayback.ts` (`yearToPlaybackT` / `playbackSegmentWeights`)
- Autoplay dwell between snapshots ∝ ΔplaybackT (sparse ancient gaps hold longer)
- **Issue clips** (today’s news → related origin/NG years): **separate track** — not bound by this curve
- Do **not** rebalance by deleting modern snapshots; warp the scrubber/playhead only

---

## 7. News geotagging

Place vs actor-seat; confidence score; low → country-level.  
Match → episode in **either** domain. One pipeline for MVP.

---

## 8. Recycle vs freeze

**Keep:** diplomacy episode drafts, parchment briefs, CLAIMS, lantern, GDELT; existing conflict + econ overlays that fit kits.

**Defer:** prediction · futures · Polymarket.  
**Freeze now:** NEPTUN always-on toy, 40-layer-as-home, CCTV/RECON.  
**In:** 3 top toggles (지정학 / 역사 / 지경학); FIRMS; Cliopatria on **역사 only**.  
**Air/satellite:** demote from top-4; optional under 지정학.

---

## 9. Monetization — users vs buyers

### Users (acquisition — free)

| Persona | Domain pull |
|---------|-------------|
| Cross-checkers | Both — sources, origin/NG |
| Novice investors | **Economy-primary** + conflict closings |
| Geopolitics-curious | **Conflict-primary** + deepen |

No Liveuamap-style ad pressure on the explainer path.

### Buyers (revenue — 1st)

| Priority | Who | What | Domain pitch |
|----------|-----|------|--------------|
| 1 | Schools / hagwon / uni | Episode packs / seat license | 지정학·지경학 교양 세트 |
| 1′ | Press / media | Embed / shared scene | 기사에 넣는 해설 위젯 |
| 2 | Consumer PRO (later) | Archive, deepen, alerts, ad-free chrome | After completion metrics |
| 3 | Prediction/Polymarket (long-term) | Separate paid layer | Backlog |

**4-week gates:** completion ≥40%; ≥1 institutional meeting from ~10 outreach.

---

## 10. MVP definition (ship)

1. Episode engine — camera, layers[], deepen, share URL, `domains[]`
2. Episodes ×3 (Peninsula, Taiwan, Red Sea) covering **Conflict + Economy** lenses + `korea_closing`
3. History DB + ~50 nodes (origin + NG) for those issues
4. News tagging ×1
5. Credits / attribution
6. **Top chrome = 3 toggles** (지정학 / 역사 / 지경학); FIRMS retained; air/sat not top-level
7. Domain Gate routes browse to 지정학 or 지경학; **왜/타임라인 = 역사**
8. **History layers on 역사 only:** Cliopatria + **Korea overlay** + historical-basemaps + **OHM live vtiles** (date-filtered)
9. **History playback pacing:** calendar-even + mild modern boost (`historyPlayback.ts`); issue clips separate

---

## 11. Open for implementation plan

- Schema paths + `domains[]` on issue/node/episode
- Layer allowlists per domain kit
- Analytics: completion, deepen, domain entry, **history-toggle year scrub**
- Editorial: first 50 nodes; origin+NG for 3 issues
- B2B one-pager: “지정학·지경학 에피소드 패키지”
- Migrate UI from old toggles → 3-toggle (**역사 / 라이브 / 지경학**); 주간 함선 독 삭제

---

## Next step

Use **writing-plans** for `docs/plans/YYYY-MM-DD-globe-episode-history-db-implementation.md` when ready to build.
