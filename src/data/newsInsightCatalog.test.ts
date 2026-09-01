import { describe, expect, it } from "vitest";
import {
  catalogForMode,
  isCatalogIdAllowed,
  patchFromNewsInsightIds,
} from "@/data/newsInsightCatalog";
import { parseAndSanitizeNewsInsight } from "@/lib/llm/newsInsightValidate";

describe("newsInsightCatalog", () => {
  it("excludes BRI from conflict mode", () => {
    expect(isCatalogIdAllowed("bri-trade", "conflict")).toBe(false);
    expect(isCatalogIdAllowed("bri-trade", "economy")).toBe(true);
    expect(isCatalogIdAllowed("bundle-bri-belt", "conflict")).toBe(false);
  });

  it("keeps shipping in both modes", () => {
    expect(isCatalogIdAllowed("shipping", "conflict")).toBe(true);
    expect(isCatalogIdAllowed("shipping", "economy")).toBe(true);
  });

  it("builds soft patch from bundle", () => {
    const patch = patchFromNewsInsightIds(["bundle-red-sea"], "conflict");
    expect(patch.showShippingLanes).toBe(true);
    expect(patch.showUkmtoIncidents).toBe(true);
    expect(patch.showLogisticsRisk).toBe(true);
  });

  it("filters catalog by mode", () => {
    const conflict = catalogForMode("conflict");
    expect(conflict.some((e) => e.id === "bri-trade")).toBe(false);
    expect(conflict.some((e) => e.id === "ukraine")).toBe(true);
  });
});

describe("parseAndSanitizeNewsInsight", () => {
  const corpus =
    "Houthi attacks disrupted Red Sea shipping lanes near Bab el-Mandeb. Insurance costs rose.";

  it("keeps verbatim excerpt and drops unknown layers", () => {
    const raw = JSON.stringify({
      excerpts: [
        {
          text: "Houthi attacks disrupted Red Sea shipping lanes near Bab el-Mandeb.",
          highlights: [
            { start: 31, end: 49, layerIds: ["shipping", "fake-layer"] },
            { start: 0, end: 6, layerIds: ["not-real"] },
          ],
        },
      ],
      insight: "홍해 통항에 리스크가 커졌을 수 있습니다.",
      mapActions: [{ layerIds: ["shipping", "bogus"] }],
    });
    const out = parseAndSanitizeNewsInsight(raw, corpus, "conflict");
    expect(out).not.toBeNull();
    expect(out!.excerpts[0].highlights).toHaveLength(1);
    expect(out!.excerpts[0].highlights[0].layerIds).toEqual(["shipping"]);
    expect(out!.mapActions[0].layerIds).toEqual(["shipping"]);
  });

  it("drops non-substring excerpts", () => {
    const raw = JSON.stringify({
      excerpts: [{ text: "완전히 다른 문장입니다.", highlights: [] }],
      insight: "x",
      mapActions: [],
    });
    const out = parseAndSanitizeNewsInsight(raw, corpus, "conflict");
    expect(out!.excerpts[0].text.startsWith("Houthi")).toBe(true);
  });

  it("drops economy-only ids in conflict mode", () => {
    const raw = JSON.stringify({
      excerpts: [
        {
          text: "Houthi attacks disrupted Red Sea shipping lanes near Bab el-Mandeb.",
          highlights: [{ start: 0, end: 14, layerIds: ["bri-trade"] }],
        },
      ],
      insight: "x",
      mapActions: [{ layerIds: ["bri-trade"] }],
    });
    const out = parseAndSanitizeNewsInsight(raw, corpus, "conflict");
    expect(out!.excerpts[0].highlights).toHaveLength(0);
    expect(out!.mapActions).toHaveLength(0);
  });
});
