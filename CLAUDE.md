# CLAUDE.md

이 프로젝트(conflict-view, 임시 서비스명)에서 에이전트가 작업할 때 지켜야 할 규칙.

## 유저 인사이트 / 브리핑 설명 톤

유저에게 보이는 인사이트·브리핑·뉴스/경제 인사이트 문구를 쓰거나 고칠 때는
`.cursor/skills/insight-eli5/SKILL.md`(ELI5 기반)를 따른다.
기본 청중은 비전문가 성인 유저이며, Age 5 장난감 비유는 쓰지 않는다.

## 영유권 클레임 등 briefing류 텍스트 작성 규칙

`territorialDisputeEpisodes.ts`의 `briefing`/`briefingEn`/`presentLinkKo`/`presentLinkEn`,
그리고 같은 패턴을 따르는 다른 데이터 파일의 서술형 필드를 쓸 때 아래를 반드시 지킨다
(2026-09-16 확정, `scripts/fetch-territorial-claims.js` 남아시아 클레임 초안 작업 중 정리됨):

1. **전문용어·약어는 처음 등장할 때 괄호로 뜻을 풀어준다.**
   예: "LAC(실질통제선, 조약으로 측량된 정식 국경이 아니라 양측이 서로 다르게 인식하는
   실질 접촉선)". 지명·조약명처럼 고유명사인 경우도 낯설면 한 번은 괄호로 맥락을 준다
   (예: "1816년 수가울리조약(당시 네팔 왕국과 영국 동인도회사가 맺은 조약)").

2. **"마찰이 산발적으로 재발한다", "긴장이 지속된다" 같은 추상적·관료적 요약 문구 금지.**
   대신 현장에서 실제로 무슨 행동이 벌어지는지를 구체적 메커니즘으로 쓴다 — 누가 뭘 막고,
   뭘 부수고, 무엇으로(총인지 곤봉인지) 싸우는지, 왜 그런 방식으로 싸우는지(예: 국경협정상
   총기 금지)까지 포함. "실효지배가 순찰·초소·도로 경쟁으로 그때그때 다시 정해진다" 처럼
   메커니즘을 먼저 설명한 뒤, 그 메커니즘이 실제로 작동한 구체적 사건(연도·지명 포함)을
   순서대로 붙이는 구조를 기본으로 한다.

3. 2001년 이후(ICOW Territorial Claims 데이터셋의 커버리지 종료 시점) 상황은 반드시
   웹서치로 검증 후 반영한다 — 학습 지식만으로 채우지 않는다. `resolved=-9`(미해결)는
   "2001년 데이터 마감 시점 기준 미해결"이라는 뜻이지 "지금도 그렇다"는 보장이 아니므로,
   그 사이 실제로 해결된 케이스(예: 인도-방글라데시 벵골 엔클레이브, 2015년 국경협정으로
   해결됨)는 각주로 명시한다.

4. `briefing`/`presentLink` 초안은 스크립트가 자동 생성하지 않는다(TODO 플레이스홀더만
   생성) — 이 문서의 규칙을 따라 LLM이 초안을 잡고 필성이 검수하는 2단계 워크플로를 유지한다.

## 새 기능·레이어 추가 기준 (2026-10-17)

새 레이어·패널·모드는 **케이스 파일(기사 확인)의 증거 또는 판정에 연결될 때만** 노출한다.
발전소·철도·케이블·사일로·국경선처럼 속보의 원본이 아닌 지도 백과는 넣지 않는다. 그 층은 `src/lib/layerLab.ts`에서 항상 꺼 두고, 데이터 파일은 저장소에 두지 않는다. `NEXT_PUBLIC_LAB=1`로 되살리지 않는다.
화면 모드는 지정학 하나이며, 위성(세슘) 모드는 2026-11-06에 막고 4단계에서 코드까지 없앴다(아래 세슘 제거 항목).

## 2026-10-20 방향 번복 — 전체 버전 복원

같은 날 해역 대시보드로 줄였던 것(SeaDashboard 중심)을 되돌리고 전체 지정학 버전(`archive/geopolitics-full` 기준)을 기본으로 복원했다.
이유: 무료로 넓게 보여줄 전체 버전이 있어야 그 위에 프리미엄(해역 판단·알림)을 얹을 수 있다.
해역 축소판 코드와 이날 추가된 것(에너지 시설 피격, 양피지, 진영 면 등)은 복원 직전 `main` 커밋 이력에 남아 있다.
복원하면서 유지한 수정: Google Fonts 로컬화(빌드 안정성), MapLibre 워커의 버전 경로(`/maplibre-gl/<버전>/`).

## 2026-11-11 제품 방향 — 근거로 확인하는 지정학 속보 (첫 화면 = 속보 중심)

