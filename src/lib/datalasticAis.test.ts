import { describe, expect, it } from "vitest";
import {
  DATALASTIC_ZONES,
  canSpend,
  categoryFromType,
  isHistoryKeepPoint,
  monthKey,
  parseInradius,
  zonesDue,
  paceAllowance,
} from "@/lib/datalasticAis";

// 2026-10-21 실제 응답 (키 제외)
const REAL = {
  data: {
    point: { lat: 12.6, lon: 43.3, radius: 5 },
    total: 1,
    vessels: [
      {
        uuid: "564a878d-c206-da5e-3254-7fd7bb9fa27b",
        name: "LAZURIT",
        mmsi: "273129220",
        imo: "9384069",
        eni: null,
        country_iso: "RU",
        type: "Tanker",
        type_specific: "Crude Oil Tanker",
        lat: 12.658479,
        lon: 43.300354,
        speed: 9.6,
        course: 152,
        heading: 152,
        destination: "SINGAPORE",
        last_position_epoch: 1792598640,
        last_position_UTC: "2026-10-21T16:04:00Z",
      },
    ],
  },
  meta: { success: true },
};

describe("parseInradius", () => {
  it("실제 응답을 파싱한다", () => {
    const r = parseInradius(REAL);
    expect(r.ok).toBe(true);
    expect(r.total).toBe(1);
    expect(r.vessels[0]).toMatchObject({
      mmsi: "273129220",
      name: "LAZURIT",
      type: "Tanker",
      lat: 12.658479,
      lng: 43.300354,
      sog: 9.6,
      cog: 152,
      destination: "SINGAPORE",
      at: "2026-10-21T16:04:00.000Z",
    });
  });

  it("IMO 체크섬이 틀리면 null, 맞으면 채택", () => {
    const bad = parseInradius({ ...REAL, data: { ...REAL.data, vessels: [{ ...REAL.data.vessels[0], imo: "9384060" }] } });
    expect(bad.vessels[0].imo).toBeNull();
    expect(parseInradius(REAL).vessels[0].imo).toBe("9384069");
  });

  it("빈 문자열 IMO·MMSI 형식 오류·좌표 없음은 거른다", () => {
    const r = parseInradius({
      data: {
        vessels: [
          { mmsi: "123", lat: 1, lon: 1 },
          { mmsi: "273129220", imo: "", lat: null, lon: 1 },
          { mmsi: "273129221", imo: "", lat: 1, lon: 1 },
        ],
      },
      meta: { success: true },
    });
    expect(r.vessels.map((v) => v.mmsi)).toEqual(["273129221"]);
    expect(r.vessels[0].imo).toBeNull();
  });

  it("success:false 나 null 은 ok:false", () => {
    expect(parseInradius({ meta: { success: false } }).ok).toBe(false);
    expect(parseInradius(null).ok).toBe(false);
  });
});

describe("categoryFromType", () => {
  it("분류", () => {
    expect(categoryFromType("Tanker")).toBe("commercial");
    expect(categoryFromType("Cargo")).toBe("commercial");
    expect(categoryFromType("Military Ops")).toBe("military");
    expect(categoryFromType("SAR")).toBe("other");
    expect(categoryFromType(null)).toBe("other");
  });
});

describe("zonesDue / canSpend / monthKey", () => {
  const now = Date.parse("2026-10-21T12:00:00Z");
  it("기록 없으면 전부 due, 구역별 간격 안이면 제외, 오래 못 본 구역이 앞", () => {
    expect(zonesDue(DATALASTIC_ZONES, {}, now, 72)).toHaveLength(DATALASTIC_ZONES.length);
    const polled = {
      "bab-el-mandeb": "2026-10-21T08:00:00Z", // hot 24h — 4시간 전이라 제외
      "red-sea-south": "2026-10-19T12:00:00Z", // 48h 전 — 24h 간격이라 due
    };
    const due = zonesDue(DATALASTIC_ZONES, polled, now, 72).map((z) => z.id);
    expect(due).not.toContain("bab-el-mandeb");
    expect(due).toContain("red-sea-south");
    // 기록 없는 구역(무한 age)이 기록 있는 구역보다 앞선다
    expect(due.indexOf("red-sea-south")).toBeGreaterThan(due.indexOf("hormuz"));
  });
  it("구역 id 는 중복이 없고 반경은 API 한도(50NM) 이하", () => {
    const ids = DATALASTIC_ZONES.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const z of DATALASTIC_ZONES) expect(z.radiusNm).toBeLessThanOrEqual(50);
  });
  it("월 예산 페이싱: 월초엔 한 구역분만, 월말엔 전액", () => {
    expect(paceAllowance(11_000, new Date("2026-10-01T00:00:00Z"))).toBe(500);
    expect(paceAllowance(11_000, new Date("2026-10-16T12:00:00Z"))).toBeGreaterThan(5_000);
    expect(paceAllowance(11_000, new Date("2026-10-31T23:59:00Z"))).toBe(11_000);
  });
  it("남은 예산이 150 미만이면 호출 안 함", () => {
    expect(canSpend(14_849, 15_000)).toBe(true);
    expect(canSpend(14_851, 15_000)).toBe(false);
  });
  it("월 키는 UTC", () => {
    expect(monthKey(new Date("2026-10-31T23:59:00Z"))).toBe("2026-10");
    expect(monthKey(new Date("2026-11-01T00:00:00Z"))).toBe("2026-11");
  });
});

describe("isHistoryKeepPoint", () => {
  it("호르무즈·홍해 안, 말라카 밖", () => {
    expect(isHistoryKeepPoint(26.3, 56.1)).toBe(true);
    expect(isHistoryKeepPoint(20, 38.5)).toBe(true);
    expect(isHistoryKeepPoint(2, 101)).toBe(false);
  });
});
