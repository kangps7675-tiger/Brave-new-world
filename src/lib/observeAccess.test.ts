import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  OBSERVE_PREVIEW_MS,
  canMountFullObserve,
  clearObserveUnlocked,
  markObserveUnlocked,
  readObserveUnlocked,
} from "@/lib/observeAccess";

describe("observeAccess", () => {
  beforeEach(() => {
    clearObserveUnlocked();
  });
  afterEach(() => {
    clearObserveUnlocked();
  });

  it("defaults locked", () => {
    expect(readObserveUnlocked()).toBe(false);
    expect(canMountFullObserve()).toBe(false);
  });

  it("unlocks via localStorage", () => {
    markObserveUnlocked();
    expect(readObserveUnlocked()).toBe(true);
    expect(canMountFullObserve(true)).toBe(true);
  });

  it("preview window is ~30s", () => {
    expect(OBSERVE_PREVIEW_MS).toBe(30_000);
  });
});
