# UX · 성능 · 크로스브라우저 개선 실행 계획

**작성일:** 2026-08-06
**대상:** 멋진 신세계 (Brave New World) — Next.js 14 / MapLibre GL v5 / Cloudflare Workers
**근거 진단:** 도허티 임계(<400ms) · Laws of UX 총괄 · 브라우저별 최적화

**우선순위 축:** 사고 방지 → 체감 속도 → UX 구조
"일부 사용자에게만 완전히 깨지는데 아무도 모르는" 상태를 먼저 없애고, 그 다음 속도, 그 다음 구조를 바꾼다.

---

## 0. 한눈에 보기

| Phase | 기간 | 주제 | 대표 작업 |
|---|---|---|---|
| **P0** | 1~2일 | 사고 방지 — 무증상 장애 제거 | WebGL 폴백 · 컨텍스트 복구 · Playwright 3종 · 상한 무반응 제거 |
| **P1** | 2~3일 | 체감 속도 — 도허티 임계 | debounce 400→120 · 로딩 인위적 대기 제거 · 캐시 헤더 래퍼 · 폴링 게이트 |
| **P2** | 3~5일 | UX 구조 — Hick / Tesler / Selective Attention | 시나리오 프리셋 · 배너 예산 · 상한→자동 강등 |
| **P3** | 1주 | 구조 리팩터 · 마감 | GlobeDashboard 코드 분할 · 입장 게이트 재설계 · 스켈레톤 |

각 Phase는 독립적으로 배포 가능해야 한다. P0을 끝내지 않고 P1로 넘어가지 않는다.

---

## Phase 0 — 사고 방지 (1~2일)

> 목표: 지금 이 순간 일부 사용자가 검은 화면을 보고 있을 가능성을 0으로 만들고, 그 사실을 감지할 수 있는 장치를 만든다.

### P0-1. WebGL 미지원 폴백 — 최우선

**문제**
- `maplibre-gl` v5는 WebGL2 필수. 미지원 환경에서 지도가 아예 렌더되지 않는데 안내가 없다.
- `GlobeLoadingScreen.tsx:295` — `if (!gl) return;` 조용히 빈 캔버스.

**작업**
1. `src/lib/webglSupport.ts` 신규
   ```ts
   export type WebglSupport = "webgl2" | "webgl1" | "none";
   export function detectWebglSupport(): WebglSupport;
   ```
   `document.createElement("canvas").getContext("webgl2" | "webgl")` 순차 시도, 결과를 모듈 스코프에 캐시.
2. `GlobeBootLoader.tsx` — Dashboard import 전에 검사. `"none"`이면 `UnsupportedBrowserNotice` 렌더 후 종료.
3. `src/components/UnsupportedBrowserNotice.tsx` 신규 — 정적 세계지도 이미지(`public/assets/`) + 최신 브리핑 텍스트 + "권장 브라우저" 안내. **완전한 빈손으로 돌려보내지 않는다.**
4. `GlobeLoadingScreen.tsx` — `if (!gl)` 시 CSS 그라디언트 정적 배경으로 대체(현재는 아무것도 안 그림).

**수용 기준**
- Chrome DevTools에서 WebGL 비활성화(`chrome://flags` 또는 `--disable-gpu`) 후 접속 → 검은 화면이 아니라 안내 화면.

---

### P0-2. `webglcontextlost` 복구

**문제** 모바일 탭 전환·메모리 압박으로 컨텍스트 유실 시 검은 화면 고착. 새로고침 외 복구 없음.

**작업**
1. `MapGlobeView.tsx` — map load 후 캔버스에 리스너 등록
   ```ts
   canvas.addEventListener("webglcontextlost", (e) => {
     e.preventDefault();              // 이게 없으면 복구 자체가 불가
     setContextLost(true);
   });
   canvas.addEventListener("webglcontextrestored", () => {
     setContextLost(true → false); // 스타일·소스 재적용
   });
   ```
2. `contextLost` 시 "지도를 다시 불러오는 중" 오버레이 + 3초 내 미복구면 `[다시 시도]` 버튼.
3. `GlobeLoadingScreen`의 셰이더 캔버스에도 동일 처리.

