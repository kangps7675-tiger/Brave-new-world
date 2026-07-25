import { describe, expect, it } from "vitest";
import {
  computeTransitStress,
  parsePortWatchResponse,
  toStressObservation,
} from "@/lib/portWatch";

describe("portWatch", () => {
  it("parsePortWatchResponse normalizes ArcGIS features", () => {
    const rows = parsePortWatchResponse({
      features: [
        {
          attributes: {
            portid: "chokepoint6",
            date: "2026-07-19",
            n_total: 15,
            capacity: 100,
          },
        },
        { attributes: { portid: null, n_total: 1 } },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      portid: "chokepoint6",
      date: "2026-07-19",
      nTotal: 15,
    });
  });

  it("computeTransitStress reports decline vs baseline", () => {
    const rows = Array.from({ length: 30 }, (_, i) => {
      const day = String(30 - i).padStart(2, "0");
      return {
        portid: "chokepoint6",
        date: `2026-06-${day}`,
        // recent 7 days ~10, older ~20 → ~-50%
        nTotal: i < 7 ? 10 : 20,
        capacity: 0,
      };
    });
    const stress = computeTransitStress(rows);
    expect(stress.changePct).not.toBeNull();
    expect(stress.changePct!).toBeLessThan(-40);
    const obs = toStressObservation(stress);
    expect(obs?.isDemo).toBe(false);
    expect(obs?.changePct).toBe(stress.changePct);
  });

  it("toStressObservation returns null when data insufficient", () => {
    expect(toStressObservation(computeTransitStress([]))).toBeNull();
  });
});
