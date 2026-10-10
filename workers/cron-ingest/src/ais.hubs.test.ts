import { describe, expect, it } from "vitest";
import { thinWorldwide } from "../../../src/lib/adsbWorld";
import { AISSTREAM_BBOXES } from "./ais";
import { classifyAisVessel } from "../../../src/lib/aisVesselClass";

describe("AISSTREAM_BBOXES world hubs", () => {
  it("covers multiple longitude bands (not hotspot-only)", () => {
    expect(AISSTREAM_BBOXES.length).toBeGreaterThanOrEqual(20);
    const midLons = AISSTREAM_BBOXES.map(([[, lonMin], [, lonMax]]) => (lonMin + lonMax) / 2);
    const west = midLons.some((lon) => lon < -60);
    const east = midLons.some((lon) => lon > 100);
    const atlanticIsh = midLons.some((lon) => lon > -40 && lon < 20);
    expect(west).toBe(true);
    expect(east).toBe(true);
    expect(atlanticIsh).toBe(true);
  });

  it("thinWorldwide keeps vessels across distant cells", () => {
    const dense = Array.from({ length: 200 }, (_, i) => ({
      lat: 2 + (i % 5) * 0.1,
      lng: 102 + (i % 5) * 0.1,
      id: `malacca-${i}`,
    }));
    const sparse = [
      { lat: 38, lng: -74, id: "us-east" },
      { lat: 35, lng: 139, id: "tokyo" },
      { lat: -33, lng: 18, id: "cape" },
      { lat: -34, lng: 151, id: "sydney" },
    ];
    const thinned = thinWorldwide([...dense, ...sparse], {
      cellDeg: 10,
      perCell: 8,
      max: 40,
    });
    const ids = new Set(thinned.map((v) => v.id));
    expect(ids.has("us-east")).toBe(true);
    expect(ids.has("tokyo")).toBe(true);
    expect(ids.has("sydney")).toBe(true);
    expect(thinned.length).toBeLessThanOrEqual(40);
  });

  it("named AIS without type classifies as commercial (not blank other)", () => {
    expect(classifyAisVessel({ shipType: null, shipName: "PILOT GP01" })).toBe("commercial");
  });
});
