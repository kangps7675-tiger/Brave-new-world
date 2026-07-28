/**
 * GTI — Global Tension Index (글로벌 긴장지수)
 * GTS — Global Tension Score (0–100 점수; UI에서는 GTI와 동일 기축)
 *
 * 이 서비스의 단일 기축 통화. 랭킹·게이지·예측·사운드·브리핑은
 * 전부 이 숫자(및 전일 대비 Δ)의 파생상품으로 취급한다.
 *
 * 공식 산출은 cron `upsertWorldTension` (전장 z-score 평균·최고 혼합 0–100).
 * 이 모듈은 브랜드·밴드·매핑·애널리스트 등급만 담당한다.
 *
 * 원유 티커(WTI crude / CL=F)와는 무관 — 과거 브랜드명 WTI(World Tension)와 혼동하지 말 것.
 */

import type { WorldTensionSnapshot } from "@/lib/dailyRanks";

export type GtiSnapshot = WorldTensionSnapshot;

/** 브랜드 표기 — UI·공유·카피의 단일 소스 */
export const GTI = {
  ticker: "GTI",
  /** 점수 약칭 (동일 기축 · 카피용) */
  scoreTicker: "GTS",
  nameKo: "긴장지수",
  nameEn: "Tension Index",
  shortKo: "긴장지수",
  shortEn: "Tension",
  /** 풀네임 — 문서·툴팁 */
  fullKo: "글로벌 긴장지수",
  fullEn: "Global Tension Index",
  scoreNameKo: "글로벌 긴장 점수",
  scoreNameEn: "Global Tension Score",
  entityId: "global",
  subjectKind: "world" as const,
  hookKo: "전 세계 분쟁을 하나의 숫자로. 오늘의 긴장지수(GTI)를 맞혀보세요.",
  hookEn: "One number for global conflict. Guess today’s GTI.",
  ethicsKo: "지표만 맞춥니다. 공습·인명 예측이 아닙니다.",
  ethicsEn: "Index only — not raids or casualties.",
} as const;

/** @deprecated use GTI */
export const WTI = GTI;

export type GtiBand = "calm" | "elevated" | "high" | "critical";
/** @deprecated use GtiBand */
export type WtiBand = GtiBand;

/** 점수 → 긴장 밴드 (사운드·UI 공통) */
export function gtiBand(score: number): GtiBand {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 35) return "elevated";
  return "calm";
}

/** @deprecated use gtiBand */
export const wtiBand = gtiBand;

export function gtiBandLabel(band: GtiBand, ko: boolean): string {
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

/** @deprecated use gtiBandLabel */
export const wtiBandLabel = gtiBandLabel;

/**
 * GTI → 긴장 앰비언트 볼륨 배율.
 * 40 근처 잔잔(~0.55), 75+ 급박(~1.35). BGM 강도에도 동일 곡선 사용.
 */
export function gtiAmbientVolumeScale(score: number | null | undefined): number {
  if (score == null || !Number.isFinite(score)) return 1;
  const t = Math.max(0, Math.min(100, score)) / 100;
  return Math.round((0.45 + t * 1.05) * 100) / 100;
}

/** @deprecated use gtiAmbientVolumeScale */
export const wtiAmbientVolumeScale = gtiAmbientVolumeScale;

/** BGM 채널용 — 동일 곡선, 상한만 약간 낮춤 */
export function gtiBgmVolumeScale(score: number | null | undefined): number {
  return Math.min(1.25, gtiAmbientVolumeScale(score) * 0.92);
}

/** @deprecated use gtiBgmVolumeScale */
export const wtiBgmVolumeScale = gtiBgmVolumeScale;

export function formatGtiTitle(ko: boolean, opts?: { ticker?: boolean }): string {
  const withTicker = opts?.ticker !== false;
  if (ko) {
    return withTicker ? `긴장지수 (${GTI.ticker})` : "긴장지수";
  }
  return withTicker ? `Tension index (${GTI.ticker})` : "Tension index";
}

/** @deprecated use formatGtiTitle */
export const formatWtiTitle = formatGtiTitle;

/** 등불·브리핑 리드 문장 — "오늘 GTI 67, 어제보다 왜" */
export function formatGtiBriefingLead(
  snap: GtiSnapshot,
  lang: "ko" | "en",
): string {
  const score = Math.round(snap.score);
  const band = gtiBandLabel(gtiBand(snap.score), lang === "ko");
  const delta = snap.deltaScore;
  if (lang === "ko") {
    if (delta == null || Math.abs(delta) < 0.05) {
      return `오늘의 ${GTI.ticker}는 ${score}(${band}). 전일과 거의 같은 수준입니다.`;
    }
    const dir = delta > 0 ? "올랐" : "내렸";
    const mag = Math.abs(Math.round(delta * 10) / 10);
    return `오늘의 ${GTI.ticker}는 ${score}(${band}). 어제보다 ${mag}포인트 ${dir}습니다.`;
  }
  if (delta == null || Math.abs(delta) < 0.05) {
    return `Today’s ${GTI.ticker} is ${score} (${band}) — roughly flat vs yesterday.`;
  }
  const dir = delta > 0 ? "up" : "down";
  const mag = Math.abs(Math.round(delta * 10) / 10);
  return `Today’s ${GTI.ticker} is ${score} (${band}) — ${mag} pts ${dir} from yesterday.`;
}

/** @deprecated use formatGtiBriefingLead */
export const formatWtiBriefingLead = formatGtiBriefingLead;

/** 메인 예측 문제 카피 (전장별은 보너스) */
export function gtiPredictQuestion(): { ko: string; en: string } {
  return {
    ko: `내일 이 시간, ${formatGtiTitle(true)}는 오를까 내릴까?`,
    en: `By this time tomorrow, will the ${formatGtiTitle(false)} go UP or DOWN?`,
  };
}

/** @deprecated use gtiPredictQuestion */
export const wtiPredictQuestion = gtiPredictQuestion;

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
  // 고변동일 보너스 자리는 나중에 Δ|GTI| 가중으로 채움 — 지금은 누적 적중률
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
