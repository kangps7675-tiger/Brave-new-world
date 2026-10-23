import { describe, expect, it } from "vitest";
import { JMIC_2026, type JmicRow } from "@/data/gold/jmic2026";
import { checkAgainstJmic, isAnonymizedName } from "./jmicCheck";

const row = (ref: number, date: string, event: string, vessel: string | null): JmicRow => ({ ref, date, vessel, type: "Tanker", event, location: "x" });

describe("checkAgainstJmic", () => {
  it("번호가 없으면 missing, 있으면 found", () => {
    const r = checkAgainstJmic([{ incidentNumber: 5, incidentTypeName: "Attack", utcDateOfIncident: "2026-03-01T00:00:00Z" }], [row(5, "2026-03-01", "Attack", null), row(6, "2026-03-02", "Attack", null)]);
    expect(r.found).toBe(1);
    expect(r.missing.map((m) => m.ref)).toEqual([6]);
  });
  it("2026년이 아닌 DB 줄은 번호가 같아도 무시", () => {
    const r = checkAgainstJmic([{ incidentNumber: 5, incidentTypeName: "Attack", utcDateOfIncident: "2025-03-01T00:00:00Z" }], [row(5, "2026-03-01", "Attack", null)]);
    expect(r.found).toBe(0);
  });
  it("날짜·유형 불일치와 선명 보강을 잡는다", () => {
    const r = checkAgainstJmic(
      [{ incidentNumber: 7, incidentTypeName: "Suspicious Activity", vesselName: "tkr", utcDateOfIncident: "2026-03-20T00:00:00Z" }],
      [row(7, "2026-03-10", "Attack", "SKYLIGHT")],
    );
    expect(r.dateMismatch).toHaveLength(1);
    expect(r.typeMismatch[0]!.dbType).toBe("Suspicious Activity");
    expect(r.nameGains[0]).toMatchObject({ ref: 7, jmicName: "SKYLIGHT" });
  });
  it("가려진 이름 판별", () => {
    expect(["", ".", "TKR", "Merchant", "NO", "Tanker"].every(isAnonymizedName)).toBe(true);
    expect(isAnonymizedName("GFS Galaxy")).toBe(false);
  });
});

describe("JMIC_2026", () => {
  it("ref가 겹치지 않는다", () => {
    expect(new Set(JMIC_2026.map((r) => r.ref)).size).toBe(JMIC_2026.length);
  });
});
