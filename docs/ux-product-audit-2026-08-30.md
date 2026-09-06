# 유저 관점 프로덕트 진단 리포트 (2026-08-30)

**범위:** 진단만. 코드 수정 없음 — 우선순위를 정한 뒤 다음 세션에서 항목별로 착수.
**방법:** 사용자가 실제로 사용해보고 남긴 피드백 원문을 코드로 추적해, "느낌"이 아니라 파일·라인 단위 근거를 남겼다.
**교차 참조:** `docs/ux-perf-remediation-2026-08-06.md` — Phase 0~3 전 항목이 `[x]` 완료로 표시돼 있다. 이번 리뷰에서 그중 P0-1(WebGL 폴백)과 정확히 같은 증상이 다시 재현됐다. 즉 "체크리스트상 완료"와 "실제 사용자가 겪는 상태" 사이에 괴리가 있다 — 아래 2번 항목 참고.

---

## 0. 종합 판단

버그 개수보다 심각한 건 두 가지다.

첫째, **같은 숫자가 화면마다 다르게 보인다.** GTI(긴장지수)가 상단 칩과 좌측 패널에서 서로 다른 값을 보여준 건 우연한 렌더링 버그가 아니라, 코드에 "공식 스냅샷"과 "클라이언트 폴백 계산"이라는 두 개의 서로 다른 산출 경로가 실제로 공존하기 때문이다(1번 항목). 지정학·경제 데이터를 다루는 서비스에서 이건 사소한 버그가 아니라 신뢰 문제다.

둘째, **핵심 기능이 조용히 죽을 수 있는 지점이 아직 남아 있다.** WebGL 초기화 실패 시 안내 없이 빈 화면만 뜨는 문제는 이미 2026-08-06에 최우선 과제로 진단되고 "완료" 표시까지 됐는데, 이번 리뷰에서 똑같은 증상이 재현됐다(2번 항목). 완료 체크와 실제 상태가 어긋나 있다는 뜻이라 다른 "완료" 항목들도 재검증이 필요할 수 있다.

나머지(검색/묻기 혼동, DFC·BRI 단위 불명확, 툴팁 겹침, 게임화 톤)는 개별 UX 결함이고, 3번(제품 정체성)은 코드로 해결되지 않는 별도 트랙이다.

---

## 1. [Critical] GTI 이중 계산 경로 — 화면마다 다른 숫자

> **[2026-08-31 수정 완료]** 실제 근본 원인은 "계산식 차이"보다 **fetch 파편화**였다 —
> `/api/daily-ranks`를 GlobeDashboard.tsx(상단 칩), `DailyRankSharePanel.tsx`(좌측 패널)
> 등 최소 9곳이 각자 독립적으로 호출하고 있어, cron 갱신 타이밍에 따라 같은 순간에도
> 서로 다른 스냅샷을 받을 수 있었다. `src/lib/worldTensionStore.ts`(신규) + 
> `useWorldTensionSnapshot`로 단일 소스 캐시를 만들고, 상단 칩과
> 좌측 패널(DailyRankSharePanel)이 이 캐시 하나만 구독한다. 폴백값
> (`method === "theater-blend-fallback"`) 사용 시 "잠정치/provisional" 배지를
> 상단 칩·좌측 패널 모두에 노출한다.
>
> **[2026-08-31 후속 완료]** 리포트에 남겨 둔 `MobileHomeView.tsx` 독립 fetch도
> `useWorldTensionSnapshot`으로 합쳤다. 모바일 「분쟁」 탭 GTI도 데스크톱과 같은
> 캐시·정수 점수(`displayGtiScore`)·잠정치 배지를 쓴다. 공습 경보(NEPTUN/Tzeva)
> fetch는 그대로 두었다. `yesterdayCorrectPct` 전용 호출(`MobileAlertFeed`)과
> 랭킹 목록용 `limit>1` 호출은 GTI 점수 표시가 아니라서 캐시 밖에 둔다.

**증상:** 상단 칩 59 vs 좌측 패널 56, 전일 대비 +2 vs +1.9.

