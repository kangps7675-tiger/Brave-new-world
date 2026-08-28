import { describe, expect, it } from "vitest";
import { HOVER } from "@/lib/hoverLabels";
import {
  isPhilippinesFrontlinePoint,
  isUsMilitaryOperator,
  osmMilitaryDisplayName,
  osmMilitaryKind,
  osmMilitaryTier,
  shouldKeepOsmMilitary,
} from "@/lib/osmFrontlineBases";

describe("osm frontline military filter", () => {
  it("keeps named airfields and naval bases as tier 1", () => {
    expect(osmMilitaryKind({ military: "airfield", name: "Osan Air Base" })).toBe("airfield");
    expect(osmMilitaryTier("airfield")).toBe(1);
    expect(osmMilitaryTier("naval_base")).toBe(1);
    expect(shouldKeepOsmMilitary({ military: "naval_base", name: "Jinhae Naval Base" })).toBe(true);
  });

  it("keeps named bases as tier 2 and drops ranges / unnamed", () => {
    expect(osmMilitaryKind({ military: "base", name: "Camp Casey" })).toBe("base");
    expect(osmMilitaryTier("base")).toBe(2);
    expect(shouldKeepOsmMilitary({ military: "range", name: "Seoul Shooting Range" })).toBe(false);
    expect(shouldKeepOsmMilitary({ military: "airfield" })).toBe(false);
    expect(osmMilitaryDisplayName({ name: "Foo Shooting Range" })).toBeNull();
  });

  it("drops emergency strips", () => {
    expect(osmMilitaryDisplayName({ name: "영주비상활주로" })).toBeNull();
  });

  it("keeps Palawan and drops Sabah leaks from the PH bbox", () => {
    expect(isPhilippinesFrontlinePoint(9.74, 118.76)).toBe(true);
    expect(isPhilippinesFrontlinePoint(6.92, 122.06)).toBe(true);
    expect(isPhilippinesFrontlinePoint(5.9, 116.1)).toBe(false);
  });

  it("drops abandoned sites", () => {
    expect(
      shouldKeepOsmMilitary({ military: "airfield", name: "Old Field", abandoned: "yes" }),
    ).toBe(false);
  });
});

describe("HOVER.militaryBase", () => {
  it("labels US operators as US bases", () => {
    expect(isUsMilitaryOperator("USA")).toBe(true);
    expect(HOVER.militaryBase("ko", "USA")).toBe("미군기지");
    expect(HOVER.militaryBase("en", "United States")).toBe("US military base");
  });

  it("labels host-nation OSM sites as generic military bases", () => {
    expect(isUsMilitaryOperator("South Korea")).toBe(false);
    expect(HOVER.militaryBase("ko", "South Korea")).toBe("군사기지");
    expect(HOVER.militaryBase("en", "Japan")).toBe("Military base");
  });
});
