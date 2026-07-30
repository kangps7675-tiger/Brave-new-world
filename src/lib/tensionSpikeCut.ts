/**
 * 오늘의 핫 전장·초크 긴장 스파이크 → 암전 컷 → 렌즈(증시/항로/전선) 점프.
 * daily-ranks TOP(전장 vs 초크 score 비교) 기준. 대만 전용이 아님.
 */

import type { DailyRankEntry, WorldTensionSnapshot } from "@/lib/dailyRanks";
import { displayTensionScore } from "@/lib/dailyRanks";
import { formatTensionDriverLine } from "@/lib/tensionDrivers";

export type TensionCutDestination = "market" | "route" | "front";

export type TensionCutNavTarget = {
  /** 경제 내비 id — econNavSelectionFromId */
  economyNavId?: string;
  /** 지정학 내비 id — navSelectionFromId */
  conflictNavId?: string;
};

export type TensionSpikeSnapshot = {
  /** daily-ranks 승자 entityId (taiwan, choke-hormuz, ukraine …) */
  entityId: string;
  labelKo: string;
  labelEn: string;
  kind: "theater" | "chokepoint";
  theaterScore: number;
  theaterDelta: number | null;
  chokeScore: number | null;
  worldScore: number | null;
  /** 임계 미달이지만 세계 긴장이 높아 TOP을 미리보기로 연 경우 */
  proxy: boolean;
  driverKo: string | null;
  driverEn: string | null;
  telegraphKo: string;
  telegraphEn: string;
};

/** 점수 이 이상이면 컷 오퍼 */
export const HOT_SPIKE_SCORE = 68;
/** 하루 상승분이 이 이상이면(점수와 무관하게) 컷 */
export const HOT_SPIKE_DELTA = 4;
/** 랭크 TOP이 임계 아래여도 세계 긴장이 이 이상이면 TOP 미리보기 */
export const WORLD_PROXY_SPIKE_SCORE = 72;

/** @deprecated HOT_SPIKE_SCORE 사용 */
export const TAIWAN_SPIKE_SCORE = HOT_SPIKE_SCORE;
/** @deprecated HOT_SPIKE_DELTA 사용 */
export const TAIWAN_SPIKE_DELTA = HOT_SPIKE_DELTA;

const DISMISS_KEY = "geowatch-tension-cut-dismiss-v1";

export function tensionCutDismissedToday(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const day = new Date().toISOString().slice(0, 10);
    return raw === day;
  } catch {
    return false;
  }
}

export function dismissTensionCutToday(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString().slice(0, 10));
  } catch {
    /* ignore */
  }
}

/**
 * 전장 TOP vs 초크 TOP을 score로 비교 — HotTheater와 동일한 승자 규칙.
 */
export function pickHottestRankEntry(input: {
  theater?: DailyRankEntry[];
  chokepoint?: DailyRankEntry[];
}): DailyRankEntry | null {
  const topTheater = input.theater?.[0] ?? null;
  const topChoke = input.chokepoint?.[0] ?? null;
  if (!topTheater && !topChoke) return null;
  if (topTheater && topChoke) {
    return topTheater.score >= topChoke.score ? topTheater : topChoke;
  }
  return (topTheater ?? topChoke)!;
}

/** entity → 렌즈별 내비. 없으면 front에 entityId 자체를 시도. */
const CUT_LENSES: Record<
  string,
  Record<TensionCutDestination, TensionCutNavTarget>
> = {
  taiwan: {
    market: { economyNavId: "taiwan-chip" },
    route: { economyNavId: "taiwan-strait-econ" },
    front: { conflictNavId: "taiwan-strait" },
  },
  "china-taiwan": {
    market: { economyNavId: "taiwan-chip" },
    route: { economyNavId: "taiwan-strait-econ" },
    front: { conflictNavId: "taiwan-strait" },
  },
  "choke-taiwan": {
    market: { economyNavId: "taiwan-chip" },
    route: { economyNavId: "taiwan-strait-econ" },
    front: { conflictNavId: "taiwan-strait" },
  },
  ukraine: {
    market: { economyNavId: "chicago-cme" },
    route: { conflictNavId: "ukraine" },
    front: { conflictNavId: "ukraine-east" },
  },
  "russia-ukraine": {
    market: { economyNavId: "chicago-cme" },
    route: { conflictNavId: "ukraine" },
    front: { conflictNavId: "ukraine-east" },
  },
  "middle-east": {
    market: { economyNavId: "hormuz" },
    route: { economyNavId: "hormuz" },
    front: { conflictNavId: "gulf" },
  },
  korea: {
    market: { economyNavId: "hong-kong" },
    route: { conflictNavId: "korea" },
    front: { conflictNavId: "dmz" },
  },
  japan: {
    market: { economyNavId: "hong-kong" },
    route: { conflictNavId: "senkaku" },
    front: { conflictNavId: "us-jpn-kor" },
  },
  "southeast-asia": {
    market: { economyNavId: "malacca" },
    route: { economyNavId: "malacca" },
    front: { conflictNavId: "south-china-sea" },
  },
  "choke-hormuz": {
    market: { economyNavId: "hormuz" },
    route: { economyNavId: "hormuz" },
    front: { conflictNavId: "persian-gulf" },
  },
  "choke-suez": {
    market: { economyNavId: "suez" },
    route: { economyNavId: "suez" },
    front: { conflictNavId: "yemen-red-sea" },
  },
  "choke-bab-el-mandeb": {
    market: { economyNavId: "bab-el-mandeb" },
    route: { economyNavId: "suez" },
    front: { conflictNavId: "yemen-red-sea" },
  },
  "choke-malacca": {
    market: { economyNavId: "malacca" },
    route: { economyNavId: "malacca" },
    front: { conflictNavId: "asean" },
  },
  "choke-gibraltar": {
    market: { economyNavId: "london" },
    route: { economyNavId: "suez" },
    front: { conflictNavId: "europe" },
  },
  "choke-good-hope": {
    market: { economyNavId: "chicago-cme" },
    route: { economyNavId: "suez" },
    front: { conflictNavId: "africa" },
  },
};

