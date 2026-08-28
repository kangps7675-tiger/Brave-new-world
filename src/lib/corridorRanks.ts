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
  corridorTeuNorm?: number | null;
  railFreightShockPct?: number | null;
  railFreightShareOfWorld?: number | null;
  dualSignal?: "aligned" | "price_over_volume" | "volume_over_price" | null;
  oceanTradeUsd?: number | null;
  oceanTradeNorm?: number | null;
  lsbci?: number | null;
  lsbciNorm?: number | null;
  oceanServicesUsd?: number | null;
  oceanServicesNorm?: number | null;
  euRailGateway?: boolean;
  gaugeBreak?: boolean;
};

export type CorridorRankRow = {
  corridorId: string;
  category: string;
  status: string;
  mode: string;
  endpointCountries: string[];
  comtradePair: string[];
  railFreightPair?: { geo: string; partner: string } | null;
  euRailGateway?: boolean;
  gaugeBreak?: boolean;
  modalFamily?: string | null;
  relatedCorridorIds?: string[];
  modalStress?: {
    family: string;
    relatedCorridorIds: string[];
    railShockPct: number | null;
    familyMinRailShockPct: number | null;
    familyMaxRailShockPct: number | null;
    seaChokeStress: number | null;
    lsciDrops: { iso: string; month: string; pctChange: number }[];
    connectivityDual: "aligned" | "sea_over_rail" | "rail_over_sea" | null;
    hypothesis: string | null;
    narrativeKo: string | null;
    narrativeEn: string | null;
  } | null;
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
