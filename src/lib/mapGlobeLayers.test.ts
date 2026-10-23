import { describe, expect, it } from "vitest";
import { buildRingsGeoJson } from "./mapGlobeLayers";

describe("해역 경보 링 (줌인할수록 줄어듦)", () => {
  it("choke-glow·ship-movement 링에만 sea=1", () => {
    const fc = buildRingsGeoJson(
      [{ k: "choke-glow" }, { k: "ship-movement" }, { k: "firms-bomb" }, {}] as Array<{ k?: string }>,
      { lat: () => 0, lng: () => 0, color: () => "#fff", maxRadius: () => 1, kind: (i) => i.k },
    );
    expect(fc.features.map((f) => f.properties?.sea)).toEqual([1, 1, 0, 0]);
  });
  it("화면 반지름은 줌인할수록 단조 감소(줌 4 이후)하고 최상위 interpolate 다", async () => {
    const { SEA_ALERT_RING_RADIUS_BY_ZOOM } = await import("./mapGlobeLayers");
    const e = SEA_ALERT_RING_RADIUS_BY_ZOOM as unknown[];
    expect(e[0]).toBe("interpolate");
    const pairs: Array<[number, number]> = [];
    for (let i = 3; i < e.length; i += 2) pairs.push([e[i] as number, e[i + 1] as number]);
    const after4 = pairs.filter(([z]) => z >= 4);
    for (let i = 1; i < after4.length; i++) expect(after4[i]![1]).toBeLessThan(after4[i - 1]![1]);
    expect(pairs[pairs.length - 1]![1]).toBeLessThanOrEqual(6);
  });
});
