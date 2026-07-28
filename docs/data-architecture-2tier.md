# 데이터 아키텍처 — 2층 (가드 유지)

> **한 줄:** 집을 **2층으로 리모델링**해도, 렉 막는 **기둥(가드)은 절대 부수지 않는다.**  
> 관련: `liveRenderGuard.ts` · `layerExclusiveCap` · `workers/cron-ingest` · `docs/cloudflare-deploy.md`

---

## 1. 목표 구조 (2층)

| 층 | 별명 | 넣는 것 | 기술 |
|----|------|---------|------|
| **1층** | 클라우드 창고 | 지도·국경·전선 빗금·정적 JSON·오디오 | R2(CDN) · D1(cron 스냅샷) |
| **2층** | 실시간 빨대 | 뉴스 · Telegram · NEPTUN · (토글 시) AIS/ADS-B 등 | 앱 API 폴링 · ingest warm |

유저 브라우저는 **창고에서 읽고**, 당장 변하는 것만 **빨대로 천천히** 가져온다.

동영상 뉴스는 본 RSS와 **분리**된 스냅샷(`video_news_snapshots`)이며, **공신력 채널의 현실(지정학·지경학) 영상만** 폴링한다. 메타만 warm→D1, 재생은 클릭 시 embed. 반서방 충돌사 다큐는 스토리 큐레이션이며 폴링하지 않는다.

---

## 2. 예전에 헷갈리던 “3갈래”는?

| 옛 말 | 지금 위치 |
|-------|-----------|
| `lite` / `full` | **1층 안 해상도 옵션** (저사양 vs 고해상도). 별도 “층”이 아님 |
| `live/` · stub 시드 | 개발·폴백용. 프로덕션 목표는 D1/R2 |
| 뉴스 Tier1/2/3 | **매체 신뢰도 UI** — 데이터 계층과 무관 |

**리모델링 = 경로를 2층으로 단순화.** lite 폴더를 당장 삭제하라는 뜻이 아님.

---

## 3. 절대 부수지 말 기둥

### 기둥 1 — `liveRenderGuard` (실시간 브레이크)

- stub OFF일수록 폴링을 **더 느리게** (예: Telegram 30s, FIRMS 5분).
- 1초마다 전 세계 피드를 받지 않는다.

### 기둥 2 — 레이어 기본 OFF + 동시 ON 상한

- `layerPrefs` · `layerExclusiveCap` (UI 동시 ON: 일반 30 / Ultra-Lite 16) · 패키지 hard cap 64 (`viewPackages`).
- 입장 시 전 레이어 ON 금지.

### 기둥 3 — D1/R2 미리 채우기 (서버 짬통)

- Cron ingest → D1. 정적 대용량 → R2.
- 요청마다 NASA/외부 API를 직접 두드리지 않는다 (실패 폴백만).

### 그 외 (그대로)

- 뷰포트 LOD · `cameraBusyGuard` · gzip + JSON worker.

---

## 4. stub OFF 체크리스트

상세: [stub-off-checklist.md](./stub-off-checklist.md)

stub를 끄기 **전에**:

1. [ ] `cf:d1:migrate:remote` + ingest cron이 행을 쌓는지 (`/latest`)
2. [ ] R2 Enable + `cf:r2:upload` + `NEXT_PUBLIC_DATA_CDN` (권장)
3. [ ] `liveRenderGuard` / 레이어 cap **삭제·완화하지 않음**
4. [ ] D1 miss 시 외부 API 폴백이 `?live=1`로만 열림 (FIRMS/GDELT/AIS/ADS-B)

그다음 `API_STUB_MODE=false`.

---

## 5. 공사 순서 (권장)

1. R2에 `lite`(기본) + 필요 시 `full` 업로드 · CDN 연결  
2. D1 cron 안정화 (FIRMS/GDELT/warm)  
3. 앱은 창고 우선 · 폴링은 가드 간격만  
4. stub OFF 검증 (저사양 PC + Ultra-Lite)  
5. (후순위) 로컬 `public/data` 중복·시드 정리

---

## 6. 비목표

- 가드 제거로 “더 실시간” 보이기  
- stub OFF + full + 전 레이어 ON 동시  
- 요청 경로에서 ZIP/대용량 GDELT 직접 파싱
