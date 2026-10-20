export type MaritimeNodeType = "port" | "chokepoint" | "waypoint";

export type MaritimeNode = {
  id: string;
  type: MaritimeNodeType;
  name: string;
  lat: number;
  lng: number;
  iso3?: string | null;
  country?: string | null;
  portid?: string;
  tradeVolume?: number;
  capacityNorm?: number;
};

export type MaritimeEdge = {
  to: string;
  distanceKm: number;
  capacityNorm?: number;
};

export type MaritimeGraph = {
  generatedAt: string;
  source: string;
  nodeCount: number;
  edgeCount: number;
  nodes: Record<string, MaritimeNode>;
  adjacency: Record<string, MaritimeEdge[]>;
};

export type MaritimeRouteResult = {
  nodePath: string[];
  lengthKm: number;
  capacityNorm: number;
  points: { lat: number; lng: number }[];
};
