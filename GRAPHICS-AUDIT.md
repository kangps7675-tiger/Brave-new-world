# 그래픽 최적화 총평 — Conflict View

측정 대상: `src/` 810개 파일 / 152,895줄, MapLibre GL 5.24 + react-map-gl 8.1 + Next 14.

결론부터: **렉의 원인은 데이터 양이 아니라 렌더 파이프라인 설계다.** 뷰포트 컬링·LOD 티어·폴링 가드는 이미 잘 짜여 있는데, 그 뒤에서 "프레임마다 반드시 도는 비용"이 네 겹으로 쌓여 있다.

---

## 티어 1 — 프레임 예산을 직접 먹는 것 (여기서 대부분 회복)

### 1. `preserveDrawingBuffer: true` 가 상시 켜져 있다 ⚠️ 최우선

`MapGlobeView.tsx:1113`

```ts
{...({ preserveDrawingBuffer: true } as Record<string, unknown>)}
```

주석에 "ShareViewButton 캡처용"이라고 적혀 있다. 그런데 이 플래그는 WebGL에서 **브라우저의 프레임버퍼 스왑 최적화를 통째로 끈다.** 매 프레임 백버퍼를 복사해 보존해야 하므로, 내장 GPU에서는 이것만으로 프레임 예산의 20~40%가 날아간다. 공유 버튼 한 번 누르려고 100% 시간 동안 세금을 내는 구조다.

**대안:** 플래그를 끄고, 캡처 시점에만

```ts
map.once("render", () => { canvas.toBlob(...) });
map.triggerRepaint();
```

로 같은 프레임 안에서 읽는다. MapLibre 공식 캡처 패턴이다.

---

### 2. HTML `<Marker>` 수백~1000개 (구조적 문제)

`GlobeDashboard.tsx:4008` 에서 **29개 마커 배열**이 하나로 합쳐진다 — 함정·군용기·민항기·사망자·콜아웃·뉴스네온·텔레그램·금융허브·정찰위성·핵탄두… 전부 `<Marker>` = DOM 노드다.

LOD 상한(`liveRenderGuard.ts`)을 합산하면 village 티어에서 AIS 120 + 군용기 150 + 민항 280 + 나머지 = **동시 600~1000 DOM 마커**가 정상 범위다.

MapLibre Marker는 프레임마다 마커 하나당:
- `map.project()` (globe 투영이라 더 비쌈)
- `element.style.transform` 쓰기 → 레이아웃/합성 무효화

여기에 두 배수가 더 붙는다:

- **`opacityWhenCovered={0}`** (`MapGlobeView.tsx:1784`) — 마커별 오클루전 판정을 강제한다.
- **terrain(DEM)이 상시 소스** (`MapGlobeView.tsx:1122`, "상시 소스, exaggeration만 조절") — terrain이 켜지면 오클루전 판정이 표고 조회를 타므로 마커당 비용이 다시 몇 배가 된다.

**대안:** 아이콘성 마커(선박·항공기·핀·네온)는 MapLibre **symbol 레이어**로 옮긴다. 이미 `firmsFireIcons` / `gemFacilityIcons` 로 `ensure*Images` 패턴을 쓰고 있으니 인프라는 있다. GPU에서 한 번에 그리고, DOM은 0이 된다. HTML 마커는 진짜 인터랙티브한 소수(콜아웃 등)만 남긴다.

이 하나가 사실상 렉의 본체다.

---

### 3. `deconflictTheaterHtmlOverlays` — 전체 복사 + O(n²)

`src/lib/htmlOverlayDeconflict.ts:37`

```ts
const out = markers.map((m) => ({ ...m }));   // 전 마커 객체 복사
...
for (a...) for (b...)                          // O(n²)
```

문제는 O(n²)보다 **첫 줄**이다. 실제로 밀어낼 마커는 3종(`casualty-skull`/`situation-callout`/`news-stream-neon`)뿐인데 1000개 전부의 객체 identity를 새로 만든다. → 모든 `<Marker>` props가 "바뀐 것"으로 판정 → React 재조정 + ref 콜백 재실행이 전량 발생한다.

**대안:** 대상 3종만 부분 배열로 뽑아 격자(grid hash)로 근접 판정하고, 실제로 밀린 인덱스만 복사해 원본 배열에 스프레드 없이 되꽂는다. 나머지 997개는 참조를 그대로 유지.

---

### 4. Marker `key` 에 방위각이 들어가 있다

`MapGlobeView.tsx:1775`

```ts
key={`html-marker-${markerId}-r${rotKey}-b${bearingKey}-h${headingKey}`}
```

