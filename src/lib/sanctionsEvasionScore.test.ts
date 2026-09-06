import { describe, expect, it } from "vitest";
import {
  computeSanctionsEvasionSnapshot,
  corridorEvasionIntensity,
  listSanctionsEvasionRankRows,
} from "@/lib/sanctionsEvasionScore";
import { displaySesScore } from "@/lib/ses";

describe("sanctions evasion score", () => {
  it("lists sanctions-evasion corridors", () => {
    const rows = listSanctionsEvasionRankRows();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.category === "sanctions-evasion")).toBe(true);
  });

  it("corridor intensity is 0–1", () => {
    const row = listSanctionsEvasionRankRows()[0];
    const intensity = corridorEvasionIntensity(row);
    expect(intensity).toBeGreaterThanOrEqual(0);
    expect(intensity).toBeLessThanOrEqual(1);
  });

  it("global SES is 0–100", () => {
    const snap = computeSanctionsEvasionSnapshot(null);
    const score = displaySesScore(snap.score);
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThanOrEqual(0);
    expect(score!).toBeLessThanOrEqual(100);
    expect(snap.topDrivers.length).toBeGreaterThan(0);
    expect(snap.topDrivers.length).toBeLessThanOrEqual(5);
  });

  it("delta reflects prior score", () => {
    const snap = computeSanctionsEvasionSnapshot(10);
    expect(snap.deltaScore).toBe(snap.score - 10);
  });
});
