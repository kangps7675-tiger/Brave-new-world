import { afterEach, describe, expect, it, vi } from "vitest";
import { datalasticEnabled, enrichWithDatalastic, exclusiveEndDate, parseVesselHistory } from "./datalastic";

/** 2026-10-21 실제 vessel_history 응답에서 앞 3건 + 2시간 38분 공백 앞뒤 2건 (값 그대로) */
const REAL_HISTORY = {
  data: {
    name: "EVER GIVEN",
    mmsi: "636026627",
    imo: "9811000",
    type: "Cargo - Hazard A (Major)",
    type_specific: "Container Ship",
    positions: [
      { lat: 2.4360051, lon: 90.437279, speed: 19.2, course: 50, heading: null, destination: "SG SIN", last_position_epoch: 1792540560, last_position_UTC: "2026-10-20T23:56:00Z" },
      { lat: 2.3311367, lon: 90.310814, speed: 19.1, course: 48, heading: null, destination: "SG SIN", last_position_epoch: 1792538400, last_position_UTC: "2026-10-20T23:20:00Z" },
      { lat: -0.94929498, lon: 86.333069, speed: 17.8, course: 52, heading: 54, destination: "SG SIN", last_position_epoch: 1792477920, last_position_UTC: "2026-10-20T06:32:00Z" },
      { lat: -1.4363084, lon: 85.743538, speed: 17.6, course: 48, heading: 51, destination: "SG SIN", last_position_epoch: 1792468440, last_position_UTC: "2026-10-20T03:54:00Z" },
    ],
  },
  meta: { success: true },
};

describe("실제 응답", () => {
  it("vessel_history 를 읽는다 (epoch 와 UTC 문자열이 같은 시각)", () => {
    const h = parseVesselHistory(REAL_HISTORY);
    expect(h.imo).toBe("9811000");
    expect(h.name).toBe("EVER GIVEN");
    expect(h.points).toHaveLength(4);
    expect(h.points[0]).toMatchObject({ lat: 2.4360051, lng: 90.437279, sog: 19.2, cog: 50, sampledAt: "2026-10-20T23:56:00.000Z" });
    // epoch 우선 경로와 UTC 문자열 경로가 같은 시각을 가리키는지
    expect(new Date(1792540560 * 1000).toISOString()).toBe(h.points[0]!.sampledAt);
  });
});

describe("exclusiveEndDate", () => {
  it("구간 끝이 속한 날의 다음 날", () => {
    expect(exclusiveEndDate("2026-10-15T15:20:00.000Z")).toBe("2026-10-16");
    expect(exclusiveEndDate("2026-12-31T23:59:00Z")).toBe("2027-01-01");
  });
});

describe("parseVesselHistory", () => {
  it("epoch·UTC 문자열 둘 다 읽는다", () => {
    const h = parseVesselHistory({
      data: {
        name: "TUTOR",
        imo: "9943396",
        positions: [
          { lat: 14.1, lon: 42.2, speed: 11.5, course: 340, last_position_epoch: 1783857600 },
          { lat: "14.2", lon: "42.1", speed: 0.3, course: 10, last_position_UTC: "2026-07-12 06:30:00" },
          { lat: null, lon: 1 },
        ],
      },
    });
    expect(h.imo).toBe("9943396");
    expect(h.points).toHaveLength(2);
    expect(h.points[1]).toMatchObject({ lat: 14.2, lng: 42.1, sampledAt: "2026-07-12T06:30:00.000Z" });
  });
  it("IMO 0 은 없음 처리", () => {
    expect(parseVesselHistory({ data: { imo: 0 } }).imo).toBeNull();
  });
});

describe("enrichWithDatalastic", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("키 없으면 호출 안 함", async () => {
    vi.stubEnv("DATALASTIC_API_KEY", "");
    expect(datalasticEnabled()).toBe(false);
    const r = await enrichWithDatalastic([{ mmsi: "1", name: null, imo: null, shipType: null, category: null, points: [] }], {
      fromIso: "2026-07-12T00:00:00Z",
      toIso: "2026-07-12T12:00:00Z",
    });
    expect(r.used).toBe(false);
  });

  it("키 있으면 빈 구간을 채우고 IMO 를 붙인다", async () => {
    vi.stubEnv("DATALASTIC_API_KEY", "k");
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () =>
      new Response(
        JSON.stringify({
          data: { imo: "9000001", positions: [{ lat: 1, lon: 2, speed: 3, course: 4, last_position_UTC: "2026-07-12T05:00:00Z" }] },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const r = await enrichWithDatalastic(
      [{ mmsi: "1", name: "X", imo: null, shipType: null, category: null, points: [] }],
      { fromIso: "2026-07-12T00:00:00Z", toIso: "2026-07-12T12:00:00Z" },
    );
    expect(r.used).toBe(true);
    expect(r.tracks[0]).toMatchObject({ imo: "9000001" });
    expect(r.tracks[0].points).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("mmsi=1");
    // 같은 날 안의 구간이어도 to 는 다음 날로 보낸다
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("from=2026-07-12&to=2026-07-13");
  });
});
