# CLAUDE.md

이 프로젝트(Strait Desk, 구 Brave New World / 멋진 신세계 / GeoWatch)에서 에이전트가 작업할 때 지켜야 할 규칙.

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
연결되지 않으면 `src/lib/layerLab.ts`의 실험실(lab) 목록에 넣어 숨긴다(코드는 지우지 않는다, `NEXT_PUBLIC_LAB=1`로 풀림).
화면 모드는 지정학 하나이며 위성(세슘)은 사건 카드의 "위성으로 보기"로만 들어간다(`src/lib/viewerModePolicy.ts`).

## 2026-10-20 방향 번복 — 전체 버전 복원

같은 날 해역 대시보드로 줄였던 것(SeaDashboard 중심)을 되돌리고 전체 지정학 버전(`archive/geopolitics-full` 기준)을 기본으로 복원했다.
이유: 무료로 넓게 보여줄 전체 버전이 있어야 그 위에 프리미엄(해역 판단·알림)을 얹을 수 있다.
해역 축소판 코드와 이날 추가된 것(에너지 시설 피격, 양피지, 진영 면 등)은 복원 직전 `main` 커밋 이력에 남아 있다.
복원하면서 유지한 수정: Google Fonts 로컬화(빌드 안정성), MapLibre 워커의 버전 경로(`/maplibre-gl/<버전>/`).

## 2026-10-21 첫 화면 = 랜딩이 약속한 「해운 위험」

랜딩(해운 위험 상황실)에서 들어온 신규 방문자는 지정학 상황판이 아니라 해운 화면을 본다. 전체 지정학 버전은 그대로 있고 메뉴·「무엇을 볼까요」로 바꾼다.
- 신규 방문 레이어는 `layerPrefs.ts`의 `firstVisitLayerPrefs`(= `firstScreenLayers.ts`의 `FIRST_SCREEN_MARITIME_ON/OFF`)에서 정해진다. 지구본은 마운트 때 `loadLayerPrefs()`만 읽으므로 보기 패키지만 바꿔서는 첫 화면이 안 바뀐다.
- 기본 패키지 `maritime`(viewPackages.ts), 언어 선택 직후 히어로·「처음 화면으로」도 `buildDomainOverviewPrefs(…, { maritime })`로 같은 레이어.
- 해운 화면에서는 지정학 개관(핵탄두 수·전략태세 라벨)을 숨기고 길목 콜아웃(`MARITIME_OVERVIEW_CALLOUTS`)을 띄운다. (좌측 「오늘의 GTS」 패널·「오늘의 브리핑」 게이지·「오늘의 등불뉴스」 접힘 탭은 2026-10-22 화면에서 뺐다 — `DashboardOverlayHost`)
- 랜딩 문구(질문 넷·화면 읽는 법·불꽃)가 약속하는 레이어를 끄거나 실험실로 내리려면 랜딩 문구도 같이 고친다 (`src/lib/maritimeFirstScreen.test.ts`가 막는다).

## 2026-10-21 세슘에는 선박(AIS)을 그리지 않는다

세슘(위성)에는 선박 위치(AIS)를 그리지 않는다. 선박은 Datalastic·AISstream으로 보는 데이터이고, 지도(MapLibre)와 세슘에 둘 다 그리면 GPU가 무거워진다. 항공기·불꽃·해협 오버레이·라벨·사건 콜아웃 등 나머지는 세슘에도 그대로 그린다.
- 구현: `src/lib/satelliteLayers.ts`의 `cesiumShipProps` — `GlobeMapCanvas`가 세슘에 넘기는 선박 데이터·표시 플래그 6개(`aisVessels`, `disguisedVessels`, `showAis`, `showAisMilitary`, `showAisCommercial`, `showDisguisedVessels`)를 기본에서 비운다. 코드는 지우지 않고 `NEXT_PUBLIC_LAB=1`이면 예전대로 그린다.
- 아직 안 한 것: 위성 모드일 때 AIS·항공 등을 강제로 폴링하는 훅들(`isSatelliteViewer` 참조 지점 다수)은 그대로다. 선박을 안 그려도 AIS 폴링은 남는다.

## 2026-10-21 서비스명 = Strait Desk

서비스명을 **Strait Desk**로 바꿨다(구 Brave New World / 멋진 신세계 / GeoWatch). 뜻: Strait=해협(길목), Desk=상황실의 데스크. 헉슬리 소설 모티브는 폐기했다.
- 화면·메타데이터·카드·이메일 제목·User-Agent 는 전부 새 이름이다. 사용자에게 보이는 이름은 `src/lib/brand.ts`(`BRAND_NAME`)를 쓴다.
- **일부러 안 바꾼 것(인프라 식별자):** localStorage·IndexedDB 키(`geowatch-*` 등 — 바꾸면 방문자 저장 설정이 초기화된다), npm 패키지명·저장소명(`brave-new-world`)·Vercel/Cloudflare 프로젝트명, `src/config/geowatch.config.ts` 파일명, 도메인·UA 안의 연락 URL(`bravenew.world`).
- `docs/` 아래 날짜가 붙은 보고서·계획서는 당시 기록이라 옛 이름 그대로 둔다.
- 이미지로 구워진 이름(`public/brand/og-1200x630.png` 등)은 코드로 못 바꾼다 — 디자인 교체가 필요하다.
