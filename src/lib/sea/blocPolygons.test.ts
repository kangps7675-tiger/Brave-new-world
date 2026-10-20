import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import data from "../../../public/data/allied-bloc-countries.json";
import { paintBlocPolygons } from "./blocPolygons";

const painted = paintBlocPolygons(data as unknown as FeatureCollection);
const blocOf = (iso: string) => painted.features.find((f) => f.properties?.iso === iso)?.properties?.bloc;

describe("paintBlocPolygons", () => {
  it("covers the five requested blocs", () => {
    expect(blocOf("RUS")).toBe("crink");
    expect(blocOf("IRN")).toBe("crink");
    expect(blocOf("KAZ")).toBe("csto");
    expect(blocOf("POL")).toBe("nato");
    expect(blocOf("IND")).toBe("quad");
    expect(blocOf("KOR")).toBe("us-treaty");
  });

  it("repaints AUKUS countries as NATO / QUAD", () => {
    expect(blocOf("USA")).toBe("nato");
    expect(blocOf("GBR")).toBe("nato");
    expect(blocOf("AUS")).toBe("quad");
    expect(painted.features.some((f) => f.properties?.bloc === "aukus")).toBe(false);
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
