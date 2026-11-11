import { describe, expect, it } from "vitest";
import { buildFlashNeonPoints, distanceKm, nearbyItems, NEON_COLOR } from "@/lib/flashNeon";

const NOW = Date.parse("2026-11-12T00:00:00Z");
const H = 3_600_000;
const row = (id: string, lat: number, lng: number, hoursAgo: number) => ({ id, lat, lng, at: NOW - hoursAgo * H });

describe("속보 네온 지점", () => {
  it("6시간 안은 fresh, 넘으면 흐리게, 선택한 건 selected", () => {
    const pts = buildFlashNeonPoints([row("a", 10, 20, 1), row("b", 11, 21, 7)], () => "strike", NOW, "b");
    expect(pts.map((p) => [p.id, p.fresh, p.selected])).toEqual([["a", 1, 0], ["b", 0, 1]]);
    expect(pts[0].color).toBe(NEON_COLOR.strike);
  });
  it("좌표가 잘못됐거나 id가 겹치면 뺀다", () => {
    const pts = buildFlashNeonPoints(
      [row("a", 10, 20, 1), row("a", 10, 20, 2), row("n", NaN, 0, 1), row("x", 95, 0, 1)],
      () => "ship",
      NOW,
      null,
    );
    expect(pts.map((p) => p.id)).toEqual(["a"]);
  });
  it("범주마다 다른 색", () => {
    const colors = Object.values(NEON_COLOR);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe("같은 지역 최근 사건", () => {
  it("거리를 잰다(서울-부산 약 325km)", () => {
    expect(Math.round(distanceKm({ lat: 37.5665, lng: 126.978 }, { lat: 35.1796, lng: 129.0756 }))).toBeGreaterThan(300);
    expect(Math.round(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }))).toBe(0);
  });
  it("250km 안·7일 안만, 최근 순, 자기 자신은 뺀다", () => {
    const me = row("me", 48.0, 37.8, 1);
    const all = [
      me,
      row("near-new", 48.2, 37.9, 2),
      row("near-old", 48.1, 37.7, 30),
      row("far", 55.0, 37.8, 1),
      row("stale", 48.0, 37.8, 24 * 9),
    ];
    expect(nearbyItems(me, all, NOW).map((r) => r.id)).toEqual(["near-new", "near-old"]);
  });
  it("최대 5건", () => {
    const me = row("me", 0, 0, 1);
    const many = Array.from({ length: 9 }, (_, i) => row(`n${i}`, 0.1, 0.1, i + 2));
    expect(nearbyItems(me, [me, ...many], NOW)).toHaveLength(5);
  });
});
