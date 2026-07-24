# Vercel CDN 캐시 · Workers 미러 fs→R2 체크리스트

본진 UI: **Vercel** (`confilct-view.vercel.app`)  
클라우드: **ingest Worker + D1 + R2**  
Workers 앱(`confilct-view.*.workers.dev`)은 미러/실험 — 본진 아님.

## A. Vercel Cache-Control (`s-maxage`)

헬퍼: `src/lib/httpCacheHeaders.ts` (`CDN_CACHE` 프리셋).

| 라우트 | 권장 | 비고 |
|--------|------|------|
| `/api/firms-fires` | firms 90s | D1/ingest hit만 CDN; `waiting`·에러는 no-store |
| `/api/gdelt` | gdelt 300s | stub/빈 이벤트는 짧게 |
| `/api/ais` | ais 30s | `waiting`·live provider는 no-store |
| `/api/adsb-mil` · `adsb-traffic` | adsb 25s | |
| `/api/telegram-alerts` | telegram 12s | |
| `/api/tzeva-adom` | tzeva 8s | |
| `/api/stock-tickers` | stock 300s | |
| `/api/world-stats/*` | worldStats 600s | |
| `/api/briefing-stats` · `daily-prompt` | briefing / dailyPrompt | |
| `/api/us-carriers` · `submarine-tunnels` | carriers / tunnels | |
| `/api/layers/*` (정적) | staticLayer | |
| `/api/newfeeds-*` | newfeeds | |
| 이미 있음 | daily-ranks, daily-predict/stats, hapi, news-stream, video-news, mediazona | |
| 캐시 금지 | track, push, predict POST, claude/*, warm, viina-session, render/* private | |

`caches.default`는 **Workers 전용** — Vercel Node 라우트에 넣지 말 것.

## B. Workers 미러용 fs → R2/CDN 잔여

미러를 본진으로 쓰기 전에 아래를 R2/fetch 우선으로 바꿔야 함. Vercel만 쓰면 대부분 번들 `public/`로 동작.

| 경로 | fs 용도 | 미러 조치 |
|------|---------|-----------|
| `cloudStaticJson` / `streamPublicJson` | public/data 폴백 | CDN 있으면 OK; 없으면 R2 바인딩 |
| `/api/data-stream` | public/data | CDN 307 이미 있음 — CDN 필수 |
| `/api/sound-stream` | public/audio | CDN audio/* 우선 |
| `/api/tzeva-adom` | live/seed JSON | D1 또는 R2 live 스냅샷 |
| `/api/telegram-alerts` (+ status/ingest) | live/seed | D1 telegram 테이블 우선 (이미 일부) |
| `/api/news-digest` | live/news-digest.json | R2 또는 D1 |
| `/api/neptun` | seed JSON | R2 seed 또는 빈 응답 |
| `/api/data-sync` | status/lock 파일 | Workers에서 비활성 또는 KV |
| `/api/mediazona-casualties` | cwd 파일 | R2 |
| `viinaServerData` / hatch / dispute hatch | `private/` | **번들 금지** — R2 private 또는 빌드 시 업로드 |
| `telegramEmbedScrape` | live + state 파일 | D1/KV |
| `apiStub` seed 읽기 | public seed | stub OFF면 무관 |

`private/viina-render` · `private/overlay-cache`는 Vercel에도 **배포 아티팩트에 없으면** 404 — hatch 빌드 산출물을 배포 파이프라인에 넣거나 R2에 올려야 함.
