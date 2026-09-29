# Liveuamap (third-party) — 전선 속보 · 통제면

> 상태: **서버 ingest 전용.** 클라는 `GET /api/liveuamap` 캐시만 읽고,
> 쿼터는 `POST /api/liveuamap/sync`(cron `LIVEUAMAP_SYNC_URL`)만 소비한다.
> Attribution: Liveuamap. API 키는 `LIVEUAMAP_API_KEY`(NEXT_PUBLIC 금지).

## 제품 용도

| 레이어 | 경로 | 비고 |
|--------|------|------|
| 전선 속보 이벤트 | 메모리 store 48h · Cesium 핀 · 쪽지/독/양피지 | KO=`titleKo`/`bodyKo` (sync 시 번역) |
| 통제·점령 폴리곤 | mpts `fields`/`kmls` → D1 `liveua-{region}` | **본선.** 빈 배열이면 면 OFF (가짜 면 금지) |
| 우크라 폴백 | DeepState 3일 스냅샷 | LiveUA 없을 때만 (`resolveUkraineOccupied`) |

## 예산

일 `LIVEUAMAP_DAILY_BUDGET`(기본 200). 슬롯: UA96 · Iran48 · YE24 · LB16 · IL-PS12 · TW4 · KR4.
`LIVEUAMAP_RESID_MAP` JSON으로 resid 확정(Ukraine=`0` 내장).

## 상업·면책

- **상업 이용 가능** (Liveuamap About/ToS): data·map tiles·area polygons를 작업에 쓸 수 있으며 **liveuamap.com 참조(attribution)** 필요. 엔터프라이즈/유료 API로 기존·신규 소프트웨어 통합을 명시.
- 서버만 `LIVEUAMAP_API_KEY`로 호출 (브라우저 노출 금지). UI·출처 패널에 Liveuamap 표기 유지.
- 이벤트에 붙은 3rd-party 사진·원문 텍스트는 **원 소셜/매체 ToS** (`source` 링크) — LiveUA 허용과 별개.
- 통제면은 **대략 지오코딩** — OSINT·근사 고지 유지.
- `sourceCatalog` `liveuamap-*` → `commercialUse: "allowed"`. DeepState 폴백은 여전히 `license-required`.

## 관련 코드

- `src/lib/liveuamap/*` · `src/app/api/liveuamap/*`
- Cron: `workers/cron-ingest` `LIVEUAMAP_SYNC_URL`
- UI: `LiveuaFlashToast` / `LiveuaFlashDock` / `LiveuaFlashParchment` · Cesium `liveuaPins` + `controlGeoJson`
