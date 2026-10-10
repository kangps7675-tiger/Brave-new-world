import { describe, expect, it } from "vitest";
import {
  classifyAisVessel,
  matchesAisClassFilter,
  matchesStoredAisCategory,
} from "./aisVesselClass";

describe("classifyAisVessel", () => {
  it("marks named vessels without type as commercial", () => {
    expect(classifyAisVessel({ shipType: null, shipName: "ADVANTAGE SUGAR" })).toBe(
      "commercial",
    );
  });

  it("keeps empty/unknown as other", () => {
    expect(classifyAisVessel({ shipType: null, shipName: null })).toBe("other");
    expect(classifyAisVessel({ shipType: null, shipName: "AB" })).toBe("other");
  });

  it("detects military by name or type", () => {
    expect(classifyAisVessel({ shipType: 35, shipName: "X" })).toBe("military");
    expect(classifyAisVessel({ shipType: null, shipName: "USS DEMO" })).toBe("military");
  });
});

describe("matchesStoredAisCategory / matchesAisClassFilter", () => {
  it("commercial filter includes other", () => {
    expect(matchesStoredAisCategory("other", "commercial")).toBe(true);
    expect(matchesStoredAisCategory("commercial", "commercial")).toBe(true);
    expect(matchesStoredAisCategory("military", "commercial")).toBe(false);
    expect(matchesAisClassFilter("other", "commercial")).toBe(true);
  });

  it("military stays strict", () => {
    expect(matchesStoredAisCategory("other", "military")).toBe(false);
    expect(matchesAisClassFilter("other", "military")).toBe(false);
  });
});
