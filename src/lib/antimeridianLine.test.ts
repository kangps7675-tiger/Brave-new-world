import { describe, expect, it } from "vitest";
import { splitAntimeridianCoordinates } from "@/lib/antimeridianLine";
import { greatCircleArc } from "@/lib/axisNetworkPaths";

describe("splitAntimeridianCoordinates", () => {
  it("keeps a short segment that does not cross the date line", () => {
    const parts = splitAntimeridianCoordinates([
      [129.7, 33.2],
      [139.7, 35.3],
    ]);
    expect(parts).toHaveLength(1);
    expect(parts[0]).toHaveLength(2);
  });

  it("splits a Pacific hop so it does not span the whole map", () => {
    const parts = splitAntimeridianCoordinates([
      [-170, 21],
      [170, 24],
    ]);
    expect(parts.length).toBeGreaterThanOrEqual(2);
    for (const part of parts) {
      for (let i = 1; i < part.length; i += 1) {
        const d = Math.abs(part[i]![0] - part[i - 1]![0]);
        expect(d).toBeLessThanOrEqual(180);
      }
    }
    const flat = parts.flat();
    expect(flat.some((c) => c[0] === 180 || c[0] === -180)).toBe(true);
  });

  it("splits a Pearl Harbor → Yokosuka great circle at the date line", () => {
    const arc = greatCircleArc(21.35, -157.95, 35.29, 139.67, 24, 0);
    const parts = splitAntimeridianCoordinates(arc.map((p) => [p.lng, p.lat]));
    expect(parts.length).toBeGreaterThanOrEqual(2);
    for (const part of parts) {
      for (let i = 1; i < part.length; i += 1) {
        expect(Math.abs(part[i]![0] - part[i - 1]![0])).toBeLessThanOrEqual(180);
      }
    }
  });
});
