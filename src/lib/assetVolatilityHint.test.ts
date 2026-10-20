import { describe, expect, it } from "vitest";
import {
  assetVolatilityHintForPoint,
  primaryRelatedTicker,
  volatilityZScore,
} from "@/lib/assetVolatilityHint";

describe("primaryRelatedTicker", () => {
  it("picks the first resolvable label, not the loudest mover later", () => {
    expect(primaryRelatedTicker("Brent · DXY · VIX")).toEqual({
      label: "Brent",
      symbol: "BZ=F",
    });
  });
});

describe("assetVolatilityHintForPoint", () => {
  it("uses the primary ticker even when another related ticker moved more", () => {
    const map = new Map<string, number | null>([
      ["BZ=F", 0.2], // Brent quiet
      ["DX-Y.NYB", 0.1],
      ["^VIX", 12], // VIX screaming — must not steal the signal
    ]);
    const hint = assetVolatilityHintForPoint("Brent · DXY · VIX", map);
    expect(hint).toBeTruthy();
    expect(hint!.assetLabel).toBe("Brent");
    expect(hint!.symbol).toBe("BZ=F");
    expect(hint!.hint).toBe("normal");
  });

  it("marks high when primary ticker z-score is large", () => {
    const map = new Map<string, number | null>([["BZ=F", 4.0]]); // σ≈1.6 → z≈2.5
    const hint = assetVolatilityHintForPoint("Brent · NatGas", map);
    expect(hint?.hint).toBe("high");
    expect(hint!.zScore).toBeGreaterThanOrEqual(2);
  });

  it("returns null when the primary ticker has no quote", () => {
    const map = new Map<string, number | null>([
      ["^VIX", 8],
      ["BZ=F", null],
    ]);
    expect(assetVolatilityHintForPoint("Brent · VIX", map)).toBeNull();
  });
});

describe("volatilityZScore", () => {
  it("scales by typical daily sigma", () => {
    expect(volatilityZScore(1.6, "BZ=F")).toBeCloseTo(1, 5);
    expect(volatilityZScore(3.2, "BZ=F")).toBeCloseTo(2, 5);
  });
});
