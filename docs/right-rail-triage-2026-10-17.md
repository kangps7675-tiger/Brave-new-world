# 우측 패널·레일 분류표 (2026-10-17)

대상: `src/components` 아래에서 화면 우측에 자리 잡는 패널/칩/토스트 (`absolute|fixed ... right-*`, `right:` 인라인, `flex-row-reverse` 레일).
기준: 타깃 = 해운사 운항·안전 담당 + 해상보험 전쟁위험 담당. 핵심 = 센서 교차검증으로 피격 보도를 확인됨 / 일부 확인 / 확인 못 함 판정. 핵심 증거 외는 lab.
짝 문서: `docs/layer-triage-2026-10-14.md` (레이어 등급). 코드는 수정하지 않음.

## 읽는 법

- **z** = `src/lib/uiStack.ts`의 `Z` 값. mapChrome 100 / mapControl 200 / nav 300 / navMenu 400 / panel 600 / immersive 700 / gate 800 / alert 900 / toast 1000. `z-[숫자]` 직접 지정은 숫자 그대로 표기.
- **viewerMode**: `economy` / `history` / `satellite`(`isSatelliteViewer`, 3D 확인 보기) / 그 외 = 일반 맵(conflict). `isPhoneUi`(폰 셸) / `isCompactUi`(태블릿·좁은 화면).
- 분류: **유지** = 슬롯 B 렌즈 패널 또는 슬롯 A 사건 스택 귀속 / **C** = 슬롯 C 피드 탭으로 이관 / **lab** = 실험실 숨김.
- 파일 위치: `GlobeDashboard.tsx`(GD), `globe/DashboardOverlayHost.tsx`(DOH), `globe/GeopoliticsChrome.tsx`(GC), `globe/DashboardTopChrome.tsx`(DTC).

## 1. 분류표 (39개)

