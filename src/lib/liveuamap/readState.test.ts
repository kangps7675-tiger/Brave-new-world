import { describe, expect, it } from "vitest";
import {
  createLiveuaReadState,
  isLiveuaUnreadArrival,
  markLiveuaIdsRead,
  pruneLiveuaReadState,
  registerLiveuaArrivals,
} from "@/lib/liveuamap/readState";

describe("LiveUA read state", () => {
  it("does not badge the history received on the first visit", () => {
    const t0 = 1_000_000;
    const s = registerLiveuaArrivals(createLiveuaReadState(t0), ["a", "b"], t0);
    expect(isLiveuaUnreadArrival(s, "a")).toBe(false);
    expect(isLiveuaUnreadArrival(s, "b")).toBe(false);
  });

  it("badges later arrivals until opened", () => {
    const t0 = 1_000_000;
    let s = registerLiveuaArrivals(createLiveuaReadState(t0), ["a"], t0);
    s = registerLiveuaArrivals(s, ["a", "c"], t0 + 15_000);
    expect(isLiveuaUnreadArrival(s, "c")).toBe(true);
    s = markLiveuaIdsRead(s, ["c"], t0 + 20_000);
    expect(isLiveuaUnreadArrival(s, "c")).toBe(false);
    expect(s.read.c).toBe(t0 + 20_000);
  });

  it("keeps the first arrival time on repeat polls", () => {
    const t0 = 1_000_000;
    const s1 = registerLiveuaArrivals(createLiveuaReadState(t0), ["a"], t0 + 5);
    const s2 = registerLiveuaArrivals(s1, ["a"], t0 + 99);
    expect(s2).toBe(s1);
    expect(s2.known.a).toBe(t0 + 5);
  });

  it("returns the same object when marking an already-read id", () => {
    const s1 = markLiveuaIdsRead(createLiveuaReadState(0), ["a"], 10);
    expect(markLiveuaIdsRead(s1, ["a"], 20)).toBe(s1);
  });

  it("drops records older than 48 hours", () => {
    const now = 100 * 60 * 60 * 1000;
    const s = pruneLiveuaReadState(
      { since: 0, read: { old: 1, fresh: now - 1000 }, known: { old: 1 } },
      now,
    );
    expect(Object.keys(s.read)).toEqual(["fresh"]);
    expect(s.known).toEqual({});
    expect(s.since).toBe(0);
  });
});
