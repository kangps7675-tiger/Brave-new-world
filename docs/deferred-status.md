# 문서 vs 코드 · 미완 / 레거시 (정본 안내)

> **리뷰·문서 작성 시 코드가 우선.** 숫자·플래그가 문서와 다르면 아래 파일을 연다.

---

## 브랜드 · 긴장 기축

| 약자 | 의미 | 정본 |
|------|------|------|
| **GTI** | Global Tension Index (글로벌 긴장지수) — UI 티커 | `src/lib/gti.ts` |
| **GTS** | Global Tension Score (0–100 점수, 동일 기축) | 동일 |
| ~~WTI~~ (긴장) | 구 브랜드 — **원유 WTI와 혼동** → GTI로 교체됨 | `@/lib/wti`는 `@/lib/gti` re-export만 |

원유 `CL=F` 라벨의 「WTI 원유」는 그대로 둔다.

---

## 레이어 캡 (정본)

| 구분 | 값 | 파일 |
|------|-----|------|
| UI 동시 ON (일반) | **30** | `src/lib/layerExclusiveCap.ts` → `ACTIVE_LAYER_CAP_DEFAULT` |
| UI 동시 ON (Ultra-Lite) | **16** | 동일 → `ACTIVE_LAYER_CAP_ULTRA` |
| 패키지 hard cap (GEOINT / FININT) | **64** / **64** | `src/lib/viewPackages.ts` → `MAX_ON_LAYERS*` |

구 문서의 「무제한 / UL 12」·「일반 5 / UL 3」·「hard 11–12」는 **폐기**. stub OFF 절차: [`stub-off-checklist.md`](./stub-off-checklist.md).

---

## stub OFF 전제

1. Cron → D1 채움 (`/latest`에서 firms/gdelt 등 행 확인)
2. Warm URL secrets (뉴스/AIS/ADS-B/터널) — **미설정 시 해당 테이블 공백 가능**
3. (권장) R2 CDN
4. env: `API_STUB_MODE=false` · `NEXT_PUBLIC_API_STUB_MODE=false`

`liveRenderGuard` 코드는 삭제·완화하지 않는다.

---

## 패키지 · 부트 UI

| 항목 | 현행 |
|------|------|
| 지정학 기본 | `frontline-live` (`CONFLICT_VIEWER_PACKAGE`) |
| `conflict-watch` | 레거시 패키지 정의 유지 · 활성 기본 아님 |
| ModePicker | `shouldShowModePicker(): false` — 세부 전장 부트 UI 비활성 |

---

## 로드맵 · 추후 (의도적 미구현)

| 영역 | 상태 | 참고 |
|------|------|------|
| 시장 HUD 전일대비 통일 | **반영됨** | BDRY·티커 |
| 시장 해석 깊이 (딥링크·브리프) vs 복잡도 | **다음** | 합산 점수 금지 · 카드/딥링크만 검토 |
| 오버레이 큐 | **반영됨** | `overlayQueue.ts` 공습 > 해상 > 긴장컷 > 핫전장 > 코치 > Ultra-Lite |
| 첫 90초 · 소리 기본 OFF | **반영됨** | `DEFAULT_SOUND_ENABLED` + `useSoundEnabled`/`useSoundStream` 초기값 동기 |
| 첫 90초 · 언어 자동 감지 | **반영됨** (게이트 유지) | `detectDefaultLabelLanguage` · EN i18n(P1-5) 전 `LanguageGate` 제거 금지 |
| 첫 90초 · Ultra-Lite FPS 제안 | **반영됨** | `useUltraLiteAutoOffer` · `UltraLiteOfferBanner` · `enabled←globeReady` |
| P0-1 온보딩 예산제 | **반영됨** | `onboardingBudget.ts` · 넛지 8종 배선 · 테스트는 vitest에 localStorage 스텁 필요 |
| P0-4 소리 기본 OFF | **반영됨** | `DEFAULT_SOUND_ENABLED = false` |
| P0-5 개발 노트 삭제 | **반영됨** | `LayerPanelHost` 노출 문구 제거 (주석만 잔존) |
| P0-6 reduced-motion | **반영됨** | `useReducedMotion` · `verify:reduced-motion` |
| P0-7 캡 피드백 | **반영됨** | `emitLayerCapRejected` · `LayerCapToast` OverlayHost 마운트 |
| P0-2/3 첫 90초 | **반영됨** | `useFirstImpressionController` · `GtiHeroMoment` · 게이트→도메인만 · 가치제안 문구 |
| globals.css 인코딩 | **반영됨** | `???` 주석 0건 |
| 진입 퍼널 KPI 계측 | **미착수** | `trackEvent`만 있음 |
| 스펙 SSOT 검증 | **반영됨** | `npm run verify:product-spec` |
| 전장→심볼 · Yahoo 딥링크 · watchlist | P0 구현 | `theaterAssets` · `IntelRelatedMarketsPanel` |
| TradingView **심볼 URL** | 헬퍼 + UI 링크 | `tradingViewSymbolUrl` — **임베드·위젯 미구현** |
| 국내 증권/토스 딥링크 | 미구현 | [`retention-markets-roadmap.md`](./retention-markets-roadmap.md) |
| 일일 “오늘 핫한 곳” cron UX | 부분(규칙 브리핑) · 전용 cron UX 미완 | 동일 |
| LLM 뉴스 digest 배치 | 스캐폴딩만 | [`llm-news-digest.md`](./llm-news-digest.md) |
| Living conflict JSON override | 시드(+D1)만 · override stub | `livingConflict.ts` `loadLivingConflictWithOverrides` |
| 훈련 ingest 관영 화이트리스트 | 추후 | `exerciseIngest.ts` · [`exercise-alerts.md`](./exercise-alerts.md) |
| 예측 deviceId → 로그인 연동 | 추후 | `predictionDeviceId.ts` · guestPolicy 키만 예고 |

---

## 환경 변수 템플릿

| 파일 | 용도 |
|------|------|
| [`.env.example`](../.env.example) | 루트 안내 (복사 대상 아님) |
| [`.env.local.example`](../.env.local.example) | Next.js → `.env.local` |
| [`.dev.vars.example`](../.dev.vars.example) | Wrangler → `.dev.vars` |

단일 통합 `.env` 예시는 두지 않는다 (Next + Workers 분리).

---

## IRONSIGHT/

저장소 내 `IRONSIGHT/`는 **별도 서브프로젝트** (`IRONSIGHT/TODO.md`).  
본 앱(멋진 신세계 / geowatch) 핵심 경로와 분리. Telegram 채널 카탈로그만 MIT로 인용한다 (`licensing/ironsight`).
