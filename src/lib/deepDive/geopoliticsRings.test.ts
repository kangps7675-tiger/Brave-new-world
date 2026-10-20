import { describe, expect, it } from "vitest";
import { resolveGeopoliticsRings } from "@/lib/deepDive/geopoliticsRings";

describe("resolveGeopoliticsRings", () => {
  it("returns peninsula rings for korea nav", () => {
    const rings = resolveGeopoliticsRings({
      deepDiveKey: "hub:hub-rok",
      navId: "hub-rok",
    });
    expect(rings.length).toBe(3);
    expect(rings[0]?.id).toBe("peninsula-tension");
  });

  it("returns taiwan rings", () => {
    const rings = resolveGeopoliticsRings({
      deepDiveKey: "hub:taiwan-strait",
      navId: "taiwan",
    });
    expect(rings.some((r) => r.id === "taiwan-adiz")).toBe(true);
  });

  it("maps friction stages to at most 3 rings", () => {
    const rings = resolveGeopoliticsRings({
      deepDiveKey: "friction:ep-1",
      frictionStages: [
        {
          id: "s1",
          order: 1,
          yearLabel: "1950",
          titleKo: "하나",
          titleEn: "One",
          bodyKo: "본문",
          bodyEn: "Body",
          coordinates: [127, 38],
        },
        {
          id: "s2",
          order: 2,
          yearLabel: "1953",
          titleKo: "둘",
          titleEn: "Two",
          bodyKo: "본문2",
          bodyEn: "Body2",
          coordinates: [126, 37],
        },
      ],
    });
    expect(rings).toHaveLength(2);
    expect(rings[0]?.camera?.lat).toBe(38);
  });
});
