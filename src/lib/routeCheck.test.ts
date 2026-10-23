import { describe, expect, it } from "vitest";
import { checkRoute, distToRouteNm, planRoute, PORTS, routeLengthNm, type RouteIncident } from "./routeCheck";

const NOW = Date.parse("2026-10-23T00:00:00Z");
const ago = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const inc = (id: string, lat: number, lng: number, d: number, type = "Attack", detail = ""): RouteIncident => ({
  id, incidentTypeName: type, lat, lng, utcDateOfIncident: ago(d), detail,
});

describe("planRoute", () => {
  it("라스타누라 → 푸자이라는 호르무즈를 지난다", () => {
    const r = planRoute("ras-tanura", "fujairah")!;
    expect(r[0]).toEqual([26.65, 50.16]);
    expect(r.some((p) => p[0] === 26.55 && p[1] === 56.15)).toBe(true);
    expect(r.at(-1)).toEqual([25.12, 56.37]);
    expect(routeLengthNm(r)).toBeGreaterThan(300);
  });
  it("같은 쪽 항구끼리는 길목까지 갔다 오지 않는다", () => {
    const r = planRoute("ras-tanura", "jebel-ali")!;
    expect(r.some((p) => p[1] > 56)).toBe(false);
    const o = planRoute("fujairah", "sohar")!;
    expect(o).toHaveLength(2);
  });
  it("모르는 항구·같은 항구는 null, 모든 항구 쌍에서 항로가 나온다", () => {
    expect(planRoute("x", "fujairah")).toBeNull();
    expect(planRoute("fujairah", "fujairah")).toBeNull();
    for (const a of PORTS) for (const b of PORTS) if (a.id !== b.id) expect(planRoute(a.id, b.id)!.length).toBeGreaterThanOrEqual(2);
  });
});

describe("checkRoute", () => {
  it("항로 40해리 안 사건만 센다", () => {
    const b = checkRoute("ras-tanura", "fujairah", {
      incidents: [inc("near", 26.4, 56.3, 2), inc("far", 29.4, 48.9, 2), inc("old", 26.4, 56.3, 45)],
      warnings: [], now: NOW,
    })!;
    expect(b.strikes30d).toBe(1);
    expect(b.strikesPrev30d).toBe(1);
    expect(b.stance).toBe("avoid");
    expect(b.recent.map((r) => r.id)).toContain("near");
    expect(b.recent.map((r) => r.id)).not.toContain("far");
  });
  it("공격 주체를 문구 근거로 센다", () => {
    const b = checkRoute("ras-tanura", "fujairah", {
      incidents: [inc("a", 26.4, 56.3, 5, "Attack", "fired on by IRGC gunboats"), inc("b", 26.4, 56.3, 6)], warnings: [], now: NOW,
    })!;
    expect(b.actors.iran).toBe(1);
    expect(b.actors.unknown).toBe(1);
  });
  it("자료가 없으면 nodata, 사건이 없어도 자료가 있으면 normal", () => {
    expect(checkRoute("ras-tanura", "fujairah", { incidents: [], warnings: [], now: NOW })!.stance).toBe("nodata");
    expect(checkRoute("ras-tanura", "fujairah", { incidents: [inc("x", 29.4, 48.9, 2)], warnings: [], now: NOW })!.stance).toBe("normal");
  });
  it("항행경보는 30해리 안(반경 차감)만 모은다", () => {
    const b = checkRoute("ras-tanura", "fujairah", {
      incidents: [],
      warnings: [
        { id: "w1", areaHint: "Hormuz", description: "mine danger", date: null, points: [[26.7, 56.1]], radiusNm: null },
        { id: "w2", areaHint: "Aden", description: "far", date: null, points: [[12.8, 45]], radiusNm: null },
      ],
      now: NOW,
    })!;
    expect(b.warnings.map((w) => w.id)).toEqual(["w1"]);
  });
  it("선분 거리: 선 위 점은 0에 가깝다", () => {
    expect(distToRouteNm([26.55, 56.15], [[26.55, 56.15], [26.2, 56.75]])).toBeLessThan(0.5);
  });
});
