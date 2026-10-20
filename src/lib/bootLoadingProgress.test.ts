import { describe, expect, it } from "vitest";
import {
  ACTIVE_LOAD_CAP,
  WAITING_GLOBE_BASE,
  WAITING_GLOBE_CAP,
  combineBootProgress,
  computeDashboardBootProgress,
  waitingGlobeCrawlBonus,
} from "@/lib/bootLoadingProgress";

describe("computeDashboardBootProgress", () => {
  it("returns 100 only when data and globe are ready", () => {
    expect(
      computeDashboardBootProgress({
        isLoading: false,
        globeReady: true,
        appDataLoadProgress: {
          phase: "ready",
          bytesReceived: 1,
          contentLength: 1,
        },
      }),
    ).toBe(100);
  });

  it("does not jump to ~97 while waiting for globe", () => {
    const pct = computeDashboardBootProgress({
      isLoading: false,
      globeReady: false,
      appDataLoadProgress: {
        phase: "ready",
        bytesReceived: 1,
        contentLength: 1,
      },
    });
    expect(pct).toBe(WAITING_GLOBE_BASE);
    expect(pct).toBeLessThan(90);
    expect(combineBootProgress(18, pct, true)).toBeLessThan(90);
  });

  it("caps active load below the false-almost-done band", () => {
    const pct = computeDashboardBootProgress({
      isLoading: true,
      globeReady: false,
      appDataLoadProgress: {
        phase: "ready",
        bytesReceived: 1,
        contentLength: 1,
      },
    });
    expect(pct).toBeLessThanOrEqual(ACTIVE_LOAD_CAP);
  });
});

describe("waitingGlobeCrawlBonus", () => {
  it("crawls slowly toward the waiting cap, never claiming 100", () => {
    expect(waitingGlobeCrawlBonus(0)).toBe(0);
    expect(WAITING_GLOBE_BASE + waitingGlobeCrawlBonus(28_000)).toBe(
      WAITING_GLOBE_CAP,
    );
    expect(WAITING_GLOBE_BASE + waitingGlobeCrawlBonus(60_000)).toBe(
      WAITING_GLOBE_CAP,
    );
  });
});
