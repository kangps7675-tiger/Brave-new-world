# GlobeDashboard.tsx 분리 로드맵 + 작업 로그

## HTML overlay factory 배선 + 미사용 import 정리 (2026-07-28)

- **`createDashboardHtmlOverlayElement`** (`src/components/globe/markers/createDashboardHtmlOverlayElement.ts`) —
  인라인 `createHtmlOverlayElement` 본문을 대체해 최종 배선 완료. GlobeDashboard는 factory 호출만 유지.
- 마커 factory 임포트(`createEventPinElement`, `createUsCarrierBadge`, `createMilAircraftBadge`,
  `createNeptunThreatBadge`, `createInfraStaticBadge` 등) 중 본문에서 더 이상 참조되지 않는 항목만 제거.
  `isHtmlStaticKind`, `buildExerciseBriefingContent`, `CARRIER_MARKER_ROOT_CLASS` 후보 중 실제 사용분
  (`isHtmlStaticKind` / `buildExerciseBriefingContent`)은 유지.
- 결과: GlobeDashboard.tsx **7,559줄**. `npx tsc --noEmit` exit 0.

---

## 7단계: 맵 캔버스 훅 분리 + DashboardTopChrome (2026-07-28)

- **`useGlobeMapGlobeProps`** (`src/components/globe/hooks/useGlobeMapGlobeProps.ts`) — 이전 단계에서
  보류했던 `GlobeMapCanvas` 셸 래핑을 완료. `PausedMapGlobeView`에 넘어가던 `pointColor`/`pointRadius`/
  `pathColor`/`polygonCapColor` 등 모든 accessor와 파생 값 계산을 훅으로 이관하고, GlobeDashboard는
  `useGlobeMapGlobeProps({...})` 호출 결과를 `<GlobeMapCanvas containerRef=... {...mapGlobeProps} />`로
  스프레드만 한다. `globe-shell` div + `PausedMapGlobeView` JSX(~900줄) + `LoadErrorBanner` 임포트 제거.
- **`DashboardTopChrome`** (`src/components/globe/DashboardTopChrome.tsx`) — `HoverNav` 블록(상단 검색·
  뷰 전환·레이어 드롭다운·`ModeGlobalIndexChip`/`GlobeSpinToggle`/`compactMenuExtra`)과 그 조건부 래퍼
  (`intelSheetOpen`/`entryGate`/`showModePicker`)를 `GeopoliticsChrome.tsx` 스타일로 추출. GlobeDashboard는
  `<DashboardTopChrome ... />` 한 번 호출로 대체.
- 두 추출로 더 이상 쓰이지 않게 된 컴포넌트/상수 임포트(`ModeGlobalIndexChip`, `GlobeSpinToggle`,
  `HoverNav`, `ViewModeSwitcher`, `BasemapModeToggle`, `LayerQuickDropdown`, `ExplorationTabs`,
  `EconomySupplyChainFixedToggle`, `FinintTicker`, `GpsJamFixedToggle`, `UsCarrierFixedToggle`,
  `CompactPresetChips`, `UtilityChromeMenu`, `ECON_EXPLORATION_PRESETS`, `US_DFC_LINK_COUNT`,
  `BRI_TRADE_LINK_COUNT`)를 GlobeDashboard.tsx에서 정리.
- 결과: GlobeDashboard.tsx **8,916줄 → 7,519줄** (−1,397줄, ~15.7%). `npx tsc --noEmit` 클린,
  `overlayQueue`/`tensionDrivers`/`tensionSpikeCut`/`stockTickers` vitest 21건 통과.

---

## 6단계: 카메라/네비 훅 + LayerPanelHost 배선 (2026-07-28)

- **`useGlobeCamera`** (`src/components/globe/hooks/useGlobeCamera.ts`) — 카메라 상태
  (`viewState`/`filterCenter`/`layerAltitude`/`isCameraMoving`) · refs(`configuredGlobe`,
  `layerCenterRef`, `layerAltitudeRef`, `layerLodTierRef`, idle 타이머류, `isCameraMovingRef`,
  `cameraTweenUntilRef`, `flyBusyTimerRef`) · `configureGlobe`/`flyTo`/`computeRegionFitAltitude`/
  `flyToBounds` · 몰입/자전/필터 동기화 이펙트를 그대로 추출. GlobeDashboard는 `historyEpisodeActive`가
  계산된 직후 이 훅을 호출하고, 반환된 `isCameraMovingRef`를 `useDataSync`에 넘기기 위해
  `useDataSync` 호출도 이 훅 바로 뒤로 이동(훅 순서 불변 유지).
- **`useTheaterNavigation`** (`src/components/globe/hooks/useTheaterNavigation.ts`) —
  `enterTheaterFocus`/`enterEconomyRegionFocus`/`flyToTheaterDetail` + 패키지 autoEnter·우크라
  전선 자동 줌·NEPTUN 자동 줌 이펙트를 1:1 추출. `enterTheaterFocusRef`/`enterEconomyRegionFocusRef`도
  훅이 소유(로컬 선언 제거).
- **`LayerPanelHost`** JSX 임포트·배선 완료 — 좌측 레이어 패널을
  `{showLeftPanel ? <LayerPanelHost ... /> : null}`로 교체(카운트류는 숫자 prop만 전달).