**근거:**
- `src/lib/gti.ts` 자체 주석: "칩이 정수로 반올림하면 브리핑(1.9)과 어긋난다(계획의 '2 vs 1.9')" — 이 정확한 불일치가 이미 코드 주석에 문서화돼 있다.
- `src/lib/dailyRanks.ts:52-75` `deriveWorldTensionFromTheaters()` — "공식 GTI 행(kind=world)이 없을 때의 대체 산출"이라는 주석과 함께, cron이 적용하는 **EMA 스무딩을 적용하지 않고** 그날 전장 점수만으로 즉시 블렌딩하는 별도 계산 경로.
- `src/lib/dailyRanks.ts:330-338` `withTensionFallback()` — 공식 스냅샷이 없으면 이 폴백을 자동으로 끼워넣는다. 요청 타이밍에 따라 어떤 화면은 공식 스냅샷을, 어떤 화면은 스무딩 없는 폴백값을 받을 수 있다.
- `src/components/WorldTensionChip.tsx:99-110` — 이 컴포넌트 자체는 `displayGtiScore`/`displayGtiDelta` 헬퍼를 정상적으로 쓰고 있어 표시 반올림 로직은 안전하다. 문제는 표시 로직이 아니라 **어떤 스냅샷을 넘겨받는지**가 화면(컴포넌트)마다 달라질 수 있는 상위 데이터 흐름이다.

**권장:**
- 클라이언트 폴백 계산을 없애고 서버가 항상 스무딩된 단일 스냅샷만 반환하도록 하거나,
- 폴백이 실제로 쓰였을 땐 "추정치" 배지를 노출해 사용자가 두 숫자가 다른 소스라는 걸 알 수 있게 한다.
- '위성 화재가 평소보다 훨씬 많음' 류의 서술형 경고도 같은 맥락 — 기준 기간·평균·가중치를 곁들이지 않으면 검증 불가능한 블랙박스 점수로 보인다. `gtiMethodologyCopy()`(같은 파일)에 이미 산출식 설명이 있으니, 개별 이상 신호 문구에도 "최근 N일 평균 대비"처럼 기준을 인라인으로 붙이는 걸 권장.

---

## 2. [Critical] WebGL 초기화 실패 시 무증상 블랙아웃 — "완료" 체크리스트와 실제 상태 불일치

> **[2026-08-31 수정 완료]** 아래 진단대로 세 지점을 손봤다.
> (1) `src/components/MapGlobeView.tsx` — `<Map>`을 감싸는 컨테이너에
> `webglcontextcreationerror`를 **캡처 단계**로 미리 걸어둠(캔버스가 생기기
> 전부터 잡아야 함) + `<Map onError>` 연결(첫 로드 전 오류만 치명적으로 간주,
> 로드 후 오류는 maplibre가 알아서 처리하므로 무시) + 15초 타임아웃 안전망
> (이벤트 자체가 안 뜨는 조용한 실패까지 대비). 실패 시 새로 만든
> `MapInitFailedOverlay`(재시도 버튼, 자동 복구를 전제하지 않는 문구)를 띄운다.
> (2) `src/components/GlobeLoadingScreen.tsx` — 로딩 셰이더 cleanup에서
> `WEBGL_lose_context`로 컨텍스트를 명시적으로 반납하도록 추가(그동안
> program/buffer만 delete하고 컨텍스트 자체는 안 놓고 있었다 — `webglSupport.ts`
> 자신의 probe는 이미 하고 있던 걸 실제 셰이더는 안 하고 있었다).
> `tsc --noEmit`, `eslint` 클린 확인. Playwright e2e 스모크(`e2e/smoke.spec.ts`)는
> 로컬 설치가 필요해 이번 세션에선 실행하지 못함 — 실제 저사양 GPU 재현 테스트는
> 사람이 한 번 더 확인 권장.
>
> 변경 파일: `src/components/MapInitFailedOverlay.tsx`(신규),
> `src/components/MapGlobeView.tsx`, `src/components/GlobeLoadingScreen.tsx`.

