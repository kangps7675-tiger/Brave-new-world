import { describe, expect, it } from "vitest";
import { parseVesselFind, pickByName, verifyNamedPosition } from "./vesselFind";

// ⚠️ 가짜 픽스처 — 실제 vessel_find 응답을 확인하면 교체할 것 (vesselFind.ts 머리말 참고)
const FIXTURE = {
  data: [
    { name: "EVER LOVELY", mmsi: "477000001", imo: "9378474", type: "Cargo", country_iso: "HK" },
    { name: "EVER LOVELY", mmsi: "563000002", imo: null, type: "Tanker", country_iso: "SG" },
    { name: "EVER LOVELY 2", mmsi: "563000003", imo: "9378474", type: "Cargo" },
    { name: "BAD", mmsi: "12", imo: null, type: null },
  ],
  meta: { success: true },
};

describe("parseVesselFind", () => {
  it("배열 위치가 달라도 읽는다", () => {
    expect(parseVesselFind(FIXTURE).vessels).toHaveLength(3);
    expect(parseVesselFind({ data: { vessels: FIXTURE.data }, meta: { success: true } }).vessels).toHaveLength(3);
    expect(parseVesselFind({ data: { results: FIXTURE.data } }).vessels).toHaveLength(3);
  });
  it("실패 응답·빈 응답", () => {
    expect(parseVesselFind({ meta: { success: false } }).ok).toBe(false);
    expect(parseVesselFind(null).ok).toBe(false);
    expect(parseVesselFind({ data: [] })).toEqual({ ok: true, vessels: [] });
  });
});

describe("pickByName", () => {
  const found = parseVesselFind(FIXTURE).vessels;
  it("이름이 정확히 같은 것만 (EVER LOVELY 2 제외)", () => {
    expect(pickByName(found, { name: "Ever Lovely", imo: null }).map((v) => v.mmsi)).toEqual(["477000001", "563000002"]);
  });
  it("기사에 IMO 가 있으면 IMO 같은 것만", () => {
    expect(pickByName(found, { name: "Ever Lovely", imo: "9378474" }).map((v) => v.mmsi)).toEqual(["477000001"]);
  });
  it("최대 척수를 지킨다", () => {
    expect(pickByName(found, { name: "Ever Lovely", imo: null }, 1)).toHaveLength(1);
  });
});

describe("verifyNamedPosition", () => {
  const AT = Date.parse("2026-10-21T01:45:00Z");
  const inc = { lat: 26.3, lng: 56.1, atMs: AT };
  const pt = (min: number, lat: number, lng: number) => ({
    lat,
    lng,
    sog: 5,
    cog: 0,
    sampledAt: new Date(AT + min * 60_000).toISOString(),
  });
  it("사건 시각에 100km 안이면 verified", () => {
    expect(verifyNamedPosition([pt(-30, 26.31, 56.12), pt(30, 26.32, 56.13)], inc).status).toBe("verified");
  });
  it("자료가 충분한데 멀면 rejected", () => {
    expect(verifyNamedPosition([pt(-30, 25.0, 55.0), pt(30, 25.0, 55.0)], inc).status).toBe("rejected");
  });
  it("사건 시각 근처 표본이 없으면 unresolved (아니라는 뜻이 아님)", () => {
    expect(verifyNamedPosition([pt(-600, 26.3, 56.1)], inc).status).toBe("unresolved");
    expect(verifyNamedPosition([], inc).status).toBe("unresolved");
  });
});
