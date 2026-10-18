import { describe, expect, it } from "vitest";
import {
  behaviorSignals,
  namesMatch,
  normalizeShipName,
  positionAt,
  scoreCandidates,
  summarizeMatch,
  type TrackPoint,
  type VesselTrack,
} from "./scoreCandidates";

const T0 = Date.parse("2026-07-10T12:00:00Z");
const iso = (minFromIncident: number) => new Date(T0 + minFromIncident * 60_000).toISOString();

/** 북쪽으로 일정 속도로 가는 항적 (lat 0.1° ≈ 11km) */
function cruising(lat0: number, lng: number, sog: number, from = -180, to = 180, step = 30): TrackPoint[] {
  const pts: TrackPoint[] = [];
  for (let m = from; m <= to; m += step) {
    pts.push({ lat: lat0 + (m / 60) * (sog / 60), lng, sog, cog: 0, sampledAt: iso(m) });
  }
  return pts;
}

const INCIDENT = { lat: 14.0, lng: 42.0, atIso: iso(0), vesselType: "Bulk Carrier", vesselName: null };

describe("positionAt", () => {
  it("앞뒤 표본 사이를 보간한다", () => {
    const p = positionAt(
      [
        { lat: 10, lng: 40, sog: 10, cog: 0, sampledAt: iso(-30) },
        { lat: 11, lng: 40, sog: 10, cog: 0, sampledAt: iso(30) },
      ],
      T0,
    );
    expect(p).toMatchObject({ lat: 10.5, basis: "interpolated", offsetMin: 30 });
  });

  it("간격이 3시간 넘으면 보간하지 않고 가까운 표본을 쓴다", () => {
    const p = positionAt(
      [
        { lat: 10, lng: 40, sog: 10, cog: 0, sampledAt: iso(-200) },
        { lat: 11, lng: 40, sog: 10, cog: 0, sampledAt: iso(20) },
      ],
      T0,
    );
    expect(p).toMatchObject({ lat: 11, basis: "nearest", offsetMin: 20 });
  });
});

describe("선명 비교", () => {
  it("접두어·기호를 무시한다", () => {
    expect(normalizeShipName("M/V Tutor")).toBe("TUTOR");
    expect(namesMatch("MV TUTOR", "TUTOR")).toBe(true);
    expect(namesMatch("Sounion", "DELTA SOUNION")).toBe(true);
  });
  it("짧은 흔한 단어는 부분 일치로 안 친다", () => {
    expect(namesMatch("STAR", "STAR IRIS")).toBe(false);
    expect(namesMatch("GALAXY", "GALAXY LEADER")).toBe(true);
  });
});

describe("behaviorSignals", () => {
  it("급감속을 잡는다", () => {
    const pts: TrackPoint[] = [
      ...cruising(13.9, 42, 12, -120, 0),
      { lat: 14.0, lng: 42, sog: 0.5, cog: 0, sampledAt: iso(30) },
      { lat: 14.0, lng: 42, sog: 0.3, cog: 0, sampledAt: iso(60) },
    ];
    expect(behaviorSignals(pts, T0).map((s) => s.key)).toContain("slowdown");
  });
  it("사건 시각을 낀 신호 끊김", () => {
    const pts: TrackPoint[] = [
      { lat: 14, lng: 42, sog: 12, cog: 0, sampledAt: iso(-60) },
      { lat: 14.5, lng: 42, sog: 12, cog: 0, sampledAt: iso(150) },
    ];
    expect(behaviorSignals(pts, T0).map((s) => s.key)).toContain("dark_at_incident");
  });
});

describe("scoreCandidates", () => {
  const stopped: VesselTrack = {
    mmsi: "111",
    name: "VICTIM ONE",
    imo: "9000001",
    shipType: 70,
    category: "commercial",
    points: [
      ...cruising(13.85, 42.02, 12, -180, 0),
      { lat: 14.0, lng: 42.02, sog: 0.4, cog: 200, sampledAt: iso(30) },
      { lat: 14.0, lng: 42.02, sog: 0.2, cog: 210, sampledAt: iso(60) },
    ],
  };
  const passer: VesselTrack = {
    mmsi: "222",
    name: "PASSER BY",
    imo: null,
    shipType: 70,
    category: "commercial",
    points: cruising(13.9, 42.1, 12),
  };
  const tanker: VesselTrack = {
    mmsi: "333",
    name: "WRONG TYPE",
    imo: null,
    shipType: 80,
    category: "commercial",
    points: [
      ...cruising(13.95, 42.0, 12, -180, 0),
      { lat: 14.0, lng: 42.0, sog: 0.2, cog: 0, sampledAt: iso(30) },
    ],
  };
  const warship: VesselTrack = {
    mmsi: "444",
    name: "HMS ESCORT",
    imo: null,
    shipType: 35,
    category: "military",
    points: cruising(13.99, 42.0, 14),
  };
  const far: VesselTrack = {
    mmsi: "555",
    name: "FAR AWAY",
    imo: null,
    shipType: 70,
    category: "commercial",
    points: cruising(16, 42, 12),
  };

  it("근처에서 멈춘 같은 선종 배가 유력 1순위", () => {
    const res = scoreCandidates(INCIDENT, [passer, tanker, warship, far, stopped]);
    expect(res.map((c) => c.mmsi)).not.toContain("555");
    expect(res[0]).toMatchObject({ mmsi: "111", verdict: "likely", imo: "9000001" });
    expect(res.find((c) => c.mmsi === "333")?.verdict).toBe("possible"); // 선종 불일치는 유력 못 됨
    expect(res.find((c) => c.mmsi === "444")?.verdict).toBe("possible");
    expect(summarizeMatch(res).status).toBe("likely");
  });

  it("선명이 맞으면 확인 — 경보 좌표가 좀 멀어도", () => {
    const named = { ...INCIDENT, lat: 14.6, vesselName: "M/V Passer By" };
    const res = scoreCandidates(named, [stopped, passer]);
    expect(res[0]).toMatchObject({ mmsi: "222", verdict: "confirmed" });
    expect(summarizeMatch(res).status).toBe("confirmed");
  });

  it("근처에 있기만 하면 가능성까지만, 결론은 '못 좁힘'", () => {
    const res = scoreCandidates(INCIDENT, [passer]);
    expect(res[0].verdict).toBe("possible");
    expect(summarizeMatch(res).status).toBe("ambiguous");
  });

  it("비슷한 유력 후보가 둘이면 하나를 찍지 않는다", () => {
    const twin = { ...stopped, mmsi: "666", name: "VICTIM TWO", imo: null };
    expect(summarizeMatch(scoreCandidates(INCIDENT, [stopped, twin])).status).toBe("ambiguous");
  });

  it("6시간 넘게 떨어진 기록만 있으면 후보에서 뺀다", () => {
    const stale: VesselTrack = { ...passer, points: [{ lat: 14, lng: 42, sog: 0, cog: 0, sampledAt: iso(-500) }] };
    expect(scoreCandidates(INCIDENT, [stale])).toHaveLength(0);
    expect(summarizeMatch([]).status).toBe("unknown");
  });
});
