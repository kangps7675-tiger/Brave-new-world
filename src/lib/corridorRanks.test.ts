import { describe, expect, it } from "vitest";
import { getCorridorLod } from "@/lib/corridorLod";
import { getCorridorScalerank, getCorridorRank } from "@/lib/corridorRanks";
import { strategicCorridorPathsForLod, allStrategicCorridorPaths } from "@/lib/strategicCorridorPaths";

describe("corridor ranks MVP", () => {
  it("has ranks for strategic corridors", () => {
    expect(getCorridorScalerank("instc-trans-caspian")).toBeGreaterThanOrEqual(1);
    expect(getCorridorScalerank("instc-trans-caspian")).toBeLessThanOrEqual(4);
    const row = getCorridorRank("suez-baseline");
    expect(row?.components.chokeNorm).not.toBeNull();
  });

  it("military corridors are at least scalerank 3", () => {
    expect(getCorridorScalerank("irn-rus-caspian-arms")).toBeGreaterThanOrEqual(3);
  });

  it("Comtrade bilateral fills trade corridors when cache present", () => {
    const tsr = getCorridorRank("tsr");
    // RUS|CHN should have data from public preview fetch
    expect(tsr?.components.bilateralTradeUsd).toBeGreaterThan(1e9);
    expect(tsr?.components.bilateralTradeNorm).toBeGreaterThan(0);
    expect(tsr?.sources.some((s) => /Comtrade/i.test(s))).toBe(true);
  });

  it("LOD global keeps only top ranks", () => {
    const global = getCorridorLod(2.5);
    expect(global.maxScalerank).toBe(1);
    const paths = strategicCorridorPathsForLod(global, { lat: 35, lng: 50 });
    const ids = new Set(paths.map((p) => p.meta?.corridorId));
    for (const id of ids) {
      expect(getCorridorScalerank(String(id))).toBeLessThanOrEqual(1);
    }
  });

  it("allStrategicCorridorPaths emits strategic-corridor kind with real-corridor glint meta", () => {
    const all = allStrategicCorridorPaths();
    expect(all.length).toBeGreaterThan(30);
    expect(all.every((p) => p.kind === "strategic-corridor")).toBe(true);
    expect(all.every((p) => p.meta?.geometrySource === "real-corridor")).toBe(true);
  });
});
