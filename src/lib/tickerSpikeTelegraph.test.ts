import { describe, expect, it, beforeEach } from "vitest";
import {
  evaluateSpikeTelegraphFire,
  isBreakingMorseSuppressing,
  listDatabentoSpikes,
  markBreakingMorsePlayed,
  pickDatabentoSpikeLeader,
  resetBreakingMorseSuppressForTests,
  TICKER_TELEGRAPH_COOLDOWN_MS,
} from "@/lib/tickerSpikeTelegraph";

describe("listDatabentoSpikes / pickDatabentoSpikeLeader", () => {
  it("only includes Databento futures at/above threshold", () => {
    const list = listDatabentoSpikes([
      { symbol: "CL=F", changePercent: 2.1 },
      { symbol: "GC=F", changePercent: 0.5 },
      { symbol: "LMT", changePercent: 3.0 },
      { symbol: "NG=F", changePercent: -1.8 },
    ]);
    expect(list.map((x) => x.symbol)).toEqual(["CL=F", "NG=F"]);
    expect(list[0].direction).toBe("up");
    expect(list[1].direction).toBe("down");
  });

  it("picks max abs percent as leader", () => {
    const leader = pickDatabentoSpikeLeader([
      { symbol: "CL=F", changePercent: 1.5 },
      { symbol: "BZ=F", changePercent: -2.4 },
    ]);
    expect(leader?.symbol).toBe("BZ=F");
    expect(leader?.direction).toBe("down");
  });
});

describe("evaluateSpikeTelegraphFire", () => {
  it("fires on reentry then arms; clears arm when quiet", () => {
    let state = { armed: false, lastFiredAt: 0 };
    const t0 = 1_000_000;
    let r = evaluateSpikeTelegraphFire(true, state, t0);
    expect(r.fire).toBe(true);
    state = r.next;
    expect(state.armed).toBe(true);

    r = evaluateSpikeTelegraphFire(true, state, t0 + 1000);
    expect(r.fire).toBe(false);

    r = evaluateSpikeTelegraphFire(false, state, t0 + 2000);
    expect(r.fire).toBe(false);
    expect(r.next.armed).toBe(false);

    r = evaluateSpikeTelegraphFire(true, r.next, t0 + 2000);
    expect(r.fire).toBe(false); // cooldown
    expect(r.next.armed).toBe(true);

    r = evaluateSpikeTelegraphFire(false, r.next, t0 + 3000);
    r = evaluateSpikeTelegraphFire(true, r.next, t0 + TICKER_TELEGRAPH_COOLDOWN_MS + 3000);
    expect(r.fire).toBe(true);
  });
});

describe("breaking morse suppress", () => {
  beforeEach(() => {
    resetBreakingMorseSuppressForTests();
  });

  it("suppresses within window after mark", () => {
    const now = 5_000_000;
    expect(isBreakingMorseSuppressing(now)).toBe(false);
    markBreakingMorsePlayed(now);
    expect(isBreakingMorseSuppressing(now + 1000)).toBe(true);
    expect(isBreakingMorseSuppressing(now + 13_000)).toBe(false);
  });
});
