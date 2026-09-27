import { describe, expect, it } from "vitest";
import { DEFAULT_LAYER_PREFS } from "@/lib/layerPrefs";
import {
  buildLayerOnCoachCopy,
  detectSingleLayerTurnOn,
  firstScreenLayersTourBody,
  listFirstScreenLayerLines,
} from "@/lib/layerOnboarding";

describe("layerOnboarding", () => {
  it("lists conflict first-screen layers in plain Korean", () => {
    const lines = listFirstScreenLayerLines("conflict", "ko");
    expect(lines.length).toBeGreaterThanOrEqual(4);
    const body = firstScreenLayersTourBody("conflict", "ko");
    expect(body).toMatch(/이미 켜져/);
    expect(body).toMatch(/다음/);
    expect(body).toMatch(/전쟁|전선|진영|도련|ADIZ|방공/);
  });

  it("detects only a single false→true toggle", () => {
    const prev = {
      ...DEFAULT_LAYER_PREFS,
      showFirmsFires: false,
      showGdeltWar: false,
    };
    const one = { ...prev, showFirmsFires: true };
    const hit = detectSingleLayerTurnOn(prev, one);
    expect(hit?.layerId).toBe("firms-fires");

    const bulk = {
      ...prev,
      showFirmsFires: true,
      showGdeltWar: true,
    };
    expect(detectSingleLayerTurnOn(prev, bulk)).toBeNull();
  });

  it("builds ELI5 coach copy for a turned-on layer", () => {
    const copy = buildLayerOnCoachCopy(
      { prefKey: "showWarZones", layerId: "war-zones" },
      "ko",
    );
    expect(copy.title).toMatch(/전쟁/);
    expect(copy.body).toMatch(/지도|알겠어요/);
  });
});
