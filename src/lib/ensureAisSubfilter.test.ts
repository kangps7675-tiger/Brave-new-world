import { describe, expect, it } from "vitest";
import { DEFAULT_LAYER_PREFS, ensureAisSubfilter } from "@/lib/layerPrefs";

describe("ensureAisSubfilter", () => {
  it("AIS가 켜졌는데 군·민 세부가 둘 다 꺼진 저장값은 둘 다 켠다", () => {
    const r = ensureAisSubfilter({ ...DEFAULT_LAYER_PREFS, showAis: true, showAisMilitary: false, showAisCommercial: false });
    expect(r.showAisMilitary).toBe(true);
    expect(r.showAisCommercial).toBe(true);
  });

  it("한쪽만 꺼둔 건 존중한다", () => {
    const r = ensureAisSubfilter({ ...DEFAULT_LAYER_PREFS, showAis: true, showAisMilitary: true, showAisCommercial: false });
    expect(r.showAisCommercial).toBe(false);
  });

  it("AIS 자체를 끈 건 그대로 둔다", () => {
    const r = ensureAisSubfilter({ ...DEFAULT_LAYER_PREFS, showAis: false, showAisMilitary: false, showAisCommercial: false });
    expect(r.showAis).toBe(false);
    expect(r.showAisCommercial).toBe(false);
  });
});
