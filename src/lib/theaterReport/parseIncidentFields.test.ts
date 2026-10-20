import { describe, expect, it } from "vitest";
import {
  parseCasualties,
  parseMaterialDamage,
  placeLabelFromEvent,
} from "@/lib/theaterReport/parseIncidentFields";

describe("parseCasualties", () => {
  it("reads killed/wounded from English", () => {
    const p = parseCasualties("Strike killed 12 people and wounded 30 in the city");
    expect(p.killed).toBe(12);
    expect(p.wounded).toBe(30);
  });

  it("returns nulls when no numbers", () => {
    const p = parseCasualties("Explosion reported near the bridge");
    expect(p.killed).toBeNull();
    expect(p.wounded).toBeNull();
  });
});

describe("parseMaterialDamage", () => {
  it("clips a damage clause", () => {
    const d = parseMaterialDamage("Drone struck a substation and damaged power lines overnight.");
    expect(d).toMatch(/damaged/i);
  });
});

describe("placeLabelFromEvent", () => {
  it("uses title head", () => {
    expect(
      placeLabelFromEvent({
        title: "Kharkiv — drone strike on warehouse",
        lat: 50,
        lng: 36,
      }),
    ).toBe("Kharkiv");
  });
});
