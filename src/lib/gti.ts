/**
 * GTI — Global Tension Index (글로벌 긴장지수)
 * GTS — Global Tension Score (0–100 점수; UI에서는 GTI와 동일 기축)
 *
 * 이 서비스의 단일 기축 통화. 랭킹·게이지·예측·사운드·브리핑은
 * 전부 이 숫자(및 전일 대비 Δ)의 파생상품으로 취급한다.
 *
 * 공식 산출은 cron `upsertWorldTension` (전장 z-score 평균·최고 혼합 0–100).
 * 이 모듈은 브랜드·밴드·**표시 반올림**·매핑·애널리스트 등급을 담당한다.
 * UI 컴포넌트는 score/delta를 직접 Math.round 하지 말고 아래 display* 헬퍼만 쓴다.
 *
 * 원유 티커(WTI crude / CL=F)와는 무관 — 과거 브랜드명 WTI(World Tension)와 혼동하지 말 것.
 */

import type { WorldTensionSnapshot } from "@/lib/dailyRanks";

export type GtiSnapshot = WorldTensionSnapshot;

/**
 * cron `upsertWorldTension` / `computeWorldTension` 과 동일 축.
 * 클라이언트 fallback(`deriveWorldTensionFromTheaters`)도 이 가중치를 써야 한다.
 */
export const GTI_BLEND = {
  avgWeight: 0.55,
  maxWeight: 0.45,
  /** |Δ| 미만이면 UI에서 “평탄” */
  flatDeltaEps: 0.05,
  /** 전장 베이스라인 창 (일) — cron BASELINE_DAYS */
  baselineDays: 90,
  /** 전일 EMA 혼합 — cron EMA_TODAY / EMA_PREV */
  emaToday: 0.55,
  emaPrev: 0.45,
  /** 하루 최대 상대 변동 — cron MAX_DAY_DELTA_RATIO */
  maxDayDeltaRatio: 0.4,
} as const;

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

/**
 * UI 간판 점수 — 0–100 정수.
 * 칩·히어로·브리핑·공유 카드가 반드시 이 함수만 사용한다.
 */
