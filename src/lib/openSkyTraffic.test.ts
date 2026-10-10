import { describe, expect, it } from "vitest";
import {
  openSkyBboxAround,
  openSkyStatesUrl,
  openSkyWorldwideUrl,
  parseOpenSkyTraffic,
} from "./openSkyTraffic";

describe("OpenSky traffic", () => {
  it("builds a one-credit bounding box, including near map edges", () => {
    expect(openSkyBboxAround(37.5, 127)).toEqual({
      lamin: 35,
      lomin: 125,
      lamax: 40,
      lomax: 130,
    });
    expect(openSkyBboxAround(90, 180)).toEqual({
      lamin: 85,
      lomin: 175,
      lamax: 90,
      lomax: 180,
    });
    expect(openSkyStatesUrl(openSkyBboxAround(0, 0))).toContain("extended=1");
    expect(openSkyWorldwideUrl()).toBe(
      "https://opensky-network.org/api/states/all?extended=1",
    );
  });

  it("normalizes state vectors to globe aircraft units", () => {
    const row = [
      "ABC123",
      " TEST1 ",
      "Republic of Korea",
      1_999,
      2_000,
      127.1,
      37.6,
      10_000,
      false,
      250,
      92,
      5,
      null,
      10_100,
      "7700",
      false,
      0,
      6,
    ];
    const aircraft = parseOpenSkyTraffic([row], { time: 2_005, max: 10 });

    expect(aircraft).toHaveLength(1);
    expect(aircraft[0]).toMatchObject({
      hex: "abc123",
      callsign: "TEST1",
      originCountry: "Republic of Korea",
      onGround: false,
      positionSource: 0,
      altitude: 32808,
      groundSpeed: 486,
      track: 92,
      baroRate: 984,
      squawk: "7700",
      emergency: "7700",
      category: "heavy",
      seen: 5,
      seenPos: 6,
    });
  });

  it("thins worldwide samples across cells when requested", () => {
    const rows = Array.from({ length: 40 }, (_, i) => [
      `a${i.toString(16).padStart(5, "0")}`,
      `CS${i}`,
      "Testland",
      100,
      100,
      (i % 10) * 10,
      Math.floor(i / 10) * 10,
      5_000,
      false,
      100,
      90,
      0,
      null,
      5_000,
      null,
      false,
      0,
      4,
    ]);
    const aircraft = parseOpenSkyTraffic(rows, {
      time: 100,
      max: 12,
      thin: true,
      thinCellDeg: 10,
      thinPerCell: 2,
    });
    expect(aircraft.length).toBeLessThanOrEqual(12);
    expect(aircraft.length).toBeGreaterThan(4);
    const cells = new Set(
      aircraft.map((ac) => `${Math.floor(ac.lat / 10)}:${Math.floor(ac.lng / 10)}`),
    );
    expect(cells.size).toBeGreaterThan(1);
  });

  it("drops vectors without a usable position", () => {
    expect(parseOpenSkyTraffic([["abc123", null, null, null, 10, null, null]])).toEqual([]);
  });
});
