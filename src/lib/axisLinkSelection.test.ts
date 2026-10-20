import { describe, expect, it } from "vitest";
import {
  dimAxisLinkColor,
  preferredAxisHub,
  selectedAxisLinkFromPath,
} from "./axisLinkSelection";
import type { TransportPath } from "@/data/geoTypes";

describe("axisLinkSelection", () => {
  it("parses network axis-link path", () => {
    const path = {
      id: "axis-CHN-RUS-patronage",
      kind: "axis-link",
      name: "중–러",
      scalerank: 1,
      lengthKm: 1000,
      accentColor: "rgba(167, 139, 250, 0.82)",
      bbox: { minLat: 39, minLng: 37, maxLat: 55, maxLng: 116 },
      points: [
        { lat: 39.9, lng: 116.4 },
        { lat: 55.7, lng: 37.6 },
      ],
      meta: {
        mode: "network",
        relationKind: "patronage",
        from: "CHN",
        to: "RUS",
        fromName: "중국",
        toName: "러시아",
      },
    } as TransportPath;

    const link = selectedAxisLinkFromPath(path);
    expect(link?.from).toBe("CHN");
    expect(link?.to).toBe("RUS");
    expect(link?.relationKind).toBe("patronage");
    expect(link?.hubs).toContain("CHN");
    expect(link?.hubs).toContain("RUS");
  });

  it("prefers active hub when on edge", () => {
    expect(preferredAxisHub("CHN", "RUS", ["CHN", "RUS"], "RUS")).toBe("RUS");
    expect(preferredAxisHub("IRN", "YEM", ["IRN"], null)).toBe("IRN");
  });

  it("dims non-selected accent", () => {
    const dim = dimAxisLinkColor("rgba(167, 139, 250, 0.82)", false);
    expect(dim).toContain("0.16");
    expect(dimAxisLinkColor("rgba(167, 139, 250, 0.82)", true)).toBe(
      "rgba(167, 139, 250, 0.82)",
    );
  });
});