**증상:** 지도만 완전히 빈 화면, 오류·대체 안내 없음, 주변 패널은 정상 표시.

이 정확한 증상이 `docs/ux-perf-remediation-2026-08-06.md`의 P0-1(최우선)로 이미 진단됐고 체크리스트엔 `[x]` 완료로 표시돼 있다. 그런데 이번 리뷰에서 재현됐다. 코드를 추적하면 "부트 시점 감지"는 되어 있지만 "감지 통과 이후 실제 생성 실패"는 여전히 안 잡힌다는 걸 알 수 있다.

**근거 (추적 순서):**
1. `src/lib/webglSupport.ts` — 부트 최초 1회, 최소 옵션 canvas로 컨텍스트 생성 가능 여부만 확인한 뒤 `WEBGL_lose_context`로 **즉시 반납**한다(주석: "GPU 메모리를 붙잡지 않는다"). 결과는 캐싱.
2. `src/components/GlobeBootLoader.tsx:63` — 이 probe 결과가 "webgl2"면 그냥 통과시키고 실제 지도를 마운트한다. 즉 여기서 통과했다고 해서 나중에 실제 지도용 컨텍스트 생성이 반드시 성공한다는 보장은 없다.
3. `src/components/GlobeLoadingScreen.tsx:322` — 로딩 셰이더가 **별도의 WebGL1 컨텍스트**를 직접 생성해서 쓴다. 그런데 정리(cleanup, 라인 385-389)에서 `gl.deleteProgram` / `gl.deleteBuffer`만 호출하고, `webglSupport.ts`가 스스로 "필수"라고 못박은 `WEBGL_lose_context` 반납은 하지 않는다.
4. 로딩 화면→대시보드 전환 시점(`yieldGpu` 플래그, `GlobeBootLoader.tsx:273`)에 로딩 셰이더가 물러나면서 위 컨텍스트가 확실히 반납되지 않은 채로, `src/components/MapGlobeView.tsx`의 `<Map>`(react-map-gl)이 실제 WebGL2 컨텍스트를 새로 요청한다.
5. `src/components/MapGlobeView.tsx` — `webglcontextlost` 리스너(라인 1024)는 있다. 이건 "생성된 컨텍스트가 나중에 소실"되는 경우만 잡는다. **`webglcontextcreationerror`(애초에 생성 자체가 실패하는 경우) 리스너는 코드베이스 전체에 없다.** `<Map onLoad={handleLoad} ...>`(라인 2023)에도 `onError`가 연결돼 있지 않다 — react-map-gl이 내부적으로 잡는 에러를 상위로 올릴 통로 자체가 없다.

**가장 유력한 가설(미검증, 재현 필요):** 3~4번 지점에서 로딩 셰이더 컨텍스트가 완전히 반납되지 않은 채 실제 지도가 새 컨텍스트를 요청 → 저사양/구형 GPU나 컨텍스트 수 제한이 있는 드라이버에서 생성 실패 → 5번 지점의 공백 때문에 아무도 못 잡고 조용히 빈 화면.

**권장:**
- `<Map>`에 `onError` 연결 — 최소한 "지도를 불러오지 못했습니다, 새로고침" 안내라도 뜨게.
- `webglcontextcreationerror` 리스너 추가.
- `GlobeLoadingScreen.tsx` cleanup에 `WEBGL_lose_context` 반납 추가(정확히 `webglSupport.ts`가 이미 하고 있는 패턴).
- `docs/ux-perf-remediation-2026-08-06.md`의 다른 "완료" 항목들도 이번처럼 실사용 재현 검증을 한 번 더 거치는 걸 권장 — 체크 표시가 실제 검증을 반영하지 못했을 가능성이 있다.

---

## 3. [Critical / 전략 — 코드로 해결 불가] 제품 정체성 불명확

사용자가 지적한 대로: 실시간 분쟁 지도, OSINT/텔레그램, 군사 활동, GTI, 경제·물류 지표(GSCPI·PortWatch·화물 스트레스), 해운/AIS, 지정학 관계망(DFC/BRI), 시장 정보, 예측 게임이 한 서비스 안에 공존한다.

