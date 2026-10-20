import { describe, expect, it } from "vitest";
import {
  GAZA_WAR_START,
  IRAN_WAR_START,
  UKRAINE_FULLSCALE_START,
  hapiLookbackWindow,
  hapiLookbackWindowForLocation,
} from "@/lib/hapiConflictCasualties";

describe("hapiLookbackWindowForLocation", () => {
  const now = new Date("2026-08-26T00:00:00.000Z");

  it("uses theater start dates for active wars", () => {
    expect(hapiLookbackWindowForLocation("UKR", now)).toEqual({
      start: UKRAINE_FULLSCALE_START,
      end: "2026-08-26",
    });
    expect(hapiLookbackWindowForLocation("IRN", now)).toEqual({
      start: IRAN_WAR_START,
      end: "2026-08-26",
    });
    expect(hapiLookbackWindowForLocation("PSE", now).start).toBe(GAZA_WAR_START);
    expect(hapiLookbackWindowForLocation("LBN", now).start).toBe(GAZA_WAR_START);
  });

  it("keeps a recent window for China/Taiwan gray-zone", () => {
    const recent = hapiLookbackWindow(now);
    expect(hapiLookbackWindowForLocation("CHN", now)).toEqual(recent);
    expect(hapiLookbackWindowForLocation("TWN", now)).toEqual(recent);
    expect(recent.start).toBe("2026-04-26");
  });
});
