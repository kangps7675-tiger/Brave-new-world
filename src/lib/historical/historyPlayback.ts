/**
 * History scrubber / autoplay pacing.
 *
 * Rule: calendar-even from antiquity → present, with a mild modern boost
 * (international-affairs product). Snapshot density ≠ screen time.
 *
 * Issue clips (today’s news → related nodes) are a separate track and
 * do not use this curve.
 */

export type HistoryPlaybackConfig = {
  yearMin: number;
  yearMax: number;
  /** Inclusive start of “modern” boost band */
  modernStart: number;
  /**
   * Fraction of scrubber/playtime for [yearMin, modernStart).
   * Remaining (1 - preModernShare) goes to [modernStart, yearMax].
   * Pure calendar would give modern ~2–3%; we use ~22% (“조금 더”).
   */
  preModernShare: number;
};

/** Locked product defaults — keep in sync with design §6.7 Playback pacing. */
export const HISTORY_PLAYBACK: HistoryPlaybackConfig = {
  yearMin: -3000,
  yearMax: 2024,
  modernStart: 1900,
  preModernShare: 0.78, // modern ≈ 22% of background playtime
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Map a calendar year → scrubber / playhead position in [0, 1].
 * Pre-1900 is calendar-linear inside its share; 1900→max likewise inside modern share.
 */
export function yearToPlaybackT(
  year: number,
  cfg: HistoryPlaybackConfig = HISTORY_PLAYBACK
): number {
  const y = clamp(year, cfg.yearMin, cfg.yearMax);
  const modernShare = 1 - cfg.preModernShare;
  if (y < cfg.modernStart) {
    const span = cfg.modernStart - cfg.yearMin;
    const u = span <= 0 ? 0 : (y - cfg.yearMin) / span;
    return clamp(u * cfg.preModernShare, 0, 1);
  }
  const span = cfg.yearMax - cfg.modernStart;
  const u = span <= 0 ? 1 : (y - cfg.modernStart) / span;
  return clamp(cfg.preModernShare + u * modernShare, 0, 1);
}

/** Inverse of yearToPlaybackT (continuous years; not snapped to snapshots). */
export function playbackTToYear(
  t: number,
  cfg: HistoryPlaybackConfig = HISTORY_PLAYBACK
): number {
  const x = clamp(t, 0, 1);
  const modernShare = 1 - cfg.preModernShare;
  if (x < cfg.preModernShare) {
    const u = cfg.preModernShare <= 0 ? 0 : x / cfg.preModernShare;
    return cfg.yearMin + u * (cfg.modernStart - cfg.yearMin);
  }
  const u = modernShare <= 0 ? 1 : (x - cfg.preModernShare) / modernShare;
  return cfg.modernStart + u * (cfg.yearMax - cfg.modernStart);
}

/**
 * Relative dwell between two snapshot years for autoplay.
 * Proportional to ΔplaybackT — sparse ancient gaps get more screen time.
 */
export function playbackDwellWeight(
  yearFrom: number,
  yearTo: number,
  cfg: HistoryPlaybackConfig = HISTORY_PLAYBACK
): number {
  return Math.max(0, yearToPlaybackT(yearTo, cfg) - yearToPlaybackT(yearFrom, cfg));
}

/**
 * Normalize dwell weights across an ordered year list (length n → n-1 segment weights,
 * plus a small hold on the last frame using the median segment).
 */
export function playbackSegmentWeights(
  years: number[],
  cfg: HistoryPlaybackConfig = HISTORY_PLAYBACK
): number[] {
  if (years.length === 0) return [];
  if (years.length === 1) return [1];
  const segs: number[] = [];
  for (let i = 0; i < years.length - 1; i++) {
    segs.push(playbackDwellWeight(years[i]!, years[i + 1]!, cfg));
  }
  const positive = segs.filter((w) => w > 0);
  const fallback =
    positive.length > 0
      ? positive.reduce((a, b) => a + b, 0) / positive.length
      : 1;
  const lastHold = fallback;
  const all = [...segs, lastHold];
  const sum = all.reduce((a, b) => a + b, 0) || 1;
  return all.map((w) => w / sum);
}