export function displayGtiScore(score: number | null | undefined): number | null {
  if (score == null || !Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * UI 전일대비 Δ — 소수 1자리. 평탄(|Δ|<eps)이면 null.
 * 칩이 정수로 반올림하면 브리핑(1.9)과 어긋난다(계획의 “2 vs 1.9”).
 */
export function displayGtiDelta(delta: number | null | undefined): number | null {
  if (delta == null || !Number.isFinite(delta)) return null;
  if (Math.abs(delta) < GTI_BLEND.flatDeltaEps) return null;
  return Math.round(delta * 10) / 10;
}

/** 저장·API 정규화 (소수 1자리) — dailyRanks 페이로드와 맞춤 */
export function normalizeGtiScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/** 전장 점수 배열 → 혼합 GTI (stabilize/EMA 전 raw). cron computeWorldTension 과 동일. */
export function blendTheaterScoresToGti(theaterScores: number[]): number {
  const scores = theaterScores.filter((n) => Number.isFinite(n) && n > 0);
  if (scores.length === 0) return 0;
  const avg = scores.reduce((sum, n) => sum + n, 0) / scores.length;
  const max = Math.max(...scores);
  const blended = GTI_BLEND.avgWeight * avg + GTI_BLEND.maxWeight * max;
  return Math.round(Math.max(0, Math.min(100, blended)) * 100) / 100;
}

export function formatGtiDeltaLabel(
  delta: number | null | undefined,
  lang: "ko" | "en" = "ko",
): string {
  const rounded = displayGtiDelta(delta);
  if (rounded == null) {
    return lang === "en" ? "vs yesterday —" : "어제 대비 —";
  }
  const sign = rounded > 0 ? "+" : "";
  return lang === "en"
    ? `vs yesterday ${sign}${rounded}`
    : `어제보다 ${sign}${rounded}`;
}

export type GtiBand = "calm" | "elevated" | "high" | "critical";
/** @deprecated use GtiBand */
export type WtiBand = GtiBand;

/** 점수 → 긴장 밴드 (사운드·UI 공통) — raw score 기준 (표시 반올림 전) */
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
  const score = displayGtiScore(snap.score) ?? 0;
  const band = gtiBandLabel(gtiBand(snap.score), lang === "ko");
  const delta = displayGtiDelta(snap.deltaScore);
  if (lang === "ko") {
    if (delta == null) {
      return `오늘의 ${GTI.ticker}는 ${score}(${band}). 전일과 거의 같은 수준입니다.`;
    }
    const dir = delta > 0 ? "올랐" : "내렸";
    const mag = Math.abs(delta);
    return `오늘의 ${GTI.ticker}는 ${score}(${band}). 어제보다 ${mag}포인트 ${dir}습니다.`;
  }
  if (delta == null) {
    return `Today’s ${GTI.ticker} is ${score} (${band}) — roughly flat vs yesterday.`;
  }
  const dir = delta > 0 ? "up" : "down";
  const mag = Math.abs(delta);
  return `Today’s ${GTI.ticker} is ${score} (${band}) — ${mag} pts ${dir} from yesterday.`;
}

/** @deprecated use formatGtiBriefingLead */
export const formatWtiBriefingLead = formatGtiBriefingLead;

/** Methodology 패널용 — 산출식 한 장 (한·영) */
export function gtiMethodologyCopy(lang: "ko" | "en"): {
  title: string;
  paragraphs: string[];
} {
  if (lang === "en") {
    return {
      title: `${GTI.ticker} — how the index is built`,
      paragraphs: [
        `${GTI.fullEn} (${GTI.ticker}) is a 0–100 headline from theater tension ranks (not oil ticker WTI).`,
        `Each theater gets a baseline z-score over ~${GTI_BLEND.baselineDays} UTC days from open signals (GDELT mentions, map points, FIRMS fires, telegram volume, air-raid scores), then blended soft/hard weights.`,
        `World score before smoothing: ${GTI_BLEND.avgWeight}×theater average + ${GTI_BLEND.maxWeight}×theater max (clamped 0–100).`,
        `Day-over-day: EMA ${GTI_BLEND.emaToday} today / ${GTI_BLEND.emaPrev} previous, with a daily move cap (~${Math.round(GTI_BLEND.maxDayDeltaRatio * 100)}% of prior level, min floor).`,
        `UI shows the score as a whole number; day change (Δ) to one decimal. Same snapshot feeds the top chip, daily rank hero, parchment briefs, and share cards.`,
        `Not a raid/casualty forecast — interpretive tension only.`,
      ],
    };
  }
  return {
    title: `${GTI.ticker} — 산출식`,
    paragraphs: [
      `${GTI.fullKo}(${GTI.ticker})는 전장 긴장 랭킹을 하나의 0–100 간판 숫자로 묶은 지표입니다 (원유 티커 WTI와 무관).`,
      `전장별 점수는 공개 신호(GDELT 멘션·지도 포인트·FIRMS 화재·텔레그램 분량·공습 점수 등)를 약 ${GTI_BLEND.baselineDays}일(UTC) 베이스라인 대비 z-score로 만든 뒤 soft/hard 가중합니다.`,
      `세계 점수(스무딩 전): 전장 평균×${GTI_BLEND.avgWeight} + 전장 최고×${GTI_BLEND.maxWeight} (0–100 클램프).`,
      `일간: 오늘 EMA ${GTI_BLEND.emaToday} / 전일 ${GTI_BLEND.emaPrev}, 하루 변동 상한(전일 대비 약 ${Math.round(GTI_BLEND.maxDayDeltaRatio * 100)}%·하한 있음).`,
      `화면 표시: 점수는 정수, 전일대비(Δ)는 소수 1자리. 우상단 칩·일일 랭킹 히어로·등불 브리핑·공유 카드가 같은 스냅샷을 씁니다.`,
      `공습·인명 예측이 아닙니다. 해석용 긴장 지표입니다.`,
    ],
  };
}

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
