/**
 * 화면 상태 파생 (P2-1 8단계)
 *
 * ── 무엇이 문제였나 ────────────────────────────────────────────────
 * 리팩터 7단계까지 GlobeDashboard는 10,885 → 7,971줄로 잘 줄었다. 그런데
 * **줄 수는 줄어도 조건 중복은 그대로**였다. 게이트 변수 참조 횟수:
 *
 *   entryGate 62 · isCompactUi 56 · showModePicker 53 · globeReady 48
 *   showLeftPanel 42 · isLoading 38 · intelSheetOpen 33   → 약 330회
 *
 * 호출부마다 "지금 이걸 보여도 되는 상태인가"를 매번 다시 조합한다.
 * `entryGate === null && !showModePicker && !intelSheetOpen` 같은 식이
 * 조금씩 다르게 반복되고, 하나를 빠뜨리면 조용히 겹침 버그가 된다.
 *
 * ── 이 모듈이 하는 일 ─────────────────────────────────────────────
 * **상태를 옮기지 않는다.** 기존 값을 받아 *이름 붙은 판정*으로 바꿔줄 뿐인
 * 순수 함수다. 그래서 회귀 위험이 낮고, 호출부는 이렇게 바뀐다:
 *
 *   before  entryGate === null && !showModePicker && !intelSheetOpen
 *   after   screen.canShowChrome
 *
 * 판정 규칙이 한 곳에 모이면 "누가 언제 보이는가"를 읽을 수 있고,
 * 새 오버레이를 추가할 때 어떤 게이트를 물어야 하는지가 명확해진다.
 */

export type ScreenPhase =
  /** 데이터·지구본 준비 전 */
  | "booting"
  /** 진입 게이트(주의·환영·도메인) 표시 중 */
  | "gate"
  /** 세부 모드 선택창 */
  | "modePicker"
  /** 지도가 주인공인 평상 상태 */
  | "map"
  /** 좌측 레이어 패널 열림 */
  | "layerPanel"
  /** 하단 뉴스 시트 전체 열림 */
  | "intelSheet";

export type ScreenStateInput = {
  entryGate: unknown | null;
  showModePicker: boolean;
  showLeftPanel: boolean;
  intelSheetOpen: boolean;
  globeReady: boolean;
  isLoading: boolean;
  loadError?: unknown;
  isPhoneUi: boolean;
  isCompactUi: boolean;
  /** 브리핑 양피지 등 화면 점유 연출 진행 중 */
  briefingBusy?: boolean;
};

export type ScreenState = {
  phase: ScreenPhase;

  /** 지구본이 실제로 돌고 있고 사용자가 조작 가능한가 */
  mapInteractive: boolean;
  /** 상단 nav·칩 등 상시 크롬을 보여도 되는가 */
  canShowChrome: boolean;
  /** 자동 배너·오퍼를 띄워도 되는가 (게이트·시트·브리핑 중이면 안 됨) */
  canShowBanner: boolean;
  /** 온보딩 넛지를 띄워도 되는가 — 배너보다 더 보수적 */
  canShowOnboarding: boolean;
  /** 성능 측정(FPS 프로브)을 시작해도 되는가 */
  canMeasurePerf: boolean;
  /** 첫 90초 시퀀스를 돌려도 되는가 */
  canRunFirstImpression: boolean;

  /** 원자 판정 — 호출부에서 조합할 때 쓰라고 노출 */
  isGateOpen: boolean;
  isPanelOpen: boolean;
};

export function resolveScreenPhase(input: ScreenStateInput): ScreenPhase {
  if (input.entryGate != null) return "gate";
  if (input.showModePicker) return "modePicker";
  if (!input.globeReady || input.isLoading) return "booting";
  if (input.intelSheetOpen) return "intelSheet";
  if (input.showLeftPanel) return "layerPanel";
  return "map";
}

export function buildScreenState(input: ScreenStateInput): ScreenState {
  const phase = resolveScreenPhase(input);
  const isGateOpen = input.entryGate != null || input.showModePicker;
  const isPanelOpen = input.showLeftPanel || input.intelSheetOpen;
  const briefingBusy = input.briefingBusy ?? false;
  const hasError = input.loadError != null;

  /**
   * 지구본이 준비됐고 게이트가 없다.
   * `isLoading`은 데이터 재조회로 깜빡일 수 있어 **조작 가능 판정에는 넣지 않는다** —
   * 넣으면 재조회 때마다 지도가 "조작 불가"로 잠깐 바뀐다.
   */
  const mapInteractive = input.globeReady && !isGateOpen && !hasError;

  return {
    phase,
    mapInteractive,
    canShowChrome: mapInteractive && !input.intelSheetOpen,
    canShowBanner: mapInteractive && !isPanelOpen && !briefingBusy,
    /**
     * 온보딩은 배너보다 한 단계 더 보수적이다.
     * 로딩 중에 코치마크가 뜨면 "아직 아무것도 안 보이는데 설명부터" 가 된다.
     */
    canShowOnboarding: mapInteractive && !isPanelOpen && !briefingBusy && !input.isLoading,
    /**
     * FPS 측정은 지구본이 실제로 그려지는 동안만 의미가 있다.
     * 폰은 지구본이 없고, Compact는 이미 가벼운 경로라 측정하지 않는다.
     */
    canMeasurePerf:
      mapInteractive && !input.isLoading && !input.isPhoneUi && !input.isCompactUi,
    /** 첫 90초는 지도가 주인공 — 패널이 열려 있으면 시작하지 않는다 */
    canRunFirstImpression: mapInteractive && !input.isLoading && !isPanelOpen && !input.isPhoneUi,
    isGateOpen,
    isPanelOpen,
  };
}