「Conflict-view 큰 그림 정리」 문서대로 방향을 바꾼다. 지구본 위에 지정학 속보를 찍고, 소식마다 출처와 확인 상태(확인·유력·자료 없음)를 붙이며, 이메일 브리핑(주 4회)으로 이어 준다. 해운은 폐기하지 않고 첫 연재 주제로 둔다.
- 랜딩 문구는 이 방향을 말한다. 아직 화면에 없는 것(국가 이니셔티브·분기점·시나리오·직접 판정·주 4회 메일)은 반드시 「준비 중」으로 적고, 이미 있는 것처럼 쓰지 않는다. 무료 범위는 미정이라고 쓴다.
- 신규 방문자의 첫 지구본 화면은 속보 중심이다(완료). 기본 패키지 `breaking`(`viewPackages.ts`), 레이어는 `firstScreenLayers.ts`의 `FIRST_SCREEN_BREAKING_ON/OFF`. 지구본은 마운트 때 `loadLayerPrefs()`만 읽으므로 레이어는 `layerPrefs.ts`의 `firstVisitLayerPrefs`에서 정해진다. 해운 패키지(`maritime`)와 그 레이어는 「무엇을 볼까요 → 해운 위험」용으로 남아 있다.
- `src/lib/firstScreen.test.ts`가 랜딩 약속과 첫 화면 레이어를 맞춰 지킨다. 레이어를 바꾸면 랜딩 문구와 이 테스트를 같이 고친다.
- 새 레이어·패널은 위 「새 기능·레이어 추가 기준」을 그대로 따른다. 케이스 파일의 증거나 판정에 연결될 때만 노출한다.
- 이메일: 지금 실제로 나가는 것은 매일 한 번의 해운 요약이다(`emailConsent.ts`의 동의 문구도 그 내용). 주 4회 지정학 브리핑 발송을 만들기 전에는 동의 문구와 랜딩 설명을 바꿔 쓰지 않는다.

## 서비스명 = conflict-view (임시, 2026-11-11)

서비스명은 당분간 **conflict-view**다. 확정 이름이 아니므로 사용자에게 보이는 이름은 `src/lib/brand.ts`(`BRAND_NAME`)만 거쳐 쓴다. 옛 이름(Strait Desk·Brave New World·GeoWatch)은 화면에 남기지 않는다.
- 인프라 식별자는 바꾸지 않는다: localStorage·IndexedDB 키 `straitdesk-*`, 설정 파일 `src/config/straitdesk.config.ts`, 도메인 `straitdesk.app`, 외부 호출 User-Agent `StraitDesk/…`, npm 패키지명 `strait-desk`. 바꾸면 방문자 설정이 초기화된다.
- 이미지로 구워진 이름(`public/brand/og-1200x630.png` 등)은 코드로 못 바꾼다. 이름이 정해지면 다시 만든다.

## 2026-11-06 세슘(위성) 제거

세슘은 뺀다. 지금 방향(근거 확인·연결·이니셔티브·시나리오·분기점)에서 세슘이 핵심인 곳이 없고, 번들·성능·유지보수 부담만 남기 때문이다.
- 1단계(완료): `SATELLITE_ENABLED = false` 스위치로 위성 진입을 전부 막았다(「위성으로 보기」 버튼, 모드 전환·부팅 복원, 진입 게이트·모드 스위처의 위성 항목). 빌드에서 세슘 에셋 복사도 뺐다. 스위치 파일(`satelliteAccess.ts`)은 4단계에서 지웠다.
- 2단계(완료, 2026-11-12): 묶음 PR로 죽은 코드를 지웠다. A(#426) 세슘 지구본·전용 훅·`satelliteLayers`, B(#428) `cesium` 패키지·에셋 스크립트·그리기 함수.
- 3단계(2026-11-12): 위성 전용 관측대 UI(하루 스크러버·해협 투어·리플레이·센서 칩·범례)와 녹화(`cesiumRecordClip`)를 지웠다.
- 4단계(완료): 위성 뷰어 모드 자체를 걷어냈다. `ViewerMode`에서 `"satellite"`를 빼고(`"live"`는 lab용으로 남김), GlobeDashboard와 훅의 `isSatelliteViewer`·`viewerMode === "satellite"` 분기, 세슘 핸들(`satelliteHandle.ts`)·관측 체험/페이월(`observeAccess.ts`, `ObservePaywallOverlay`)·확인 배너(`FlyToConfirmBanner`)를 지웠다. 속보·워치보드의 「위치로 가기」(`switchToObserveAndFly`, 이름만 옛것)는 이제 모드 전환 없이 지도에서 바로 flyTo만 한다. 옛 `?mode=satellite` 링크와 저장된 위성 모드는 지정학으로 열린다. `next.config.mjs`의 `swcMinify: false`도 뺐다(Next 14 기본값 true로 복귀).
- 4단계 뒤에 남은 것: `satellite-eye` 패키지 id(`viewPackages.ts`), 어디서도 안 쓰이는 `LiveuaFlashToast`·`LiveuaFlashParchment`·`IntelDeskTipCard`·`TheaterSitrepBook`·`LiveuaEventFocusCard` 컴포넌트와 그 상태(`theaterSitrepRegion` 등), 항상 닫히는 `incidentSpace` 사건 창, `docs/` 옛 문서의 위성 설명(문서 상단에 제거 표시를 달았다). 별도 PR로 지운다.
