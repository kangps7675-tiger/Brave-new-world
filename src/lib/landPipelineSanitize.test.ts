import { describe, expect, it } from "vitest";
import type { TransportPath } from "@/data/geoTypes";
import { sanitizeLandPipelinePath } from "@/lib/landPipelineSanitize";

describe("sanitizeLandPipelinePath", () => {
  it("drops Persian Gulf–style open-water chords", () => {
    const path: TransportPath = {
      id: "test-oil",
      kind: "oil-pipeline",
      name: "test",
      scalerank: 1,
      lengthKm: null,
      bbox: { minLat: 25, minLng: 52, maxLat: 27, maxLng: 56 },
      points: [
        { lat: 27.18, lng: 56.28 },
        { lat: 25.28, lng: 55.3 },
      ],
    };
    const out = sanitizeLandPipelinePath(path);
    expect(out.length).toBe(0);
  });

  it("keeps dense onshore segments", () => {
    const path: TransportPath = {
      id: "test-land",
      kind: "oil-pipeline",
      name: "land",
      scalerank: 1,
      lengthKm: null,
      bbox: { minLat: 40, minLng: -104, maxLat: 41, maxLng: -102 },
      points: [
        { lat: 40.2, lng: -103.8 },
        { lat: 40.4, lng: -103.4 },
        { lat: 40.6, lng: -103.0 },
        { lat: 40.8, lng: -102.6 },
      ],
    };
    const out = sanitizeLandPipelinePath(path);
    expect(out).toHaveLength(1);
    expect(out[0]!.points).toHaveLength(4);
  });
});