코드 규모가 이 진단을 뒷받침한다: `src/` 아래에만 953개 `.ts`/`.tsx` 파일, `src/lib/`에 `databento`, `maritime`, `navarea`, `licensing`, `llm`, `news` 등 서로 거의 무관한 도메인 라이브러리가 나란히 존재한다.

이건 리팩터링으로 풀리지 않는다. "누구를 위한 제품인가"를 먼저 정해야, 그 뒤에 어떤 기능을 1차 화면/2차 메뉴/제거로 재배치할지 실행 계획을 짤 수 있다. 이번 리포트에서는 진단만 남기고, 방향이 정해지면 별도로 정보구조 재설계 계획을 잡는 걸 권장.

---

## 4. [High] 검색창 vs 묻기 버튼 — 의미 경계 모호

> **[2026-08-31 수정 완료]** 검색 0건일 때 "장소·국가·분쟁 이름만 찾는다"는 안내와
> 「묻기로 레이어 켜기」 버튼을 드롭다운에 붙였다(`HoverNav.tsx`). 묻기 오버레이가
> 있는 화면에서만 버튼이 뜬다.

**근거:**
- `src/components/HoverNav.tsx` — 검색 input(placeholder는 `src/lib/viewerChrome.ts` "지명 · 국가 · 분쟁 검색")과 바로 옆에 "묻기" 버튼이 나란히 배치돼 있다.
- 검색 자체의 라벨링은 정직하다(장소/국가/분쟁 이름 한정 명시). 문제는 두 컨트롤이 인접해 있고 목적이 비슷해 보인다는 점 — 사용자가 자연어 질문이나 일반 키워드를 "검색"에 입력하면 매치되는 장소가 없어 아무 반응이 없는 것처럼 느껴지고, "묻기"가 레이어를 켜는 기능이라는 건 툴팁을 봐야 알 수 있다.

**권장:** 검색 결과가 0건일 때 "묻기를 사용해보세요" 유도 문구 노출, 또는 두 컨트롤을 시각적으로 더 분리(간격·아이콘·라벨 상시 노출).

---

## 5. [Medium] DFC/BRI 뱃지 숫자 단위 불명확 + 두 토글 문구 불일치

> **[2026-08-31 수정 완료]** 뱃지를 `연결선 N개` / `N links`로 바꾸고
> `aria-label`을 붙였다. DFC·BRI 툴팁 detail을 둘 다 "프로젝트 연결선 표시"로 통일
> (`EconomySupplyChainFixedToggle.tsx`).

**근거:** `src/components/EconomySupplyChainFixedToggle.tsx`
- 뱃지(`usLinkCount`/`chinaLinkCount`, 라인 60-66 부근)에 숫자만 노출, 단위 텍스트도 `aria-label`도 없음.
- 툴팁 문구가 서로 다르다: DFC는 "프로젝트 연결선 표시"(라인 39), BRI는 "일대일로 무역·운송 연결선 표시"(라인 73 부근) — 같은 종류의 숫자(연결선 개수)인데 하나는 "프로젝트", 하나는 "무역·운송"이라는 다른 단어를 써서 100과 82가 서로 다른 종류의 값처럼 보인다.

**권장:** 뱃지에 "연결선 82개"처럼 단위를 직접 포함시키고, 두 토글의 툴팁 문구 패턴을 통일.

---

## 6. [Medium, 가설 — 재현 필요] 경제 모드 전환 시 지정학 레이어 잔존 가능성

