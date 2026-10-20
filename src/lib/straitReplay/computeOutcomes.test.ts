import { describe, expect, it } from "vitest";
import {
  computePriceOutcomes,
  computeTrafficOutcomes,
  distributionFromDeltas,
  priceOnOrNextSession,
  trafficBaseline,
} from "@/lib/straitReplay/computeOutcomes";
import type { TrafficDay } from "@/lib/straitReplay/types";

function traffic(
  dates: Array<[string, number]>,
): TrafficDay[] {
  return dates.map(([date, vesselCount]) => ({
    straitId: "hormuz" as const,
    date,
    vesselCount,
    sourceVintage: "test",
  }));
}

describe("computeOutcomes traffic", () => {
  it("computes baseline as mean of prior window excluding event day", () => {
    const rows = traffic([
      ["2023-04-01", 100],
      ["2023-04-02", 110],
      ["2023-04-03", 90],
      ["2023-04-04", 50],
    ]);
    const base = trafficBaseline(rows, "hormuz", "2023-04-04", 3);
    expect(base?.daysUsed).toBe(3);
    expect(base?.avg).toBeCloseTo(100, 5);
  });

  it("returns null delta when horizon day missing (no interpolation)", () => {
    const rows = traffic([
      ["2023-04-01", 100],
      ["2023-04-02", 100],
      ["2023-04-03", 100],
    ]);
    // pad baseline window
    for (let i = 4; i <= 30; i++) {
      rows.push({
        straitId: "hormuz",
        date: `2023-03-${String(i).padStart(2, "0")}`,
        vesselCount: 100,
        sourceVintage: "test",
      });
    }
    const out = computeTrafficOutcomes({
      eventId: "e1",
      straitId: "hormuz",
      eventOn: "2023-04-03",
      baselineWindowDays: 28,
      traffic: rows,
    });
    const d1 = out.find((o) => o.horizon === "D+1");
    expect(d1?.observedValue).toBeNull();
    expect(d1?.deltaPct).toBeNull();
    expect(d1?.sampleNote).toContain("missing_traffic_");
  });
});

describe("computeOutcomes price sessions", () => {
  it("aligns event day to next session when closed", () => {
    const series = [
      { date: "2023-04-03", value: 80 }, // Monday
      { date: "2023-04-04", value: 82 },
      { date: "2023-04-05", value: 81 },
    ];
    // Saturday
    const anchor = priceOnOrNextSession(series, "2023-04-01");
    expect(anchor?.date).toBe("2023-04-03");
    expect(anchor?.value).toBe(80);
  });

  it("computes D+1 / D+5 from session-aligned anchor", () => {
    const series = [
      { date: "2023-04-03", value: 100 },
      { date: "2023-04-04", value: 110 },
      { date: "2023-04-10", value: 120 },
    ];
    const out = computePriceOutcomes({
      eventId: "e1",
      eventOn: "2023-04-03",
      metric: "BZ",
      series,
    });
    expect(out.find((o) => o.horizon === "D+1")?.deltaPct).toBeCloseTo(10, 5);
    expect(out.find((o) => o.horizon === "D+5")?.deltaPct).toBeCloseTo(20, 5);
  });
});

describe("distributionFromDeltas", () => {
  it("marks insufficient under 5 samples", () => {
    const d = distributionFromDeltas("traffic_total", "D+1", [-10, -5, null, 2]);
    expect(d.insufficient).toBe(true);
    expect(d.median).toBeNull();
    expect(d.sampleSize).toBe(3);
  });

  it("exposes min median max when sample >= 5", () => {
    const d = distributionFromDeltas(
      "traffic_total",
      "D+5",
      [-10, -5, 0, 5, 10],
    );
    expect(d.insufficient).toBe(false);
    expect(d.min).toBe(-10);
    expect(d.max).toBe(10);
    expect(d.median).toBe(0);
  });
});