`bearingKey`는 `mapBearingDeg`(5° 양자화)다. **지도를 회전시키면 5°마다 해당 마커 전체가 언마운트→재마운트된다.** DOM 파괴/재생성 + `htmlElement()` 재호출 + innerHTML 재파싱까지 간다. 회전 드래그가 특히 끊기는 이유가 여기 있을 가능성이 높다.

바로 아래 ref 콜백은 이미 `data-markerSig` 로 정확히 이 재생성을 막고 있는데, key가 그 방어를 무력화한다. **key는 `markerId`만.**

---

## 티어 2 — 합성(Compositing) 비용

### 5. `backdrop-filter` — 101개 파일, 156회

WebGL 캔버스 **위에** 얹힌 `backdrop-filter: blur()`는 최악의 조합이다. 지도가 움직이는 동안 백드롭이 매 프레임 dirty → 패널마다 백드롭 읽기 + 블러 패스가 재실행된다. `globals.css`만 해도 blur(16px), blur(14px), blur(12px)가 상시 패널에 걸려 있다.

**대안:** 지도 이동 중에는 body에 `.map-moving` 클래스를 걸고 `backdrop-filter: none; background: rgba(...)` 로 폴백. idle 420ms 타이머(`handleMove`)가 이미 있으니 훅 지점도 있다. 또는 blur를 8px 이하로 낮추고 반투명 단색으로 대체 — 시각 손실 대비 이득이 크다.

### 6. 마커 아이콘마다 `drop-shadow()` 필터

`aisVesselMarkers.ts:39-78` — 선박 아이콘 전부에 `filter: drop-shadow(...)`, 일부는 drop-shadow 2겹. SVG 필터는 요소별 오프스크린 렌더를 유발한다. 마커 100개면 오프스크린 100개.

**대안:** SVG 내부에 그림자를 미리 그려 넣거나(path 복제), symbol 레이어로 옮기면서 `icon-halo` 로 대체.

### 7. 무한 CSS 애니메이션

`globals.css` 에 `@keyframes`/`animation` 75건, 그중 `infinite`가 다수(`cyber-pulse`, `carrier-deployed-pulse`, `intel-fab-glow`, `hero-*-pulse`, `neptun-threat-pulse`…). 대부분 `box-shadow`를 애니메이션한다 — **box-shadow는 GPU 합성이 안 되는 속성**이라 매 프레임 페인트가 발생한다.

**대안:** pulse는 `transform: scale()` + `opacity` 를 쓰는 별도 pseudo-element 링으로. `prefers-reduced-motion` 대응 블록은 이미 잘 되어 있으니 그 구조를 그대로 쓰면 된다.

### 8. 오버레이 패널이 거의 상시 마운트

`DashboardOverlayHost.tsx` 1,621줄, 컴포넌트 태그 73개. 조건부가 있긴 하나 `next/dynamic`이 **components 전체에 0회** 사용된다. 패널 하나 열고 닫을 때마다 트리 전체가 재조정 후보다.

---

## 티어 3 — React 구조

### 9. `GlobeDashboard.tsx` 8,275줄 / 단일 컴포넌트

- `useState` 64 · `useEffect` 76 · `useMemo` 58 · `useCallback` 74 · 커스텀 훅 37개

64개 상태 중 **어느 하나만 바뀌어도** 이 컴포넌트 전체가 재실행된다. 29개 마커 memo의 deps 배열이 전부 재평가되고, 그중 하나라도 참조가 바뀌면 `htmlOverlayMarkers` → `deconflict` → 전 마커 재조정 체인이 돈다. 폴링 훅이 여러 개 붙어 있으니 이 체인은 **사용자가 아무것도 안 해도** 수 초 간격으로 돈다.

**대안(순서대로):**
1. 마커 파이프라인을 `GlobeDashboard` 밖 별도 컴포넌트로 분리 — 지도+마커만 구독하는 하위 트리를 만든다.
2. UI 상태(패널 열림, 툴팁, 호버)를 context/store로 빼서 지도 트리와 리렌더 경로를 끊는다.
3. memo 범위 확대.

> **초판 정정:** "코드베이스 어디에도 `memo`가 없다"고 썼으나 **사실이 아니다**
> (`MapGlobeView.tsx` / `GlobeDashboard.tsx` 두 파일만 grep한 실수).
> 실제로는 4곳에 있고, 그중 `PausedMapGlobeView`가 **지도 자체를 감싸는
> 커스텀 비교 memo**다 — 레이어 패널이 열려 있는 동안 GeoJSON 재빌드를 막는
> 목적으로 잘 설계돼 있다.
> 다만 비교기가 `interactionPaused`가 양쪽 true일 때만 차단하므로,
> **평상시에는 사실상 항상 리렌더된다.** 즉 memo는 있으나 상시 경로에는
> 효과가 없고, 9번 항목의 지적(64개 상태 중 하나만 바뀌어도 전체 재실행)은
> 그대로 유효하다.

