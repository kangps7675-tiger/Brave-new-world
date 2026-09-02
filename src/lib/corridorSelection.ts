import { findCorridor } from "@/data/strategicCorridors";
import type { TransportPath } from "@/data/geoTypes";
import { getCorridorRank, corridorIndicatorCoverage } from "@/lib/corridorRanks";
import railFreightPayload from "@/data/rail-freight-bilateral.json";

export type DualSignalKind =
  | "aligned"
  | "price_over_volume"
  | "volume_over_price"
  | null;

export type ConnectivityDualKind =
  | "aligned"
  | "sea_over_rail"
  | "rail_over_sea"
  | null;

export type ModalStressView = {
  family: string;
  relatedCorridorIds: string[];
  relatedLabels: { id: string; nameKo: string; nameEn: string }[];
  railShockPct: number | null;
  familyMinRailShockPct: number | null;
  familyMaxRailShockPct: number | null;
  seaChokeStress: number | null;
  lsciDrops: { iso: string; month: string; pctChange: number }[];
  connectivityDual: ConnectivityDualKind;
  hypothesis: string | null;
  narrativeKo: string | null;
  narrativeEn: string | null;
};

export type SelectedCorridor = {
  corridorId: string;
  pathId: string;
  nameKo: string;
  nameEn: string;
  midLat: number;
  midLng: number;
  note?: string;
  gaugeBreak: boolean;
  euRailGateway: boolean;
  railFreightPair: { geo: string; partner: string } | null;
  tonKmSeries: { year: string; value: number }[];
  avgRecentTkm: number | null;
  shockPct: number | null;
  shareOfWorld: number | null;
  bilateralTradeUsd: number | null;
  dualSignal: DualSignalKind;
  scalerank: number | null;
  modalStress: ModalStressView | null;
  indicatorCoverage?: { available: number; total: number; missing: string[] };
  rankSources?: string[];
};

type RailFreightFile = {
  pairs?: Record<
    string,
    {
      years?: Record<string, number>;
      avgRecentTkm?: number | null;
      shockPct?: number | null;
      shareOfWorld?: number | null;
    }
  >;
};

function midOfPath(path: TransportPath): { lat: number; lng: number } {
  const pts = path.points;
  if (!pts?.length) return { lat: 0, lng: 0 };
  const mid = pts[Math.floor(pts.length / 2)] ?? pts[0];
  return { lat: mid.lat, lng: mid.lng };
}

function seriesForPair(geo: string, partner: string): {
  tonKmSeries: { year: string; value: number }[];
  avgRecentTkm: number | null;
  shockPct: number | null;
  shareOfWorld: number | null;
} {
  const key = `${geo.toUpperCase()}|${partner.toUpperCase()}`;
  const row = (railFreightPayload as RailFreightFile).pairs?.[key];
  if (!row?.years) {
    return { tonKmSeries: [], avgRecentTkm: null, shockPct: null, shareOfWorld: null };
  }
  const tonKmSeries = Object.keys(row.years)
    .sort()
    .map((year) => ({ year, value: row.years![year]! }));
  return {
    tonKmSeries,
    avgRecentTkm: typeof row.avgRecentTkm === "number" ? row.avgRecentTkm : null,
    shockPct: typeof row.shockPct === "number" ? row.shockPct : null,
    shareOfWorld: typeof row.shareOfWorld === "number" ? row.shareOfWorld : null,
  };
}

function relatedLabels(ids: string[]) {
  return ids.slice(0, 4).map((id) => {
    const c = findCorridor(id);
    return {
      id,
      nameKo: c?.nameKo ?? id,
      nameEn: c?.nameEn ?? id,
    };
  });
}

export function selectedCorridorFromPath(path: TransportPath): SelectedCorridor | null {
  if (path.kind !== "strategic-corridor") return null;
  const corridorId =
    typeof path.meta?.corridorId === "string"
      ? path.meta.corridorId
      : path.id.replace(/^corridor-/, "");
  if (!corridorId) return null;

  const corridor = findCorridor(corridorId);
  const rank = getCorridorRank(corridorId);
  const pair =
    rank?.railFreightPair &&
    typeof rank.railFreightPair.geo === "string" &&
    typeof rank.railFreightPair.partner === "string"
      ? { geo: rank.railFreightPair.geo, partner: rank.railFreightPair.partner }
      : null;
  const freight = pair
    ? seriesForPair(pair.geo, pair.partner)
    : { tonKmSeries: [], avgRecentTkm: null, shockPct: null, shareOfWorld: null };
  const mid = midOfPath(path);
  const ms = rank?.modalStress ?? null;
  const modalStress: ModalStressView | null = ms
    ? {
        family: ms.family,
        relatedCorridorIds: ms.relatedCorridorIds ?? [],
        relatedLabels: relatedLabels(ms.relatedCorridorIds ?? []),
        railShockPct: ms.railShockPct,
        familyMinRailShockPct: ms.familyMinRailShockPct,
        familyMaxRailShockPct: ms.familyMaxRailShockPct,
        seaChokeStress: ms.seaChokeStress,
        lsciDrops: ms.lsciDrops ?? [],
        connectivityDual: (ms.connectivityDual as ConnectivityDualKind) ?? null,
        hypothesis: ms.hypothesis,
        narrativeKo: ms.narrativeKo,
        narrativeEn: ms.narrativeEn,
      }
    : null;

  return {
    corridorId,
    pathId: path.id,
    nameKo: corridor?.nameKo ?? path.name ?? corridorId,
    nameEn: corridor?.nameEn ?? path.name ?? corridorId,
    midLat: mid.lat,
    midLng: mid.lng,
    note: corridor?.note,
    gaugeBreak: Boolean(rank?.gaugeBreak),
    euRailGateway: Boolean(rank?.euRailGateway),
    railFreightPair: pair,
    tonKmSeries: freight.tonKmSeries,
    avgRecentTkm: freight.avgRecentTkm ?? rank?.components.corridorTeu ?? null,
    shockPct: freight.shockPct ?? rank?.components.railFreightShockPct ?? null,
    shareOfWorld:
      freight.shareOfWorld ?? rank?.components.railFreightShareOfWorld ?? null,
    bilateralTradeUsd: rank?.components.bilateralTradeUsd ?? null,
    dualSignal: (rank?.components.dualSignal as DualSignalKind) ?? null,
    scalerank: rank?.scalerank ?? null,
    modalStress,
    indicatorCoverage: rank ? corridorIndicatorCoverage(rank) : undefined,
    rankSources: rank?.sources,
  };
}
