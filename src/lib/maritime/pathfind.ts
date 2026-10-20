import type { MaritimeEdge, MaritimeGraph, MaritimeNode, MaritimeRouteResult } from "@/lib/maritime/types";
import { haversineKm } from "@/lib/maritime/geo";
import { maritimePathFromNodePath } from "@/lib/maritime/sphere3d";

/** A* shortest path on maritime adjacency (edge cost = distanceKm). */
export function findMaritimePath(
  graph: MaritimeGraph,
  fromId: string,
  toId: string,
): MaritimeRouteResult | null {
  const { nodes, adjacency } = graph;
  if (!nodes[fromId] || !nodes[toId]) return null;
  if (fromId === toId) {
    const n = nodes[fromId]!;
    return {
      nodePath: [fromId],
      lengthKm: 0,
      capacityNorm: n.capacityNorm ?? 0.5,
      points: [{ lat: n.lat, lng: n.lng }],
    };
  }

  const open = new Set<string>([fromId]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[fromId, 0]]);
  const h0 = haversineKm(
    nodes[fromId]!.lat,
    nodes[fromId]!.lng,
    nodes[toId]!.lat,
    nodes[toId]!.lng,
  );
  const fScore = new Map<string, number>([[fromId, h0]]);

  while (open.size > 0) {
    let current: string | null = null;
    let bestF = Infinity;
    for (const id of open) {
      const f = fScore.get(id) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        current = id;
      }
    }
    if (!current) break;

    if (current === toId) {
      const nodePath: string[] = [current];
      while (cameFrom.has(nodePath[0]!)) {
        nodePath.unshift(cameFrom.get(nodePath[0]!)!);
      }
      return buildRouteResult(nodes, adjacency, nodePath);
    }

    open.delete(current);
    const edges = adjacency[current] ?? [];
    for (const edge of edges) {
      const tentative = (gScore.get(current) ?? Infinity) + edge.distanceKm;
      if (tentative < (gScore.get(edge.to) ?? Infinity)) {
        cameFrom.set(edge.to, current);
        gScore.set(edge.to, tentative);
        const n = nodes[edge.to]!;
        fScore.set(
          edge.to,
          tentative + haversineKm(n.lat, n.lng, nodes[toId]!.lat, nodes[toId]!.lng),
        );
        open.add(edge.to);
      }
    }
  }
  return null;
}

function buildRouteResult(
  nodes: Record<string, MaritimeNode>,
  adjacency: Record<string, MaritimeEdge[]>,
  nodePath: string[],
): MaritimeRouteResult {
  let lengthKm = 0;
  for (let i = 0; i < nodePath.length - 1; i += 1) {
    const a = nodePath[i]!;
    const b = nodePath[i + 1]!;
    const edge = adjacency[a]?.find((e) => e.to === b);
    lengthKm += edge?.distanceKm ?? haversineKm(nodes[a]!.lat, nodes[a]!.lng, nodes[b]!.lat, nodes[b]!.lng);
  }
  const capacityNorm = Math.min(
    ...nodePath.map((id) => nodes[id]?.capacityNorm ?? 0.5),
  );
  return {
    nodePath,
    lengthKm: Math.round(lengthKm),
    capacityNorm,
    points: maritimePathFromNodePath(nodes, nodePath, 12),
  };
}