### 10. 매 렌더 새 객체 생성

`MapGlobeView.tsx:395` — `accessorsRef.current = { …28개 필드 }` 를 렌더 본문에서 무조건 재할당. deps 회피 트릭인 건 이해하지만, 렌더마다 28필드 객체 할당 + GC 압력이다. `useEffect` 안으로 옮기거나 개별 ref로.

### 11. `void basemapMode` 로 memo 강제 무효화

`pointsGeoJson` / `pathsGeoJson` / `labelsGeoJson` 3곳(`:428, :450, :518`). basemap 토글 한 번에 전체 GeoJSON을 다시 굽는다. 색상만 바뀌는 거라면 **feature property에 톤 키를 넣고 paint expression(`match`)으로 분기**하면 재빌드가 0이 된다. MapLibre 표현식을 이미 잘 쓰고 있으니 일관성 면에서도 맞다.

### 12. ultraLite가 마커 상한을 안 낮춘다

`ultraLiteMode.ts`는 레이어를 강제 OFF 하지만, `liveRenderGuard.ts`의 `AIS/MIL/AIR_HTML_DISPLAY_BY_TIER`는 **tier만 보고 ultraLite를 모른다.** 저사양 모드를 켜도 민항기 280개가 그대로 뜬다. `liveAisDisplayMax(tier, ultraLite)` 로 시그니처를 넓히고 0.4배 정도 곱하는 게 맞다.

### 13. 번들

```
748.*.js          1.9 MB   ← 대시보드 청크
05f6971a.*.js     1.1 MB   ← maplibre-gl
```

초기 First Load JS는 128kB로 훌륭한데, 지도 진입 시 **3MB 파싱**이 한 번에 온다. 저사양 기기에서 "들어가자마자 멈춤"의 원인. 부팅 필수 경로(지도+베이스 레이어)와 나머지 패널을 `next/dynamic`으로 쪼개면 체감이 크게 달라진다.

---

## 이해가 안 되거나 모순되는 부분

| 위치 | 내용 |
|---|---|
| `next.config.mjs` | `config.cache = { type: "memory" }` 를 **프로덕션 빌드에도** 적용. OneDrive 이슈 회피용 주석이 있지만, 프로덕션까지 memory 캐시면 빌드가 매번 풀 리빌드다. dev만 분기하는 게 맞다. |
| `next.config.mjs` | `typescript.ignoreBuildErrors` + `eslint.ignoreDuringBuilds` 로 **next build 게이트는 꺼져 있다.** 단 CI `quality` 잡이 `lint` / `tsc --noEmit` / `verify:*` 를 별도로 돌리므로 품질 게이트 자체는 존재한다. 진짜 구멍은 **CI를 안 거치는 빌드 경로(Vercel 등)만 보고 머지하는 경우** — TS가 깨진 채 배포될 수 있다. |
| `next.config.mjs` | CSP가 Report-Only인데 `script-src`에 `unsafe-eval`까지 들어 있다. 주석은 `unsafe-inline` 이유만 설명하고 `unsafe-eval` 근거는 없다. enforce로 올리면 그대로 굳으므로, Report-Only 기간에 필요 여부를 재검증해야 한다. |
| `public/data/live/telegram-embed-state.json` | **12.9MB**. `/public/data/live/` 는 `.gitignore` 되어 있으므로 **커밋물이 아니라 런타임 생성물**이다. 문제는 커밋 여부가 아니라 **위치** — 스크레이퍼 상태 파일이 정적 자산으로 서비스되는 경로에 쓰인다. R2/KV/임시 디렉터리가 맞다. |
| ~~`roads` 이중 경로~~ | **확인 결과 문제 없음.** 빌드 산출물 `app-data.json`(5.5MB)의 `roads`·`railroads`는 이미 빈 배열이고, 실체는 `places` 7,997 + `events` 2,449 다. 철도는 `useViewportPaths` → `/api/layers/viewport-paths` 로만 간다. 다만 `fetchAppDataStream`의 `$.roads`/`$.railroads` 파싱 경로와 `GlobeDashboard:2109`의 `railroads: []` 는 죽은 코드이며, 빌드 스크립트가 이 키를 다시 채우면 클라가 조용히 받아 파싱하게 된다 → 파서 경로에서 제거 권장. |
| `public/_headers` | **`/data/*` 캐시 규칙이 없다.** `/_next/static/*` 만 `immutable`. 첫 페인트가 `lite/countries.json` **2.0MB**(full은 2.7MB) + disputes인데 명시적 캐시 헤더가 없어 재방문마다 재검증 대상이 된다. 해시 파일명이 아니라 `immutable`은 못 쓰지만 `max-age` + `stale-while-revalidate` 는 가능. gz는 lite/full 각 65개로 이미 갖춰져 있어 **헤더만 빠진 상태**다. |
| `MapGlobeView.tsx:636` | `idleFallback` 12초. idle이 안 오면 12초 스플래시. 실제로 무거운 기기에서 여기 걸리고 있을 가능성이 높다 — 이 값이 자주 발동하는지 로깅해볼 만하다. |
| `perfProbe.ts` | FPS 프로브가 잘 만들어져 있는데 결과를 Ultra-Lite 제안에만 쓴다. 이는 **의도된 축소**다(헤더 주석: 강제 적용 없음 · 1회 제안 · 수락 시에만 적용, "첫 90초에 사양을 묻지 않는다"는 UX 결정). 따라서 자동 강등(마커 상한·blur·애니) 확장은 기술 문제가 아니라 **제품 결정(자동 vs 동의)** 이다. |

