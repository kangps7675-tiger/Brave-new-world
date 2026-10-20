import { describe, expect, it } from "vitest";
import {
  lampContentSlotKey,
  lampSeenKey,
  msUntilNextLampContentSlot,
} from "@/lib/news/periodicBriefing";

describe("lamp 6h slot keys", () => {
  it("lampSeenKey ties mode to content slot", () => {
    const slot = "daily-2026-08-10-s2";
    expect(lampSeenKey(slot, "conflict")).toBe("daily-2026-08-10-s2-conflict");
    expect(lampSeenKey(slot, "economy")).toBe("daily-2026-08-10-s2-economy");
  });

  it("lampContentSlotKey uses 6h buckets", () => {
    expect(lampContentSlotKey(new Date(2026, 7, 10, 0, 30))).toBe("daily-2026-08-10-s0");
    expect(lampContentSlotKey(new Date(2026, 7, 10, 6, 0))).toBe("daily-2026-08-10-s1");
    expect(lampContentSlotKey(new Date(2026, 7, 10, 12, 1))).toBe("daily-2026-08-10-s2");
    expect(lampContentSlotKey(new Date(2026, 7, 10, 18, 0))).toBe("daily-2026-08-10-s3");
  });

  it("msUntilNextLampContentSlot is positive and within 6h", () => {
    const ms = msUntilNextLampContentSlot(new Date(2026, 7, 10, 5, 0, 0));
    expect(ms).toBeGreaterThanOrEqual(1000);
    expect(ms).toBeLessThanOrEqual(6 * 60 * 60 * 1000);
  });
});
