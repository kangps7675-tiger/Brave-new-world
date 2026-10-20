import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import data from "../../../public/data/allied-bloc-countries.json";
import { paintBlocPolygons } from "./blocPolygons";

const painted = paintBlocPolygons(data as unknown as FeatureCollection);
const blocOf = (iso: string) => painted.features.find((f) => f.properties?.iso === iso)?.properties?.bloc;

describe("paintBlocPolygons", () => {
  it("covers every bloc", () => {
    expect(blocOf("RUS")).toBe("crink");
    expect(blocOf("IRN")).toBe("crink");
    expect(blocOf("KAZ")).toBe("csto");
    expect(blocOf("POL")).toBe("nato");
    expect(blocOf("IND")).toBe("quad");
    expect(blocOf("KOR")).toBe("us-treaty");
  });

  it("paints AUKUS members as their own bloc", () => {
    expect(blocOf("USA")).toBe("aukus");
    expect(blocOf("GBR")).toBe("aukus");
    expect(blocOf("AUS")).toBe("aukus");
  });

  it("dims disputed / weaker members", () => {
    const op = (iso: string) => painted.features.find((f) => f.properties?.iso === iso)?.properties?.fillOpacity;
    expect(op("ARM")).toBeLessThan(op("KAZ"));
    expect(op("PHL")).toBeLessThan(op("KOR"));
  });

  it("returns empty for missing input", () => {
    expect(paintBlocPolygons(null).features).toHaveLength(0);
  });
});
