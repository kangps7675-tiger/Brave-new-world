/**
 * 긴장도 신호 분해 → 비전공자용 한 줄.
 * σ / z-score 등 통계 기호는 UI에 쓰지 않는다.
 */

import { GTI_BLEND } from "@/lib/gti";

export type TensionSignalKey =
  | "mentions"
  | "points"
  | "fireCount"
  | "telegramCount"
  | "airRaidScore";

type SignalMeta = {
  key: TensionSignalKey;
  labelKo: string;
  labelEn: string;
};

const SIGNALS: SignalMeta[] = [
  { key: "fireCount", labelKo: "위성 화재", labelEn: "satellite hotspots" },
  { key: "mentions", labelKo: "뉴스 언급", labelEn: "news mentions" },
  { key: "points", labelKo: "관련 기사", labelEn: "news coverage" },
  { key: "telegramCount", labelKo: "현장 경보", labelEn: "field alerts" },
  { key: "airRaidScore", labelKo: "공습 경보", labelEn: "air-raid alerts" },
];

/** 기준 기간 대비 얼마나 튀었는지 — 숫자·σ 없이 */
function intensityPhrase(
  z: number,
  lang: "ko" | "en",
): string {
  const abs = Math.abs(z);
  const up = z > 0;
  const days = GTI_BLEND.baselineDays;
  if (lang === "en") {
    if (abs >= 2) return up ? `far above the ${days}-day average` : `far below the ${days}-day average`;
    if (abs >= 1.2) return up ? `well above the ${days}-day average` : `well below the ${days}-day average`;
    if (abs >= 0.7) return up ? `above the ${days}-day average` : `below the ${days}-day average`;
    return up ? `a bit above the ${days}-day average` : `a bit below the ${days}-day average`;
  }
  if (abs >= 2) return up ? `최근 ${days}일 평균보다 훨씬 많음` : `최근 ${days}일 평균보다 훨씬 적음`;
  if (abs >= 1.2) return up ? `최근 ${days}일 평균보다 많음` : `최근 ${days}일 평균보다 적음`;
  if (abs >= 0.7) return up ? `최근 ${days}일 평균보다 다소 많음` : `최근 ${days}일 평균보다 다소 적음`;
  return up ? `최근 ${days}일 평균보다 살짝 많음` : `최근 ${days}일 평균보다 살짝 적음`;
}

export function extractTensionZScores(
  detail: Record<string, unknown> | null | undefined,
): Partial<Record<TensionSignalKey, number>> | null {
  if (!detail || typeof detail !== "object") return null;
  const components =
    detail.components && typeof detail.components === "object"
      ? (detail.components as Record<string, unknown>)
      : null;
  const raw =
    (detail.zScores && typeof detail.zScores === "object"
      ? (detail.zScores as Record<string, unknown>)
      : null) ??
    (components?.zScores && typeof components.zScores === "object"
      ? (components.zScores as Record<string, unknown>)
      : null);
  if (!raw) return null;

  const out: Partial<Record<TensionSignalKey, number>> = {};
  for (const { key } of SIGNALS) {
    const n = Number(raw[key]);
    if (Number.isFinite(n)) out[key] = n;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export type TensionDriverLineOptions = {
  /** 상승 구간이면 양수 신호, 완화면 음수 신호 우선 */
  rising?: boolean;
  /** 최대 몇 개 신호 (기본 2) */
  max?: number;
  /** 이 절대값 미만은 무시 (기본 0.7 ≈ ‘눈에 띄는’ 이탈) */
  minAbs?: number;
};

/**
 * 예: "주요인: 위성 화재(평소보다 훨씬 많음), 뉴스 언급(평소보다 많음)"
 * 눈에 띄는 신호가 없으면 null.
 */
export function formatTensionDriverLine(
  detail: Record<string, unknown> | null | undefined,
  lang: "ko" | "en",
  options: TensionDriverLineOptions = {},
): string | null {
  const zScores = extractTensionZScores(detail);
  if (!zScores) return null;

  const rising = options.rising !== false;
  const max = Math.min(3, Math.max(1, options.max ?? 2));
  const minAbs = options.minAbs ?? 0.7;

  const ranked = SIGNALS.map((meta) => {
    const z = zScores[meta.key];
    return z == null || !Number.isFinite(z) ? null : { meta, z };
  })
    .filter((row): row is { meta: SignalMeta; z: number } => row != null)
    .filter((row) => Math.abs(row.z) >= minAbs)
    .filter((row) => (rising ? row.z > 0 : row.z < 0))
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
    .slice(0, max);

  if (ranked.length === 0) return null;

  const bits = ranked.map(({ meta, z }) => {
    const label = lang === "en" ? meta.labelEn : meta.labelKo;
    const how = intensityPhrase(z, lang);
    return lang === "en" ? `${label} (${how})` : `${label}(${how})`;
  });

  if (lang === "en") {
    return rising
      ? `Mainly: ${bits.join("; ")}`
      : `Easing: ${bits.join("; ")}`;
  }
  return rising ? `주요인: ${bits.join(", ")}` : `완화 요인: ${bits.join(", ")}`;
}

/** Sitrep / telegraph용 짧은 접미 — " · 주요인: …" 또는 빈 문자열 */
export function tensionDriverSuffix(
  detail: Record<string, unknown> | null | undefined,
  lang: "ko" | "en",
  options: TensionDriverLineOptions = {},
): string {
  const line = formatTensionDriverLine(detail, lang, options);
  return line ? ` · ${line}` : "";
}
