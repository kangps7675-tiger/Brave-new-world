import { describe, expect, it, beforeEach } from "vitest";
import {
  BRIEFING_STEP_IDS,
  getBriefingProgress,
  markBriefingStep,
} from "@/lib/dailyBriefingProgress";

function mockSessionStorage() {
  const store: Record<string, string> = {};
  const api: Storage = {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
    getItem(key) {
      return store[key] ?? null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    key(index) {
      return Object.keys(store)[index] ?? null;
    },
  };
  Object.defineProperty(globalThis, "sessionStorage", {
    value: api,
    configurable: true,
  });
}

describe("dailyBriefingProgress", () => {
  beforeEach(() => {
    mockSessionStorage();
  });

  it("counts marked steps", () => {
    expect(getBriefingProgress().done).toBe(0);
    markBriefingStep("gti");
    markBriefingStep("gti"); // idempotent
    markBriefingStep("predict");
    const p = getBriefingProgress();
    expect(p.done).toBe(2);
    expect(p.total).toBe(BRIEFING_STEP_IDS.length);
    expect(p.steps.gti).toBe(true);
    expect(p.steps.layer).toBe(false);
  });
});
