import type { LabelLanguage } from "@/lib/layerPrefs";

/**
 * 해협 리플레이 UI 문자열.
 * 금지어: 때문에|원인|예측|전망|추천|매수|매도
 */
export const STRAIT_REPLAY_I18N = {
  chipLabel: { ko: "해협 이력", en: "Strait history" },
  panelTitle: { ko: "해협 사건 이력 리플레이", en: "Strait event history replay" },
  historyBanner: {
    ko: "과거 이력 기반 · 연관이며 인과 아님 · 표본 {n}",
    en: "History-based · association, not causation · sample {n}",
  },
  sampleBadge: { ko: "샘플", en: "Sample" },
  insufficient: {
    ko: "표본 부족 ({n}건)",
    en: "Insufficient sample ({n})",
  },
  trafficChart: {
    ko: "통행량 변화 (이력)",
    en: "Transit change (history)",
  },
  priceChart: {
    ko: "연동 자산 변화 (FRED 이력)",
    en: "Linked asset change (FRED history)",
  },
  median: { ko: "중앙값", en: "Median" },
  timelineAria: {
    ko: "사건일 전후 14일 통행 스크러버",
    en: "Transit scrubber ±14 days around event",
  },
  calm: {
    ko: "최근 7일 특이 사건 없음 · 마지막 사건 {date}",
    en: "No notable events in last 7 days · last event {date}",
  },
  empty: {
    ko: "이 해협의 검토된 이력이 없습니다.",
    en: "No reviewed history for this strait.",
  },
  loading: { ko: "이력 불러오는 중…", en: "Loading history…" },
  error: { ko: "이력을 불러오지 못했습니다.", en: "Could not load history." },
  close: { ko: "닫기", en: "Close" },
  selectEvent: { ko: "사건 선택", en: "Select event" },
  disclaimer: {
    ko: "과거 이력의 연관 통계만 보여 주며, 미래나 투자 판단을 안내하지 않습니다.",
    en: "Shows historical association statistics only. Does not guide future or investment decisions.",
  },
  attribution: { ko: "출처", en: "Sources" },
  similar: { ko: "유사 과거 사건", en: "Similar past events" },
  straitHormuz: { ko: "호르무즈", en: "Hormuz" },
  straitRedSea: { ko: "수에즈·홍해", en: "Suez · Red Sea" },
  straitMalacca: { ko: "말라카", en: "Malacca" },
} as const;

export type StraitReplayI18nKey = keyof typeof STRAIT_REPLAY_I18N;

export function sr(
  key: StraitReplayI18nKey,
  lang: LabelLanguage,
  vars?: Record<string, string | number>,
): string {
  let s = STRAIT_REPLAY_I18N[key][lang === "en" ? "en" : "ko"];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

/** 금지어 회귀 테스트용 — 모든 로케일 문자열을 평탄하게. */
export function allStraitReplayI18nStrings(): string[] {
  return Object.values(STRAIT_REPLAY_I18N).flatMap((v) => [v.ko, v.en]);
}
