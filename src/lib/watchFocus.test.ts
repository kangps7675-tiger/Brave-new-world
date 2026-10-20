import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  formatWatchPinsLine,
  loadWatchPins,
  removeWatchPin,
  upsertWatchPin,
  WATCH_PINS_MAX,
  WATCH_FOCUS_STORAGE_KEY,
  WATCH_PINS_STORAGE_KEY,
  type WatchFocus,
} from "./watchFocus";

vi.mock("@/lib/trackClient", () => ({
  trackEvent: vi.fn(),
}));

function mockStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage },
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
  return map;
}

describe("watchFocus pins", () => {
  beforeEach(() => {
    mockStorage();
  });

  it("migrates legacy single focus into pins", () => {
    const legacy: WatchFocus = {
      mode: "conflict",
      theater: "china-taiwan",
      labelKo: "대만 해협",
      labelEn: "Taiwan Strait",
      rankEntityId: "taiwan",
      rankKind: "theater",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    window.localStorage.setItem(WATCH_FOCUS_STORAGE_KEY, JSON.stringify(legacy));
    const pins = loadWatchPins();
    expect(pins).toHaveLength(1);
    expect(pins[0]?.rankEntityId).toBe("taiwan");
    expect(window.localStorage.getItem(WATCH_PINS_STORAGE_KEY)).toBeTruthy();
  });

  it("upserts without duplicating same entity and caps at max", () => {
    for (let i = 0; i < WATCH_PINS_MAX + 2; i += 1) {
      upsertWatchPin({
        mode: "conflict",
        theater: `t-${i}`,
        labelKo: `전장${i}`,
        labelEn: `Theater${i}`,
        rankEntityId: `e-${i}`,
        rankKind: "theater",
      });
    }
    expect(loadWatchPins()).toHaveLength(WATCH_PINS_MAX);
    upsertWatchPin({
      mode: "conflict",
      theater: "t-0",
      labelKo: "전장0-갱신",
      labelEn: "Theater0",
      rankEntityId: "e-0",
      rankKind: "theater",
    });
    const pins = loadWatchPins();
    expect(pins).toHaveLength(WATCH_PINS_MAX);
    expect(pins[0]?.labelKo).toBe("전장0-갱신");
  });

  it("formats multi-pin line with ranks", () => {
    const pins: WatchFocus[] = [
      {
        mode: "conflict",
        labelKo: "대만",
        labelEn: "Taiwan",
        rankEntityId: "taiwan",
        rankKind: "theater",
        updatedAt: "a",
      },
      {
        mode: "economy",
        labelKo: "호르무즈",
        labelEn: "Hormuz",
        rankEntityId: "hormuz",
        rankKind: "chokepoint",
        updatedAt: "b",
      },
    ];
    const line = formatWatchPinsLine(pins, "ko", {
      taiwan: { rank: 2, prevRank: 4 },
      hormuz: { rank: 1, prevRank: 1 },
    });
    expect(line).toContain("내 핀 2");
    expect(line).toContain("대만 2위↑");
    expect(line).toContain("호르무즈 1위");
  });

  it("removes a pin by entity", () => {
    upsertWatchPin({
      mode: "conflict",
      labelKo: "A",
      labelEn: "A",
      rankEntityId: "taiwan",
      rankKind: "theater",
    });
    upsertWatchPin({
      mode: "conflict",
      labelKo: "B",
      labelEn: "B",
      rankEntityId: "ukraine",
      rankKind: "theater",
    });
    removeWatchPin({ mode: "conflict", rankEntityId: "taiwan" });
    expect(loadWatchPins().map((p) => p.rankEntityId)).toEqual(["ukraine"]);
  });
});
