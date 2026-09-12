import { describe, expect, it } from "vitest";
import {
  appendTrailPoint,
  deadReckonLatLng,
  formatAircraftHud,
  formatAisHud,
  findNearbyContacts,
} from "@/lib/gevLiveTrack";
import type { AisVessel, MilitaryAircraft } from "@/data/geoTypes";

const vessel = (partial: Partial<AisVessel> & Pick<AisVessel, "id" | "mmsi" | "lat" | "lng">): AisVessel => ({
  shipName: null,
  speedOverGround: null,
  courseOverGround: null,
  trueHeading: null,
  timestamp: null,
  shipType: null,
  shipTypeLabel: null,
  category: "commercial",
  ...partial,
});

const aircraft = (
  partial: Partial<MilitaryAircraft> & Pick<MilitaryAircraft, "id" | "hex" | "lat" | "lng">,
): MilitaryAircraft => ({
  callsign: null,
  registration: null,
  altitude: null,
  altitudeGeom: null,
  groundSpeed: null,
  indicatedAirspeed: null,
  trueAirspeed: null,
  mach: null,
  track: null,
  trackRate: null,
  roll: null,
  magHeading: null,
  trueHeading: null,
  baroRate: null,
  geomRate: null,
  squawk: null,
  emergency: null,
  type: null,
  category: null,
  dbFlags: null,
  windDirection: null,
  windSpeed: null,
  navAltitudeMcp: null,
  navHeading: null,
  navModes: null,
  seen: null,
  seenPos: null,
  rssi: null,
  acasAdvisory: null,
  timestamp: null,
  ...partial,
});

describe("gevLiveTrack", () => {
  it("formats GEV-style aircraft HUD", () => {
    const hud = formatAircraftHud(
      aircraft({
        id: "abc123",
        hex: "abc123",
        lat: 37,
        lng: 127,
        callsign: "KAL001",
        altitude: 35000,
        groundSpeed: 480,
        track: 90,
        type: "B77W",
      }),
      { traffic: "civil" },
    );
    expect(hud.lines[0]).toContain("KAL001");
    expect(hud.lines[0]).toContain("FL350");
    expect(hud.lines[0]).toContain("480 kts");
    expect(hud.lines[1]).toContain("CIV");
  });

  it("formats GEV-style AIS HUD", () => {
    const hud = formatAisHud(
      vessel({
        id: "1",
        mmsi: "123456789",
        lat: 1,
        lng: 103,
        shipName: "EVER GIVEN",
        shipTypeLabel: "Cargo",
        speedOverGround: 12.4,
        trueHeading: 45,
        timestamp: "2026-09-12T12:34:56Z",
        category: "commercial",
      }),
    );
    expect(hud.lines[0]).toContain("AIS: EVER GIVEN");
    expect(hud.lines[1]).toContain("SPD: 12.4");
    expect(hud.lines[1]).toContain("HDG: 45°");
    expect(hud.lines[2]).toContain("MMSI: 123456789");
  });

  it("dead-reckons eastbound roughly", () => {
    const next = deadReckonLatLng(0, 0, 60, 90, 3600);
    expect(next.lat).toBeCloseTo(0, 1);
    expect(next.lng).toBeGreaterThan(0.5);
  });

  it("appends trail only after min move", () => {
    const a = appendTrailPoint([], 37, 127);
    const b = appendTrailPoint(a, 37.00001, 127.00001);
    expect(b).toHaveLength(1);
    const c = appendTrailPoint(b, 37.01, 127.01);
    expect(c).toHaveLength(2);
  });

  it("lists contacts within 250 km", () => {
    const rows = findNearbyContacts({
      centerLat: 37.5,
      centerLng: 127,
      excludeId: "aaa",
      ais: [
        vessel({ id: "1", mmsi: "1", lat: 37.6, lng: 127.1, shipName: "NEAR" }),
        vessel({ id: "2", mmsi: "2", lat: 50, lng: 10, shipName: "FAR" }),
      ],
      military: [aircraft({ id: "aaa", hex: "aaa", lat: 37.51, lng: 127.01, callsign: "SELF" })],
      civil: [],
    });
    expect(rows.some((r) => r.label === "NEAR")).toBe(true);
    expect(rows.some((r) => r.label === "FAR")).toBe(false);
    expect(rows.some((r) => r.label === "SELF")).toBe(false);
  });
});