**수용 기준** DevTools `WEBGL_lose_context` 확장으로 강제 유실 → 자동 복구 또는 재시도 버튼 노출.

---

### P0-3. Playwright 크로스브라우저 스모크 3종

**문제** `vitest.config.ts`가 `environment: "node"` + `include: ["src/**/*.test.ts"]`. 브라우저 검증이 0. 위 P0-1/P0-2를 고쳐도 회귀를 잡을 방법이 없다.

**작업**
1. `npm i -D @playwright/test` · `npx playwright install --with-deps chromium webkit firefox`
2. `playwright.config.ts` — projects: chromium / webkit / firefox, `webServer: npm run dev`
3. `e2e/smoke.spec.ts` — 3개만
   - **부팅**: 접속 → 입장 게이트 스킵 → `canvas.maplibregl-canvas`가 보이고 첫 타일이 그려짐 (30초 내)
   - **레이어 토글**: ≡ 열기 → 체크박스 1개 클릭 → `aria-checked=true` + 지도 소스 추가 확인
   - **양피지**: 허브 nav 1개 클릭 → 양피지 노출 → 닫기 동작
4. `.github/workflows/ci.yml`에 `e2e` job 추가 (PR에서 chromium만, main 머지 시 3종 전부 — CI 시간 절약)

**수용 기준** 3 브라우저 × 3 시나리오 = 9 케이스 그린. WebKit에서 하나라도 빨간색이면 그것이 곧 P0-1/P0-2의 실증.

---

### P0-4. 조용한 실패 제거 — 레이어 상한 무반응

**문제** `LayerCategoryDraftHost.applyItem` — 상한 초과 시 `return`. 체크박스가 움직이지 않는다 = 사용자에겐 고장.

**작업 (P2-2의 임시 조치, 즉시 적용)**
- `applyItem`에서 거부 시 `showCapWarn()`은 이미 호출되나, **체크박스 자체가 반응하지 않는 것**이 문제. 거부된 항목에 200ms 흔들림 애니메이션 + 인라인 문구를 해당 항목 바로 아래에 표시(토스트는 시선 밖).
- 근본 해결은 P2-2(자동 강등).

---

### P0-5. 빠른 위생 조치 (합쳐서 30분)

| 항목 | 파일 | 조치 |
|---|---|---|
| autoprefixer 누락 | `postcss.config.mjs` | `plugins: { tailwindcss: {}, autoprefixer: {} }` — Next는 커스텀 config가 있으면 기본값을 **대체**한다 |
| 지원 브라우저 미정의 | `package.json` | `"browserslist": ["> 0.5%", "last 2 versions", "not dead", "safari >= 15"]` |
| 빌드 게이트 | `next.config.mjs` | `relaxNextBuildGates`가 로컬 기본 true — 의도된 것이나, 배포 전 `NEXT_RELAX_BUILD_GATES=0` 1회 통과를 릴리스 체크리스트에 명문화 |

---

## Phase 1 — 체감 속도 / 도허티 임계 (2~3일)

> 목표: 사용자의 모든 클릭이 400ms 안에 시각적 응답을 받는다.

### P1-1. 레이어 토글 debounce 400 → 120ms

**문제**
```ts
// hooks/useLayerPrefsController.ts
const BATCH_WINDOW_MS = 400;
const BATCH_DEBOUNCE_MS = 400;   // 도허티 임계와 동일 = 안전 마진 0
```
`startTransition` + 레이어 재계산이 얹혀 체감 600~900ms. README의 "체크 즉시 지도 반영"과 불일치.

**작업**
1. `BATCH_DEBOUNCE_MS` 400 → **120**.
2. **Leading-edge debounce**: 첫 토글은 debounce 없이 즉시 flush, 이후 연속 토글만 120ms 윈도로 배칭.
   ```ts
   const scheduleBatchFlush = useCallback(() => {
     const now = Date.now();
     if (now - lastFlushAtRef.current > BATCH_DEBOUNCE_MS) {
       flushPrefs(draftRef.current, "deferred");   // leading
       lastFlushAtRef.current = now;
       return;
     }
     // trailing
     clearDebounce();
     debounceTimerRef.current = setTimeout(...);
   }, [...]);
   ```
