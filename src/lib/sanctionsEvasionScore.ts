/**
 * 제재 회피 강도(SES) — corridor-ranks.json sanctions-evasion 회랑 집계.
 */
import { STRATEGIC_CORRIDORS } from "@/data/strategicCorridors";
import {
  getCorridorRanksGeneratedAt,
  type CorridorRankRow,
  type CorridorRanksFile,
} from "@/lib/corridorRanks";
import ranksPayload from "@/data/corridor-ranks.json";
import { SES_BLEND } from "@/lib/ses";

const ranks = ranksPayload as CorridorRanksFile;

export type SanctionsEvasionDriver = {
  corridorId: string;
  nameKo: string;
  nameEn: string;
  intensity: number;
  scorePercentile: number | null;
  status: string;
};

export type SanctionsEvasionSnapshot = {
  score: number;
  deltaScore: number | null;
  corridorCount: number;
  generatedAt: string;
  method: "corridor-proxy-blend";
  topDrivers: SanctionsEvasionDriver[];
};

type EvasionComponents = CorridorRankRow["components"] & {
  shadowFleetAgeNorm?: number | null;
  crudeOilNorm?: number | null;
  crudeOilLoadedTonnage?: number | null;
  shadowFleetAvgAgeYears?: number | null;
};

const corridorNameById = new Map(
  STRATEGIC_CORRIDORS.map((c) => [c.id, { ko: c.nameKo, en: c.nameEn }]),
);

export function listSanctionsEvasionRankRows(): CorridorRankRow[] {
  return ranks.corridors.filter((r) => r.category === "sanctions-evasion");
}

/** 회랑 하나의 제재 회피 강도 (0–1) */
export function corridorEvasionIntensity(row: CorridorRankRow): number {
  const c = row.components as EvasionComponents;
  let sum = 0;
  let weight = 0;
  if (c.shadowFleetAgeNorm != null && Number.isFinite(c.shadowFleetAgeNorm)) {
    sum += c.shadowFleetAgeNorm * 0.35;
    weight += 0.35;
  }
  if (c.crudeOilNorm != null && Number.isFinite(c.crudeOilNorm)) {
    sum += c.crudeOilNorm * 0.3;
    weight += 0.3;
  }
  if (Number.isFinite(row.score)) {
    sum += row.score * 0.35;
    weight += 0.35;
  }
  const choke = row.modalStress?.seaChokeStress;
  if (choke != null && Number.isFinite(choke)) {
    sum += Math.min(1, Math.max(0, choke)) * 0.15;
    weight += 0.15;
  }
  if (weight <= 0) return row.score;
  return sum / weight;
}

export function computeSanctionsEvasionSnapshot(
  prevScore: number | null = null,
): SanctionsEvasionSnapshot {
  const rows = listSanctionsEvasionRankRows();
  const intensities = rows.map((r) => ({
    row: r,
    intensity: corridorEvasionIntensity(r),
  }));

  let score = 0;
  if (intensities.length > 0) {
    const avg =
      intensities.reduce((a, x) => a + x.intensity, 0) / intensities.length;
    const max = Math.max(...intensities.map((x) => x.intensity));
    const raw = avg * SES_BLEND.avgWeight + max * SES_BLEND.maxWeight;
    score = Math.max(0, Math.min(100, Math.round(raw * 100)));
  }

  const deltaScore =
    prevScore != null && Number.isFinite(prevScore)
      ? score - prevScore
      : null;

  const topDrivers = [...intensities]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 5)
    .map(({ row, intensity }) => {
      const names = corridorNameById.get(row.corridorId);
      return {
        corridorId: row.corridorId,
        nameKo: names?.ko ?? row.corridorId,
        nameEn: names?.en ?? row.corridorId,
        intensity,
        scorePercentile: row.scorePercentile ?? null,
        status: row.status,
      };
    });

  return {
    score,
    deltaScore,
    corridorCount: rows.length,
    generatedAt: getCorridorRanksGeneratedAt(),
    method: "corridor-proxy-blend",
    topDrivers,
  };
}
