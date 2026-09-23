import { describe, it, expect } from "vitest";
import {
  classifyGateZone,
  detectZoneCrossings,
  buildAisZoneCrossings,
  AIS_GATE_ZONES,
} from "./aisZones";
import type { AisVesselRow } from "./env";

describe("classifyGateZone", () => {
  it("returns hormuz for a point inside the Hormuz gate", () => {
    expect(classifyGateZone(26.6, 56.3)).toBe("hormuz");
  });

  it("returns null for open ocean far from any gate", () => {
    expect(classifyGateZone(0, 0)).toBeNull();
    expect(classifyGateZone(-40, 100)).toBeNull();
  });

  it("every defined zone's own center point classifies as itself", () => {
    for (const zone of AIS_GATE_ZONES) {
      const [[latMin, lngMin], [latMax, lngMax]] = zone.bbox;
      const centerLat = (latMin + latMax) / 2;
      const centerLng = (lngMin + lngMax) / 2;
      expect(classifyGateZone(centerLat, centerLng)).toBe(zone.id);
    }
  });
});

describe("detectZoneCrossings", () => {
  it("emits nothing on first-ever observation (no prior row)", () => {
    const events = detectZoneCrossings({
      hasPrior: false,
      prevLat: null,
      prevLng: null,
      currLat: 26.6,
      currLng: 56.3,
    });
    expect(events).toEqual([]);
  });

  it("emits nothing when the vessel stays in the same zone", () => {
    const events = detectZoneCrossings({
      hasPrior: true,
      prevLat: 26.5,
      prevLng: 56.2,
      currLat: 26.6,
      currLng: 56.3,
    });
    expect(events).toEqual([]);
  });

  it("emits nothing when the vessel stays outside all zones", () => {
    const events = detectZoneCrossings({
      hasPrior: true,
      prevLat: 0,
      prevLng: 0,
      currLat: 1,
      currLng: 1,
    });
    expect(events).toEqual([]);
  });

  it("emits enter when moving from outside into a gate", () => {
    const events = detectZoneCrossings({
      hasPrior: true,
      prevLat: 20,
      prevLng: 40,
      currLat: 26.6,
      currLng: 56.3,
    });
    expect(events).toEqual([{ zoneId: "hormuz", direction: "enter" }]);
  });

  it("emits exit when moving from a gate to outside", () => {
    const events = detectZoneCrossings({
      hasPrior: true,
      prevLat: 26.6,
      prevLng: 56.3,
      currLat: 20,
      currLng: 40,
    });
    expect(events).toEqual([{ zoneId: "hormuz", direction: "exit" }]);
  });

  it("emits both exit and enter when jumping between two different gates", () => {
    const events = detectZoneCrossings({
      hasPrior: true,
      prevLat: 26.6,
      prevLng: 56.3,
      currLat: 2.5,
      currLng: 102.0,
    });
    expect(events).toEqual([
      { zoneId: "hormuz", direction: "exit" },
      { zoneId: "malacca", direction: "enter" },
    ]);
  });
});

function vessel(overrides: Partial<AisVesselRow>): AisVesselRow {
  return {
    id: "111222333",
    mmsi: "111222333",
    ship_name: "TEST SHIP",
    lat: 26.6,
    lng: 56.3,
    sog: 12,
    cog: 90,
    true_heading: 90,
    ship_type: 80,
    ship_type_label: "Tanker",
    category: "commercial",
    provider: "aisstream",
    timestamp: "2026-09-22T00:00:00Z",
    draught: null,
    destination: null,
    length_m: null,
    beam_m: null,
    ...overrides,
  };
}

describe("buildAisZoneCrossings", () => {
  it("builds one enter row for a vessel newly seen inside a gate with a known prior outside position", () => {
    const vessels = [vessel({ id: "111222333", mmsi: "111222333", lat: 26.6, lng: 56.3 })];
    const prior = new Map([["111222333", { lat: 20, lng: 40 }]]);
    const rows = buildAisZoneCrossings(vessels, prior, "2026-09-22T00:10:00Z");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      zone_id: "hormuz",
      direction: "enter",
      mmsi: "111222333",
      ship_name: "TEST SHIP",
      category: "commercial",
      detected_at: "2026-09-22T00:10:00Z",
    });
    expect(typeof rows[0].id).toBe("string");
    expect(rows[0].id.length).toBeGreaterThan(0);
  });

  it("produces no rows for a vessel with no prior position (first sighting)", () => {
    const vessels = [vessel({ id: "999", mmsi: "999" })];
    const rows = buildAisZoneCrossings(vessels, new Map());
    expect(rows).toEqual([]);
  });

  it("produces no rows when nothing crosses a gate boundary", () => {
    const vessels = [vessel({ id: "999", mmsi: "999", lat: 0, lng: 0 })];
    const prior = new Map([["999", { lat: 1, lng: 1 }]]);
    const rows = buildAisZoneCrossings(vessels, prior);
    expect(rows).toEqual([]);
  });
});