> 위 표 중 "빌드 게이트"·"telegram 커밋"·"roads 이중 경로" 3건은 초판에서 사실관계가 틀렸던 항목으로, 코드·데이터 재확인 후 수정됨.

---

## 권장 실행 순서

| 순 | 작업 | 예상 효과 | 난이도 | 상태 |
|---|---|---|---|---|
| 1 | `preserveDrawingBuffer` 제거 + 온디맨드 캡처 | 상 | 낮음 | ✅ 적용 |
| 2 | Marker `key`에서 bearing 제거 | 중~상(회전 시) | 매우 낮음 | ✅ 적용 |
| 3 | `deconflict` 전체 복사 제거 | 중~상 | 낮음 | ✅ 적용 |
| 4 | 지도 이동 중 `backdrop-filter` 비활성 | 중~상 | 낮음 | ✅ 적용 |
| 5 | `opacityWhenCovered` 재검토 / terrain 조건부 | 중 | 낮음 | ✅ 적용(ultraLite terrain OFF) |
| 6 | ultraLite → 마커 상한 연동 | 중 | 낮음 | ✅ 적용 |
| 10 | `_headers`에 `/data/*` 캐시 규칙 추가 | 재방문 진입 | 매우 낮음 | ✅ 적용 |
| 7 | **항공기** 마커를 symbol 레이어로 이전 | **최상** | 높음 | ✅ 적용 |
| 7b | **선박(AIS)** 마커 symbol 이전 | 상 | 높음 | ⬜ 미착수 |
| 8 | 마커 목록 메모이제이션 | 상 | 중간 | ✅ 적용 |
| 8b | GlobeDashboard 상태 분해 | 상 | 높음 | ⬜ 미착수 |
| 9 | `next/dynamic` 패널 분할 | 초기 진입 | 중간 | ✅ 적용 |

### 7. 항공기 symbol 레이어 이전 (적용)

화면 마커 중 **수가 가장 많은** 군용기(최대 150) + 민항기(최대 280)를
DOM `Marker` → MapLibre symbol 레이어로 옮겼다.

**왜 항공기가 1순위였나**
아이콘이 역할 12종 × 팔레트 2종 = **24개로 유한**하고, 텍스트가 없으며,
회전은 `icon-rotate`가 그대로 처리한다. 즉 DOM으로 얻는 게 없었다.

**제거된 것 (마커 1개당)**
`div > button > span > span` 4노드 · `innerHTML` SVG 파싱 ·
`filter: drop-shadow()` 오프스크린 렌더 · `box-shadow` 글로우 ·
프레임마다 `project()` + transform 쓰기 + 오클루전 판정.
→ village 티어 기준 **DOM 노드 약 1,700개가 사라진다** (430 × 4).

**추가된 파일 / 변경**
- `src/lib/milAircraftSymbols.ts` (신규) — 아이콘 24종 등록 + GeoJSON 빌더
- `MapGlobeView` — `aircraft-symbols` Source/Layer, `interactiveLayerIds` 등록,
  `resolveFeature`/클릭/호버 분기 (기존 index 기반 배선 재사용)
- `useGlobeMapGlobeProps` — `aircraftSymbolsData/Items/IsCivil` + 핸들러 2개
- `useLiveOverlayMarkers` — `milHtmlMarkers`/`civHtmlMarkers` **삭제**
  (사본을 만들 이유가 없어짐), `milDisplayPoints`/`civDisplayPoints` 직접 노출
- `GlobeDashboard` — htmlOverlayMarkers 병합에서 항공기 2종 제외

**동작 보존**
침로 없으면 -18° 기울임 + opacity 0.8, 민항은 여객기 실루엣 통일 —
기존 `createMilAircraftBadge` 규칙을 그대로 옮겼다.
`src/lib/milAircraftSymbols.test.ts` 신규 (index→원본 복원 계약 포함).

