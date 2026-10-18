import { afterEach, describe, expect, it, vi } from "vitest";
import { datalasticEnabled, enrichWithDatalastic, parseVesselHistory } from "./datalastic";

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
    const fetchMock = vi.fn(async () =>
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
  });
});
