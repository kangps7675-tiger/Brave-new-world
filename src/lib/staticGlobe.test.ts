import { describe, expect, it } from "vitest";
import { pickFairByKind, filterStaticPointsForView } from "@/lib/staticGlobe";
import type { StaticPoint } from "@/data/geoTypes";

function mk(kind: StaticPoint["kind"], i: number, lat = 10, lng = 10): StaticPoint {
  return {
    id: `${kind}-${i}`,
    kind,
    name: `${kind} ${i}`,
    lat,
    lng,
  } as StaticPoint;
}

describe("pickFairByKind", () => {
  it("한 kind가 예산을 독식하지 않는다 (선착순 굶김 수정)", () => {
    const airports = Array.from({ length: 500 }, (_, i) => mk("airport", i));
    const sanctions = Array.from({ length: 30 }, (_, i) => mk("sanctions-entity", i));
    const launches = Array.from({ length: 10 }, (_, i) => mk("space-launch", i));
    // 예전 로직: airports 500개가 앞에 있으면 56슬롯 전부 airport
    const picked = pickFairByKind(
      [...airports, ...sanctions, ...launches],
      { lat: 0, lng: 0 },
      0,
      56,
    );
    const kinds = new Set(picked.map((p) => p.kind));
    expect(kinds.has("sanctions-entity")).toBe(true);
    expect(kinds.has("space-launch")).toBe(true);
    expect(picked.length).toBe(56);
  });

  it("상한보다 적으면 전부 반환", () => {
    const pts = [mk("airport", 1), mk("port", 1)];
    expect(pickFairByKind(pts, { lat: 0, lng: 0 }, 0, 56)).toHaveLength(2);
  });

  it("radius가 있으면 뷰포트 밖은 제외", () => {
    const near = mk("airport", 1, 10, 10);
    const far = mk("airport", 2, -60, 120);
    const picked = pickFairByKind([near, far], { lat: 10, lng: 10 }, 20, 56);
    expect(picked.map((p) => p.id)).toEqual([near.id]);
  });

  it("max 0이면 빈 배열", () => {
    expect(pickFairByKind([mk("airport", 1)], { lat: 0, lng: 0 }, 0, 0)).toEqual([]);
  });
});

describe("filterStaticPointsForView — kind 공평 배분 통합", () => {
  it("global 티어에서 공항이 많아도 다른 kind가 살아남는다", () => {
    const points: StaticPoint[] = [
      ...Array.from({ length: 300 }, (_, i) => mk("airport", i)),
      ...Array.from({ length: 20 }, (_, i) => mk("sanctions-entity", i)),
      ...Array.from({ length: 20 }, (_, i) => mk("internet-exchange", i)),
    ];
    const visible = filterStaticPointsForView(points, { lat: 0, lng: 0 }, "global", 0);
    const kinds = new Set(visible.map((p) => p.kind));
    expect(kinds.has("sanctions-entity")).toBe(true);
    expect(kinds.has("internet-exchange")).toBe(true);
  });
});
