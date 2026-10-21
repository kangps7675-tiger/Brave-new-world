import { describe, expect, it } from "vitest";
import { parseVesselFind, pickByName, verifyNamedPosition } from "./vesselFind";

// 2026-10-22 실제 vessel_find 응답 (name=EVER GIVEN&fuzzy=0) — 불필요한 null 필드만 줄임
const REAL = {
  data: [
    { uuid: "9d8b5853-bb09-2f75-49f7-41732ca6836f", name: "EVER GIVEN", name_ais: null, mmsi: "636026627", imo: "9811000", callsign: "A8AB9", country_iso: null, type: null, type_specific: null },
    { uuid: "a9bc01b8-28d8-e116-1e73-1be093830bb3", name: "EVER GIVEN", name_ais: "EVER GIVEN", mmsi: "636026627", imo: "9811000", callsign: "A8AB9", country_iso: "LR", type: "Cargo - Hazard A (Major)", type_specific: "Container Ship" },
  ],
  meta: { duration: 0.004, endpoint: "/api/v0/vessel_find", success: true },
};
// 가공 픽스처 — 동명이선·이름 변형·잘못된 MMSI
const SYNTH = {
  data: [
    { name: "EVER LOVELY", name_ais: "EVER LOVELY", mmsi: "477000001", imo: "9378474", type: "Cargo", type_specific: "Container Ship" },
    { name: "EVER LOVELY", name_ais: null, mmsi: "563000002", imo: null, type: "Tanker", type_specific: null },
    { name: "EVER LOVELY 2", mmsi: "563000003", imo: "9378474", type: "Cargo" },
    { name: "OLD NAME", name_ais: "NEW NAME", mmsi: "563000004", imo: null, type: null },
    { name: "BAD", mmsi: "12", imo: null, type: null },
  ],
  meta: { success: true },
};

describe("parseVesselFind", () => {
  it("실제 응답: 같은 MMSI 두 줄을 하나로 합치고 값이 있는 쪽을 쓴다", () => {
    const r = parseVesselFind(REAL);
    expect(r.ok).toBe(true);
    expect(r.vessels).toEqual([
      { mmsi: "636026627", imo: "9811000", name: "EVER GIVEN", nameAis: "EVER GIVEN", type: "Container Ship" },
    ]);
  });
  it("배열 위치가 달라도 읽는다", () => {
    expect(parseVesselFind(SYNTH).vessels).toHaveLength(4);
    expect(parseVesselFind({ data: { vessels: SYNTH.data }, meta: { success: true } }).vessels).toHaveLength(4);
    expect(parseVesselFind({ data: { results: SYNTH.data } }).vessels).toHaveLength(4);
  });
  it("실패 응답(잘못된 키)·빈 응답", () => {
    expect(parseVesselFind({ meta: { endpoint: "/api/v0/vessel_find", message: "Invalid or expired API Key", success: false } }).ok).toBe(false);
    expect(parseVesselFind(null).ok).toBe(false);
    expect(parseVesselFind({ data: [] })).toEqual({ ok: true, vessels: [] });
  });
});

describe("pickByName", () => {
  const found = parseVesselFind(SYNTH).vessels;
  it("이름이 정확히 같은 것만 (EVER LOVELY 2 제외)", () => {
    expect(pickByName(found, { name: "Ever Lovely", imo: null }).map((v) => v.mmsi)).toEqual(["477000001", "563000002"]);
  });
  it("AIS 이름이 같아도 찾는다", () => {
    expect(pickByName(found, { name: "New Name", imo: null }).map((v) => v.mmsi)).toEqual(["563000004"]);
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