> **남은 것:** 선박(AIS)은 8방위 실루엣·위장선·항모 등 상태 조합이 많아
> 아이콘 수가 크게 늘어난다. 같은 패턴으로 가능하지만 별도 설계가 필요하다.

### 8. 마커 목록 메모이제이션 (적용)

`MapGlobeView`의 `htmlElementsData.map(...)` 은 화면 마커 수만큼 `<Marker>`
JSX를 만든다. `GlobeDashboard`는 상태가 64개라 **티커·폴링 등 지도와 무관한
이유로도 자주 리렌더**되는데, 그때마다 이 목록 전체가 재생성되고 React가
전부 diff했다.

이 블록(155줄)을 `htmlMarkerNodes` useMemo로 감쌌다. deps는 4개뿐:

| dep | 왜 |
|---|---|
| `htmlElementsData` | deconflict가 참조를 유지하므로(3번) 내용이 같으면 **같은 배열** → 스킵 |
| `htmlElement` | GlobeDashboard의 `useCallback`. 언어·고도가 바뀔 때만 새 참조 = DOM을 다시 만들어야 하는 시점과 정확히 일치 |
| `mapBearingDeg` | 옆모습 실루엣(e/w)이 실제로 뒤집히는 기준 |
| `basemapMode` | 톤에 따라 팔레트가 달라짐 |

위치 접근자(`htmlLat/Lng/Rotation/RotationAlignment`)는 매 렌더 새 참조인
인라인 화살표라 deps에 넣으면 메모가 절대 적중하지 않는다. 전부 item만 보는
순수 함수이므로 `htmlAccessorsRef`로 최신값을 읽는다 — 기존 `accessorsRef`와
같은 패턴이다.

**3번과 맞물린다.** deconflict가 참조를 보존하지 않으면 이 메모는 매번 깨진다.
두 최적화는 세트로 봐야 한다.

> **미착수(8b):** `useGlobeMapGlobeProps`는 **`useMemo`가 0개**이고 ~60개의
> 인라인 화살표를 담은 객체를 매 렌더 새로 만든다. 이걸 정리하면 `MapGlobeView`
> 렌더 자체를 건너뛸 수 있지만, deps가 방대해 별도 스코핑이 필요하다.
> 지금은 위 메모가 **가장 비싼 부분(마커 목록)** 만 막아 준다.

### 9. `next/dynamic` 패널 분할 (적용)

닫힌 상태가 기본인 모달·패널 9종이 정적 import라 대시보드 청크(1.9MB)에
통째로 들어 있었다 — 한 번도 열지 않아도 진입 시 파싱 비용을 낸다.

| 컴포넌트 | 줄 수 | 조건 |
|---|---|---|
| MobileHomeView | 948 | 폰 UI 전용 (데스크톱은 영영 안 씀) |
| MethodologySourcesPanel | 711 | `showSourcesPanel` |
| FeatureGuidePanel | 438 | `showFeatureGuide` |
| TomorrowTensionModal | 295 | `tomorrowTensionPrompt` |
| ModePickerOverlay | 290 | `showModePicker` |
| AskLayersOverlay | 278 | `askLayersOpen` |
| WhereIsItGameOverlay | 245 | `playOverlay === "where"` |
| GeopoliticsSenseQuizModal | 222 | `playOverlay === "sense"` |
| ViewerIntroOverlay | 170 | 최초 방문 |

합계 **약 3,600줄** + 각자의 의존성이 초기 경로에서 빠진다.

> ⚠️ **핵심 주의:** dynamic 컴포넌트는 **렌더되는 순간** 청크를 받는다.
> 위 4개(`FeatureGuidePanel`·`AskLayersOverlay`·`MethodologySourcesPanel`·
> `ViewerIntroOverlay`)는 내부에서 `if (!open) return null` 하던 것들이라,
> 그냥 dynamic으로 바꾸면 **항상 렌더 = 효과 0**이었다.
> 그래서 open 조건을 부모로 끌어올려 삼항으로 감쌌다. **이 구조를 되돌리지 말 것.**

---

## 적용 내역 (1~6 + 10)

### 1. `preserveDrawingBuffer` → 온디맨드 캡처
- `mapGlobeRef.ts`: `MapGlobeMethods.captureFrame()` 추가.
  `triggerRepaint()` 후 **render 콜백 안에서** 오프스크린 canvas로 `drawImage`,
  2초 타임아웃 가드.
- `MapGlobeView.tsx`: 플래그 제거 + 재발 방지 주석.
- `ShareViewButton` / `UtilityChromeMenu`: prop을 `getCanvas` → `captureFrame`(async)로 교체.
  호출부 2곳(`DashboardTopChrome`, `DashboardOverlayHost`) 갱신.