3. README의 "체크 즉시 반영" 문구를 실제 동작에 맞게 갱신(또는 반대로 코드를 문구에 맞춤 — 지금 택한 방향).

**수용 기준** 체크 → 지도 변화 시작까지 p95 < 200ms (Performance 패널 측정).

---

### P1-2. 부팅 인위적 대기 제거

**문제** `PICKER_LOADING_FINISH_MS = 1400` + `LOADING_FADE_MS = 720` — Dashboard 로드가 **끝난 뒤에도** ~2.1초 장식.

**작업**
1. `GlobeBootLoader.tsx` — `PICKER_LOADING_FINISH_MS`를 **상한**으로 변경. 실제 준비 완료 시 `finishPrePickerLoading()` 즉시 호출, 미완료 시에만 최대 1.4초 대기.
2. `LOADING_FADE_MS` 720 → **250**.
3. `DASHBOARD_BOOT_TIMEOUT_MS = 45_000` 유지(안전망)하되, **8초 시점에 "느립니다 — 간이 모드로 전환할까요?"** 중간 안내 추가. 45초를 침묵으로 채우지 않는다.

---

### P1-3. 로딩 셰이더 조건부 강등

**문제** 4옥타브 simplex fbm 풀스크린 GLSL이 부팅 중 GPU를 점유. Firefox는 `powerPreference: "high-performance"`를 무시하고 통합 GPU 유지 → 특히 무겁다.

**작업**
- `GlobeLoadingScreen.tsx` 진입 시 판정:
  - `prefersReducedMotion()` → 정적 배경
  - `navigator.hardwareConcurrency <= 4` → 정적 배경
  - `deviceProfile === "phone"` → fbm 옥타브 4 → 2로 축소
- 판정 로직은 `src/lib/renderTier.ts`로 분리(P2-2의 자동 강등과 공유).

---

### P1-4. 폴링 타이머 `document.hidden` 게이트

**문제** `useLiveGeoFeedPolling`(7) · `useLiveOsintPolling`(4) · `useLiveVesselAirPolling`(4) 등 20+ `setInterval`이 백그라운드에서도 계속 돈다. `visibilitychange`를 보는 곳은 날짜 훅 2개뿐.
- iOS Safari 백그라운드 스로틀 → 복귀 시 밀린 fetch 폭주
- 모바일 배터리 직결

**작업**
1. `src/hooks/useVisiblePolling.ts` 신규 — 기존 `setInterval` 호출을 대체하는 공통 훅
   ```ts
   useVisiblePolling(fn, intervalMs, { immediateOnResume: true });
   ```
   - `document.hidden` → 타이머 정지
   - `visibilitychange`로 복귀 → **1회 즉시 실행 후** 재개
2. 위 3개 폴링 훅의 모든 `window.setInterval`을 치환.

**수용 기준** 탭을 백그라운드로 5분 두었다 복귀 → Network 패널에 요청이 1회 버스트만(현재는 밀린 만큼 다발).

---

### P1-5. API 캐시 헤더 일괄 적용

> **정정 (구현 중 확인):** 최초 진단에서 "93개 route 중 대다수에 캐시 헤더 없음"이라고 적었는데 **틀렸다.**
> 이 프로젝트에는 이미 `src/lib/httpCacheHeaders.ts`라는 SSOT가 있고, `CDN_CACHE` 프리셋이
> 폴링 간격에 맞춰 정렬돼 있다(`gdelt` 300s, `ais` 30s, `adsb` 25s …). 문자열 `Cache-Control`만
> grep해서 헬퍼 사용처를 통째로 놓쳤다.
>
> **실제 수치: GET 라우트 82개 중 26개 미적용.** 나머지 56개는 이미 올바르게 처리되어 있었다.
> 문제는 커버리지가 아니라 **강제성 부재** — 새 라우트를 추가하며 빠뜨려도 아무도 몰랐다.

**작업**
1. `src/lib/apiResponse.ts` 신규
   ```ts
   export function jsonCached(data, { sMaxAge, swr, status = 200 }) { ... }
   ```
   기본값 `s-maxage=60, stale-while-revalidate=300`.
