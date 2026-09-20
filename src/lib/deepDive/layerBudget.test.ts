import { describe, expect, it } from "vitest";
import { DEFAULT_LAYER_PREFS } from "@/lib/layerPrefs";
import {
  DEEP_DIVE_LAYER_HARD,
  DEEP_DIVE_LAYER_TARGET,
  deepDivePrefsFromPatch,
  pickSceneLayerKeys,
  replaceWithSceneLayers,
  trueLayerKeys,
} from "@/lib/deepDive/layerBudget";
import { deepDiveBlocksFlash } from "@/lib/deepDive/session";

describe("deepDive layerBudget", () => {
  it("caps scene keys to target by default", () => {
    const keys = pickSceneLayerKeys(
      [
        "showWarZones",
        "showDiplomaticTension",
        "showUkraineControl",
        "showFirmsFires",
        "showAis",
        "showNeptun",
        "showMilitaryActivity",
      ],
      DEEP_DIVE_LAYER_TARGET,
    );
    expect(keys).toHaveLength(DEEP_DIVE_LAYER_TARGET);
    expect(keys).toEqual([
      "showWarZones",
      "showDiplomaticTension",
      "showUkraineControl",
    ]);
  });

  it("never exceeds hard cap", () => {
    const many = trueLayerKeys({
      ...Object.fromEntries(
        [
          "showWarZones",
          "showDiplomaticTension",
          "showUkraineControl",
          "showAlliedBlocs",
          "showIslandChains",
          "showEastAsiaAdiz",
          "showFirmsFires",
          "showAis",
        ].map((k) => [k, true]),
      ),
    });
    expect(pickSceneLayerKeys(many, 99).length).toBeLessThanOrEqual(
      DEEP_DIVE_LAYER_HARD,
    );
  });

  it("replaces layers instead of stacking", () => {
    const base = {
      ...DEFAULT_LAYER_PREFS,
      showAis: true,
      showFirmsFires: true,
      showWarZones: false,
    };
    const next = replaceWithSceneLayers(base, [
      "showWarZones",
      "showDiplomaticTension",
    ]);
    expect(next.showWarZones).toBe(true);
    expect(next.showDiplomaticTension).toBe(true);
    expect(next.showAis).toBe(false);
    expect(next.showFirmsFires).toBe(false);
    expect(next.labelLanguage).toBe(base.labelLanguage);
  });

  it("builds prefs from concept patch", () => {
    const { prefs, sceneKeys } = deepDivePrefsFromPatch(DEFAULT_LAYER_PREFS, {
      showWarZones: true,
      showDiplomaticTension: true,
      showNeptun: true,
      showAis: true,
      showFirmsFires: true,
    });
    expect(sceneKeys).toHaveLength(DEEP_DIVE_LAYER_TARGET);
    expect(prefs.showWarZones).toBe(true);
    expect(prefs.showAis).toBe(false);
  });
});

describe("deepDiveBlocksFlash", () => {
  it("blocks flash only while conflict deep dive is open", () => {
    expect(deepDiveBlocksFlash(null)).toBe(false);
    expect(
      deepDiveBlocksFlash({
        domain: "conflict",
        kind: "hub",
        key: "hub:test",
        snapshot: DEFAULT_LAYER_PREFS,
        sceneKeys: ["showWarZones"],
        label: "test",
        activeRingId: null,
      }),
    ).toBe(true);
  });
});
