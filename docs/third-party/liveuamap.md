# Liveuamap (third-party) — 전선 속보 · 통제면

> 상태: **서버 ingest 전용.** 클라는 `GET /api/liveuamap` 캐시를 읽고,
> 관측 폴링 중 서버가 **UA minInterval(15분)·일 예산**을 존중해 mpts warm한다.
> Cron `POST /api/liveuamap/sync`도 동일 ingest. Attribution: Liveuamap.
> API 키는 `LIVEUAMAP_API_KEY`(NEXT_PUBLIC 금지).

## 제품 용도

| 레이어 | 경로 | 비고 |
|--------|------|------|
| 전선 속보 이벤트 | 메모리 store 48h · Cesium 핀 · 쪽지/독/양피지 | KO=`titleKo`/`bodyKo` (sync 시 번역) |
| 통제·점령 폴리곤 | mpts Polygon → D1 `liveua-{region}` | **본선.** Cesium always-on (UA/IR/YE/LB). 빈 배열이면 면 OFF |
| 우크라 폴백 | DeepState 3일 스냅샷 | MapLibre만. Cesium은 `liveuaOnly` (DeepState 금지) |

## 예산

일 `LIVEUAMAP_DAILY_BUDGET`(기본 200). 슬롯: UA96(15분) · Iran48 · YE24 · LB16 · IL-PS12 · TW4 · KR4.
내장 resid: Ukraine=`0`, Lebanon=`74`, IL/PS=`2`. Iran·Yemen은 `LIVEUAMAP_RESID_MAP`.
동일 resid는 sync 시 HTTP 1회만 쓰고, 통제면은 지역 bbox로 걸러 저장한다.
Point 기사 1건 = Cesium 양피지 1장 (`LiveuaFlashParchment` index).

## 로컬 next dev · D1

`CLOUDFLARE_*` D1 HTTP 자격 증명이 있으면 next dev는 **원격 D1을 우선**한다.
(로컬 OpenNext/wrangler 바인딩에 `deepstate_occupied_snapshots` 마이그레이션이 없으면
통제면 쿼리가 실패해 Cesium 면이 비었다.)

## 상업·면책

- **상업 이용 가능** (Liveuamap About/ToS): data·map tiles·area polygons를 작업에 쓸 수 있으며 **liveuamap.com 참조(attribution)** 필요. 엔터프라이즈/유료 API로 기존·신규 소프트웨어 통합을 명시.
- 서버만 `LIVEUAMAP_API_KEY`로 호출 (브라우저 노출 금지). UI·출처 패널·지도 바에 **Liveuamap / liveuamap.com** 표기 (`PRIMARY_LIVE_SOURCES`, Cesium 크레딧).
- 이벤트에 붙은 3rd-party 사진·원문 텍스트는 **원 소셜/매체 ToS** (`source` 링크) — LiveUA 허용과 별개.
- 통제면은 **대략 지오코딩** — OSINT·근사 고지 유지.
- `sourceCatalog` `liveuamap-*` → `commercialUse: "allowed"`. DeepState 폴백은 여전히 `license-required`.

## 관련 코드

- `src/lib/liveuamap/*` · `src/app/api/liveuamap/*`
- Cron: `workers/cron-ingest` `LIVEUAMAP_SYNC_URL`
- UI: `LiveuaFlashToast` / `LiveuaFlashDock` / `LiveuaFlashParchment` · Cesium `liveuaPins` + `controlGeoJson`