2. 모든 GET route의 `NextResponse.json(...)`을 `jsonCached(...)`로 치환. 실시간성이 높은 것만 개별 override(ADS-B 15s, AIS 30s, GDELT 300s, 정적 layers 3600s).
3. ESLint 규칙 또는 CI grep으로 "route.ts에 Cache-Control 없으면 실패" 가드.

---

### P1-6. 클라이언트 stale-while-revalidate

**작업**
1. `src/lib/clientCache.ts` — IndexedDB(폴백 localStorage) 기반 `{key, data, fetchedAt}` 저장.
2. 레이어 데이터 fetch 래퍼: 캐시 있으면 **0ms에 즉시 렌더** → 백그라운드 갱신 → 도착 시 교체.
3. 낡은 데이터에는 "3분 전" 배지 표기. 정직하게 표시하는 것이 빈 화면보다 낫다.
4. 타임아웃 2단계: **2.5초** "느립니다, 캐시본 표시 중" → **8초** 실패 처리(현재 20초 단일).

---

## Phase 2 — UX 구조 (3~5일)

> 목표: 사용자가 "무엇을 눌러야 하는가"를 고민하지 않게 한다.

### P2-1. 시나리오 프리셋 — 최대 효과 항목

**문제 (Hick's Law · Choice Overload · Doherty 동시 해당)**
레이어 88개 항목 / 허브 nav 20 / econ 6그룹 → 진입 직후 결정 지점 100개 초과. "무엇을 켜야 하는가"의 답이 UI에 없다. 일반 모드에는 프리셋 진입점이 아예 없다(`CompactPresetChips`는 Ultra-Lite 전용).

**작업**
1. `src/lib/scenarioPresets.ts` 신규
   ```ts
   type ScenarioPreset = {
     id: string;
     labelKo: string; labelEn: string;
     mode: ViewerMode;
     layers: Partial<LayerPrefs>;      // 우선순위 순서대로 나열 — 상한 초과 시 뒤에서 절삭
     camera: { center: [number, number]; zoom: number };
     bottomIntel?: BottomIntelKind;
   };
   ```
   - 지정학: `대만해협` · `우크라 전선` · `호르무즈/홍해` · `한반도` · `핵·미사일`
   - 지경학: `반도체 공급망` · `에너지 초크` · `해운 운임` · `제재·금융`
2. `ScenarioPresetChips.tsx` — 일반 모드 상단(허브 nav 아래)에 노출. 기존 `CompactPresetChips`와 스타일 공유.
3. **한 프레임 커밋**: `patchLayerPrefsSoft`를 88번 부르지 말고 `applyLayerPrefs(preset.layers)` **1회 호출** + 카메라 이동 + 하단 Intel 전환을 같은 배치에.
4. 상한 초과분은 `preset.layers` 정의 순서 뒤쪽부터 자동 절삭(사용자에게 묻지 않음).

**수용 기준** 프리셋 칩 클릭 → 지도 변화 시작까지 < 400ms. 클릭 1회로 "이 주제를 보는 화면"이 완성됨.

---

### P2-2. 레이어 상한 → 자동 강등 (Tesler's Law)

**문제** 「동시 ON 상한 30 / Ultra-Lite 16」은 순수 GPU·네트워크 제약인데 숫자로 노출되고, 초과 시 사용자가 무엇을 끌지 직접 판단해야 한다. 시스템이 흡수해야 할 복잡성의 전가.

**작업**
1. 일반 모드도 Ultra-Lite처럼 `enableLayerEvictingCap` 사용 — 거부 대신 **우선순위 낮은 레이어 자동 해제 후 실행**.
2. 해제 결과만 통보: `"공항·항구를 잠시 껐습니다 [되돌리기]"` — 상한 숫자를 문구에서 제거.
3. `PERF_PROBE_*` FPS 프로브를 자동 강등에 연결: FPS < 30이 3초 지속 → 무거운 레이어 자동 해제 + 동일 형식 통보. `UltraLiteOfferBanner`(제안형)를 결과 통보형으로 전환.
4. `layerExclusiveCap.ts`의 우선순위 테이블을 `geowatch.config`로 승격(SSOT).

**수용 기준** 사용자에게 "상한"이라는 단어가 UI에 노출되지 않는다.

---

### P2-3. 배너 세션 예산 (Selective Attention)

**문제** 오버레이·배너·코치 29종. `overlayQueue`가 "한 번에 하나"로 막지만 **큐가 비면 다음을 계속 밀어 넣는다** → 배너 실명. 진짜 공습 경보도 무시당한다.

**작업**
1. `src/lib/overlayBudget.ts` 신규 — `sessionStorage` 기반
   - 세션당 **제안형(offer/tour/push/ultraLite/coach) 총 3개** 예산. 초과분은 조용히 폐기.
   - **긴급형(airRaid / adsbEmergency / escalation)은 예산 미적용** — 항상 통과.
2. `DISMISS_COOLDOWN_MS`는 재등장 쿨다운일 뿐 → 제안형은 **한 번 무시 = 세션 내 영구 억제**로 변경.
3. `buildOverlayBannerCandidates`에 예산 필터를 삽입(우선순위 계산 이전).

---

### P2-4. 긴급 배너 시각 차별화 (Von Restorff)

**문제** 모든 배너가 같은 문법(테두리 + `backdrop-blur` + 반투명). 공습 경보가 "투어 해보실래요?"와 시각적으로 동급.

**작업**
- 긴급 등급 전용 스타일: 각진 모서리(`rounded-none`) · 채운 적색 배경(반투명 아님) · 좌측 4px 경고 바 · 진입 시 1회 미세 진동(`prefers-reduced-motion` 존중).
- 제안형은 현재 스타일 유지 + 채도 한 단계 하향.

---

### P2-5. 닫기 관례 표준화 + 빵부스러기 (Jakob's Law · Working Memory)

**작업**
1. `ParchmentLetter` 및 모든 양피지 계열 패널에 **X 버튼 + ESC + 바깥 클릭** 3종 전부 지원. 미학은 유지하되 닫는 방법은 표준으로.
2. 허브 → fly → 양피지 → `AxisArmsPanel` 3단 깊이에 상단 빵부스러기(`중국 › 무기거래 › SIPRI 상세`) + 각 단계 클릭으로 복귀.
3. 지도 조작(줌·회전·핀 클릭)은 MapLibre 기본 유지 — 재발명 금지.

---

### P2-6. Safari `backdrop-blur` 강도 하향

**문제** WebGL 캔버스 위 `backdrop-filter` 합성 비용이 Safari에서 현저히 크다. UI 전체가 `backdrop-blur` 범벅인데 브라우저 분기가 없다.

**작업**
1. `DEVICE_BOOT_SCRIPT`에 WebKit 판별 추가 → `html[data-engine="webkit"]`.
2. `globals.css`
   ```css
   [data-engine="webkit"] .glass { backdrop-filter: blur(6px); }  /* 기본 12~16px */
   ```
3. `globals.css:1809`의 `-webkit-backdrop-filter: none !important` 발동 조건을 확인·문서화(현재 의도 불명).

---

## Phase 3 — 구조 리팩터 · 마감 (1주)

### P3-1. `GlobeDashboard` 코드 분할

**문제** 8,368줄 단일 청크, 내부 `dynamic()` 0개 → 첫 인터랙션까지 전체 번들 파싱 대기.

**작업** 최소 3덩이
| 덩이 | 내용 | 로딩 시점 |
|---|---|---|
| Core | 지도 · 카메라 · 레이어 적용 | 즉시 |
| Intel | 하단 Intel · 티커 · 뉴스 | `runWhenIdle` |
| Panels | 분석 패널 · 양피지 · Axis/Econ 상세 | on-demand `dynamic(…, { ssr: false })` |

기존 `docs/refactor-globedashboard.md`와 정합성 확인 후 진행.

**수용 기준** 초기 JS 전송량 30% 이상 감소, TTI 개선을 Lighthouse로 전후 비교.

---

### P3-2. 입장 게이트 재설계 (Paradox of the Active User)

**문제** 로딩 → 주의 → 환영 편지(타이핑) → 도메인 선택 → 히어로 → 코치. 지구본에 닿기 전 읽기 화면 3개. 스킵은 우상단 구석 작은 타겟(Fitts 위반).

**작업**
1. 순서 반전: **도메인 선택 → 지구본 즉시** → 편지는 우측에 접힌 카드로(미열람 배지 = Zeigarnik 역이용).
2. 주의창은 사운드·성능 고지만 남기고 **스킵 버튼을 주 액션과 동등한 크기**로.
3. `ChromeOnboardingCoach`는 P2-3 배너 예산에 포함.
4. 재방문 시 게이트 생략(현재 동작) 유지.

---

### P3-3. 스켈레톤 · 레이아웃 안정화

**문제** 컴포넌트 157개 중 skeleton/`animate-pulse` 사용은 13개.

**작업** 실제 레이아웃 크기의 스켈레톤 추가 — `BottomIntelStack` · `AxisArmsPanel` · `EconInsightParchment` · `LivingConflictPanel`. CLS도 함께 개선된다.

---

### P3-4. 카메라 애니메이션 인터럽트

**작업** `AUTO_FLY_MS = 2400` / `INTRO_CAMERA_DURATION_MS = 2200` 중 사용자 드래그·클릭 시 **즉시 목적지 스냅**. 양피지 타이핑 스킵(`typedChars = totalChars`)과 동일한 원칙 — 애니메이션이 사용자를 인질로 잡지 않는다.

---

### P3-5. 카테고리 내부 점진적 공개 (Miller's Law)

**작업** `conflict` 카테고리 25개+가 평평하게 나열되는 문제. 카테고리마다 **추천 3개만 펼치고 나머지 접기**. `trackLayerToggle`이 이미 토글 로그를 수집 중이므로 Pareto(상위 20%)로 추천 목록을 산출.

---

### P3-6. 범례 연결 (Uniform Connectedness)

**작업** `MapLegend` / `MapOverlayLegendPanel`이 **켜진 레이어만** 표시하도록, 지도 요소 hover 시 해당 범례 항목 하이라이트.

---

### P3-7. Peak-End · Goal-Gradient (선택)

- **Peak-End**: 이탈 직전 "오늘 본 것" 카드(`DailyRankSharePanel` 재활용) → 공유 동선.
- **Goal-Gradient**: `daily-predict` / `daily-ranks`를 "오늘의 브리핑 3/5" 진행 게이지로 연결.

---

## 측정 · 검증

### 계기판 (P1 시작 전 구축)

| 지표 | 도구 | 목표 |
|---|---|---|
| 레이어 토글 → 지도 변화 시작 | `performance.mark` + 기존 `trackLayerToggle` | p95 < 200ms |
| 프리셋 클릭 → 첫 프레임 | 동일 | < 400ms |
| TTI / LCP | Lighthouse CI (`ci.yml`) | TTI 30% 개선 |
| 초기 JS 전송량 | `next build` 출력 | 30% 감소 |
| 크로스브라우저 스모크 | Playwright 3종 | 9/9 그린 |
| WebGL 미지원 비율 | `/api/track`에 `detectWebglSupport()` 결과 기록 | 실측치 확보 |

마지막 항목이 중요하다 — 지금은 **얼마나 많은 사용자가 지도를 아예 못 보는지 데이터가 없다.** P0-1과 함께 계측을 넣어야 P0의 효과를 증명할 수 있다.

---

## 실행 체크리스트

### Phase 0
- [x] P0-1 `webglSupport.ts` + `UnsupportedBrowserNotice` + BootLoader 분기
- [x] P0-1b 로딩 셰이더 `!gl` 시 정적 배경
- [x] P0-2 `webglcontextlost` / `restored` 핸들러 + 재시도 UI
- [x] P0-3 `playwright.config.ts` · `e2e/smoke.spec.ts` 3종 · CI job — **로컬 `npm i` + `npm run test:e2e:install` 필요**
- [x] P0-4 상한 거부 시 흔들림 + 인라인 문구
- [x] P0-5 autoprefixer · browserslist
- [x] P0-5b 릴리스 게이트(`NEXT_RELAX_BUILD_GATES=0`) 문서화

### Phase 1
- [x] P1-1 `BATCH_DEBOUNCE_MS` 120 + leading-edge
- [x] P1-1b README "체크 즉시 지도 반영" 문구 정합 확인
- [x] P1-2 `PICKER_LOADING_MAX_MS` 상한화 · fade 250ms · 8초 지연 안내
- [x] P1-3 `renderTier.ts` + 로딩 셰이더 조건부 강등
- [x] P1-4 `visibleInterval` + 19개 interval 치환 (`useLiveGeoFeedPolling` 7 · `useLiveOsintPolling` 4 · `useLiveVesselAirPolling` 4 · `BottomIntelStack` · `FinintTicker` · `BunkerSentimentVote` · `useAdsbEmergencyAlert`) — cleanup 누락 1건도 함께 수정
- [x] P1-5 캐시 정책 없던 GET 라우트 24개에 `CDN_CACHE`/`NO_STORE_HEADERS` 적용 + `verify:api-cache` CI 가드
- [x] P1-6 `clientCache.ts` SWR + 낡음 배지 + 2단계 타임아웃

### Phase 2
- [x] P2-1 `scenarioPresets.ts`(9종) + `ScenarioPresetChips` + `applyLayerPrefs` 단일 커밋
- [x] P2-2 자동 강등 · 상한 문구 제거 · FPS 프로브 연결
- [x] P2-3 `overlayBudget.ts` 세션 예산 3 + 무시=영구 억제 + 긴급형 예외 (+ 단위 테스트)
- [x] P2-4 긴급 배너 시각 차별화
- [x] P2-5 양피지 ESC/X/바깥클릭 + 빵부스러기
- [x] P2-6 WebKit `backdrop-blur` 하향 분기

### Phase 3
- [x] P3-1 `GlobeDashboard` — AnalysisPanel · IntelNewsSheet(idle) · Geopolitics on-demand 패널 · DailyRank/TopWatch dynamic
- [x] P3-2 입장 게이트 스킵을 주 CTA와 동등 크기
- [x] P3-3 스켈레톤 4종 (`BottomIntelStack` · `AxisArmsPanel` · `EconInsightParchment` · `LivingConflictPanel`)
- [x] P3-4 카메라 애니메이션 인터럽트 → 목적지 스냅
- [x] P3-5 카테고리 점진적 공개 (추천 3 + 더보기, 로컬 Pareto)
- [x] P3-6 범례 동적 연결 (ON만 · 호버 하이라이트)
- [x] P3-7 Peak-End / Goal-Gradient (`DailyBriefingChrome` · `dailyBriefingProgress`)

---

## 건드리지 말 것

진단 과정에서 확인한, **이미 올바르게 되어 있는 것들**. 리팩터 중 실수로 되돌리지 않도록 명시한다.

- `DEVICE_BOOT_SCRIPT` — hydration 전 `html[data-device]` 설정 (FOUC 방지)
- 오디오 자동재생 unlock — 첫 `pointerdown`/`keydown` (`useSoundStream.ts:206-217`)
- `deferIdle.ts`의 `requestIdleCallback` 폴백
- `navigator.share` 존재 확인 후 사용 + 클립보드 폴백 (`SceneLinkButton.tsx`)
- `100vh` / `100dvh` 이중 선언, `env(safe-area-inset-*)`
- CSP `worker-src blob:` (MapLibre) · Report-Only 롤아웃 전략
- `overlayQueue` 단일 오버레이 원칙 — 예산만 얹고 구조는 유지
- 양피지 타이핑 클릭 스킵 (`typedChars = totalChars`)
- `prefersReducedMotion` 존중 (8개 파일)
- 레이어 7 카테고리 / econ 6그룹 청킹 분류

---

## 리스크

| 리스크 | 완화 |
|---|---|
| P1-1 debounce 단축이 저사양에서 프레임 드롭 유발 | `renderTier.ts` 판정으로 저사양은 200ms 유지 |
| P2-2 자동 강등이 사용자가 의도한 레이어를 끔 | `pinUserLayers()`가 이미 존재 — 수동 ON 레이어는 강등 대상에서 제외 |
| P3-1 대규모 분할 중 회귀 | P0-3 Playwright 스모크가 선행 조건. 스모크 없이 P3-1 착수 금지 |
| P2-1 프리셋 레이어 조합이 상한을 넘음 | 정의 순서 = 우선순위. 뒤에서 절삭하고 조용히 진행 |
| P1-5 캐시 헤더가 실시간성 훼손 | ADS-B/AIS 등 실시간 라우트는 개별 override 목록으로 관리 |
