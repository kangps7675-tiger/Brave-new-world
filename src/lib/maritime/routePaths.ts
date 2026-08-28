import type { TransportPath, TransportPathPoint } from "@/data/geoTypes";
import type { MaritimeGraph, MaritimeRouteResult } from "@/lib/maritime/types";
import { maritimePathFromNodePath, SURFACE_EPSILON } from "@/lib/maritime/sphere3d";

function pointsBbox(points: TransportPathPoint[]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return { minLat, minLng, maxLat, maxLng };
}

export function maritimeRouteToTransportPath(
  route: MaritimeRouteResult,
  graph: MaritimeGraph,
  opts: { fromId: string; toId: string; id?: string },
): TransportPath {
  const from = graph.nodes[opts.fromId];
  const to = graph.nodes[opts.toId];
  const name =
    from && to ? `${from.name} → ${to.name}` : `${opts.fromId} → ${opts.toId}`;
  const points: TransportPathPoint[] = route.points.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    alt: SURFACE_EPSILON,
  }));
  const chokeIds = route.nodePath.filter((id) => graph.nodes[id]?.type === "chokepoint");
  return {
    id: opts.id ?? `maritime-route-${opts.fromId}-${opts.toId}`,
    kind: "maritime-route",
    name,
    scalerank: 1,
    lengthKm: route.lengthKm,
    bbox: pointsBbox(points),
    points,
    meta: {
      fromId: opts.fromId,
      toId: opts.toId,
      nodePath: route.nodePath.join(","),
      chokeIds: chokeIds.join(","),
      capacityNorm: route.capacityNorm,
      source: "portwatch-maritime-graph",
    },
  };
}

export type SampleMaritimeRoute = {
  id: string;
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  nodePath: string[];
  lengthKm: number;
  capacityNorm: number;
  points: { lat: number; lng: number }[];
};

export function sampleRoutesToTransportPaths(
  graph: MaritimeGraph,
  samples: SampleMaritimeRoute[],
): TransportPath[] {
  return samples.map((s) => {
    const points =
      s.nodePath.length >= 2
        ? maritimePathFromNodePath(graph.nodes, s.nodePath, 12)
        : s.points;
    return maritimeRouteToTransportPath(
      {
        nodePath: s.nodePath,
        lengthKm: s.lengthKm,
        capacityNorm: s.capacityNorm,
        points,
      },
      graph,
      { fromId: s.fromId, toId: s.toId, id: s.id },
    );
  });
}
