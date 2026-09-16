import { afterEach, describe, expect, it, vi } from "vitest";
import {
  conflictEventsReplaceLegacy,
  stripLegacyConflictPrefs,
} from "@/lib/conflictEvents/flags";
import { DEFAULT_LAYER_PREFS } from "@/lib/layerPrefs";

describe("conflictEventsReplaceLegacy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("미설정·1이면 대체 ON", () => {
    vi.stubEnv("NEXT_PUBLIC_CONFLICT_EVENTS_REPLACE_LEGACY", undefined);
    expect(conflictEventsReplaceLegacy()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_CONFLICT_EVENTS_REPLACE_LEGACY", "1");
    expect(conflictEventsReplaceLegacy()).toBe(true);
  });

  it("0이면 병행(대체 OFF)", () => {
    vi.stubEnv("NEXT_PUBLIC_CONFLICT_EVENTS_REPLACE_LEGACY", "0");
    expect(conflictEventsReplaceLegacy()).toBe(false);
  });

  it("대체 ON이면 레거시 prefs를 강제 OFF", () => {
    vi.stubEnv("NEXT_PUBLIC_CONFLICT_EVENTS_REPLACE_LEGACY", "1");
    const stripped = stripLegacyConflictPrefs({
      ...DEFAULT_LAYER_PREFS,
      showNewfeedsIranAttacks: true,
      showUkraineStrikesOnRussia: true,
      showNorthKoreaMissileTests: true,
      showChinaTaiwanIncidents: true,
      showConflictEvents: true,
    });
    expect(stripped.showNewfeedsIranAttacks).toBe(false);
    expect(stripped.showUkraineStrikesOnRussia).toBe(false);
    expect(stripped.showNorthKoreaMissileTests).toBe(false);
    expect(stripped.showChinaTaiwanIncidents).toBe(false);
    expect(stripped.showConflictEvents).toBe(true);
  });
});
