/**
 * 지경학 Databento 선물 SPIKE → 전보음/토스트 게이트 (순수 로직).
 */
import { isDatabentoFuturesSymbol } from "@/lib/databento/symbolMap";
import { TICKER_SPIKE_THRESHOLD_PERCENT } from "@/lib/news/intelStackMode";

export const TICKER_TELEGRAPH_COOLDOWN_MS = 45_000;
/** 속보 모스(hero-breaking ~12s) 직후 시세 전보 억제 */
export const BREAKING_MORSE_SUPPRESS_MS = 12_000;

/**
 * 초단위(60초 창) SPIKE 임계값 — 일봉 1.25%보다 낮게.
 * 일봉 티커 스트립은 기존 TICKER_SPIKE_THRESHOLD_PERCENT 유지.
 */
export const FUTURES_LIVE_SPIKE_THRESHOLD_PERCENT = 0.35;

export type TickerTelegraphDirection = "up" | "down";

export type TickerSpikeCandidate = {
  symbol: string;
  changePercent: number;
  direction: TickerTelegraphDirection;
};

export type SpikeArmState = {
  armed: boolean;
  lastFiredAt: number;
};

type PctTicker = { symbol: string; changePercent: number | null };

export function listDatabentoSpikes(
  tickers: PctTicker[],
  threshold = TICKER_SPIKE_THRESHOLD_PERCENT,
): TickerSpikeCandidate[] {
  const out: TickerSpikeCandidate[] = [];
  for (const item of tickers) {
    if (!isDatabentoFuturesSymbol(item.symbol)) continue;
    const pct = item.changePercent;
    if (pct == null || Math.abs(pct) < threshold) continue;
    out.push({
      symbol: item.symbol,
      changePercent: pct,
      direction: pct >= 0 ? "up" : "down",
    });
  }
  out.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  return out;
}

/** 동시 다건이면 |%| 최대 1건 */
export function pickDatabentoSpikeLeader(
  tickers: PctTicker[],
  threshold = TICKER_SPIKE_THRESHOLD_PERCENT,
): TickerSpikeCandidate | null {
  return listDatabentoSpikes(tickers, threshold)[0] ?? null;
}

/** 초단위 futures-live 전용 리더 */
export function pickFuturesLiveSpikeLeader(
  tickers: PctTicker[],
): TickerSpikeCandidate | null {
  return pickDatabentoSpikeLeader(tickers, FUTURES_LIVE_SPIKE_THRESHOLD_PERCENT);
}

/**
 * 재진입 arm + 쿨다운. 집합이 비면 arm 해제; 재진입 시에만 fire.
 */
export function evaluateSpikeTelegraphFire(
  hasAnySpike: boolean,
  state: SpikeArmState,
  now: number,
  cooldownMs = TICKER_TELEGRAPH_COOLDOWN_MS,
): { fire: boolean; next: SpikeArmState } {
  if (!hasAnySpike) {
    return { fire: false, next: { armed: false, lastFiredAt: state.lastFiredAt } };
  }
  if (state.armed) {
    return { fire: false, next: state };
  }
  if (now - state.lastFiredAt < cooldownMs) {
    return { fire: false, next: { armed: true, lastFiredAt: state.lastFiredAt } };
  }
  return { fire: true, next: { armed: true, lastFiredAt: now } };
}

let lastBreakingMorseAt = 0;

export function markBreakingMorsePlayed(now = Date.now()) {
  lastBreakingMorseAt = now;
}

export function isBreakingMorseSuppressing(
  now = Date.now(),
  windowMs = BREAKING_MORSE_SUPPRESS_MS,
): boolean {
  return now - lastBreakingMorseAt < windowMs;
}

/** 테스트용 */
export function resetBreakingMorseSuppressForTests() {
  lastBreakingMorseAt = 0;
}
