import { describe, expect, it } from "vitest";
import { buildDailyTourScenes } from "@/lib/dailyTour";
import type { DisputeArea } from "@/data/geoTypes";

describe("dailyTour", () => {
  it("sorts combat before tension and builds tour scenes", () => {
    const disputes: DisputeArea[] = [
      {
        id: "t1",
        kind: "dispute",
        name: "Tension Only",
        nameLong: "Tension",
        admin: null,
        sovereignty: null,
        type: null,
        note: null,
        source: "main",
        scalerank: 0,
        center: { lat: 10, lng: 10 },
        categories: [],
        tension: "high",
        hazardClass: "tension",
        matchedEventCount: 99,
        geometry: { type: "Polygon", coordinates: [] },
      },
      {
        id: "c1",
        kind: "dispute",
        name: "Combat",
        nameLong: "Combat",
        admin: null,
        sovereignty: null,
        type: null,
        note: null,
        source: "main",
        scalerank: 0,
        center: { lat: 20, lng: 20 },
        categories: [],
        tension: "medium",
        hazardClass: "combat",
        matchedEventCount: 0,
        geometry: { type: "Polygon", coordinates: [] },
      },
    ];
    const scenes = buildDailyTourScenes(disputes, "en", 5);
    expect(scenes).toHaveLength(2);
    expect(scenes[0]!.id).toBe("tour-c1");
    expect(scenes[0]!.title).toBe("Combat");
    expect(scenes[0]!.body).toMatch(/Active combat zone/);
  });

  it("falls back to korean hazard labels", () => {
    const disputes: DisputeArea[] = [
      {
        id: "combat-me-gaza",
        kind: "dispute",
        name: "Gaza Combat",
        nameLong: "Gaza",
        admin: null,
        sovereignty: null,
        type: null,
        note: "IRONSIGHT",
        source: "main",
        scalerank: 0,
        center: { lat: 31.4, lng: 34.4 },
        categories: [],
        tension: "high",
        hazardClass: "combat",
        matchedEventCount: 3,
        geometry: { type: "Polygon", coordinates: [] },
      },
    ];
    const scenes = buildDailyTourScenes(disputes, "ko", 5);
    expect(scenes).toHaveLength(1);
    expect(scenes[0]!.id).toBe("tour-combat-me-gaza");
    expect(scenes[0]!.body).toMatch(/실제 교전 구역/);
    expect(scenes[0]!.body).toMatch(/관련 사건 3건/);
  });

  it("skips disputes without finite centers", () => {
    const disputes: DisputeArea[] = [
      {
        id: "bad",
        kind: "dispute",
        name: "No Center",
        nameLong: "No Center",
        admin: null,
        sovereignty: null,
        type: null,
        note: null,
        source: "main",
        scalerank: 0,
        center: { lat: Number.NaN, lng: 10 },
        categories: [],
        tension: "high",
        hazardClass: "combat",
        matchedEventCount: 0,
        geometry: { type: "Polygon", coordinates: [] },
      },
    ];
    expect(buildDailyTourScenes(disputes, "en", 5)).toEqual([]);
  });
});
