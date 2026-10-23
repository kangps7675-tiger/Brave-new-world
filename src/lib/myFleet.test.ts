import { describe, expect, it } from "vitest";
import type { AisVessel } from "@/data/geoTypes";
import { fleetNearIncidents, matchFleet, parseFleetInput } from "./myFleet";

const v = (mmsi: string, name: string, lat: number, lng: number) =>
  ({ id: mmsi, mmsi, shipName: name, lat, lng } as unknown as AisVessel);
const NOW = Date.parse("2026-10-23T00:00:00Z");
const inc = (ago: number, type = "Attack") => ({
  id: "i", incidentTypeName: type, lat: 14, lng: 42.5, utcDateOfIncident: new Date(NOW - ago * 3_600_000).toISOString(),
});

describe("myFleet", () => {
  it("MMSI·IMO·선명을 구분하고 중복을 뺀다", () => {
    expect(parseFleetInput("123456789, IMO 9123456\nmv test\nMV TEST")).toEqual([
      { kind: "mmsi", value: "123456789" },
      { kind: "imo", value: "9123456" },
      { kind: "name", value: "MV TEST" },
    ]);
  });
  it("IMO는 AIS와 맞추지 못한다", () => {
    const [s] = matchFleet([{ kind: "imo", value: "9123456" }], [v("1", "X", 0, 0)]);
    expect(s!.vessel).toBeNull();
  });
  it("사건 50해리·72시간 안의 내 배만 알린다", () => {
    const st = matchFleet(
      [{ kind: "mmsi", value: "111111111" }, { kind: "mmsi", value: "222222222" }],
      [v("111111111", "NEAR", 14.2, 42.6), v("222222222", "FAR", 20, 38)],
    );
    const a = fleetNearIncidents(st, [inc(10)], NOW);
    expect(a).toHaveLength(1);
    expect(a[0]!.vesselName).toBe("NEAR");
    expect(fleetNearIncidents(st, [inc(100)], NOW)).toHaveLength(0);
    expect(fleetNearIncidents(st, [inc(10, "Advisory")], NOW)).toHaveLength(0);
  });
});
