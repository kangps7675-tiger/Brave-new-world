import { describe, expect, it } from "vitest";
import { MIN_AIRCRAFT, parseGpsJamCsv, gpsJamLevel } from "@/lib/gpsJam";

describe("parseGpsJamCsv", () => {
  const csv = [
    "hex,count_good_aircraft,count_bad_aircraft",
    "8428347ffffffff,100,20", // 16.7% high
    "8428341ffffffff,50,2", // 3.8% medium
    "8428307ffffffff,200,1", // 0.5% low → excluded
    "8428301ffffffff,2,2", // total 4 < MIN → excluded
  ].join("\n");

  it("keeps high/medium with enough aircraft and drops low/small samples", () => {
    const cells = parseGpsJamCsv(csv);
    expect(cells.map((c) => c.hex)).toEqual([
      "8428347ffffffff",
      "8428341ffffffff",
    ]);
    expect(cells[0]!.level).toBe("high");
    expect(cells[1]!.level).toBe("medium");
    expect(cells.every((c) => c.total >= MIN_AIRCRAFT)).toBe(true);
  });

  it("gpsJamLevel thresholds match GPSJam legend", () => {
    expect(gpsJamLevel(0.01)).toBe("low");
    expect(gpsJamLevel(0.02)).toBe("medium");
    expect(gpsJamLevel(0.1)).toBe("medium");
    expect(gpsJamLevel(0.1001)).toBe("high");
  });
});
