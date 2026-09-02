/**
 * GTS — Global Tension Score (글로벌 긴장 점수, 0–100)
 *
 * 개인용 지정학 터미널의 단일 기축. IEP Global Terrorism Index(GTI)와 무관.
 * 랭킹·게이지·감각 연습·사운드·브리핑은 전부 이 숫자(및 전일 대비 Δ)의 파생.
 *
 * 공식 산출은 cron `upsertWorldTension` (전장 z-score 평균·최고 혼합 0–100).
 * 이 모듈은 브랜드·밴드·**표시 반올림**·매핑·관측 등급을 담당한다.
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
export const GTS = {
  ticker: "GTS",
  scoreTicker: "GTS",
  nameKo: "긴장지수",
  nameEn: "Tension score",
  shortKo: "긴장지수",
  shortEn: "Tension",
  fullKo: "글로벌 긴장 점수",
  fullEn: "Global Tension Score",
  scoreNameKo: "글로벌 긴장 점수",
  scoreNameEn: "Global Tension Score",
  /** IEP 테러 지수와 구분 — 툴팁·출처 패널용 */
  notIepKo: "IEP 테러 지수(GTI)와 다른, 이 서비스만의 지표입니다.",
  notIepEn: "Not the IEP Global Terrorism Index (GTI) — our own score.",
  entityId: "global",
  subjectKind: "world" as const,
  hookKo: "오늘 세계가 어제보다 더 시끄러울까요? GTS 방향을 한 번 찍어 보세요.",
  hookEn: "Will the world feel louder tomorrow? Take a quick read on GTS.",
  ethicsKo: "감각 연습용입니다. 공습·인명 예측이 아닙니다.",
  ethicsEn: "Intuition practice — not raids or casualties.",
} as const;

/** @deprecated import GTS — kept for legacy imports */
export const GTI = GTS;

/** @deprecated use GTS */
export const WTI = GTS;

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
    return withTicker ? `긴장지수 · ${GTS.ticker}` : "긴장지수";
  }
  return withTicker ? `Tension · ${GTS.ticker}` : "Tension score";
}

/** @deprecated use formatGtiTitle */
export const formatWtiTitle = formatGtiTitle;

/** 등불·브리핑 리드 문장 — "오늘 GTS 67, 어제보다 왜" */
export function formatGtiBriefingLead(
  snap: GtiSnapshot,
  lang: "ko" | "en",
): string {
  const score = displayGtiScore(snap.score) ?? 0;
  const band = gtiBandLabel(gtiBand(snap.score), lang === "ko");
  const delta = displayGtiDelta(snap.deltaScore);
  if (lang === "ko") {
    if (delta == null) {
      return `오늘 ${GTS.ticker}는 ${score}(${band}). 전일과 거의 같은 수준입니다.`;
    }
    const dir = delta > 0 ? "올랐" : "내렸";
    const mag = Math.abs(delta);
    return `오늘 ${GTS.ticker}는 ${score}(${band}). 어제보다 ${mag}포인트 ${dir}습니다.`;
  }
  if (delta == null) {
    return `Today’s ${GTS.ticker} is ${score} (${band}) — roughly flat vs yesterday.`;
  }
  const dir = delta > 0 ? "up" : "down";
  const mag = Math.abs(delta);
  return `Today’s ${GTS.ticker} is ${score} (${band}) — ${mag} pts ${dir} from yesterday.`;
}

/** @deprecated use formatGtiBriefingLead */
export const formatWtiBriefingLead = formatGtiBriefingLead;

/** UI·툴팁용 — 20대도 읽을 수 있는 줄글 (계수 없음) */
export function gtiMethodologyProse(lang: "ko" | "en"): {
  title: string;
  paragraphs: string[];
} {
  const days = GTI_BLEND.baselineDays;
  if (lang === "en") {
    return {
      title: `${GTS.ticker} — what this number is`,
      paragraphs: [
        `${GTS.fullEn} (${GTS.ticker}) is one 0–100 number for how loud conflict zones feel worldwide. ${GTS.notIepEn}`,
        `We pull public signals only: news mentions (GDELT), satellite fire hotspots (NASA FIRMS), field alerts (Telegram and similar), and air-raid alert feeds.`,
        `For each theater we compare today with the last ~${days} days — “far above average” or “a bit below.” Those regional scores roll up into one world score; the loudest theater weighs heavily.`,
        `The score moves smoothly day to day so one headline does not whipsaw the dial. Not oil ticker WTI. Not a raid or casualty forecast — a personal situational-awareness summary.`,
      ],
    };
  }
  return {
    title: `${GTS.ticker} — 이 숫자는 뭔가요`,
    paragraphs: [
      `${GTS.fullKo}(${GTS.ticker})는 전 세계 분쟁·긴장 지역이 지금 얼마나 시끄러운지를 0~100 숫자 하나로 보여 줍니다. ${GTS.notIepKo}`,
      `쓰는 데이터는 전부 공개입니다. 뉴스 언급(GDELT), 위성 화재(NASA FIRMS), 현장 경보(텔레그램 등), 공습·미사일 경보 피드.`,
      `지역마다 최근 ${days}일 평소와 오늘을 비교합니다. “뉴스가 평소보다 훨씬 많다”처럼 평소 대비 얼마나 튀었는지로 지역 점수를 만들고, 여러 지역을 합쳐 세계 점수 하나로 올립니다. 가장 시끄러운 지역이 크게 반영됩니다.`,
      `하루하루 숫자가 너무 튀지 않게 조금씩 부드럽게 바꿉니다. 원유 가격(WTI)과 무관합니다. 공습·인명 예측이 아니라, 개인용으로 세계 소음을 한눈에 보는 요약입니다.`,
    ],
  };
}

