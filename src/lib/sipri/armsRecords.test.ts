import { describe, expect, it } from "vitest";
import { armsPairInFlash } from "@/lib/sipri/flashPair";
import { SIPRI_MAX_DEALS_PER_RESPONSE, sipriRecordsForHub, sipriRecordsForPair } from "@/lib/sipri/armsRecords";

describe("속보 → SIPRI 나라 쌍", () => {
  it("SIPRI 허브가 아닌 나라(한국)는 쌍에서 빠진다", () => {
    const p = armsPairInFlash("North Korea ships missiles to Russia, Seoul says");
    expect(p && [...p].sort()).toEqual(["PRK", "RUS"]);
  });
  it("두 나라 + 무기 낱말", () => {
    const p = armsPairInFlash("Iran supplied drones to Russia, officials say");
    expect(p && [...p].sort()).toEqual(["IRN", "RUS"]);
  });
  it("무기 낱말이 없으면 붙이지 않는다", () => {
    expect(armsPairInFlash("Russia and China hold talks in Beijing")).toBeNull();
  });
  it("후티 같은 비국가 행위자는 쌍으로 만들지 않는다", () => {
    expect(armsPairInFlash("Houthis fire missiles at ship, Iran denies")).toBeNull();
  });
});

describe("SIPRI 기록 조회", () => {
  it("북한↔러시아 기록이 있다", () => {
    const r = sipriRecordsForPair("PRK", "RUS");
    expect(r.pairs.length).toBeGreaterThan(0);
    expect(r.url).toContain("sipri.org");
  });
  it("한 응답의 건수 상한", () => {
    expect(sipriRecordsForHub("RUS").deals.length).toBeLessThanOrEqual(SIPRI_MAX_DEALS_PER_RESPONSE);
  });
  it("기록 없는 쌍은 비어 있다", () => {
    expect(sipriRecordsForPair("IRN", "PRK").pairs).toEqual([]);
  });
});
