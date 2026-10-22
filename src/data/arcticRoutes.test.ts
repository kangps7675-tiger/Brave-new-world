import { describe, expect, it } from "vitest";
import { ARCTIC_ROUTE_PATHS } from "@/data/arcticRoutes";

describe("ARCTIC_ROUTE_PATHS", () => {
  it("좌표가 유효하고 날짜변경선을 가로지르는 토막이 없다", () => {
    expect(ARCTIC_ROUTE_PATHS.length).toBeGreaterThanOrEqual(3);
    for (const p of ARCTIC_ROUTE_PATHS) {
      expect(p.kind).toBe("shipping-lane");
      expect(p.points.length).toBeGreaterThan(3);
      for (let i = 0; i < p.points.length; i++) {
        const { lat, lng } = p.points[i]!;
        expect(Math.abs(lat)).toBeLessThanOrEqual(90);
        expect(Math.abs(lng)).toBeLessThanOrEqual(180);
        if (i > 0) expect(Math.abs(lng - p.points[i - 1]!.lng)).toBeLessThan(40);
      }
    }
  });
  it("id가 겹치지 않는다", () => {
    const ids = ARCTIC_ROUTE_PATHS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
