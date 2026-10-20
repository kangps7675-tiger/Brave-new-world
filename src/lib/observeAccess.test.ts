import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  OBSERVE_PREVIEW_MS,
  canMountFullObserve,
  clearObserveUnlocked,
  markObserveUnlocked,
  readObserveUnlocked,
} from "@/lib/observeAccess";

/** Node vitest에는 window/localStorage가 없다 — observeAccess는 window를 본다 */
function installMemoryStorage() {
  const create = () => {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      get length() {
        return store.size;
      },
      key: (index: number) => [...store.keys()][index] ?? null,
    };
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: create(),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    value: create(),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
    writable: true,
  });
}

installMemoryStorage();

describe("observeAccess", () => {
  beforeEach(() => {
    localStorage.clear();
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
