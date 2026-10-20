import { describe, expect, it } from "vitest";
import {
  enabledMilitaryBaseForces,
  filterPointsByMilitaryBaseForces,
  militaryBaseForceId,
  parseMilitaryBaseForces,
} from "@/lib/militaryBaseForces";

describe("militaryBaseForceId", () => {
  it("classifies US CONUS and overseas as us, even when hosted in Japan", () => {
    expect(
      militaryBaseForceId({
        meta: { country: "United States", source: "military-bases-csv" },
      }),
    ).toBe("us");
    expect(
      militaryBaseForceId({
        meta: { country: "USA", hostCountry: "Japan", source: "seed-overseas" },
      }),
    ).toBe("us");
  });

  it("does not put JSDF OSM into the US layer", () => {
    expect(
      militaryBaseForceId({
        meta: { country: "Japan", iso: "JP", source: "osm-frontline" },
      }),
    ).toBe("japan");
  });

  it("splits allied OSM / frontline seeds by iso", () => {
    expect(
      militaryBaseForceId({
        meta: { country: "South Korea", iso: "KR", source: "osm-frontline" },
      }),
    ).toBe("rok");
    expect(
      militaryBaseForceId({
        meta: { country: "Taiwan", iso: "TW", source: "osm-frontline" },
      }),
    ).toBe("taiwan");
    expect(
      militaryBaseForceId({
        meta: { country: "Philippines", iso: "PH", source: "seed-frontline" },
      }),
    ).toBe("philippines");
    expect(
      militaryBaseForceId({
        meta: { country: "Australia", iso: "AU", source: "seed-frontline" },
      }),
    ).toBe("australia");
    expect(
      militaryBaseForceId({
        meta: { country: "Poland", iso: "PL", source: "seed-frontline" },
      }),
    ).toBe("eastern-nato");
  });

  it("hides unclassified points from every checkbox", () => {
    expect(militaryBaseForceId({ meta: { country: "China", iso: "CN" } })).toBeNull();
  });
});

describe("enabled / parse / filter", () => {
  it("defaults to US only when allied prefs are off", () => {
    expect(
      enabledMilitaryBaseForces({
        showMilitaryBases: true,
        showRokMilitaryBases: false,
      }),
    ).toEqual(["us"]);
  });

  it("parses forces= and drops unknown ids", () => {
    expect(parseMilitaryBaseForces(undefined)).toBeUndefined();
    expect(parseMilitaryBaseForces("us,rok,nope")).toEqual(["us", "rok"]);
    expect(parseMilitaryBaseForces("nope")).toEqual([]);
  });

  it("filters before a mixed cap would hide US points", () => {
    type TestPoint = { id: string; meta: Record<string, string | number | null> };
    const mixed: TestPoint[] = [
      { id: "kr-1", meta: { iso: "KR", country: "South Korea" } },
      { id: "kr-2", meta: { iso: "KR", country: "South Korea" } },
      { id: "us-humphreys", meta: { country: "USA", source: "seed-overseas" } },
    ];
    const usOnly = filterPointsByMilitaryBaseForces(mixed, ["us"]);
    expect(usOnly.map((p) => p.id)).toEqual(["us-humphreys"]);
  });
});
