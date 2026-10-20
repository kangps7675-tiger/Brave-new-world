import { describe, expect, it } from "vitest";
import {
  buildPlaIncursionHeatPaths,
  normalizeCrossStraitExercises,
  normalizeCrossStraitIncursions,
  normalizeEscalationIncidents,
  normalizeShipObservations,
} from "@/lib/crossStraitSignal";

describe("crossStraitSignal normalization", () => {
  it("converts geocoded approved exercise rows into map exercises", () => {
    const rows = [{
      id: 42,
      name_en: "Joint patrol",
      performer: "PRC",
      exercise_kind: "joint_patrol",
      start_date: "2026-07-20",
      latitude: 24,
      longitude: 119.5,
      article: { url: "https://example.com/report", source_name: "Source" },
    }];
    const [exercise] = normalizeCrossStraitExercises(rows);
    expect(exercise).toMatchObject({
      id: "css-42",
      performer: "PRC",
      exerciseKind: "joint_patrol",
      actors: ["cn"],
      lat: 24,
      lng: 119.5,
    });
  });

  it("builds only reported ADIZ sectors", () => {
    const incursions = normalizeCrossStraitIncursions([
      { date: "2026-07-20", aircraft_zones: "N,SW", aircraft_intruded: 5 },
      { date: "2026-07-21", aircraft_zones: "SW", aircraft_intruded: 2 },
    ]);
    const paths = buildPlaIncursionHeatPaths(incursions);
    expect(paths.some((path) => path.id.includes("css-adiz-n"))).toBe(true);
    expect(paths.some((path) => path.id.includes("css-adiz-sw"))).toBe(true);
    expect(paths.some((path) => path.id.includes("css-adiz-e-"))).toBe(false);
  });

  it("deduplicates escalation clusters and anchors missing coordinates", () => {
    const articles = [
      {
        id: 1,
        title_en: "First",
        is_escalation_signal: 1,
        event_cluster_id: "same",
        entities: [],
      },
      {
        id: 2,
        title_en: "Duplicate",
        is_escalation_signal: 1,
        event_cluster_id: "same",
        entities: [],
      },
    ];
    const incidents = normalizeEscalationIncidents(articles);
    expect(incidents).toHaveLength(1);
    expect(incidents[0]!.bodyKo).toContain("위치 미확정");
  });

  it("renders only named PRC ships with a recognized reported area", () => {
    const articles = [{
      id: 9,
      url: "https://example.com/ship",
      title_en: "Patrol east of Taiwan",
      summary_en: "A Chinese government vessel operated in waters east of Taiwan.",
      published_at: "2026-07-20T00:00:00Z",
      entities: [
        {
          id: 91,
          entity_name_en: "Daishan ship",
          entity_type: "ship",
          entity_role: "PRC government vessel",
          location_name: "waters east of Taiwan",
        },
      ],
    }];
    const observations = normalizeShipObservations(articles);
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      confidence: "reported",
      mapEligible: true,
      source: "cross-strait-signal",
      lat: 23.5,
      lng: 122.5,
    });
  });
});
