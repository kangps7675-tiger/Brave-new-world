import { describe, expect, it } from "vitest";
import { blocFeatureFromMapProps } from "@/lib/blocCountryHover";
import { explainLayer, layerIdFromPathKind, withLayerExplain } from "@/lib/layerHoverExplain";

describe("blocCountryHover", () => {
  it("parses allied-bloc fill properties", () => {
    const f = blocFeatureFromMapProps("allied-bloc-countries-fill", {
      iso: "KOR",
      name: "South Korea",
      bloc: "us-bilateral-treaty",
    });
    expect(f?.polygonLayer).toBe("allied-bloc");
    if (f?.polygonLayer === "allied-bloc") {
      expect(f.bloc).toBe("us-bilateral-treaty");
      expect(f.iso).toBe("KOR");
    }
  });

  it("parses geoecon memberships", () => {
    const f = blocFeatureFromMapProps("geoecon-bloc-countries-fill", {
      iso: "SGP",
      name: "Singapore",
      camp: "non-aligned",
      memberships: ["asean", "rcep"],
    });
    expect(f?.polygonLayer).toBe("geoecon-bloc");
    if (f?.polygonLayer === "geoecon-bloc") {
      expect(f.memberships).toEqual(["asean", "rcep"]);
    }
  });
});

describe("layerHoverExplain", () => {
  it("maps maritime-route and fills body", () => {
    expect(layerIdFromPathKind("maritime-route")).toBe("maritime-routes");
    const card = withLayerExplain(
      { kind: "path", title: "Rotterdam → Shanghai", detail: "route" },
      "maritime-routes",
      "ko",
    );
    expect(card.body).toBeTruthy();
    expect(explainLayer("allied-blocs", "ko")).toMatch(/NATO/);
  });
});