> **[2026-08-31 검증 + 보강 완료]** `mergeChromeLayers(..., "economy")`는 이미
> `showUkraineControl` / `showWarZones` / `showNeptun` 등을 강제 OFF한다
> (`viewerChrome.ts` ECONOMY_FORCE_OFF). 범례 UI도 `!isEconomyViewer` 가드가 있다.
> 남은 구멍은 맵 GeoJSON: `showUkraineControl`이 한 프레임 늦게 꺼져도 폴리곤이
> 남을 수 있어, `GlobeDashboard`의 우크라 macro/micro GeoJSON을
> `isEconomyViewer`일 때 빈 FeatureCollection으로 고정했다.
> 회귀 테스트: `firstScreenLayers.test.ts` 「지경학 크롬이 우크라 점령·전선·NEPTUN을 강제 OFF」.

**근거:** `src/components/globe/GeopoliticsChrome.tsx` — `!isEconomyViewer` 가드로 여러 패널·범례가 모드별로 숨겨진다(예: 라인 310, 319, 446, 466). 즉 "패널 UI"는 모드에 반응하도록 짜여 있다.

다만 이 가드는 패널 컴포넌트 단위이고, 사용자가 이미 켜둔 개별 레이어 토글(점령지·전선 등)은 별도의 지속 상태(layerPrefs류)로 보이며, 모드 전환 시 이 레이어 상태가 자동으로 꺼지는지는 이번 코드 리딩만으로는 확인하지 못했다. 사용자가 보고한 "경제 모드에서도 우크라이나 점령·진격 범례가 남아 있다"는 증상과 구조적으로 부합하는 지점이라 우선순위 상위에 뒀다.

**권장:** 실제로 지정학 모드에서 프런트라인/점령 레이어를 켠 뒤 경제 모드로 전환해 재현 여부 확인. 재현되면 모드 전환 핸들러에서 지정학 전용 레이어를 강제로 끄거나 흐리게 처리.

---

## 7. [Medium] 툴팁/패널 충돌 — 기존 z-index 감사와는 다른 문제

> **[2026-08-31 수정 완료]** `ModeGlobalIndexChip`에 `data-chrome-obstacle`을 달고,
> `HoverHint`가 `collectChromeObstacles()`로 우상단 칩 스택 bbox를 읽어
> 겹치면 아래/위/왼쪽으로 민다 (`viewportClamp.ts` `shiftBoxFromObstacles`).
> 단위 테스트: `viewportClamp.test.ts`.

`GRAPHICS-AUDIT.md`(상위 폴더)는 임의 z-index 1건만 지적한다(`UnsupportedBrowserNotice.tsx: z-[9999]`). 이번에 사용자가 겪은 겹침은 z-index 값 자체의 오류가 아니라 **충돌 회피 로직의 부재**로 보인다.

**근거:** `src/components/HoverHint.tsx` + `src/lib/viewportClamp.ts` — 툴팁을 뷰포트 경계 안으로는 clamp하지만, 우상단 칩 스택(`ModeGlobalIndexChip`) 같은 다른 `position: fixed` 요소의 위치는 전혀 모른 채 배치된다. 서로의 bounding box를 고려하는 로직이 없다.

**권장:** 주요 fixed 앵커(칩 스택, 우측 레일 등)의 위치를 한 곳에서 관리해 툴팁 배치 시 참고하게 하거나, 최소한 자주 겹치는 조합을 수동 QA로 목록화.

---

## 8. [톤 — 사용자 선택: "톤만 낮추기"] 게임화 요소

> **[2026-08-31 수정 완료]** 카피만 교체. 투표 API(`stable`/`bunker`)와 집계 로직은 그대로.
> - `BunkerSentimentVote`: "HEAD TO BUNKER" → "긴장 고조" / "Rising tension",
>   "벙커 감성지수" → "내일 전망", 패닉 % → "긴장 고조 N%". `GTI.ethicsKo/En` 상시 캡션.
> - `analystTierLabel`: "루키 애널리스트/상황실장" → "관측 입문/수석 관측자".

관련 파일: `src/lib/bunkerSentiment.ts`, `src/components/BunkerSentimentVote.tsx`, `src/app/api/bunker-sentiment/route.ts`, `src/lib/gti.ts`(`gtiPredictQuestion`, `analystTierLabel` 등).

