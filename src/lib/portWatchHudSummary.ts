import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import {
  stressForChokepoint,
  type ChokepointAisObservation,
} from "@/lib/chokepointStressForUi";
import type { StressLevel } from "@/lib/logisticsStress";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";

/** HUD용 최악 라벨 — 합산 점수 없음 */
export type SupplyHudBand = "normal" | "friction" | "critical";

const LEVEL_RANK: Record<StressLevel, number> = {
  unknown: 0,
  normal: 1,
  watch: 2,
  elevated: 3,
};

export function bandFromStressLevel(level: StressLevel): SupplyHudBand {
  if (level === "elevated") return "critical";
  if (level === "watch") return "friction";
  return "normal";
}

export type PortWatchHudSummary = {
  elevatedPlus: number;
  worstLevel: StressLevel;
  band: SupplyHudBand;
  totalChokes: number;
};

export function summarizePortWatchStress(
  portWatchByChokeId: Record<string, ChokepointAisObservation>,
  ukmtoIncidents: UkmtoIncidentPoint[] = [],
): PortWatchHudSummary {
  const chokes = LOGISTICS_RISK_POINTS.filter((p) => p.kind === "chokepoint");
  let elevatedPlus = 0;
  let worstLevel: StressLevel = "unknown";
  let worstRank = -1;

  for (const p of chokes) {
    const stress = stressForChokepoint(
      p,
      ukmtoIncidents,
      portWatchByChokeId[p.id] ?? null,
    );
    if (stress.level === "elevated") elevatedPlus += 1;
    const rank = LEVEL_RANK[stress.level] ?? 0;
    if (rank > worstRank) {
      worstRank = rank;
      worstLevel = stress.level;
    }
  }

  return {
    elevatedPlus,
    worstLevel,
    band: bandFromStressLevel(worstLevel),
    totalChokes: chokes.length,
  };
}