- 결과: GlobeDashboard.tsx **9,049줄 → 8,500줄**. `npx tsc --noEmit` 클린,
  `overlayQueue`/`tensionDrivers`/`tensionSpikeCut`/`stockTickers` vitest 21건 통과.
- `GlobeMapCanvas` 셸 래핑은 당시 `PausedMapGlobeView` 프롭이 매우 많아 보류했으나, 7단계에서
  `useGlobeMapGlobeProps` 훅으로 accessor 로직을 분리해 완료.

---

## 5단계 축소 (완료) + 후속 압축 (2026-07-28)

| 단계 | 내용 | 상태 |
|------|------|------|
| 1 | `geowatch.config` SSOT + overlayQueue 다듬기 + 핫전장 큐 편입 | 완료 |
| 2 | 실시간 폴링 — `useLiveVesselAirPolling` / `useLiveOsintPolling` | 완료 |
| 3 | `useGlobeOverlayModel` + HTML overlay factory | 완료 |
| 4 | `GlobeMapCanvas` JSX 분리 | 완료 |
| 5 | OverlayHost prop 번들 + LayerPanelHost | 완료 |
| 후속 | `useHoverCard` · `useSituationHtmlMarkers` · `useLiveGeoFeedPolling` | 완료 |

SSOT: [`src/config/geowatch.config.ts`](../src/config/geowatch.config.ts)  
오버레이 정본: [`src/lib/overlayQueue.ts`](../src/lib/overlayQueue.ts)

**현재 GlobeDashboard:** **7,559줄** (시작 ~10,885 → 누적 약 3.3k줄 감소).  
`createDashboardHtmlOverlayElement` 배선 완료. 남은 큰 덩어리: import 배럴, JSX return, 상류 path/marker memo.

---

## 5단계 완료 (2026-07-28)

- **`LayerPanelHost`** (`src/components/globe/LayerPanelHost.tsx`) — 좌측 레이어 패널
  `<aside className="intel-panel...">` JSX 전체(성능/Ultra-Lite·뷰 설정·레이어 드래프트·NEPTUN·데이터 상태
  카드)를 추출. GlobeDashboard는 `{showLeftPanel ? <LayerPanelHost ... /> : null}`만 렌더링.
  카운트류 prop(`gdeltEventsCount`, `disputesCount` 등)은 배열 대신 숫자만 넘겨 결합도를 낮췄다.
- **OverlayHost 경보 prop 번들** — `DashboardOverlayHost`의 시그니처(플랫 props)는 그대로 두어 회귀
  위험을 최소화하고, 대신:
  - `src/components/globe/DashboardOverlayHostProps.ts` — `AirRaidAlertGroup` / `MaritimeAlertGroup` /
    `TensionAlertGroup` / `HotTheaterAlertGroup` 그룹 타입(companion type file) 정의.
  - `src/components/globe/overlayHostPropGroups.ts` — `buildOverlayHostAlertProps({ airRaid, maritime,
    tension, hotTheater })` 헬퍼가 그룹 객체를 `DashboardOverlayHostProps`의 평탄한(flat) 서브셋으로
    변환. GlobeDashboard JSX에서 `{...buildOverlayHostAlertProps({...})}`로 스프레드해 공습경보·해상경보·
    긴장스파이크·핫전장 오퍼 관련 prop 20여 개를 그룹화된 리터럴로 정리.
- **후속 압축:** `useHoverCard`, `useSituationHtmlMarkers`, `useLiveGeoFeedPolling`(GDELT/FIRMS/UKMTO/NAVAREA/훈련·선박·양안·reef).
- 결과: GlobeDashboard.tsx **~10,885줄 → ~9,049줄**. `npx tsc --noEmit` 클린, 관련 vitest 통과.

---

## 2단계 완료 (2026-07-24)

- `useAmbientSoundSelectors` (`globe/hooks/`) — 앰비언트 사운드 셀렉터 5종 memo 이관 (~140줄 감소)
- `TourSequencer` (`globe/`) + `lib/dailyTour.ts` — 오늘의 투어 v1
- `DiscordLinkButton` — `NEXT_PUBLIC_DISCORD_INVITE` 설정 시 상단 크롬에 표시
- 레이어 굶김 수정 — `pickFairByKind` (staticGlobe.ts)
- 영어 패리티 — frictionEpisodes 등

현재 약 10,800여 줄. 2026-07-24 1단계 분리 완료.

## 완료 (1단계)

| 추출물 | 위치 |
|--------|------|
| `EntryGateHost` | `src/components/globe/EntryGateHost.tsx` |
| `useSceneDeeplink` | `src/components/globe/hooks/useSceneDeeplink.ts` |
| `sceneLink` | `src/lib/sceneLink.ts` |
| `SceneLinkButton` | `src/components/SceneLinkButton.tsx` |
| `analyticsEvents` | `src/lib/analyticsEvents.ts` |

패턴: 컴포넌트 → `src/components/globe/`, 훅 → `src/components/globe/hooks/`, 순수 로직 → `src/lib/`.

## 이전 후보 (완료)

1. ~~앰비언트 사운드~~ 
2. ~~UKMTO / NAVAREA~~ 
3. ~~공습경보~~ 
4. ~~긴장 스파이크 컷 + overlayQueue~~ 

## 검증 규칙

- 이 파일을 건드린 뒤에는 반드시 `npx tsc --noEmit` + 관련 vitest.
- 입장 플로우·딥링크·배너 top-1 회귀 체크.
