import { describe, expect, it } from "vitest";
import {
  buildScreenState,
  resolveScreenPhase,
  type ScreenStateInput,
} from "@/lib/screenState";

/** 평상시 지도 화면 */
function ready(over: Partial<ScreenStateInput> = {}): ScreenStateInput {
  return {
    entryGate: null,
    showModePicker: false,
    showLeftPanel: false,
    intelSheetOpen: false,
    globeReady: true,
    isLoading: false,
    loadError: null,
    isPhoneUi: false,
    isCompactUi: false,
    briefingBusy: false,
    ...over,
  };
}

describe("phase 판정", () => {
  it("게이트가 가장 우선한다", () => {
    expect(resolveScreenPhase(ready({ entryGate: "caution", showLeftPanel: true }))).toBe("gate");
  });

  it("모드 피커는 게이트 다음", () => {
    expect(resolveScreenPhase(ready({ showModePicker: true, intelSheetOpen: true }))).toBe(
      "modePicker",
    );
  });

  it("지구본이 준비되기 전엔 booting", () => {
    expect(resolveScreenPhase(ready({ globeReady: false }))).toBe("booting");
    expect(resolveScreenPhase(ready({ isLoading: true }))).toBe("booting");
  });

  it("시트가 패널보다 앞", () => {
    expect(resolveScreenPhase(ready({ intelSheetOpen: true, showLeftPanel: true }))).toBe(
      "intelSheet",
    );
  });

  it("아무것도 없으면 map", () => {
    expect(resolveScreenPhase(ready())).toBe("map");
  });
});

describe("mapInteractive", () => {
  it("평상시 true", () => {
    expect(buildScreenState(ready()).mapInteractive).toBe(true);
  });

  it("게이트·에러·미준비면 false", () => {
    expect(buildScreenState(ready({ entryGate: "domain" })).mapInteractive).toBe(false);
    expect(buildScreenState(ready({ showModePicker: true })).mapInteractive).toBe(false);
    expect(buildScreenState(ready({ globeReady: false })).mapInteractive).toBe(false);
    expect(buildScreenState(ready({ loadError: new Error("x") })).mapInteractive).toBe(false);
  });

  /**
   * `isLoading`은 데이터 재조회로 깜빡인다. 조작 가능 판정에 넣으면
   * 재조회 때마다 지도가 잠깐 "조작 불가"가 되어 UI가 흔들린다.
   */
  it("데이터 재조회(isLoading)로는 조작 불가가 되지 않는다", () => {
    expect(buildScreenState(ready({ isLoading: true })).mapInteractive).toBe(true);
  });
});

describe("노출 게이트", () => {
  it("시트가 열리면 상단 크롬을 감춘다", () => {
    expect(buildScreenState(ready({ intelSheetOpen: true })).canShowChrome).toBe(false);
  });

  it("패널·브리핑 중에는 배너를 띄우지 않는다", () => {
    expect(buildScreenState(ready({ showLeftPanel: true })).canShowBanner).toBe(false);
    expect(buildScreenState(ready({ briefingBusy: true })).canShowBanner).toBe(false);
  });

  it("온보딩은 배너보다 보수적 — 로딩 중엔 안 뜬다", () => {
    const s = buildScreenState(ready({ isLoading: true }));
    expect(s.canShowBanner).toBe(true);
    expect(s.canShowOnboarding).toBe(false);
  });
});

describe("성능 측정 조건", () => {
  it("폰·Compact에서는 측정하지 않는다", () => {
    expect(buildScreenState(ready({ isPhoneUi: true })).canMeasurePerf).toBe(false);
    expect(buildScreenState(ready({ isCompactUi: true })).canMeasurePerf).toBe(false);
  });

  /** 부트 스파이크를 저사양으로 오독하지 않게 */
  it("로딩 중에는 측정하지 않는다", () => {
    expect(buildScreenState(ready({ isLoading: true })).canMeasurePerf).toBe(false);
  });

  it("평상시에는 측정한다", () => {
    expect(buildScreenState(ready()).canMeasurePerf).toBe(true);
  });
});

describe("첫 90초 조건", () => {
  it("패널이 열려 있으면 시작하지 않는다", () => {
    expect(buildScreenState(ready({ showLeftPanel: true })).canRunFirstImpression).toBe(false);
  });

  it("폰에서는 돌리지 않는다", () => {
    expect(buildScreenState(ready({ isPhoneUi: true })).canRunFirstImpression).toBe(false);
  });
});

describe("원자 판정", () => {
  it("isGateOpen / isPanelOpen", () => {
    expect(buildScreenState(ready({ entryGate: "welcome" })).isGateOpen).toBe(true);
    expect(buildScreenState(ready({ showModePicker: true })).isGateOpen).toBe(true);
    expect(buildScreenState(ready({ intelSheetOpen: true })).isPanelOpen).toBe(true);
    expect(buildScreenState(ready()).isGateOpen).toBe(false);
  });
});
