import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import { buildWarCountryFeatures, warCountryIsos } from "./warCountries";

const NOW = Date.parse("2026-10-18T00:00:00Z");
const ev = (regionId: "iran" | "ukraine" | "yemen", hoursAgo: number) => ({
  regionId,
  publishedAt: new Date(NOW - hoursAgo * 3600_000).toISOString(),
});

describe("전쟁 중인 나라", () => {
  it("최근 72시간 사건이 3건 이상인 지역의 나라만 고른다", () => {
    const isos = warCountryIsos(
      [ev("iran", 1), ev("iran", 5), ev("iran", 30), ev("yemen", 2), ev("yemen", 3), ev("iran", 100)],
      NOW,
    );
    expect(isos).toEqual(["IRN"]);
  });

  it("우크라이나는 통제면이 따로 있어 제외한다", () => {
    expect(warCountryIsos([ev("ukraine", 1), ev("ukraine", 2), ev("ukraine", 3)], NOW)).toEqual([]);
  });

  it("국경 폴리곤이 있는 나라만 통제면 스타일 피처로 만든다", () => {
    const hub: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { iso: "IRN", name: "Iran" },
          geometry: { type: "Polygon", coordinates: [[[44, 25], [60, 25], [60, 39], [44, 25]]] },
        },
      ],
    };
    const out = buildWarCountryFeatures(["IRN", "LBN"], [hub, null]);
    expect(out).toHaveLength(1);
    expect(out[0]!.properties).toMatchObject({ source: "liveuamap", role: "war-country", name: "Iran" });
  });
});
