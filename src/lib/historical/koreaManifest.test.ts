import { describe, expect, it } from "vitest";
import type { Feature } from "geojson";
import {
  BALHAE_PEAK_FINAL_ID,
  BALHAE_PEAK_SOUTH_FINAL_ID,
  isKoreaFillFeature,
  selectKoreaTerritoryFeatures,
  territoryFamilyKey,
  territoryPaintRank,
} from "@/lib/historical/koreaManifest";

function poly(
  id: string,
  extra: Record<string, unknown> = {}
): Feature {
  return {
    type: "Feature",
    properties: {
      id,
      layer: "hypothesis",
      role: "korean",
      uiDefault: true,
      nameKo: String(extra.nameKo || id),
      ...extra,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [124, 40],
          [135, 40],
          [135, 48],
          [124, 48],
          [124, 40],
        ],
      ],
    },
  };
}

describe("isKoreaFillFeature", () => {
  it("accepts uiDefault polity fills", () => {
    expect(isKoreaFillFeature({ layer: "polity", uiDefault: true })).toBe(true);
  });

  it("rejects explicit uiDefault false", () => {
    expect(isKoreaFillFeature({ layer: "polity", uiDefault: false })).toBe(false);
  });

  it("rejects battles/sites", () => {
    expect(isKoreaFillFeature({ layer: "battle", uiDefault: true })).toBe(false);
    expect(isKoreaFillFeature({ layer: "site", uiDefault: true })).toBe(false);
  });
});

describe("Balhae territory preference", () => {
  it("groups Balhae variants into one family", () => {
    expect(
      territoryFamilyKey({ id: "clio-balhae-825", nameKo: "발해", layer: "polity" })
    ).toBe("balhae");
    expect(
      territoryFamilyKey({
        id: BALHAE_PEAK_FINAL_ID,
        nameKo: "발해 교과서형",
      })
    ).toBe("balhae");
  });

  it("ranks textbook (mid-coast) above south-final and max", () => {
    expect(
      territoryPaintRank({
        id: BALHAE_PEAK_FINAL_ID,
        nameKo: "발해 – 선왕기 교과서형",
        layer: "hypothesis",
      })
    ).toBeGreaterThan(
      territoryPaintRank({
        id: BALHAE_PEAK_SOUTH_FINAL_ID,
        nameKo: "발해 – 선왕기 전성기 최종안",
        layer: "hypothesis",
      })
    );
    expect(
      territoryPaintRank({
        id: BALHAE_PEAK_FINAL_ID,
        nameKo: "발해 – 선왕기 교과서형",
        layer: "hypothesis",
      })
    ).toBeGreaterThan(
      territoryPaintRank({
        id: "bh-ext-830-max",
        nameKo: "[소수·추측] 발해 최대형",
        layer: "hypothesis",
        confidence: "speculative",
      })
    );
  });

  it("paints textbook Balhae (mid Primorye coast) over stacked variants", () => {
    const selected = selectKoreaTerritoryFeatures([
      poly("clio-balhae-825", { layer: "polity", nameKo: "발해" }),
      poly("bh-ext-830-min", { nameKo: "발해 – 선왕기 최소형" }),
      poly("bh-ext-830-main", { nameKo: "발해 – 선왕기 통설형" }),
      poly("bh-ext-830-max", {
        nameKo: "[소수·추측] 발해 – 선왕기 최대형",
        confidence: "speculative",
      }),
      poly(BALHAE_PEAK_SOUTH_FINAL_ID, {
        nameKo: "발해 – 선왕기 전성기 최종안(남부 연해주)",
      }),
      poly(BALHAE_PEAK_FINAL_ID, {
        nameKo: "발해 – 선왕기 교과서형(요동·연해주 중부)",
      }),
      poly("clio-unified-silla-682", {
        layer: "polity",
        nameKo: "통일신라",
      }),
      poly("tang-liaodong-context", {
        role: "context",
        layer: "polity",
        nameKo: "당 · 요동",
        uiDefault: true,
      }),
    ]);
    const ids = selected.map((f) => (f.properties as { id: string }).id);
    expect(ids).toContain(BALHAE_PEAK_FINAL_ID);
    expect(ids).toContain("clio-unified-silla-682");
    expect(ids).not.toContain("clio-balhae-825");
    expect(ids).not.toContain("bh-ext-830-max");
    expect(ids).not.toContain("bh-ext-830-min");
    expect(ids).not.toContain(BALHAE_PEAK_SOUTH_FINAL_ID);
    expect(ids).not.toContain("tang-liaodong-context");
  });

  it("drops neighbor context fills even when uiDefault", () => {
    const selected = selectKoreaTerritoryFeatures([
      poly("silla-main", { layer: "polity", nameKo: "신라" }),
      poly("tang-context", {
        role: "context",
        layer: "polity",
        nameKo: "당",
        uiDefault: true,
      }),
    ]);
    const ids = selected.map((f) => (f.properties as { id: string }).id);
    expect(ids).toEqual(["silla-main"]);
  });
});
