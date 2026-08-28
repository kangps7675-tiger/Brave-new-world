import { describe, expect, it } from "vitest";
import { buildOsmDarkStyle } from "@/lib/osmTiles/style";

describe("buildOsmDarkStyle place-label", () => {
  it("keeps city/country/state and drops town/village", () => {
    const style = buildOsmDarkStyle("pmtiles://example.pmtiles");
    const layers = style.layers as { id: string; filter?: unknown }[];
    const place = layers.find((l) => l.id === "place-label");
    expect(place?.filter).toEqual([
      "in",
      ["get", "class"],
      ["literal", ["city", "country", "state", "continent"]],
    ]);
  });
});
