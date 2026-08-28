/**
 * Load batch corridor ranks (BRI · choke proxy · status · length → scalerank).
 * Runtime: override TransportPath.scalerank for strategic corridors.
 */
import ranksPayload from "@/data/corridor-ranks.json";
import rankMeta from "@/data/corridor-rank-meta.json";

export type CorridorRankComponents = {
  bilateralTradeUsd: number | null;
  bilateralTradeNorm: number | null;
  portThroughput: number | null;
  portThroughputNorm: number | null;
  briImpactPct: number | null;
  briImpactNorm: number | null;
  chokeCapacity: number | null;
  chokeNorm: number | null;
  osmMainlineKm: number | null;
  osmMainlineNorm: number | null;
  lengthKm: number;
  lengthNorm: number;
  statusWeight: number;
  corridorTeu: number | null;
};

export type CorridorRankRow = {
  corridorId: string;
  category: string;
  status: string;
  mode: string;
  endpointCountries: string[];
  comtradePair: string[];
  score: number;
  scorePercentile?: number;
  scalerank: number;
  components: CorridorRankComponents;
  sources: string[];
};

export type CorridorRanksFile = {
  generatedAt: string;
  version: number;
  method: string;
  attribution: string[];
  counts: Record<string, number>;
  corridors: CorridorRankRow[];
};

const ranks = ranksPayload as CorridorRanksFile;

const byId = new Map<string, CorridorRankRow>();
for (const row of ranks.corridors) {
  byId.set(row.corridorId, row);
}

export function getCorridorRanksGeneratedAt(): string {
  return ranks.generatedAt;
}

export function getCorridorRank(corridorId: string): CorridorRankRow | undefined {
  return byId.get(corridorId);
}

export function getCorridorScalerank(corridorId: string, fallback = 3): number {
  return byId.get(corridorId)?.scalerank ?? fallback;
}

export type CorridorRankMetaRow = {
  id: string;
  category: string;
  status: string;
  mode: string;
  endpointCountries: string[];
  comtradePair: string[];
  briDestCodes: string[];
  chokeIds: string[];
  lengthKmApprox: number;
};

export function getCorridorRankMeta(corridorId: string): CorridorRankMetaRow | undefined {
  const list = (rankMeta as { corridors: CorridorRankMetaRow[] }).corridors;
  return list.find((c) => c.id === corridorId);
}

export function listCorridorRankMeta(): CorridorRankMetaRow[] {
  return (rankMeta as { corridors: CorridorRankMetaRow[] }).corridors;
}
