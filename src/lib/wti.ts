/**
 * WTI — World Tension Index (세계 긴장도 지수)
 *
 * 이 서비스의 단일 기축 통화. 랭킹·게이지·예측·사운드·브리핑은
 * 전부 이 숫자(및 전일 대비 Δ)의 파생상품으로 취급한다.
 *
 * 공식 산출은 cron `upsertWorldTension` (전장 z-score 평균·최고 혼합 0–100).
 * 이 모듈은 브랜드·밴드·매핑·애널리스트 등급만 담당한다.
 */

import type { WorldTensionSnapshot } from "@/lib/dailyRanks";

export type WtiSnapshot = WorldTensionSnapshot;

/** 브랜드 표기 — UI·공유·카피의 단일 소스 */
export const WTI = {
  ticker: "WTI",
  nameKo: "세계 긴장도 지수",
  nameEn: "World Tension Index",
  shortKo: "세계 긴장도",
  shortEn: "World Tension",
  entityId: "global",
  subjectKind: "world" as const,
  hookKo: "전 세계 분쟁을 하나의 숫자로. 오늘의 세계 긴장도를 맞혀보세요.",
  hookEn: "One number for global conflict. Guess today’s World Tension.",
  ethicsKo: "지표만 맞춥니다. 공습·인명 예측이 아닙니다.",
  ethicsEn: "Index only — not raids or casualties.",
} as const;

export type WtiBand = "calm" | "elevated" | "high" | "critical";

/** 점수 → 긴장 밴드 (사운드·UI 공통) */
export function wtiBand(score: number): WtiBand {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 35) return "elevated";
  return "calm";
}

export function wtiBandLabel(band: WtiBand, ko: boolean): string {
  if (ko) {
    switch (band) {
      case "calm":
        return "잔잔";
      case "elevated":
        return "상승";
      case "high":
        return "고조";
      case "critical":
        return "급박";
    }
  }
  switch (band) {
    case "calm":
      return "Calm";
    case "elevated":
      return "Elevated";
    case "high":
      return "High";
    case "critical":
      return "Critical";
  }
}

/**
 * WTI → 긴장 앰비언트 볼륨 배율.
 * 40 근처 잔잔(~0.55), 75+ 급박(~1.35). BGM 강도에도 동일 곡선 사용.
 */
export function wtiAmbientVolumeScale(score: number | null | undefined): number {
  if (score == null || !Number.isFinite(score)) return 1;
  const t = Math.max(0, Math.min(100, score)) / 100;
  return Math.round((0.45 + t * 1.05) * 100) / 100;
}

/** BGM 채널용 — 동일 곡선, 상한만 약간 낮춤 */
export function wtiBgmVolumeScale(score: number | null | undefined): number {
  return Math.min(1.25, wtiAmbientVolumeScale(score) * 0.92);
}

export function formatWtiTitle(ko: boolean, opts?: { ticker?: boolean }): string {
  const withTicker = opts?.ticker !== false;
  if (ko) {
    return withTicker ? `${WTI.nameKo} (${WTI.ticker})` : WTI.nameKo;
  }
  return withTicker ? `${WTI.nameEn} (${WTI.ticker})` : WTI.nameEn;
}

/** 등불·브리핑 리드 문장 — "오늘 WTI 67, 어제보다 왜" */
export function formatWtiBriefingLead(
  snap: WtiSnapshot,
  lang: "ko" | "en",
): string {
  const score = Math.round(snap.score);
  const band = wtiBandLabel(wtiBand(snap.score), lang === "ko");
  const delta = snap.deltaScore;
  if (lang === "ko") {
    if (delta == null || Math.abs(delta) < 0.05) {
      return `오늘의 ${WTI.ticker}는 ${score}(${band}). 전일과 거의 같은 수준입니다.`;
    }
    const dir = delta > 0 ? "올랐" : "내렸";
    const mag = Math.abs(Math.round(delta * 10) / 10);
    return `오늘의 ${WTI.ticker}는 ${score}(${band}). 어제보다 ${mag}포인트 ${dir}습니다.`;
  }
  if (delta == null || Math.abs(delta) < 0.05) {
    return `Today’s ${WTI.ticker} is ${score} (${band}) — roughly flat vs yesterday.`;
  }
  const dir = delta > 0 ? "up" : "down";
  const mag = Math.abs(Math.round(delta * 10) / 10);
  return `Today’s ${WTI.ticker} is ${score} (${band}) — ${mag} pts ${dir} from yesterday.`;
}

/** 메인 예측 문제 카피 (전장별은 보너스) */
export function wtiPredictQuestion(): { ko: string; en: string } {
  return {
    ko: `내일 이 시간, ${formatWtiTitle(true)}는 오를까 내릴까?`,
    en: `By this time tomorrow, will the ${formatWtiTitle(false)} go UP or DOWN?`,
  };
}

/** 개인 애널리스트 등급 — 누적 적중률·시도 수 */
export type AnalystTierId = "rookie" | "analyst" | "senior" | "chief";

export type AnalystStats = {
  hits: number;
  attempts: number;
  streak: number;
};

export function analystTierFromStats(stats: AnalystStats): AnalystTierId {
  const { hits, attempts, streak } = stats;
  if (attempts < 3) return "rookie";
  const rate = attempts > 0 ? hits / attempts : 0;
  // 고변동일 보너스 자리는 나중에 Δ|WTI| 가중으로 채움 — 지금은 누적 적중률
  if (rate >= 0.7 && attempts >= 10) return "chief";
  if ((rate >= 0.55 && attempts >= 5) || streak >= 5) return "senior";
  if (attempts >= 5 || streak >= 2) return "analyst";
  return "rookie";
}

export function analystTierLabel(tier: AnalystTierId, ko: boolean): string {
  if (ko) {
    switch (tier) {
      case "rookie":
        return "루키 애널리스트";
      case "analyst":
        return "애널리스트";
      case "senior":
        return "시니어 애널리스트";
      case "chief":
        return "상황실장";
    }
  }
  switch (tier) {
    case "rookie":
      return "Rookie analyst";
    case "analyst":
      return "Analyst";
    case "senior":
      return "Senior analyst";
    case "chief":
      return "Situation-room chief";
  }
}

export function analystHitRatePct(stats: AnalystStats): number | null {
  if (stats.attempts <= 0) return null;
  return Math.round((stats.hits / stats.attempts) * 1000) / 10;
}
