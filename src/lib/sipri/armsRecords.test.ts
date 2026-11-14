import { describe, expect, it } from "vitest";
import { armsPairInFlash } from "@/lib/sipri/flashPair";
import { armsCountryName } from "@/lib/axisArmsI18n";
import { armsGeoCode } from "@/data/armsActors";
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
  it("후티는 예멘 국가와 섞이지 않는다", () => {
    expect(sipriRecordsForPair("IRN", "YEM").pairs).toEqual([]);
    const houthi = sipriRecordsForHub("IRN").pairs.filter((p) => p.recipient === "YEM-HOUTHI");
    expect(houthi).toHaveLength(1);
  });
  it("비국가 행위자는 이름표는 따로, 지도 자리는 근거지 나라", () => {
    expect(armsCountryName("YEM-HOUTHI", "ko")).toBe("후티 반군(예멘)");
    expect(armsCountryName("YEM", "ko")).toBe("예멘");
    expect(armsGeoCode("YEM-HOUTHI")).toBe("YEM");
    expect(armsGeoCode("CUB-ANTICASTRO")).toBe("CUB");
    expect(armsGeoCode("RUS")).toBe("RUS");
  });
  it("기록 없는 쌍은 비어 있다", () => {
    expect(sipriRecordsForPair("IRN", "PRK").pairs).toEqual([]);
  });
});