| # | 컴포넌트 | 렌더 위치 · 조건 | 우측 좌표 (top / bottom) | z | 분류 | 이유 |
|---|---|---|---|---|---|---|
| 1 | IncidentStack | GD:6823 · `!isSatelliteViewer && !isPhoneUi` | `fixed right-3` / top `--mode-index-chip-bottom(4rem)+0.75rem` | mapControl 200 | 유지 (슬롯 A) | 사건 스택 그 자체 |
| 2 | ObserveDeskBookmarkRail (flash·alerts·board·verify·case 탭, `flex-row-reverse`) | GD:6873 · `isSatelliteViewer && !isPhoneUi` | `fixed right-0` / top 위와 동일 | mapControl 200 | 유지 (슬롯 B) | verify·case 탭이 교차검증 판정 본체. flash·alerts 탭은 C로 분리 후보 |
| 3 | observeTracksNudge 토스트 | GD:6980 · `observeTracksNudge && !isSatelliteViewer` | `fixed right-3` / top `--hover-nav-height(4.5rem)+0.5rem` | toast 1000 | lab | 온보딩 유도 문구, 증거 아님 |
| 4 | LiveuaFlashToast | GD:7004 · `isSatelliteViewer && !theaterSitrepRegion` | `fixed right-3` / top `hover-nav+0.5rem` | toast 1000 | C | 전선 속보(보도 소스)는 피드 탭 성격 |
| 5 | IntelDeskTipCard | GD:7149 · `isSatelliteViewer && intelDeskTipVisible && !theaterSitrepRegion` | `right: 0.75rem` / bottom `safe-area+5.5rem` | alert 900 | lab | 첫 사용 팁 카드 |
| 6 | IntelSourceDrill | GD:7170 · `intelDrillGate` (모드 무관) | `fixed bottom-4 right-3` | alert 900 | 유지 (슬롯 B) | 출처 드릴 = 판정 근거 열람 |
| 7 | MacroBriefingPanel | GD:6263 · `!intelSheetOpen && entryGate===null && !showModePicker && !periodicBriefing && !weeklyExpanded && (open\|folded)`; 진입 버튼은 `history`·`satellite`에서 숨김 | `fixed right: chip-width+0.85rem` / top `hover-nav+0.45rem`, bottom `bottom-intel-clearance+0.85rem` | panel 600 | C | 거시·시세 브리핑, 피드 탭 |
| 8 | NewsPerspectivesPanel | GD:7922 · `newsPerspectives` 있을 때 (모드 무관, `viewerMode` prop 전달) | `absolute right-3` / top `5.75rem` | panel 600 | C | 뉴스 관점·신뢰도 비교 |
| 9 | ModeGlobalIndexChip (우측 HoverSideDrawer) | DTC:178~200 · `viewerMode !== history && !== satellite` | 우측 서랍 (`side="right"`) | nav 300 | C | WTI·지표 칩 = 시세. 우측 점유폭을 `--mode-index-chip-width`로 노출해 다른 패널이 비켜 감 |
| 10 | ModeGlobalIndexChip 팝오버 (SES·지표 설명, 비임베드일 때) | 같은 파일 · `showSesChip` / `showExplain` | `fixed right: clamp(4.75rem,16vw,13.5rem)` / top `--mode-index-chip-stack-bottom+0.4rem` | navMenu 400 | lab | 제재 회피(SES) 패널, 증거 아님 |
| 11 | CorridorRailChip | GC:182 · `selectedCorridor && !selectedAxisLink && !hubBriefOpen && hubFocusMode not regime/arms && !historyImmersionActive` | `absolute right-3 top-20` | panel 600 | lab | 전략 회랑 설명 (10-14 문서에서 실험실) |
| 12 | AxisLinkChip | GC:194 · `selectedAxisLink && !hubBriefOpen && 같은 hubFocusMode 조건` | `absolute right-3 top-20` | panel 600 | lab | 블록·축 연결 (AxisNetwork, 실험실) |
| 13 | AxisArmsPanel | GC:210 · `SIPRI_ARMS_LENS_ENABLED && activeHubId && hubFocusMode==="arms" && payload && !hubBriefOpen` | `absolute right-3 top-20` | z-[600] | lab | 무기 거래 렌즈, 선박 피격 판정과 무관 |
| 14 | AxisRegimePanel | GC:221 · `hubFocusMode==="regime" && !hubBriefOpen && !regimeSelectedEpisodeId` | `absolute right-3 top-20` | z-[600] | lab | 체제 역사 렌즈 (history 계열) |
| 15 | DisputeHotspotPanel | GC:234 · `disputesOverviewOpen && !hubBriefOpen && 선택 에피소드 없음` | `absolute right-3 top-20` | z-[600] | lab | 영유권 분쟁 개요, 후순위 |
| 16 | LivingConflictPanel | GC:276 · `!isEconomyViewer && livingTaiwanOpen` | `absolute right-3` / bottom `5.5rem+safe-area` | z-[600] | lab | 타이완 리빙 분쟁, 후순위 |
| 17 | HubMonitorRail | GC:631 (DOH 계열 Hub chrome) · `activeHubId` | `absolute right-3 (sm:right-4)` / top `5.5rem` | panel 600 | lab | 지역 허브 모니터. 허브 내비는 실험실 묶음 |
| 18 | GdeltAlertPanel (데스크톱 하단 패널) | GC:479 · `!isEconomyViewer && !isUkraineTheaterFocus && !selected && !regionNavSelection && !isCompactUi && bottomAlertPanel==="gdelt"` | `absolute right-4` / bottom `1.25rem+safe-area` | z-[600] | C | GDELT = 뉴스 피드. BottomIntelStack:2390 `fullPage` 탭 버전이 이미 있음 |
| 19 | LocalAlertPanel | GC:493 · `!isEconomyViewer && !isUkraineTheaterFocus && !selected && !regionNavSelection && bottomAlertPanel==="local"` | `absolute right-4` / bottom `1.25rem+safe-area` | z-[600] | C | 지역 분쟁 경보 목록 = 피드 |
| 20 | UnifiedAirRaidDropdown (데스크톱, 상단 nav "알림" 서랍 안) | DOH:1089 · `!issueUiPausedForLamp && ((!isEconomyViewer && (showNeptun\|\|neptunAlertCount>0\|\|showTzevaAdom\|\|showNewfeedsIranAttacks)) \|\| (isEconomyViewer && showNewfeedsIranAttacks))` | 드롭다운 `absolute right-0` (nav 포털 내부) | 200 | C | 공습경보 (Neptun·Tzeva). 증거 레이어 자체는 지도에 남기고 목록 UI만 피드로 |
| 21 | NewFeedsIranPanel (데스크톱, 같은 서랍) | DOH:1112 · `showNewfeedsIranAttacks` | 드롭다운 `absolute right-0` | 200 | C | 이란·중동 공격 소식 = 보도 소스 |
| 22 | 공습경보 컴팩트 칩 묶음 (#20+#21 재사용) | DOH:1209~1241 · `!isPhoneUi && !intelSheetOpen && isCompactUi && !issueUiPausedForLamp && (#20과 같은 show 조건)` | `absolute right-3` / bottom `bottom-intel-clearance+0.65rem+safe-area` | 100 | C | #20과 동일 내용의 컴팩트 판 |
| 23 | 컴팩트 우상단 스택 (🔔 알림, TrustBadgeChip, SourcesLinkButton, ParchmentLinkButton) | DOH:1173 · `!isPhoneUi && !intelSheetOpen && isCompactUi` | `absolute right-3` / top `max(3.25rem, chip-bottom)+0.35rem` | 200 | C | 알림·신뢰도·출처 진입점 = 피드/뉴스 신뢰도 |
| 24 | 컴팩트 FAB 열 (SentinelModeButton, PlayHubButton + 팝업 `absolute bottom-11 right-0 z-[800]`, SoundMuteControl, 실시간 중계 종료 칩) | DOH:1333 · `gateClosed && !isPhoneUi && (isCompactUi \|\| liveBriefingSession)` | `fixed right-4 sm:right-5` / bottom `cv-chrome-fab-bottom` 또는 `bottom-5 sm:bottom-6` | z-[900] | lab | 센티넬·게임·사운드는 제품 핵심 아님 |
| 25 | FeatureGuidePanel | DOH:1258 · `showFeatureGuide` (viewerMode prop 전달) | `fixed right-3 top-14` / max-h `100vh-4.5rem` | panel 600 | 유지 | 슬롯 귀속은 아니나 공통 도움말, 삭제 대상 아님. 내용만 3판정 기준으로 갱신 필요 |
| 26 | NewsTrustTierPanel | DOH:1299 · `open={showTrustPanel}` | `absolute right-3 top-14` | z-[600] | C | 뉴스 신뢰도 등급 = 피드 탭 부속 |
| 27 | MethodologySourcesPanel | DOH:1305 · `showSourcesPanel` | `fixed bottom-3 right-3` | z-[600] | 유지 (슬롯 B) | 판정 방법론·출처 공개. 보험 담당 신뢰 근거 |
| 28 | NatoPerimeterHalfParchment | DOH:1991 · `natoPerimeterAlert.phase==="tier2" && cross && story` | `fixed inset-y-0 right-0` (전체 높이, 폭 `28rem` / sm `32rem`) | alert 900 | C | NATO 경계 침범 경보 = 경보 피드 (해상 비핵심) |
| 29 | TourInviteBanner | DOH:1739 · `open={showTourInvite && !showFirstVisitTour && !periodicBriefing && !weeklyExpanded}` | `fixed bottom 5.5rem+safe-area, sm:right-4` | z-[600] | lab | 투어 초대 |
| 30 | LampRoleTipBanner | `LampRoleTipBanner.tsx:57` (렌더 지점은 이 문서에서 미확인) | `fixed bottom 5.5rem+safe-area, sm:right-4` | z-[600] | lab | 램프 역할 팁 |
| 31 | UltraLiteOfferBanner | DOH:1912 · `show("ultraLite")` | `fixed right-3 sm:right-4` / bottom `bottom-intel-clearance+1rem+safe-area` | panel 600 | lab | 경량 모드 제안 |
| 32 | SoundUnmuteNudge | DOH:2102 · 항상 렌더 (`ready=soundUnmuteReady`) | `fixed right-3 sm:right-4` / bottom `clearance+1rem+safe-area` | panel 600 | lab | 소리 안내 |
| 33 | LayerCacheStaleBadge | DOH:2116 · 항상 렌더 (캐시 오래됐을 때만 보임) | `fixed right-3` / bottom `clearance+0.35rem+safe-area` | panel 600 | 유지 (슬롯 B) | 데이터 신선도 = 증거 신뢰 표시 |
| 34 | CesiumSatelliteGlobe 선택 사건 카드 | `globe/CesiumSatelliteGlobe.tsx:4488` · `status==="ready" && selectedConflict` (satellite 전용) | `absolute right-3 top-3` | z-20 (지구본 컨테이너 내부) | 유지 (슬롯 A) | 선택한 사건 상세 |
| 35 | CesiumSatelliteGlobe hoverTip | `:4310` · `hoverTip.y <= 36`일 때만 우측 고정 | `right: 12, top: 12` | z-30 | 유지 (슬롯 B) | 호버 툴팁 (임시) |
| 36 | CesiumSatelliteGlobe 출처 표기 | `:4222` | `absolute bottom-1 right-2` | z-20 | 유지 | 지도·위성 저작권 표기, 제거 불가 |
| 37 | Post2020ConflictsDropdown | `Post2020ConflictsDropdown.tsx:104` · 렌더 지점 없음 (검색 결과 import 0건) | `absolute right-0 top-full` | z-[200] | lab | 미사용 죽은 코드, 정리 후보 |
| 38 | TzevaAdomPanel (독립 드롭다운) | `TzevaAdomPanel.tsx:211` · 렌더 지점 없음 (타입만 import) | `absolute right-0` | z-[200] | lab | #20 UnifiedAirRaidDropdown으로 대체됨, 죽은 코드 |
| 39 | UkraineAirRaidPanel (독립 드롭다운) | `UkraineAirRaidPanel.tsx:217` · 렌더 지점 없음 | `absolute right-0` | z-[200] | lab | 위와 동일 |

### 분류별 개수

| 분류 | 개수 | 번호 |
|---|---|---|
| 유지 | 9 | 1, 2, 6, 25, 27, 33, 34, 35, 36 |
| C (슬롯 C 피드 탭) | 12 | 4, 7, 8, 9, 18, 19, 20, 21, 22, 23, 26, 28 |
| lab | 18 | 3, 5, 10, 11~17, 24, 29, 30, 31, 32, 37, 38, 39 |
| 합계 | 39 | |

### 조사에서 제외한 것 (우측 `right-*`가 있어도 패널이 아님)

- 카드·버튼 내부 부품: `BottomIntelStack.tsx:2551`(뉴스 카드 우상단 버튼 열), `DailyBriefingChrome`·`ParchmentLetter`·`LiveuaFlashParchment`·`PurposeJobOverlay`·`ViinaFrontEventsPanel`의 닫기(✕) 버튼, `DataSourceParchmentOverlay`, `TzevaAdomPanel`/`UnifiedAirRaidDropdown`의 뱃지 점.
- 드롭다운 폭 맞춤(`left-0 right-0`): `HoverNav`, `IntelSheetSearchBar`, `HubMonitorRail:77`, `ReplayTimeline`, `LampEconomyQuoteBoard`.
- `UtilityChromeMenu` 드롭다운(`right-0 z-600`): 기본이 좌측 서랍(`menuAlign="left"`)이라 우측 고정 패널이 아님.

## 2. 같은 우측 좌표를 쓰는 겹침 후보 쌍

"동시 노출 가능"은 코드 조건상 같은 화면에 함께 뜰 수 있는지를 뜻함. 실제 화면 확인은 안 함.

| # | 쌍 | 공유 좌표 | z | 동시 노출 | 판단 |
|---|---|---|---|---|---|
| A | CorridorRailChip(#11) · AxisLinkChip(#12) | `right-3 top-20` | 둘 다 panel 600 | 코드가 막음 (Corridor는 `!selectedAxisLink`) | 안전, 단 암묵 규칙 |
| B | AxisLinkChip/CorridorRailChip(#11,#12) · AxisArmsPanel(#13) · AxisRegimePanel(#14) | `right-3 top-20` | 600 | 막음 (칩은 `hubFocusMode` arms/regime에서 숨김) | 안전 |
| C | DisputeHotspotPanel(#15) · AxisRegimePanel(#14)/AxisArmsPanel(#13)/칩(#11,#12) | `right-3 top-20` | 600 | **가능** (#15 조건에 hubFocusMode 배제 없음) | 위험, z 같아 DOM 순서로 가려짐 |
| D | HubMonitorRail(#17) · top-20 계열(#11~#15) | `right-3`, top 5.5rem vs 5rem (0.5rem 차이, 폭 300px vs 320~340px) | 600 | **가능** (`activeHubId`만 있으면 레일이 뜸) | 위험, 거의 완전 겹침 |
| E | NewsPerspectivesPanel(#8) · top-20 계열(#11~#15) · HubMonitorRail(#17) | `right-3`, top 5.75rem | 600 | **가능** | 위험, 폭 380px로 더 넓어 아래 패널을 덮음 |
| F | FeatureGuidePanel(#25) · NewsTrustTierPanel(#26) | `right-3 top-14` | 600 | **가능** (둘 다 헬프/신뢰도 모달 형태) | 위험, 같은 z에 폭 360 vs 420 |
| G | FeatureGuidePanel/NewsTrustTierPanel(top-14) · NewsPerspectivesPanel/top-20 계열 | `right-3`, top 3.5rem vs 5~5.75rem | 600 | 가능 | 위험, 세로로 일부 겹침 |
| H | IncidentStack(#1) · HubMonitorRail(#17) 등 top-20/5.5rem 패널 | `right-3`, top `chip-bottom(4rem)+0.75rem` ≒ 4.75rem | 200 vs 600 | **가능** (#1은 `!isSatelliteViewer && !isPhoneUi` 일반 맵) | 위험, 패널이 사건 스택을 가림 |
| I | ObserveDeskBookmarkRail(#2) · LiveuaFlashToast(#4) | 우상단, top 4.75rem vs 5rem | 200 vs 1000 | **가능** (둘 다 satellite) | 토스트가 레일 윗부분을 일시 가림 (의도된 토스트) |
| J | IncidentStack(#1) · observeTracksNudge(#3) | `right-3`, top 4.75rem vs 5rem | 200 vs 1000 | 가능 (#3은 `!isSatelliteViewer`) | 토스트가 가림, 일시적 |
| K | LiveuaFlashToast(#4) · observeTracksNudge(#3) | `right-3 top hover-nav+0.5rem` 완전 동일 | 1000 | 불가 (satellite vs 비-satellite) | 안전 |
| L | Cesium 선택 사건 카드(#34) · Cesium hoverTip(#35) | `right-3 top-3` vs `right:12 top:12` (동일) | 20 vs 30 | **가능** (호버 y<=36일 때) | 위험, 툴팁이 카드 위 |
| M | Cesium 선택 사건 카드(#34) · ObserveDeskBookmarkRail(#2) | 우상단 (카드는 지구본 컨테이너 내 top-3, 레일은 화면 기준 top 4.75rem) | 20 vs 200 | 가능 | 위험, 레일 쪽이 위 |
| N | MacroBriefingPanel(#7) · ModeGlobalIndexChip 서랍(#9) | `right: chip-width+0.85rem`로 칩 폭만큼 비움 | 600 vs 300 | 가능 | 안전 (변수로 회피 설계) |
| O | GdeltAlertPanel(#18) · LocalAlertPanel(#19) | `right-4 bottom 1.25rem` 완전 동일 | 600 | 불가 (`bottomAlertPanel` 한 값만) | 안전 |
| P | GdeltAlertPanel(#18)/LocalAlertPanel(#19) · MethodologySourcesPanel(#27) · IntelSourceDrill(#6) | 우하단 `right-3/4`, bottom 1.25rem / 0.75rem / 1rem | 600 / 600 / 900 | **가능** | 위험, 같은 우하단 모서리 |
| Q | LivingConflictPanel(#16) · IntelDeskTipCard(#5) · TourInviteBanner(#29) · LampRoleTipBanner(#30) | 우하단 bottom `5.5rem+safe-area`, `right-3` / `0.75rem` / `sm:right-4` | 600 / 900 / 600 / 600 | **가능** | 위험, 같은 높이대. 배너 둘은 완전 동일 좌표 |
| R | UltraLiteOfferBanner(#31) · SoundUnmuteNudge(#32) · LayerCacheStaleBadge(#33) | 우하단 `right-3`, bottom `bottom-intel-clearance + 1rem / 1rem / 0.35rem` | 모두 panel 600 | **가능** | 위험, #31·#32는 완전 동일 좌표(`w-[min(92vw,20~21rem)]`) |
| S | 공습경보 컴팩트 칩(#22) · 컴팩트 FAB 열(#24) | 우하단 `right-3` vs `right-4/5`, bottom `clearance+0.65rem` vs `cv-chrome-fab-bottom` | 100 vs 900 | 가능 (둘 다 `isCompactUi && !isPhoneUi`) | 위험, FAB가 위 |
| T | 컴팩트 우상단 스택(#23) · IncidentStack(#1) | `right-3` / top `max(3.25rem,chip-bottom)+0.35rem` ≒ 3.6rem vs 4.75rem | 200 vs 200 | **가능** (#1은 `!isPhoneUi`, #23은 `isCompactUi`) | 위험, 같은 z에 세로 겹침 |
| U | NatoPerimeterHalfParchment(#28) · 우측 전체 | `right-0 inset-y-0` 전체 높이 | 900 | 가능 | 의도된 전면 경보, 단 아래 모든 우측 패널을 덮음 |

## 3. 정리 순서 제안 (코드는 건드리지 않음, 후속 작업용)

1. 죽은 코드 3건(#37~39)은 삭제하거나 lab 플래그 아래로 이동. 영향 없음.
2. top-20 계열(#11~#15) + #17 + #8은 전부 lab/C라서 숨기면 겹침 D·E·G가 한 번에 사라짐. 가장 이득이 큼.
3. 슬롯 A(#1)는 우상단 고정 칸이므로, 남는 우측 패널(#2, #27, #33)과 좌표가 겹치지 않게 별도 예약 영역 확보 필요 (겹침 H·T).
4. 우하단 온보딩 배너 4종(#29~#32)은 lab으로 보내고, 남는 것은 #6·#27·#33뿐이라 겹침 P·Q·R이 사라짐.
5. 확인 못 한 것: #30 LampRoleTipBanner의 실제 렌더 지점, #17 HubMonitorRail의 `activeHubId` 진입 UI (지역 허브 내비를 숨길 때 같이 정리해야 함).
