import { describe, expect, it } from "vitest";
import { findMaritimePath } from "@/lib/maritime/pathfind";
import type { MaritimeGraph } from "@/lib/maritime/types";

const miniGraph: MaritimeGraph = {
  generatedAt: "test",
  source: "test",
  nodeCount: 4,
  edgeCount: 3,
  nodes: {
    A: { id: "A", type: "port", name: "A", lat: 51.9, lng: 4.2, capacityNorm: 0.8 },
    B: { id: "B", type: "chokepoint", name: "Choke", lat: 30.5, lng: 32.3, capacityNorm: 0.9 },
    C: { id: "C", type: "waypoint", name: "Mid", lat: 8.0, lng: 85.0, capacityNorm: 0.5 },
    D: { id: "D", type: "port", name: "D", lat: 21.5, lng: 108.3, capacityNorm: 0.7 },
  },
  adjacency: {
    A: [{ to: "B", distanceKm: 3500 }],
    B: [{ to: "A", distanceKm: 3500 }, { to: "C", distanceKm: 4200 }],
    C: [{ to: "B", distanceKm: 4200 }, { to: "D", distanceKm: 2800 }],
    D: [{ to: "C", distanceKm: 2800 }],
  },
};

describe("findMaritimePath", () => {
  it("finds a path through choke and waypoint", () => {
    const route = findMaritimePath(miniGraph, "A", "D");
    expect(route).not.toBeNull();
    expect(route!.nodePath[0]).toBe("A");
    expect(route!.nodePath[route!.nodePath.length - 1]).toBe("D");
    expect(route!.nodePath).toContain("B");
    expect(route!.points.length).toBeGreaterThan(4);
  });
});
