import { describe, expect, it } from "vitest";
import { DEFAULT_LAYER_PREFS } from "@/lib/layerPrefs";
import { applyViewerMode } from "@/lib/viewerChrome";
import { capLayerCountForMode } from "@/lib/viewPackages";

describe("satellite layer cap", () => {
  it("keeps observatory sensors and AIS category filters on", () => {
    const next = capLayerCountForMode(DEFAULT_LAYER_PREFS, "satellite");
    expect(next.showAis).toBe(true);
    expect(next.showAisMilitary).toBe(true);
    expect(next.showAisCommercial).toBe(true);
    expect(next.showAirTraffic).toBe(true);
    expect(next.showMilitaryActivity).toBe(true);
    expect(next.showDisguisedVessels).toBe(true);
    expect(next.showNeptun).toBe(true);
    expect(next.showFirmsFires).toBe(true);
    expect(next.showUkraineControl).toBe(true);
    expect(next.showNorthKoreaMissileTests).toBe(true);
    // MapLibre-only clutter stays off
    expect(next.showWarZones).toBe(false);
    expect(next.showConflictEvents).toBe(false);
    expect(next.showMilitaryBases).toBe(false);
  });

  it("applyViewerMode(satellite) leaves sensor chips on after chrome merge", () => {
    const { merged } = applyViewerMode("satellite");
    expect(merged.layers.showAisMilitary).toBe(true);
    expect(merged.layers.showAisCommercial).toBe(true);
    expect(merged.layers.showNeptun).toBe(true);
    expect(merged.layers.showFirmsFires).toBe(true);
    expect(merged.layers.showUkraineControl).toBe(true);
    expect(merged.layers.showNorthKoreaMissileTests).toBe(true);
  });
});
