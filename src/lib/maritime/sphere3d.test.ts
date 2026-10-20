import { describe, expect, it } from "vitest";
import {
  GLOBE_RADIUS,
  SURFACE_EPSILON,
  latLngToVec3,
  maritimePathFromNodePath,
  smoothMaritimePath,
  vec3ToLatLng,
} from "@/lib/maritime/sphere3d";

describe("sphere3d", () => {
  it("round-trips lat/lng through vec3 at R+ε", () => {
    const v = latLngToVec3(51.9, 4.2);
    const r = Math.hypot(v.x, v.y, v.z);
    expect(r).toBeCloseTo(GLOBE_RADIUS + SURFACE_EPSILON, 5);
    const back = vec3ToLatLng(v.x, v.y, v.z);
    expect(back.lat).toBeCloseTo(51.9, 3);
    expect(back.lng).toBeCloseTo(4.2, 3);
  });

  it("produces more samples than raw waypoints", () => {
    const waypoints = [
      { lat: 1.27, lng: 103.7 },
      { lat: 2.5, lng: 101.0 },
      { lat: 22.3, lng: 114.2 },
      { lat: 29.9, lng: 122.0 },
    ];
    const smooth = smoothMaritimePath(waypoints, 8);
    expect(smooth.length).toBeGreaterThan(waypoints.length * 4);
  });

  it("maritimePathFromNodePath follows node order", () => {
    const nodes = {
      A: { lat: 51.9, lng: 4.2 },
      B: { lat: 30.5, lng: 32.3 },
      C: { lat: 21.5, lng: 108.3 },
    };
    const path = maritimePathFromNodePath(nodes, ["A", "B", "C"], 6);
    expect(path[0]!.lat).toBeCloseTo(51.9, 1);
    expect(path[path.length - 1]!.lat).toBeCloseTo(21.5, 1);
  });
});
