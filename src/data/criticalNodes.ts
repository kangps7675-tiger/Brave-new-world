/**
 * Critical Nodes — derived from Critical Node Atlas (EkoA/chokepoints-project)
 * License: MIT. Upstream: https://github.com/EkoA/chokepoints-project
 */
import rawNodes from "@/data/vendor/chokepoints-nodes.json";

export type CriticalNodeLayer = "maritime" | "cables" | "financial" | "tech" | "energy";
export type CriticalRiskLevel = "critical" | "high" | "moderate";

export type CriticalCascadeLink = {
  id: string;
  layer: string;
  effect: string;
};

export type CriticalNode = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: "physical" | "institutional" | "hidden";
  layer: CriticalNodeLayer;
  plain: string;
  what: string;
  why: string;
  disruption: string;
  realEvent?: string;
  risk: CriticalRiskLevel;
  source: string;
  cascades: CriticalCascadeLink[];
  country?: string;
  flow?: string;
  metric?: string;
};

type RawNode = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: CriticalNode["category"];
  layer: CriticalNodeLayer;
  plain: string;
  what: string;
  why: string;
  disruption: string;
  realEvent?: string;
  risk: CriticalRiskLevel;
  source: string;
  cascades?: CriticalCascadeLink[];
  country?: string;
  flow?: string;
  metric?: string;
};

export const CRITICAL_NODES_ATTRIBUTION =
  "Critical Node Atlas (MIT) · https://github.com/EkoA/chokepoints-project";

export const CRITICAL_NODES: CriticalNode[] = (rawNodes as RawNode[]).map((n) => ({
  id: n.id,
  name: n.name,
  lat: n.lat,
  lng: n.lon,
  category: n.category,
  layer: n.layer,
  plain: n.plain,
  what: n.what,
  why: n.why,
  disruption: n.disruption,
  realEvent: n.realEvent,
  risk: n.risk,
  source: n.source,
  cascades: n.cascades ?? [],
  country: n.country,
  flow: n.flow,
  metric: n.metric,
}));

const BY_ID = new Map(CRITICAL_NODES.map((n) => [n.id, n]));

export function getCriticalNode(id: string): CriticalNode | undefined {
  return BY_ID.get(id);
}

/** ECON nav id → Critical Node Atlas id */
export const ECON_NAV_TO_CRITICAL_NODE: Record<string, string> = {
  hormuz: "hormuz",
  suez: "suez",
  "suez-canal": "suez",
  "bab-el-mandeb": "badmandeb",
  malacca: "malacca",
  "malacca-strait": "malacca",
  "taiwan-strait-econ": "taiwan_strait",
  panama: "panama",
  qatar: "rlaff",
  singapore: "singapore",
  "singapore-energy": "singapore",
  "taiwan-chip": "tsmc",
  "black-sea-grain": "bosporus",
};

export function criticalNodeForEconNavId(navId: string): CriticalNode | undefined {
  const mapped = ECON_NAV_TO_CRITICAL_NODE[navId];
  return mapped ? getCriticalNode(mapped) : undefined;
}

export function cascadeNeighborIds(nodeId: string): string[] {
  const node = getCriticalNode(nodeId);
  if (!node) return [];
  return node.cascades.map((c) => c.id);
}

/** Static globe points for Critical Nodes layer (MIT attribution in meta). */
export function criticalNodesAsStaticPoints(): import("@/data/geoTypes").StaticPoint[] {
  return CRITICAL_NODES.map((n) => ({
    id: `crit-${n.id}`,
    kind: "critical-node" as const,
    name: n.name,
    lat: n.lat,
    lng: n.lng,
    tier: n.risk === "critical" ? 1 : n.risk === "high" ? 2 : 3,
    meta: {
      criticalNodeId: n.id,
      layer: n.layer,
      risk: n.risk,
      flow: n.flow ?? null,
      attribution: CRITICAL_NODES_ATTRIBUTION,
    },
  }));
}

export function focusCriticalNodeIds(nodeId: string | undefined): Set<string> {
  const ids = new Set<string>();
  if (!nodeId) return ids;
  ids.add(nodeId);
  for (const neighbor of cascadeNeighborIds(nodeId)) ids.add(neighbor);
  return ids;
}
