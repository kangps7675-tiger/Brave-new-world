import { describe, expect, it } from "vitest";
import {
  liveuaFlashMarketContext,
  nearestLogisticsChokepoint,
} from "@/lib/liveuamap/flashMarketContext";

describe("nearestLogisticsChokepoint", () => {
  it("snaps Hormuz-adjacent coords to choke-hormuz", () => {
    const hit = nearestLogisticsChokepoint(26.6, 56.3);
    expect(hit?.id).toBe("choke-hormuz");
    expect(hit?.distanceKm).toBeLessThan(50);
  });

  it("returns null far from any choke", () => {
    expect(nearestLogisticsChokepoint(48.4, 31.2)).toBeNull(); // Ukraine inland
  });
});

describe("liveuaFlashMarketContext", () => {
  it("returns economy symbols for middle-east theater", () => {
    const ctx = liveuaFlashMarketContext({
      theater: "middle-east",
      lat: 26.6,
      lng: 56.3,
    });
    expect(ctx.symbols.length).toBeGreaterThan(0);
    expect(ctx.symbols.length).toBeLessThanOrEqual(3);
    expect(ctx.chokepoint?.id).toBe("choke-hormuz");
    expect(ctx.noteKo.length).toBeGreaterThan(0);
    expect(ctx.suggestPipelines).toBe(true);
  });

  it("still returns theater symbols when no choke nearby", () => {
    const ctx = liveuaFlashMarketContext({
      theater: "russia-ukraine",
      lat: 48.4,
      lng: 31.2,
    });
    expect(ctx.chokepoint).toBeNull();
    expect(ctx.symbols).toContain("ZW=F");
    expect(ctx.suggestPipelines).toBe(true);
  });
});
