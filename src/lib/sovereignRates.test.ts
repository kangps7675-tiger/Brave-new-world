import { describe, expect, it } from "vitest";
import { SOVEREIGN_RATE_COUNTRIES } from "@/lib/sovereignRates";
import { stubSovereignRates } from "@/lib/sovereignRatesFetch";

describe("sovereignRates", () => {
  it("covers major economies with long-yield series", () => {
    const ids = SOVEREIGN_RATE_COUNTRIES.map((c) => c.id);
    expect(ids).toEqual(["US", "EA", "DE", "JP", "GB", "KR", "CA", "AU"]);
    for (const c of SOVEREIGN_RATE_COUNTRIES) {
      expect(c.longSeries.length).toBeGreaterThan(3);
      expect(c.spreadLabelKo).toContain("년");
    }
  });

  it("US uses dedicated T10Y2Y spread series", () => {
    const us = SOVEREIGN_RATE_COUNTRIES.find((c) => c.id === "US");
    expect(us?.spreadSeries).toBe("T10Y2Y");
    expect(us?.policySeries).toBe("FEDFUNDS");
  });

  it("stub rows match country table", () => {
    const stub = stubSovereignRates();
    expect(stub).toHaveLength(SOVEREIGN_RATE_COUNTRIES.length);
    expect(stub.every((r) => r.spreadSparkline.length === 0)).toBe(true);
  });
});
