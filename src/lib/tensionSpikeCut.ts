/**
 * 대만 해협 긴장 스파이크 → 암전 컷 → 목적지 점프 (프로토타입).
 * daily-ranks 전장 `taiwan` / 초크 `choke-taiwan` 기준.
 */

import type { DailyRankEntry, WorldTensionSnapshot } from "@/lib/dailyRanks";
import { displayTensionScore } from "@/lib/dailyRanks";

export type TensionCutDestination = "market" | "route" | "front";

export type TensionSpikeSnapshot = {
  theaterScore: number;
  theaterDelta: number | null;
  chokeScore: number | null;
  worldScore: number | null;
  /** 전장 행이 없어 세계 긴장도로 대리 트리거 */
  proxy: boolean;
  telegraphKo: string;
  telegraphEn: string;
};

/** 전장 점수 이 이상이면 컷 오퍼 */
export const TAIWAN_SPIKE_SCORE = 68;
/** 하루 상승분이 이 이상이면(점수와 무관하게) 컷 */
export const TAIWAN_SPIKE_DELTA = 4;
/** 전장 데이터 없을 때 세계 긴장 대리 임계 */
export const WORLD_PROXY_SPIKE_SCORE = 72;

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

export function evaluateTaiwanTensionSpike(input: {
  theater?: DailyRankEntry[];
  chokepoint?: DailyRankEntry[];
  worldTension?: WorldTensionSnapshot | null;
}): TensionSpikeSnapshot | null {
  const taiwan = input.theater?.find((t) => t.entityId === "taiwan");
  const choke = input.chokepoint?.find((c) => c.entityId === "choke-taiwan");
  const world = input.worldTension ?? null;

  if (taiwan) {
    const theaterScore = displayTensionScore(taiwan);
    const theaterDelta =
      typeof taiwan.deltaScore === "number" && Number.isFinite(taiwan.deltaScore)
        ? Math.round(taiwan.deltaScore * 10) / 10
        : null;
    const chokeScore = choke ? displayTensionScore(choke) : null;
    const spiked =
      theaterScore >= TAIWAN_SPIKE_SCORE ||
      (theaterDelta != null && theaterDelta >= TAIWAN_SPIKE_DELTA) ||
      (chokeScore != null && chokeScore >= TAIWAN_SPIKE_SCORE);

    if (!spiked) return null;

    const deltaBit =
      theaterDelta != null && theaterDelta !== 0
        ? theaterDelta > 0
          ? ` · Δ+${theaterDelta}`
          : ` · Δ${theaterDelta}`
        : "";
    const chokeBit =
      chokeScore != null ? ` · 해협 초크 ${Math.round(chokeScore)}` : "";

    return {
      theaterScore,
      theaterDelta,
      chokeScore,
      worldScore: world && Number.isFinite(world.score) ? world.score : null,
      proxy: false,
      telegraphKo: `해협 긴장 ${Math.round(theaterScore)}${deltaBit}${chokeBit} · 칩·항로·전선 컷 대기`,
      telegraphEn: `Strait tension ${Math.round(theaterScore)}${deltaBit}${chokeBit} · cut ready`,
    };
  }

  if (world && Number.isFinite(world.score) && world.score >= WORLD_PROXY_SPIKE_SCORE) {
    const score = Math.round(world.score * 10) / 10;
    return {
      theaterScore: score,
      theaterDelta: world.deltaScore,
      chokeScore: choke ? displayTensionScore(choke) : null,
      worldScore: score,
      proxy: true,
      telegraphKo: `세계 긴장 ${Math.round(score)} · 대만 전장 행 대기 — 컷 체험 가능`,
      telegraphEn: `World tension ${Math.round(score)} · Taiwan row pending — cut preview`,
    };
  }

  return null;
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
    labelKo: "증시",
    labelEn: "Markets",
    hintKo: "반도체 허브 · 티커",
    hintEn: "Chip hub · tickers",
  },
  {
    id: "route",
    labelKo: "항로",
    labelEn: "Routes",
    hintKo: "해협·말라카 물류",
    hintEn: "Strait · Malacca",
  },
  {
    id: "front",
    labelKo: "전선",
    labelEn: "Front",
    hintKo: "도련·군사 레이어",
    hintEn: "Island chains · mil",
  },
];
