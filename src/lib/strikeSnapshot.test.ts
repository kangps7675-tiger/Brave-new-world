import { describe, expect, it } from "vitest";
import type { DatalasticVessel } from "@/lib/datalasticAis";
import {
  EVENT_MIN_REMAINING_CREDITS,
  SNAPSHOT_RADIUS_LATE_NM,
  SNAPSHOT_RADIUS_NM,
  aisTypeCodeFromDatalastic,
  canShareSnapshot,
  canSpendOnEvent,
  datalasticTypeGroup,
  historyDays,
  historyDue,
  historyRange,
  incidentMs,
  pickCandidates,
  snapshotRadiusNm,
} from "@/lib/strikeSnapshot";
import { isStrikeType } from "@/lib/strikeMatch/strikeType";

const P = { lat: 26.4, lng: 56.5 };

function v(over: Partial<DatalasticVessel> & { mmsi: string }): DatalasticVessel {
  return {
    imo: null,
    name: null,
    type: "Tanker",
    typeSpecific: null,
    lat: P.lat,
    lng: P.lng,
    sog: null,
    cog: null,
    heading: null,
    destination: null,
    at: null,
    ...over,
  };
}

describe("snapshot radius", () => {
  it("늦은 보고(6시간 초과)는 반경을 넓힌다", () => {
    expect(snapshotRadiusNm(0.5)).toBe(SNAPSHOT_RADIUS_NM);
    expect(snapshotRadiusNm(6)).toBe(SNAPSHOT_RADIUS_NM);
    expect(snapshotRadiusNm(6.1)).toBe(SNAPSHOT_RADIUS_LATE_NM);
    expect(SNAPSHOT_RADIUS_LATE_NM).toBeLessThanOrEqual(50);
  });
});

describe("pickCandidates", () => {
  it("가까운 순으로 자르고 최대 개수를 지킨다", () => {
    const vs = Array.from({ length: 15 }, (_, i) => v({ mmsi: String(100000000 + i), lat: P.lat + i * 0.01 }));
    const out = pickCandidates(vs, { ...P, vesselType: null }, 10);
    expect(out).toHaveLength(10);
    expect(out[0]!.mmsi).toBe("100000000");
    expect(out.map((c) => c.distNm)).toEqual([...out.map((c) => c.distNm)].sort((a, b) => a - b));
  });

  it("경보 선종과 다른 선종으로 확인된 배는 빼고, 모르는 선종은 남긴다", () => {
    const vs = [
      v({ mmsi: "100000001", type: "Tanker" }),
      v({ mmsi: "100000002", type: "Cargo" }),
      v({ mmsi: "100000003", type: null }),
      v({ mmsi: "100000004", type: "Fishing" }),
    ];
    const out = pickCandidates(vs, { ...P, vesselType: "Tanker " }, 10).map((c) => c.mmsi);
    expect(out).toEqual(expect.arrayContaining(["100000001", "100000003"]));
    expect(out).not.toContain("100000002");
    expect(out).not.toContain("100000004");
  });

  it("경보 선종을 모르면(예: Tug) 선종으로 거르지 않는다", () => {
    const vs = [v({ mmsi: "100000001", type: "Cargo" }), v({ mmsi: "100000002", type: "Tanker" })];
    expect(pickCandidates(vs, { ...P, vesselType: "Tug " })).toHaveLength(2);
  });

  it("군함·관공선은 뺀다", () => {
    const vs = [v({ mmsi: "100000001", type: "Military Ops" }), v({ mmsi: "100000002", type: "Tanker" })];
    expect(pickCandidates(vs, { ...P, vesselType: null }).map((c) => c.mmsi)).toEqual(["100000002"]);
  });
});

describe("share / timing", () => {
  const now = Date.parse("2026-10-21T12:00:00Z");
  it("90분 안 + 20NM 안이면 스냅샷을 같이 쓴다", () => {
    expect(canShareSnapshot({ snapshotAtMs: now - 30 * 60_000, ...P }, { lat: P.lat + 0.1, lng: P.lng }, now)).toBe(true);
  });
  it("오래됐거나 멀면 같이 쓰지 않는다", () => {
    expect(canShareSnapshot({ snapshotAtMs: now - 100 * 60_000, ...P }, P, now)).toBe(false);
    expect(canShareSnapshot({ snapshotAtMs: now - 10 * 60_000, ...P }, { lat: P.lat + 1, lng: P.lng }, now)).toBe(false);
  });
  it("이력 보강은 사건 3시간 뒤부터", () => {
    const at = Date.parse("2026-10-21T01:45:00Z");
    expect(historyDue(at, at + 2.9 * 3_600_000)).toBe(false);
    expect(historyDue(at, at + 3 * 3_600_000)).toBe(true);
  });
  it("이력 구간은 사건 ±6시간", () => {
    const at = Date.parse("2026-10-21T01:45:00Z");
    expect(historyRange(at)).toEqual({ fromIso: "2026-10-20T19:45:00.000Z", toIso: "2026-10-21T07:45:00.000Z" });
  });
});

describe("historyDays", () => {
  it("구간이 걸친 UTC 날수 (to 는 배타적이라 하루 뒤 날짜를 쓴다)", () => {
    expect(historyDays("2026-10-20T19:45:00.000Z", "2026-10-21T07:45:00.000Z")).toBe(2);
    expect(historyDays("2026-10-21T02:00:00.000Z", "2026-10-21T14:00:00.000Z")).toBe(1);
  });
});

describe("misc", () => {
  it("incidentMs 는 발생 시각 우선, 없으면 생성 시각", () => {
    expect(incidentMs("2026-10-21T01:45:00Z", "2026-10-21T05:00:00Z")).toBe(Date.parse("2026-10-21T01:45:00Z"));
    expect(incidentMs(null, "2026-10-21T05:00:00Z")).toBe(Date.parse("2026-10-21T05:00:00Z"));
    expect(incidentMs("bad", null)).toBeNull();
  });
  it("Datalastic 선종 → AIS 코드", () => {
    expect(datalasticTypeGroup("Crude Oil Tanker")).toBe("tanker");
    expect(aisTypeCodeFromDatalastic("Tanker")).toBe(80);
    expect(aisTypeCodeFromDatalastic("Cargo")).toBe(70);
    expect(aisTypeCodeFromDatalastic("Fishing")).toBeNull();
    expect(aisTypeCodeFromDatalastic(null)).toBeNull();
  });
  it("남은 예산이 부족하면 사건 스냅샷도 하지 않는다", () => {
    expect(canSpendOnEvent(15_000 - EVENT_MIN_REMAINING_CREDITS, 15_000)).toBe(true);
    expect(canSpendOnEvent(15_000 - EVENT_MIN_REMAINING_CREDITS + 1, 15_000)).toBe(false);
  });
  it("피격 유형 판별은 그대로 (권고·의심활동 제외)", () => {
    expect(isStrikeType("Attack")).toBe(true);
    expect(isStrikeType("Boarding")).toBe(true);
    expect(isStrikeType("Suspicious Activity")).toBe(false);
    expect(isStrikeType(null)).toBe(false);
  });
});
