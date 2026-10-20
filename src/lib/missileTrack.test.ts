import { describe, expect, it } from "vitest";
import { MISSILE_EVENTS } from "@/data/missileReports";
import { illustrationEndpoints, mentionedAgencies, safeArticleUrl, trackPosition } from "./missileTrack";

describe("public missile report provenance", () => {
  it("retains conflicting source times and does not invent US coordinates", () => {
    const event = MISSILE_EVENTS[0];
    const korean = event.reports.find(r => r.agency === "jcs")!;
    const japanese = event.reports.find(r => r.agency === "jmod")!;
    const us = event.reports.find(r => r.agency === "pentagon")!;
    expect(korean.launchTime).not.toBe(japanese.launchTime);
    expect(us.launch).toBeUndefined();
    expect(us.landing).toBeUndefined();
    expect(us.distanceKm).toBeUndefined();
  });
  it("requires both visible sources to construct an illustration", () => {
    expect(illustrationEndpoints(MISSILE_EVENTS[0], ["jcs", "jmod"])).not.toBeNull();
    expect(illustrationEndpoints(MISSILE_EVENTS[0], ["jcs"])).toBeNull();
    expect(illustrationEndpoints(MISSILE_EVENTS[0], ["pentagon"])).toBeNull();
  });
  it("marks geocoded place anchors as editorial rather than published coordinates", () => {
    for (const event of MISSILE_EVENTS) {
      const ids = event.reports.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const report of event.reports) {
        expect(safeArticleUrl(report.sourceUrl)).toBeTruthy();
        expect(Number.isFinite(Date.parse(report.publishedAt))).toBe(true);
        for (const place of [report.launch, report.landing]) {
          if (!place) continue;
          expect(place.precision).toBe("place-reference");
          expect(place.basis).toContain("참조점");
          expect(place.coordinates[0]).toBeGreaterThanOrEqual(-180);
          expect(place.coordinates[0]).toBeLessThanOrEqual(180);
          expect(place.coordinates[1]).toBeGreaterThanOrEqual(-90);
          expect(place.coordinates[1]).toBeLessThanOrEqual(90);
        }
      }
    }
  });
});
describe("illustrative playback", () => {
  it("clamps seeking and lands at the endpoints", () => {
    expect(trackPosition([125, 39], [136, 42], -1)).toEqual([125, 39]);
    expect(trackPosition([125, 39], [136, 42], 2)).toEqual([136, 42]);
    expect(trackPosition([125, 39], [136, 42], NaN)).toEqual([125, 39]);
  });
  it("takes the short direction across the date line", () => {
    expect(Math.abs(trackPosition([179, 40], [-179, 40], 0.5)[0])).toBe(180);
  });
});
describe("news discovery", () => {
  it("requires DPRK and missile context before listing agency mentions", () => {
    expect(mentionedAgencies("Pentagon briefed on Ukraine missiles")).toEqual([]);
    expect(mentionedAgencies("North Korea troops: Pentagon and JCS")).toEqual([]);
    expect(mentionedAgencies("North Korea missile: Joint Chiefs of Staff and Japan's defense ministry respond")).toEqual(["jcs", "jmod"]);
    expect(mentionedAgencies("북한 미사일 합참 방위성 펜타곤 발표")).toHaveLength(3);
  });
  it("rejects executable and malformed links", () => {
    expect(safeArticleUrl("javascript:alert(1)")).toBeNull();
    expect(safeArticleUrl("/relative")).toBeNull();
    expect(safeArticleUrl("https://example.com/article")).toBe("https://example.com/article");
  });
});
