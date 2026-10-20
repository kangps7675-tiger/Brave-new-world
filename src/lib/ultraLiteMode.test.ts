import { afterEach, describe, expect, it } from "vitest";
import { estimateWeakDeviceHint, hasStoredPerfPrefs } from "@/lib/ultraLiteMode";

function setHardwareConcurrency(value: number | undefined) {
  Object.defineProperty(navigator, "hardwareConcurrency", {
    value,
    configurable: true,
  });
}

function setDeviceMemory(value: number | undefined) {
  Object.defineProperty(navigator, "deviceMemory", {
    value,
    configurable: true,
  });
}

describe("estimateWeakDeviceHint", () => {
  const originalCores = navigator.hardwareConcurrency;

  afterEach(() => {
    setHardwareConcurrency(originalCores);
    setDeviceMemory(undefined);
  });

  it("코어 4개 이하면 약한 기기로 본다", () => {
    setHardwareConcurrency(4);
    expect(estimateWeakDeviceHint()).toBe(true);
  });

  it("코어 8개면 약한 기기로 보지 않는다", () => {
    setHardwareConcurrency(8);
    setDeviceMemory(undefined);
    expect(estimateWeakDeviceHint()).toBe(false);
  });

  it("deviceMemory가 4GB 이하면 코어 수와 무관하게 약한 기기로 본다", () => {
    setHardwareConcurrency(8);
    setDeviceMemory(4);
    expect(estimateWeakDeviceHint()).toBe(true);
  });

  it("신호가 아예 없으면(구형 브라우저) 약하다고 단정하지 않는다", () => {
    setHardwareConcurrency(undefined);
    setDeviceMemory(undefined);
    expect(estimateWeakDeviceHint()).toBe(false);
  });
});

describe("hasStoredPerfPrefs", () => {
  /**
   * 이 프로젝트 vitest 환경은 environment: "node" — window/localStorage가
   * 없다(다른 lib 테스트도 전부 순수 로직만 검증). 그래서 여기서 검증하는
   * 건 SSR 가드 자체: window가 없는 쪽(서버)에서는 항상 false여야
   * 재수화(hydration) 시 "저장된 게 있다"고 잘못 판단해 초기 추정을
   * 건너뛰는 일이 없다. localStorage 유무에 따른 분기는
   * loadPerfPrefs()가 이미 같은 PERF_PREFS_KEY로 커버한다.
   */
  it("window가 없으면(SSR) false — 재수화 시 안전한 기본값", () => {
    expect(typeof window).toBe("undefined");
    expect(hasStoredPerfPrefs()).toBe(false);
  });
});