### 2. Marker key
- `key`를 `html-marker-${markerId}` 로 축소 (rotKey·bearingKey·headingKey 제거).
- 추가로 `data-markerSig`에서 `mapBearingDeg`·`courseOverGround`·`trueHeading`
  **원값**을 빼고 `headingKey`(실제 렌더되는 방향: 옆모습은 `e`/`w` 2가지)로 교체.
  → 카메라 회전 중 DOM 재생성이 사실상 0.

### 3. `deconflict` — 측정된 개선
격자 해시(cell = `MIN_SEP_DEG`) + 밀린 원소만 복사.

| 마커 수 | 이전 | 개선 | 배수 | **새로 만들어진 객체** |
|---|---|---|---|---|
| 300 | 8.63ms | 1.64ms | 5.3× | 300 → **0** |
| 600 | 73.51ms | 3.58ms | 20.5× | 600 → **1** |
| 1000 | 90.64ms | 7.38ms | 12.3× | 1000 → **0** |

오른쪽 열이 핵심 — 객체 identity가 유지되므로 React가 전 마커를 재조정하던 것이 사라진다.
`src/lib/htmlOverlayDeconflict.test.ts` 신규 (참조 안정성 계약 포함).

### 4. 이동 중 합성 차단
- `globals.css` 하단: `html.map-moving` 에서 `backdrop-filter: none`,
  패널 배경 불투명화, 무한 pulse 애니메이션 `animation-play-state: paused`.
- `MapGlobeView`: 기존 420ms idle 타이머에 클래스 토글을 얹음 (드래그당 2회).

### 5. terrain
- `applyBasemapTerrain`: ultraLite면 `setTerrain(null)` (이전엔 exaggeration만 0.4).
  DEM 디코드·지형 메시·**마커 오클루전의 표고 조회**가 함께 빠진다.
  단 사용자가 지형 모드를 명시적으로 고른 경우는 유지.

### 6. ultraLite → 마커 상한
- `liveRenderGuard.ts`: `applyUltraLite()` (0.4배, 최소 8개) 추가,
  `liveAis/Mil/AirTrafficDisplayMax(tier, ultraLite)` 로 시그니처 확장.
- `useLiveOverlayMarkers`: `ultraLite` 옵션 추가 + **memo deps에 반영**(토글 즉시 적용).

### 10. `_headers`
`/data/*` 에 `max-age=3600, stale-while-revalidate=86400`,
매니페스트는 300s, `/data/live/*` 는 `no-cache`, textures·audio는 7일.

### 검증 결과
- `check-syntax` (844파일) · `check-reduced-motion` · `check-maplibre-expr` 통과
- `deconflict` 단위 9/9 + **브루트포스 등가성 2,000케이스** (기존 알고리즘과 결과 동일)
- `milAircraftSymbols` 단위 21/21 (아이콘 24종 등록·멱등성·침로 정규화·
  좌표 이상치·index→원본 복원 계약)

- `check-syntax` 847파일 통과 (7·8·9 적용 후 재실행)
- `MapGlobeView.tsx` 단독 파싱 통과 (마커 블록 155줄 추출 검증)

**미완 / 확인 필요**

1. ⚠️ **전체 `tsc --noEmit` 미완주** — 샌드박스에서 OneDrive 마운트 I/O가 느려
   10분을 넘겨 중단했다. `next.config.mjs` 주석의 "로컬 tsc OOM"과 같은 원인.
   **로컬에서 `npx tsc --noEmit` 과 `npm run lint` 를 돌려 확인할 것.**
   특히 프롭을 개명한 지점(`getCanvas` → `captureFrame`)과
   `useLiveOverlayMarkers` 반환 형태 변경을 중점적으로.

1b. ⚠️ **`next build` 미완주** — 청크 크기 변화(1.9MB가 얼마나 줄었는지)를
   측정하려 했으나 같은 I/O 문제로 완주 실패. **로컬에서 `npm run build` 후
   `First Load JS` / `chunks/*.js` 크기를 이전과 비교해 9번 효과를 확인할 것.**
   dynamic import는 런타임 동작이 바뀌는 변경이므로, 각 모달을 한 번씩 열어
   실제로 뜨는지도 함께 봐야 한다.

2. ⚠️ **`check-ui-tokens` 실패 — 단 내가 만든 것이 아니다.**
   ```
   ✗ 타이포 임의 px: 4건   components/ImmersionDigitalClock.tsx, UnsupportedBrowserNotice.tsx
   ✗ 임의 z-index: 1건     components/UnsupportedBrowserNotice.tsx: z-[9999]
   ```
   두 파일 모두 이번 작업에서 건드리지 않았다. 작업 중 디스크의 파일 수가
   812 → 844로 늘어난 것으로 보아 **병행 작업분이 섞여 들어온 것**으로 보인다.
   임의로 고치지 않았으니 확인 바란다.

