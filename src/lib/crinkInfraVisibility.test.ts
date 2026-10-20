import { describe, expect, it } from "vitest";
import {
  crinkInfraArmedNext,
  crinkInfraEligible,
  crinkInfraMinZoom,
  CRINK_DETAIL_DROP_ZOOM,
  CRINK_DETAIL_MIN_ZOOM,
  CRINK_POWER_MIN_ZOOM,
} from "@/lib/crinkInfraVisibility";

describe("crinkInfraEligible", () => {
  it("is intel-only and skips ultra-lite", () => {
    expect(crinkInfraEligible({ basemapMode: "intel", ultraLite: false })).toBe(true);
    expect(crinkInfraEligible({ basemapMode: "terrain", ultraLite: false })).toBe(false);
    expect(crinkInfraEligible({ basemapMode: "intel", ultraLite: true })).toBe(false);
  });
});

describe("crinkInfraArmedNext", () => {
  it("arms at min zoom and holds until drop zoom", () => {
    expect(crinkInfraArmedNext(false, CRINK_DETAIL_MIN_ZOOM - 0.1, true, CRINK_DETAIL_MIN_ZOOM, CRINK_DETAIL_DROP_ZOOM)).toBe(
      false,
    );
    expect(
      crinkInfraArmedNext(false, CRINK_DETAIL_MIN_ZOOM, true, CRINK_DETAIL_MIN_ZOOM, CRINK_DETAIL_DROP_ZOOM),
    ).toBe(true);
    expect(
      crinkInfraArmedNext(true, CRINK_DETAIL_DROP_ZOOM, true, CRINK_DETAIL_MIN_ZOOM, CRINK_DETAIL_DROP_ZOOM),
    ).toBe(true);
    expect(
      crinkInfraArmedNext(true, CRINK_DETAIL_DROP_ZOOM - 0.01, true, CRINK_DETAIL_MIN_ZOOM, CRINK_DETAIL_DROP_ZOOM),
    ).toBe(false);
  });

  it("disarms immediately off intel", () => {
    expect(
      crinkInfraArmedNext(true, 12, false, CRINK_DETAIL_MIN_ZOOM, CRINK_DETAIL_DROP_ZOOM),
    ).toBe(false);
  });
});

describe("crinkInfraMinZoom", () => {
  it("shows power later than runways", () => {
    expect(crinkInfraMinZoom("aeroway")).toBe(CRINK_DETAIL_MIN_ZOOM);
    expect(crinkInfraMinZoom("power")).toBe(CRINK_POWER_MIN_ZOOM);
    expect(crinkInfraMinZoom("power")).toBeGreaterThan(crinkInfraMinZoom("harbour"));
  });
});
