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

- Liveuamap 약관·API 키 조건을 준수. 서버 프록시만 사용하고 브라우저에 키를 넣지 않는다.
- 통제면은 **대략 지오코딩** — UI에 OSINT·근사 고지 유지 (`sourceCatalog` `liveuamap-*`).
- `commercialUse`는 계약 확인 전까지 `license-required` / `unknown`으로 둔다.

## 관련 코드

- `src/lib/liveuamap/*` · `src/app/api/liveuamap/*`
- Cron: `workers/cron-ingest` `LIVEUAMAP_SYNC_URL`
- UI: `LiveuaFlashToast` / `LiveuaFlashDock` / `LiveuaFlashParchment` · Cesium `liveuaPins` + `controlGeoJson`
