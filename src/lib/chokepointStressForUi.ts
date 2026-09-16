import type { StaticPoint } from "@/data/geoTypes";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";
import {
  computeChokepointStress,
  type ChokepointStress,
} from "@/lib/logisticsStress";

export type ChokepointAisObservation = {
  changePct: number;
  observedAt?: string | null;
  isDemo?: boolean;
} | null;

/**
 * UI helper for chokepoint stress.
 * B-grade transit = IMF PortWatch (aisObservation). Missing => insufficient observation.
 * Grade/siren remain UKMTO A-grade only (logisticsStress.ts unchanged).
 */
export type ChokepointAssetVolatility = {
  assetLabel: string;
  hint: "high" | "elevated" | "normal";
  observedAt?: string | null;
  isDemo?: boolean;
} | null;

export function stressForChokepoint(
  point: Pick<StaticPoint, "id" | "lat" | "lng">,
  ukmtoIncidents: UkmtoIncidentPoint[],
  aisObservation: ChokepointAisObservation = null,
  assetVolatility: ChokepointAssetVolatility = null,
): ChokepointStress {
  return computeChokepointStress({
    chokepointId: point.id,
    chokeLat: point.lat,
    chokeLng: point.lng,
    ukmtoIncidents,
    aisObservation,
    assetVolatility,
    windowDays: 7,
  });
}