/** 칩·히어로 fallback 한 줄 */
export function gtiMethodologyProseShort(lang: "ko" | "en"): string {
  if (lang === "en") {
    return `${GTS.fullEn} (${GTS.ticker}) — public news, fires, and alerts vs a ~${GTI_BLEND.baselineDays}-day baseline. Not IEP GTI or oil WTI.`;
  }
  return `${GTS.fullKo}(${GTS.ticker}) — 뉴스·위성 화재·현장 경보를 최근 ${GTI_BLEND.baselineDays}일 평소와 비교한 점수. IEP 테러 지수·원유 WTI와 무관.`;
}

/** Methodology 패널용 — 산출식 (접기 섹션) */
export function gtiMethodologyCopy(lang: "ko" | "en"): {
  title: string;
  paragraphs: string[];
} {
  if (lang === "en") {
    return {
      title: `${GTS.ticker} — formula (technical)`,
      paragraphs: [
        `${GTS.fullEn} (${GTS.ticker}) headline from theater tension ranks (not oil ticker WTI).`,
        `Each theater: baseline z-score over ~${GTI_BLEND.baselineDays} UTC days from open signals (GDELT mentions, map points, FIRMS fires, telegram volume, air-raid scores), then blended soft/hard weights.`,
        `World score before smoothing: ${GTI_BLEND.avgWeight}×theater average + ${GTI_BLEND.maxWeight}×theater max (clamped 0–100).`,
        `Day-over-day: EMA ${GTI_BLEND.emaToday} today / ${GTI_BLEND.emaPrev} previous, daily move cap (~${Math.round(GTI_BLEND.maxDayDeltaRatio * 100)}% of prior level, min floor).`,
        `UI: whole-number score; Δ to one decimal. Same snapshot for chip, daily hero, briefs, share cards.`,
      ],
    };
  }
  return {
    title: `${GTS.ticker} — 산출식 (자세히)`,
    paragraphs: [
      `${GTS.fullKo}(${GTS.ticker}) — 전장 긴장 랭킹을 0–100 간판 숫자로 (원유 WTI와 무관).`,
      `전장별: 공개 신호(GDELT·지도·FIRMS·텔레그램·공습 점수)를 ${GTI_BLEND.baselineDays}일(UTC) 베이스라인 z-score → soft/hard 가중.`,
      `세계(스무딩 전): 전장 평균×${GTI_BLEND.avgWeight} + 전장 최고×${GTI_BLEND.maxWeight} (0–100).`,
      `일간: EMA ${GTI_BLEND.emaToday}/${GTI_BLEND.emaPrev}, 하루 변동 상한 ~${Math.round(GTI_BLEND.maxDayDeltaRatio * 100)}%.`,
      `표시: 점수 정수, Δ 소수 1자리. 칩·랭킹·브리핑·공유 카드 동일 스냅샷.`,
    ],
  };
}

/** 감각 연습 질문 (전장별은 보너스) */
export function gtiPredictQuestion(): { ko: string; en: string } {
  return {
    ko: `내일 이 시간, ${formatGtiTitle(true)}는 어제보다 올라갈까요, 내려갈까요?`,
    en: `By this time tomorrow, will ${formatGtiTitle(false)} be UP or DOWN vs today?`,
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
        return "관측 입문";
      case "analyst":
        return "관측자";
      case "senior":
        return "선임 관측자";
      case "chief":
        return "수석 관측자";
    }
  }
  switch (tier) {
    case "rookie":
      return "Observer";
    case "analyst":
      return "Watch analyst";
    case "senior":
      return "Senior observer";
    case "chief":
      return "Lead observer";
  }
}

export function analystHitRatePct(stats: AnalystStats): number | null {
  if (stats.attempts <= 0) return null;
  return Math.round((stats.hits / stats.attempts) * 1000) / 10;
}
