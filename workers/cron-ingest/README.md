# Cloudflare Cron Ingest (FIRMS + GDELT + news/AIS/ADS-B/tunnels warm → D1)

Next.js `src/workers/`(브라우저 Web Worker)와 분리해 **`workers/cron-ingest/`** 에 둡니다.

## 구성

| 파일 | 역할 |
|------|------|
| `../../wrangler.ingest.toml` | Worker 이름, D1 바인딩, Cron `*/10 * * * *` |
| `../../drizzle/*.sql` | D1 마이그레이션 (`migrations_dir`) |
| `src/index.ts` | Cron + `GET /health` · `GET /latest` · `POST /run` |
| `src/firms.ts` | NASA FIRMS area CSV (전장 bbox) |
| `src/gdeltExport.ts` | GDELT 15분 Export — 우크라이나·중동·중국-대만·한반도의 부정적 CAMEO 긴장 이벤트를 직접 추출 |

## 최초 세팅

```bash
# 1) 스키마 적용 (원격 D1) — ais_vessels / adsb_aircraft / submarine_tunnels 포함
npm run cf:d1:migrate:remote

# 2) FIRMS 키
npx wrangler secret put NASA_FIRMS_API_KEY -c wrangler.ingest.toml

# 3) (선택) 수동 트리거 보호
npx wrangler secret put INGEST_CRON_SECRET -c wrangler.ingest.toml

# 4) Next 앱 워밍 URL (앱 배포 URL 기준)
npx wrangler secret put NEWS_WARM_URL -c wrangler.ingest.toml
# 예: https://your-app.example/api/news-stream/warm

npx wrangler secret put VIDEO_NEWS_WARM_URL -c wrangler.ingest.toml
# 예: https://your-app.example/api/video-news/warm

npx wrangler secret put AIS_WARM_URL -c wrangler.ingest.toml
# 예: https://your-app.example/api/ais/warm

npx wrangler secret put ADSB_WARM_URL -c wrangler.ingest.toml
# 예: https://your-app.example/api/adsb/warm

npx wrangler secret put TUNNELS_WARM_URL -c wrangler.ingest.toml
# 예: https://your-app.example/api/submarine-tunnels/warm

# 5) 배포
npm run cf:ingest:deploy
```

로컬:

```bash
cp .dev.vars.example .dev.vars
# NASA_FIRMS_API_KEY=...
# NEWS_WARM_URL / AIS_WARM_URL / ADSB_WARM_URL / TUNNELS_WARM_URL = http://127.0.0.1:3000/api/.../warm

npm run cf:d1:migrate:local
npm run cf:ingest:dev
# curl http://127.0.0.1:8787/run
```

## Cron

- 표현식: `*/10 * * * *` (10분마다)
- FIRMS + GDELT → D1 upsert → prune
  - 우크라이나·중동·중국-대만·한반도 일반 뉴스
  - 같은 4개 권역의 군사훈련·봉쇄·억지·제재·미사일 등 긴장 신호
- 설정된 Warm URL로 Next에 POST:
  - 뉴스 RSS 스냅샷
  - MarineTraffic AIS → `ais_vessels`
  - ADS-B mil + civ 허브 → `adsb_aircraft`
  - 해저터널 시드 보장 → `submarine_tunnels`
  - 분쟁·이란 전선 hatch → `dispute_hatch_paths`
  - 우크라 전선 hatch → `ukraine_control_paths` (VIINA 캐시 필요)

## Next 앱 연동 (유저 토글 = 클라우드 로그 꺼내기)

| 레이어 | API | D1 테이블 |
|--------|-----|-----------|
| FIRMS | `/api/firms-fires` | `firms_fires` |
| GDELT | `/api/gdelt` | `gdelt_points` |
| News | `/api/news-stream` | `news_stream_*` |
| Video news | `/api/video-news` | `video_news_snapshots` |
| AIS | `/api/ais` | `ais_vessels` |
| ADS-B mil | `/api/adsb-mil` | `adsb_aircraft` (mode=mil) |
| ADS-B civ | `/api/adsb-traffic` | `adsb_aircraft` (mode=civ) |
| 해저터널 | `/api/submarine-tunnels` | `submarine_tunnels` |
| 분쟁·이란 전선 | `/api/render/dispute-paths` | `dispute_hatch_paths` |
| 우크라 전선 | `/api/render/ukraine-control-paths` | `ukraine_control_paths` |
| DeepState 점령 좌표 (임시) | `/api/deepstate/frontlines` | `deepstate_occupied_snapshots` |

공통: D1 우선, 레이어 OFF면 클라가 fetch하지 않음. 전선은 **초단위 라이브가 아니라 주기 스냅샷**.

### 전선 hatch warm

```bash
npx wrangler secret put DISPUTE_HATCH_WARM_URL -c wrangler.ingest.toml
# 예: https://your-app/api/render/dispute-paths?lod=overview

npx wrangler secret put UKRAINE_HATCH_WARM_URL -c wrangler.ingest.toml
# 예: https://your-app/api/render/ukraine-control-paths?lod=overview
# (앱 서버에 VIINA 캐시가 있을 때만 재빌드 성공)

npx wrangler secret put DEEPSTATE_SYNC_URL -c wrangler.ingest.toml
# 예: https://your-app/api/deepstate/sync
# 3일 좌표 스냅샷. Next 라우트가 TTL로 스로틀한다 (LIVEUAMAP 전 임시).
```

로컬 빌드:

```bash
npm run dispute:hatch:build          # 이란·중동 포함 disputes → D1
npm run viina:build && npm run ukraine:hatch:build
```

헬스: Worker `GET /latest` — https://conflict-view-ingest.kangps7675.workers.dev/latest
