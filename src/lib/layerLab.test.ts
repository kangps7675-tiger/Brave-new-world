import { describe, expect, it } from "vitest";
import { DEFAULT_LAYER_PREFS } from "@/lib/layerPrefs";
import { enforceLabTier, isLabLayerKey, LAB_LAYER_KEYS } from "./layerLab";

const KEEP = [
  "showAis", "showAisMilitary", "showAisCommercial", "showDisguisedVessels", "showAirTraffic",
  "showMilitaryActivity", "showGpsInterference", "showFirmsFires", "showUkraineControl",
  "showNeptun", "showTzevaAdom", "showUkmtoIncidents", "showNavareaWarnings", "showConflictEvents",
  "showShippingLanes", "showLogisticsRisk", "showPorts", "showUsCarriers", "showAlliedBlocs",
  "showAxisNetwork", "showConflictTheaterIran", "showConflictTheaterUkraine",
];

describe("layerLab", () => {
  it("모든 키가 실제 LayerPrefs boolean이다", () => {
    for (const k of LAB_LAYER_KEYS) {
      expect(typeof (DEFAULT_LAYER_PREFS as Record<string, unknown>)[k]).toBe("boolean");
    }
  });
  it("증거·맥락·승격 레이어는 실험실에 없다", () => {
    for (const k of KEEP) expect(isLabLayerKey(k)).toBe(false);
  });
  it("실험실 키는 강제 OFF, 증거 키는 유지", () => {
    const on = { ...DEFAULT_LAYER_PREFS, showAis: true, showGemSolar: true, showCrinkInfraRoad: true };
    const out = enforceLabTier(on, false);
    expect(out.showGemSolar).toBe(false);
    expect(out.showCrinkInfraRoad).toBe(false);
    expect(out.showAis).toBe(true);
    expect(enforceLabTier(on, true)).toBe(on);
  });
  it("바뀔 게 없으면 같은 객체", () => {
    const clean = Object.fromEntries(
      Object.entries(DEFAULT_LAYER_PREFS).map(([k, v]) => [k, isLabLayerKey(k) ? false : v]),
    ) as typeof DEFAULT_LAYER_PREFS;
    expect(enforceLabTier(clean, false)).toBe(clean);
  });
});
