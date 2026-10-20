import { describe, expect, it } from "vitest";
import {
  FIRST_IMPRESSION_BUDGET_MS,
  FIRST_IMPRESSION_LAYER_BUDGET,
  PHASE_DURATION_MS,
  allowsOnboarding,
  clampToFirstImpression,
  phaseDurationMs,
  resolveNextPhase,
  showsGtiHero,
  type FirstImpressionInput,
  type FirstImpressionPhase,
} from "@/lib/firstImpression";

const base: FirstImpressionInput = {
  globeReady: true,
  hasHotTheater: true,
  hasGti: true,
  hasMarketLink: true,
  userTookControl: false,
  reducedMotion: false,
  isPhone: false,
};

describe("시퀀스", () => {
  it("해피패스는 boot → gti → fly → scene → market → done", () => {
    let phase: FirstImpressionPhase = "idle";
    const seq: FirstImpressionPhase[] = [phase];
    for (let i = 0; i < 8 && phase !== "done"; i += 1) {
      phase = resolveNextPhase(phase, base);
      seq.push(phase);
    }
    expect(seq).toEqual(["idle", "boot", "gti", "fly", "scene", "market", "done"]);
  });

  it("지구본이 준비되기 전에는 idle에 머문다", () => {
    expect(resolveNextPhase("idle", { ...base, globeReady: false })).toBe("idle");
  });

  it("폰에서는 시퀀스를 돌리지 않는다", () => {
    expect(resolveNextPhase("idle", { ...base, isPhone: true })).toBe("done");
  });
});

describe("통제권", () => {
  /**
   * 자동 이동이 불안한 이유는 "움직여서"가 아니라 "멈출 수 없어서"다.
   * 어느 단계에서든 사용자가 지도를 만지면 시퀀스는 즉시 물러난다.
   */
  it.each<FirstImpressionPhase>(["boot", "gti", "fly", "scene", "market"])(
    "%s 중 지도를 조작하면 즉시 종료된다",
    (phase) => {
      expect(resolveNextPhase(phase, { ...base, userTookControl: true })).toBe("done");
    },
  );
});

describe("데이터가 없으면 건너뛴다", () => {
  it("GTI가 없으면 gti 단계를 건너뛴다", () => {
    expect(resolveNextPhase("boot", { ...base, hasGti: false })).toBe("fly");
  });

  it("보여줄 게 아무것도 없으면 바로 종료한다", () => {
    expect(
      resolveNextPhase("boot", { ...base, hasGti: false, hasHotTheater: false }),
    ).toBe("done");
  });

  it("시장 링크가 없으면 scene에서 끝난다", () => {
    expect(resolveNextPhase("scene", { ...base, hasMarketLink: false })).toBe("done");
  });
});

describe("reduced-motion", () => {
  it("fly를 컷 전환(0ms)으로 바꾼다", () => {
    expect(phaseDurationMs("fly", false)).toBeGreaterThan(0);
    expect(phaseDurationMs("fly", true)).toBe(0);
  });

  it("이동이 아닌 단계의 체류 시간은 줄이지 않는다", () => {
    expect(phaseDurationMs("scene", true)).toBe(PHASE_DURATION_MS.scene);
  });
});

describe("예산", () => {
  it("단계 합계가 90초 예산과 일치한다", () => {
    const total = Object.values(PHASE_DURATION_MS).reduce((a, b) => a + b, 0);
    expect(total).toBe(FIRST_IMPRESSION_BUDGET_MS);
  });

  it("90초 동안에는 온보딩 넛지를 띄우지 않는다", () => {
    for (const phase of ["boot", "gti", "fly", "scene", "market"] as const) {
      expect(allowsOnboarding(phase)).toBe(false);
    }
    expect(allowsOnboarding("done")).toBe(true);
  });

  it("GTI 히어로는 gti 단계에서만 보인다", () => {
    expect(showsGtiHero("gti")).toBe(true);
    expect(showsGtiHero("scene")).toBe(false);
  });
});

describe("첫 인상 레이어 예산", () => {
  const keep = [
    "showWarZones",
    "showGdeltWar",
    "showAis",
    "showLogisticsRisk",
    "showPorts",
    "showFirmsFires",
    "showShippingLanes",
    "showUsCarriers",
    "showMilitaryActivity",
    "showGdeltDiplomatic",
  ] as const;

  /**
   * 캡이 30이라고 30개를 켜면 "한 장면"이 아니라 "덩어리"가 된다.
   * 첫 화면의 합격 기준은 핀·전선·초크 중 **하나**가 눈에 들어오는가이다.
   */
  it("상위 8개만 남기고 나머지는 끈다", () => {
    const patch = Object.fromEntries(keep.map((k) => [k, true]));
    const clamped = clampToFirstImpression(patch, keep);
    const on = Object.values(clamped).filter(Boolean).length;
    expect(on).toBe(FIRST_IMPRESSION_LAYER_BUDGET);
    expect(clamped.showWarZones).toBe(true);
    expect(clamped.showGdeltDiplomatic).toBe(false);
  });

  it("예산 이하면 그대로 둔다", () => {
    const clamped = clampToFirstImpression({ a: true, b: true }, ["a", "b"] as const);
    expect(Object.values(clamped).filter(Boolean)).toHaveLength(2);
  });
});
