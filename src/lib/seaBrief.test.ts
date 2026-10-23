import { describe, expect, it } from "vitest";
import { computeSeaBrief, type SeaIncident } from "./seaBrief";

const NOW = Date.parse("2026-10-23T00:00:00Z");
const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const rs = (id: string, type: string, ago: number): SeaIncident => ({
  id, incidentTypeName: type, lat: 14, lng: 42.5, utcDateOfIncident: day(ago), vesselName: "TEST",
});

describe("computeSeaBrief", () => {
  it("자료가 아무것도 없으면 nodata", () => {
    expect(computeSeaBrief("red-sea", { incidents: [], quotes: [], weather: null, now: NOW }).stance).toBe("nodata");
  });
  it("3일 안 피격이면 avoid", () => {
    const b = computeSeaBrief("red-sea", { incidents: [rs("a", "Attack", 2)], quotes: [], weather: null, now: NOW });
    expect(b.stance).toBe("avoid");
    expect(b.strikes30d).toBe(1);
  });
  it("의심 활동·권고는 피격으로 세지 않는다", () => {
    const b = computeSeaBrief("red-sea", { incidents: [rs("a", "Suspicious Activity", 1), rs("b", "Advisory", 1)], quotes: [], weather: null, now: NOW });
    expect(b.strikes30d).toBe(0);
    expect(b.stance).toBe("normal");
  });
  it("다른 해역 사건은 세지 않는다", () => {
    const hormuz: SeaIncident = { id: "h", incidentTypeName: "Attack", lat: 26, lng: 56, utcDateOfIncident: day(1) };
    expect(computeSeaBrief("red-sea", { incidents: [hormuz], quotes: [], weather: null, now: NOW }).strikes30d).toBe(0);
  });
  it("추세: 직전 30일보다 늘면 rising, 둘 다 0이면 quiet", () => {
    const rising = computeSeaBrief("red-sea", { incidents: [rs("a", "Attack", 10), rs("b", "Attack", 40)], quotes: [], weather: null, now: NOW });
    expect(rising.trend).toBe("flat");
    const r2 = computeSeaBrief("red-sea", { incidents: [rs("a", "Attack", 10), rs("c", "Hijack", 12), rs("b", "Attack", 40)], quotes: [], weather: null, now: NOW });
    expect(r2.trend).toBe("rising");
    expect(computeSeaBrief("red-sea", { incidents: [rs("x", "Advisory", 5)], quotes: [], weather: null, now: NOW }).trend).toBe("quiet");
  });
  it("보험료 상승만으로도 caution", () => {
    const b = computeSeaBrief("hormuz", {
      incidents: [], weather: null, now: NOW,
      quotes: [{ region: "hormuz", ratePct: 0.5, ratePrevPct: 0.2, direction: "up", outlet: "X", url: "u", publishedAt: day(1) }],
    });
    expect(b.stance).toBe("caution");
  });
});
