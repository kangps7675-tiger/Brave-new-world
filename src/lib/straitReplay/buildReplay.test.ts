import { describe, expect, it } from "vitest";
import {
  buildSeedFallbackReplay,
  buildReplayPayload,
} from "@/lib/straitReplay/buildReplay";

describe("strait replay API payload shape", () => {
  it("always includes sampleSize isSynthetic dataThrough on seed fallback", () => {
    const p = buildSeedFallbackReplay("hormuz", "hormuz-synth-001");
    expect(p.sampleSize).toBeGreaterThan(0);
    expect(typeof p.isSynthetic).toBe("boolean");
    expect(p.isSynthetic).toBe(true);
    expect(p).toHaveProperty("dataThrough");
    expect(p.event?.id).toBe("hormuz-synth-001");
  });

  it("returns empty state without throwing for unknown strait data", () => {
    const p = buildReplayPayload({
      straitId: "malacca",
      events: [],
      traffic: [],
      outcomes: [],
    });
    expect(p.event).toBeNull();
    expect(p.emptyReason).toBe("no_reviewed_events");
    expect(p.sampleSize).toBe(0);
    expect(p.isSynthetic).toBe(false);
    expect(p.dataThrough).toBeNull();
  });
});