---

## 측정 제안

추측을 줄이려면 이 순서로 확인하는 게 확실하다.

1. Chrome DevTools **Performance** 녹화 중 지도를 드래그·회전. `Marker._update` / `_evaluateOpacity` 가 상위에 뜨면 티어 1-2가 확정된다.
2. **Rendering → Paint flashing**. 지도 이동 시 패널들이 번쩍이면 backdrop-filter 문제 확정.
3. `preserveDrawingBuffer`를 잠깐 `false`로 두고 FPS 비교 — 5분 실험으로 1번 항목의 실제 크기를 알 수 있다.

---

## 2026-08-30 후속 세션 — 7b(AIS symbol) + 초기 티어 힌트 적용, 8b는 조사 후 보류

### 7b. 선박(AIS) symbol 레이어 이전 (적용)

항공기와 같은 이유로 남겨뒀던 항목. `aisVesselMarkers.ts`(DOM, 마커당 최대
2중 `drop-shadow`)를 뜯어보니 아이콘이 실제로는 유한했다 — 일반 상선은
`aisCommercialPointColor()`가 반환하는 색이 7종뿐이고, 군함·잠수함·위장
상선은 옆모습(E/W) 실루엣 2장을 카메라 방위 기준으로 바꿔치기할 뿐 임의
회전을 하지 않는다. 항모만 조감 아이콘 하나로 임의 회전.

- 신규 `src/lib/aisVesselSymbols.ts` — 아이콘 14종(일반 7 + 수상전투함 2 +
  잠수함 2 + 위장상선 2 + 항모 1) 등록 + `buildAisSymbolModel()`.
  레이어를 **둘로 분리**했다:
  - `ais-heading-symbols` — 일반 상선 + 항모. `icon-rotation-alignment: map`,
    `icon-rotate: heading` (항공기와 동일 방식).
  - `ais-aspect-symbols` — 군함·잠수함·위장상선. `icon-rotation-alignment:
    viewport`, rotate 고정 0 — 방향은 E/W 아이콘 선택이 담당.
    (일반 항공기와 달리 이쪽은 카메라 방위(mapBearingDeg)에 따라 E/W가
    바뀔 수 있어, 5° 단위로 양자화(`aisSymbolBearingBucket`)해 회전 중
    재빌드를 억제한다. 이 양자화 때문에 geojson을 MapGlobeView 안에서
    빌드한다 — mapBearingDeg가 거기 로컬 state라서.)
- `aisVesselMarkers.ts`의 `aisShipIconSvg`를 export로 바꿔 재사용(중복 방지).
- `useLiveOverlayMarkers.ts` — `aisHtmlMarkers` 제거, `aisDisplayPoints`
  (원본)를 그대로 노출 (항공기 때 `milHtmlMarkers`/`civHtmlMarkers` 제거와
  동일 패턴).
- `GlobeDashboard.tsx` — `htmlOverlayMarkers` 병합에서 AIS 제외,
  `handleAisSymbolSelect`/`handleAisSymbolHover` 추가(`handleGlobePointClick`의
  기존 "ais" 분기와 동일 로직 재사용), `useGlobeMapGlobeProps`에
  `aisDisplayPoints`+두 핸들러 전달.
- `useGlobeMapGlobeProps.ts` — `aisSymbolVessels`(원본 포인트 그대로),
  `onAisSymbolClick`/`onAisSymbolHover` 추가. 기존 `ais-html` 관련
  `htmlRotation`/`htmlRotationAlignment` 분기는 항공기 때처럼 **그대로 둠**
  (도달 불가능해지지만 되돌리기 쉽게).
- `MapGlobeView.tsx` — import, `INTERACTIVE_LAYERS`, `resolveFeature`,
  클릭/호버/leave 핸들러, `ensureAisSymbolImages` 3곳(초기 로드·mapLoaded
  effect·style.load), JSX Source×2/Layer×2 추가.
- `src/lib/aisVesselSymbols.test.ts` 신규 16개 — 빈 입력, 레이어 분기(일반/항모
  → heading, 군함/잠수함/위장상선 → aspect), 저속 침로 미상 처리,
  `allowStationaryHeading`, index 공유 계약, 좌표 유효성, properties 최소화,
  `aisSymbolBearingBucket` 양자화. **16/16 통과** (vitest, 로컬 실행 확인).

village 티어 기준 AIS 최대 상한만큼 DOM 마커가 추가로 사라진다 — 항공기(430)
+ 선박까지 더하면 화면 마커 대부분이 이제 GPU symbol 레이어다.

### 초기 티어를 기기 신호로 조용히 추정 (적용)

