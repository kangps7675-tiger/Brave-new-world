import { describe, expect, it } from "vitest";
import {
  assembleAirRaidHistoryResult,
  filterAndScoreThreatSamples,
  radiusToBbox,
  resolveAirRaidHistoryWindow,
  scoreAlertInterval,
  scoreNeptunThreatSample,
  windowAround,
  type AlertIntervalRow,
  type ThreatSampleRow,
} from "@/lib/airRaidHistorySearch";

describe("windowAround / resolveAirRaidHistoryWindow", () => {
  it("builds ±window around at", () => {
    const w = windowAround("2026-10-08T02:00:00.000Z", 1);
    expect(w.fromIso).toBe("2026-10-08T01:00:00.000Z");
    expect(w.toIso).toBe("2026-10-08T03:00:00.000Z");
  });

  it("prefers explicit from/to", () => {
    const w = resolveAirRaidHistoryWindow({
      from: "2026-10-08T00:00:00.000Z",
      to: "2026-10-08T06:00:00.000Z",
      at: "2026-10-08T02:00:00.000Z",
    });
    expect(w).toEqual({
      fromIso: "2026-10-08T00:00:00.000Z",
      toIso: "2026-10-08T06:00:00.000Z",
    });
  });

  it("errors when neither at nor range", () => {
    const w = resolveAirRaidHistoryWindow({});
    expect(w).toEqual({ error: "at 또는 from+to가 필요합니다" });
  });
});

describe("radiusToBbox", () => {
  it("expands around a point", () => {
    const b = radiusToBbox(46.48, 30.72, 30);
    expect(b.south).toBeLessThan(46.48);
    expect(b.north).toBeGreaterThan(46.48);
    expect(b.west).toBeLessThan(30.72);
    expect(b.east).toBeGreaterThan(30.72);
  });
});

describe("scoreNeptunThreatSample", () => {
  it("marks high-confidence multi-source means as medium", () => {
    const facets = scoreNeptunThreatSample({
      id: "1",
      threatId: "t1",
      threatType: "missile",
      lat: 46.5,
      lon: 30.7,
      heading: 90,
      speedKmh: 700,
      confidence: "high",
      sourceCount: 3,
      uncertaintyKm: 15,
      sampledAt: "2026-10-08T02:10:00.000Z",
      trailJson: "[]",
    });
    const means = facets.find((f) => f.facet === "means");
    expect(means?.strength).toBe("medium");
    expect(facets.some((f) => f.facet === "place")).toBe(false);
  });

  it("marks low-confidence means as weak", () => {
    const facets = scoreNeptunThreatSample({
      id: "2",
      threatId: "t2",
      threatType: "uav",
      lat: 46.5,
      lon: 30.7,
      heading: null,
      speedKmh: null,
      confidence: "low",
      sourceCount: 1,
      uncertaintyKm: 40,
      sampledAt: "2026-10-08T02:10:00.000Z",
      trailJson: null,
    });
    expect(facets.find((f) => f.facet === "means")?.strength).toBe("weak");
  });
});

describe("scoreAlertInterval", () => {
  it("gives Tzeva exact-grade time strong", () => {
    const facets = scoreAlertInterval({
      source: "tzeva-adom",
      evidenceGrade: true,
      category: 1,
      inRadius: true,
    });
    expect(facets.find((f) => f.facet === "time")?.strength).toBe("strong");
    expect(facets.find((f) => f.facet === "place")?.strength).toBe("medium");
  });
});

describe("filterAndScoreThreatSamples", () => {
  const rows: ThreatSampleRow[] = [
    {
      id: "near",
      threatId: "a",
      threatType: "missile",
      lat: 46.5,
      lon: 30.75,
      heading: null,
      speedKmh: null,
      confidence: "high",
      sourceCount: 2,
      uncertaintyKm: 10,
      sampledAt: "2026-10-08T02:05:00.000Z",
      trailJson: JSON.stringify([{ lat: 46.5, lon: 30.7, t: "t" }]),
    },
    {
      id: "far",
      threatId: "b",
      threatType: "uav",
      lat: 50.45,
      lon: 30.52,
      heading: null,
      speedKmh: null,
      confidence: "high",
      sourceCount: 2,
      uncertaintyKm: 10,
      sampledAt: "2026-10-08T02:05:00.000Z",
      trailJson: null,
    },
  ];

  it("keeps only samples within radius", () => {
    const hits = filterAndScoreThreatSamples(rows, {
      lat: 46.48,
      lng: 30.72,
      radiusKm: 30,
      maxThreats: 50,
    });
    expect(hits.map((h) => h.id)).toEqual(["near"]);
    expect(hits[0]?.trailPointCount).toBe(1);
    expect(hits[0]?.commercialUse).toBe("license-required");
  });
});

describe("assembleAirRaidHistoryResult", () => {
  it("scores Tzeva Sderot exact match near query point", () => {
    const alerts: AlertIntervalRow[] = [
      {
        id: "t1",
        source: "tzeva-adom",
        regionKey: "שדרות",
        regionName: "שדרות",
        title: "ירי רקטות וטילים",
        category: 1,
        startedAt: "2026-10-08T02:00:00.000Z",
        endedAt: "2026-10-08T02:10:00.000Z",
        lastSeenAt: "2026-10-08T02:10:00.000Z",
      },
    ];
    const result = assembleAirRaidHistoryResult(
      {
        lat: 31.525,
        lng: 34.596,
        fromIso: "2026-10-08T01:00:00.000Z",
        toIso: "2026-10-08T03:00:00.000Z",
        radiusKm: 30,
        sources: ["tzeva-adom"],
        maxThreats: 50,
        maxAlerts: 80,
      },
      [],
      alerts,
    );
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]?.evidenceGrade).toBe(true);
    expect(result.alerts[0]?.geocodeMatch).toBe("exact");
    expect(result.summary.evidenceGradeAlertCount).toBe(1);
  });

  it("drops unknown Tzeva regions (no fake coords)", () => {
    const result = assembleAirRaidHistoryResult(
      {
        lat: 31.5,
        lng: 34.8,
        fromIso: "2026-10-08T01:00:00.000Z",
        toIso: "2026-10-08T03:00:00.000Z",
        radiusKm: 50,
        sources: ["tzeva-adom"],
        maxThreats: 10,
        maxAlerts: 10,
      },
      [],
      [
        {
          id: "x",
          source: "tzeva-adom",
          regionKey: "יישוב שלא קיים",
          regionName: "יישוב שלא קיים",
          title: "alert",
          category: 1,
          startedAt: "2026-10-08T02:00:00.000Z",
          endedAt: null,
          lastSeenAt: "2026-10-08T02:00:00.000Z",
        },
      ],
    );
    expect(result.alerts).toHaveLength(0);
    expect(result.summary.absenceNote).toContain("확인 못함");
  });
});
