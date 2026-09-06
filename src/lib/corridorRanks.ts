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
  crudeOilLoadedTonnage?: number | null;
  crudeOilNorm?: number | null;
  shadowFleetAvgAgeYears?: number | null;
  shadowFleetAgeNorm?: number | null;
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

export type CorridorIndicatorCoverage = {
  available: number;
  total: number;
  missing: string[];
};

const CORE_INDICATOR_CHECKS: {
  key: string;
  labelKo: string;
  labelEn: string;
  test: (row: CorridorRankRow) => boolean;
  optional?: (row: CorridorRankRow) => boolean;
}[] = [
  {
    key: "comtrade",
    labelKo: "Comtrade 무역",
    labelEn: "Comtrade trade",
    test: (row) => row.components.bilateralTradeNorm != null,
  },
  {
    key: "port",
    labelKo: "항만 처리량",
    labelEn: "Port throughput",
    test: (row) => row.components.portThroughputNorm != null,
  },
  {
    key: "rail",
    labelKo: "Eurostat 철도",
    labelEn: "Eurostat rail",
    test: (row) => row.components.corridorTeuNorm != null,
    optional: (row) => !row.railFreightPair,
  },
  {
    key: "bri",
    labelKo: "BRI 영향",
    labelEn: "BRI impact",
    test: (row) => row.components.briImpactNorm != null,
  },
  {
    key: "choke",
    labelKo: "초크 스트레스",
    labelEn: "Choke stress",
    test: (row) =>
      row.components.chokeNorm != null ||
      (row.components as { chokeStressNorm?: number | null }).chokeStressNorm != null,
  },
];

/** 회랑 rank 점수에 실제 반영된 핵심 지표 수 (UI 정직성) */
export function corridorIndicatorCoverage(row: CorridorRankRow): CorridorIndicatorCoverage {
  const applicable = CORE_INDICATOR_CHECKS.filter((c) => !c.optional?.(row));
  const available = applicable.filter((c) => c.test(row)).length;
  const missingFromSources = row.sources.filter((s) => /pending|missing/i.test(s));
  const missingLabels = applicable
    .filter((c) => !c.test(row))
    .map((c) => c.labelKo);
  return {
    available,
    total: applicable.length,
    missing: missingFromSources.length > 0 ? missingFromSources : missingLabels,
  };
}

export function getCorridorRankPipelineStatus(): {
  generatedAt: string;
  portwatchHits: number;
  railFreightHits: number;
  comtradeHits: number;
  unctadHits: number;
  lsbciHits: number;
} {
  return {
    generatedAt: ranks.generatedAt,
    portwatchHits: ranks.counts.portwatchHits ?? 0,
    railFreightHits: ranks.counts.railFreightHits ?? 0,
    comtradeHits: ranks.counts.comtradeHits ?? 0,
    unctadHits: ranks.counts.unctadHits ?? 0,
    lsbciHits: ranks.counts.lsbciHits ?? 0,
  };
}