`perfProbe.ts`/`useUltraLiteAutoOffer`를 다시 보니 감사 초판의 설명("제안만
하고 자동 적용 안 함")은 **이미 낡은 서술**이었다 — 실제 코드(`P2-2` 주석)는
FPS가 낮으면 Ultra-Lite를 **자동 적용 후 배너로 통보**(되돌리기 가능)하는
방식으로 이미 바뀌어 있었다. 다만 이 자동 적용은 워밍업 1.2s + 샘플 3s, 최소
4.2초 뒤에야 일어난다 — 그 사이엔 정말 약한 기기도 풀티어로 초기화를
시작한다.

- `src/lib/ultraLiteMode.ts` — `hasStoredPerfPrefs()`(저장된 성능 설정이
  있는지, "저장 안 됨"과 "저장된 false"를 구분), `estimateWeakDeviceHint()`
  (`navigator.hardwareConcurrency <= 4` 또는 `navigator.deviceMemory <= 4GB`
  이면 약한 기기로 봄 — 신호가 없으면 단정하지 않고 false) 추가.
- `GlobeDashboard.tsx` — `ultraLite` 초기값을 로드하는 기존
  `useEffect`(마운트 후 1회, SSR 안전)를 수정: **저장된 선호가 있으면
  그 값이 항상 우선**(재방문·되돌리기 존중), **저장된 게 없을 때만**
  `estimateWeakDeviceHint()`로 초기값을 정한다. `useState` 자체는 그대로
  둬서(SSR 하이드레이션 불일치 방지) 기존 렌더 타이밍은 안 바뀐다 —
  달라지는 건 "그 첫 effect가 무엇으로 초기화하는가"뿐.
- 사용자에게 사양을 묻지 않는다는 기존 UX 결정은 그대로 유지 — 신호만
  조용히 읽는다. `probeFps` 실측이 오면(4.2초 후) 항상 그쪽이 이긴다.
- `src/lib/ultraLiteMode.test.ts` 신규 5개 — 코어 수·deviceMemory 임계값,
  신호 없을 때 단정 안 함, SSR(`window` 없음) 가드. **5/5 통과**.

### 8b. GlobeDashboard 상태 분해 — 조사 후 이번 세션 범위에서 제외

재확인 결과 상황이 감사 때보다 더 나빠졌다: `GlobeDashboard.tsx` 8,275→
**8,935줄**, `useState` grep 기준 64→**188**, `useEffect` **86**. 그런데
`useGlobeMapGlobeProps` 자체를 손보기 전에 `PausedMapGlobeView.tsx`의
커스텀 비교기를 다시 읽어보니, 감사가 이미 정정해둔 대로 **`interactionPaused`가
양쪽 true일 때만** 재렌더를 막고 그 외(평상시)엔 무조건 `false`를 반환한다
— 즉 지금은 `useGlobeMapGlobeProps`가 만드는 ~60필드 객체를 아무리
`useMemo`/`useCallback`으로 안정화해도, **평상시 경로에서 MapGlobeView
자체의 재렌더는 이 비교기 때문에 어차피 매번 일어난다.** (안쪽 개별
`useMemo`들 — `aircraftSymbolsGeoJson` 같은 — 은 각자의 deps가 안정적이면
여전히 스킵되므로 무의미하진 않지만, 감사가 기대한 "MapGlobeView 렌더 자체를
건너뛴다"는 효과는 비교기부터 같이 고치지 않으면 안 나온다.)

핸들러 ~60개를 전부 `useCallback`으로 감싸 올바른 deps를 새로 부여하는
작업은 이 세션에서 `tsc`/`next build`가 완주되지 않는 환경(OneDrive I/O,
본문 "미완 / 확인 필요" 참고)에서 검증 없이 진행하기엔 stale-closure 버그
위험이 크다고 판단해 **코드 변경 없이 보류**한다. 다음에 붙일 사람을 위한
실제 순서 제안:

1. `PausedMapGlobeView`의 비교기를 먼저 "평상시에도 의미 있게 비교"하도록
   바꾼다 (예: 핵심 data/handler 필드만 골라 얕은 비교, 또는 각 필드를
   `useCallback`/`useMemo`로 안정화한 뒤 비교기를 `Object.is` 전체 비교로
   단순화).
2. 그 다음에야 `useGlobeMapGlobeProps`의 핸들러 안정화가 실제로 렌더 스킵
   효과를 낸다 — 순서를 바꾸면 (1) 없이 (2)만 해도 눈에 보이는 개선이 없어
   "효과 없었다"고 오판하기 쉽다.
3. 로컬(OneDrive 아닌 경로 권장)에서 `npx tsc --noEmit`이 완주되는 환경을
   먼저 확보하고 진행할 것 — 60개 핸들러의 deps 배열을 손으로 채우는 작업은
   타입 체커 없이 검증 불가능에 가깝다.