이미 어느 정도 절제돼 있다는 점은 확인됨: 자유텍스트 없음, 이진 투표 + 집계 비율만 보여준다. 공습·인명 예측 문구가 아니라 지수 방향성만 묻는 구조. 위 완료 배너대로 라벨만 낮췄다.

---

## 9. 우선순위 요약

| 순위 | 항목 | 유형 | 비고 |
|---|---|---|---|
| 1 | GTI 이중 계산 경로 | 데이터 신뢰성 | **완료(2026-08-31)** — 단일 소스 캐시 + 모바일 홈도 구독, 잠정치 배지 |
| 2 | WebGL 무증상 블랙아웃 | 안정성 (재발) | **완료(2026-08-31)** — onError/creationerror/타임아웃 3중 안전망 + 재시도 오버레이 |
| 3 | 제품 정체성 | 전략 | 코드 작업 전 사용자 결정 필요 — **미착수** |
| 4 | 검색/묻기 혼동 | UX | **완료(2026-08-31)** — 0건 시 묻기 CTA |
| 5 | DFC/BRI 단위 불명확 | UX | **완료(2026-08-31)** — 연결선 N개 + 툴팁 통일 |
| 6 | 경제 모드 레이어 잔존 | UX | **완료(2026-08-31)** — FORCE_OFF 검증 + GeoJSON 하드 가드 |
| 7 | 툴팁 충돌 | UX | **완료(2026-08-31)** — chrome obstacle 회피 |
| 8 | 게임화 톤 | 톤/카피 | **완료(2026-08-31)** — 라벨만 절제, 로직 유지 |

## 10. 다음 단계

코드로 풀 수 있는 리포트 항목은 위 표 기준으로 반영했다. 남은 건 3번(제품 정체성)뿐이다 — 주 타깃 사용자층이 정해지면 정보구조 재설계를 별도 트랙으로 잡으면 된다.

## 11. 심층 재검증 (2026-08-31 2차)

1차 패스는 리포트 표의 “완료”만 맞추고 같은 항목의 잔여 경로를 덜 봤다. 2차는 호출부·폴백·모드 전환 이펙트까지 따라갔다.

| 구멍 | 어디에 있었나 | 2차에서 |
|---|---|---|
| GTI 패널 폴백 | `DailyRankSharePanel`이 스토어가 비면 `payload.worldTension`을 씀 — 칩과 다른 fetch | 스토어만 사용. 히어로 바도 `displayGtiScore`와 동일 정수 |
| WebGL 레이스 | `yieldGpu`와 `<Map>`이 같은 커밋에 마운트. 셰이더 compile 실패 시 `loseContext` 없음 | 다음 프레임에 지도 마운트. 실패 경로도 `releaseWebglContext` |
| 경제 모드 전선 | 우크라 GeoJSON만 막음. 분쟁 빗금·묻기/뉴스 인사이트가 `showWarZones`를 다시 켬. `askLayersIntent`는 군용만 strip | 빗금 하드 가드 + `stripEconomyGeopoliticsPatch` (묻기·인사이트·지경학 이펙트) |
| “평소보다” 블랙박스 | `tensionDrivers`가 기준 기간을 안 밝힘 | `최근 90일 평균보다` |
| 톤 잔여 | 벙커 버튼만 바꿈. 진입 화면 OPERATOR NODE, 로딩 `DECRYPTING ENCRYPTED STREAM` | 이용 안내 카피·로딩 단계 문구 절제. UP/DOWN·맞대결·인가 칩은 예측 기능 본체라 이번엔 유지 |

의도적으로 안 건드린 것:
- 경제 Compact `항로`/`에너지`의 이란 NewFeeds(유류·호르무즈) — 지정학 전선이 아니라 에너지 신호로 켜 둔 값.
- `/api/daily-ranks?limit>1` (랭킹 목록·핫 전장·yesterdayCorrectPct) — 간판 GTI가 아님.
- `docs/ux-perf-remediation-2026-08-06.md`의 browserslist / `verify:api-cache` 공허한 `[x]` — 이번 UX 리포트 범위 밖. 별도 재검증 필요.