function defaultLenses(entityId: string): Record<
  TensionCutDestination,
  TensionCutNavTarget
> {
  const bare = entityId.replace(/^choke-/, "");
  return {
    market: { economyNavId: bare, conflictNavId: entityId },
    route: { economyNavId: bare, conflictNavId: entityId },
    front: { conflictNavId: entityId },
  };
}

export function resolveTensionCutNav(
  entityId: string,
  destination: TensionCutDestination,
): TensionCutNavTarget {
  const table = CUT_LENSES[entityId] ?? defaultLenses(entityId);
  return table[destination];
}

function buildSpikeFromEntry(
  winner: DailyRankEntry,
  input: {
    theater?: DailyRankEntry[];
    chokepoint?: DailyRankEntry[];
    worldTension?: WorldTensionSnapshot | null;
  },
  proxy: boolean,
): TensionSpikeSnapshot {
  const score = displayTensionScore(winner);
  const delta =
    typeof winner.deltaScore === "number" && Number.isFinite(winner.deltaScore)
      ? Math.round(winner.deltaScore * 10) / 10
      : null;
  const relatedChoke =
    winner.kind === "chokepoint"
      ? winner
      : input.chokepoint?.find((c) =>
          c.entityId.includes(
            winner.entityId === "taiwan"
              ? "taiwan"
              : winner.entityId === "middle-east"
                ? "hormuz"
                : winner.entityId,
          ),
        ) ?? null;
  const chokeScore = relatedChoke ? displayTensionScore(relatedChoke) : null;
  const world = input.worldTension ?? null;
  const rising = delta == null || delta >= 0;
  const driverKo = formatTensionDriverLine(winner.detail, "ko", { rising });
  const driverEn = formatTensionDriverLine(winner.detail, "en", { rising });

  const deltaBitKo =
    delta != null && delta !== 0
      ? delta > 0
        ? ` · 어제보다 +${delta}`
        : ` · 어제보다 ${delta}`
      : "";
  const deltaBitEn =
    delta != null && delta !== 0
      ? delta > 0
        ? ` · vs yesterday +${delta}`
        : ` · vs yesterday ${delta}`
      : "";
  const chokeBitKo =
    chokeScore != null && winner.kind !== "chokepoint"
      ? ` · 초크 ${Math.round(chokeScore)}`
      : "";
  const chokeBitEn =
    chokeScore != null && winner.kind !== "chokepoint"
      ? ` · choke ${Math.round(chokeScore)}`
      : "";
  const proxyBitKo = proxy ? " · 미리보기" : "";
  const proxyBitEn = proxy ? " · preview" : "";

  return {
    entityId: winner.entityId,
    labelKo: winner.labelKo,
    labelEn: winner.labelEn,
    kind: winner.kind,
    theaterScore: score,
    theaterDelta: delta,
    chokeScore,
    worldScore: world && Number.isFinite(world.score) ? world.score : null,
    proxy,
    driverKo,
    driverEn,
    telegraphKo: `${winner.labelKo} 긴장 ${Math.round(score)}${deltaBitKo}${chokeBitKo}${proxyBitKo}`,
    telegraphEn: `${winner.labelEn} tension ${Math.round(score)}${deltaBitEn}${chokeBitEn}${proxyBitEn}`,
  };
}

export function evaluateHotTensionSpike(input: {
  theater?: DailyRankEntry[];
  chokepoint?: DailyRankEntry[];
  worldTension?: WorldTensionSnapshot | null;
}): TensionSpikeSnapshot | null {
  const winner = pickHottestRankEntry(input);
  const world = input.worldTension ?? null;

  if (winner) {
    const score = displayTensionScore(winner);
    const delta =
      typeof winner.deltaScore === "number" && Number.isFinite(winner.deltaScore)
        ? winner.deltaScore
        : null;
    const spiked =
      score >= HOT_SPIKE_SCORE ||
      (delta != null && delta >= HOT_SPIKE_DELTA);

    if (spiked) {
      return buildSpikeFromEntry(winner, input, false);
    }

    if (world && Number.isFinite(world.score) && world.score >= WORLD_PROXY_SPIKE_SCORE) {
      return buildSpikeFromEntry(winner, input, true);
    }

    return null;
  }

  return null;
}

/** @deprecated evaluateHotTensionSpike 사용 */
export function evaluateTaiwanTensionSpike(
  input: Parameters<typeof evaluateHotTensionSpike>[0],
): TensionSpikeSnapshot | null {
  return evaluateHotTensionSpike(input);
}

export const TENSION_CUT_DESTINATIONS: Array<{
  id: TensionCutDestination;
  labelKo: string;
  labelEn: string;
  hintKo: string;
  hintEn: string;
}> = [
  {
    id: "market",
    labelKo: "증시·자산",
    labelEn: "Markets",
    hintKo: "관련 시세·허브로 이동합니다",
    hintEn: "Jump to related tickers and hubs",
  },
  {
    id: "route",
    labelKo: "물류·항로",
    labelEn: "Routes",
    hintKo: "해상·물류 통로를 따라갑니다",
    hintEn: "Follow shipping and logistics lanes",
  },
  {
    id: "front",
    labelKo: "전선·군사",
    labelEn: "Front",
    hintKo: "병력·전선 배치를 봅니다",
    hintEn: "See force posture and front lines",
  },
];
