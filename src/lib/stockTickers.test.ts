import { describe, expect, it } from "vitest";
import { formatTickerChangePercent } from "@/lib/stockTickers";

describe("formatTickerChangePercent", () => {
  it("formats bare percent by default", () => {
    expect(formatTickerChangePercent(1.24)).toBe("+1.2%");
    expect(formatTickerChangePercent(-0.87)).toBe("-0.9%");
    expect(formatTickerChangePercent(null)).toBe("—");
  });

  it("labels prior-day basis in plain language", () => {
    expect(formatTickerChangePercent(2.1, { lang: "ko", withBasis: true })).toBe(
      "전일 +2.1%",
    );
    expect(formatTickerChangePercent(-1.5, { lang: "en", withBasis: true })).toBe(
      "-1.5% d/d",
    );
  });
});
