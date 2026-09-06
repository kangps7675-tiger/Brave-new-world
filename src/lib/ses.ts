/**
 * SES — Sanctions Evasion Stress (제재 회피 강도, 0–100)
 *
 * 지정학 창의 GTS(글로벌 긴장)와 짝을 이루는 두 번째 간판 숫자.
 * 제재 우회·암시장·섀도 플릿 프록시를 corridor-ranks.json에서 집계한다.
 * OFAC 명단·단속 예측이 아니라 관측·가설 강도 지표.
 */

import type { SanctionsEvasionSnapshot } from "@/lib/sanctionsEvasionScore";

export type SesBand = "low" | "moderate" | "elevated" | "high";

export const SES_BLEND = {
  avgWeight: 0.55,
  maxWeight: 0.45,
  flatDeltaEps: 0.05,
} as const;

export const SES = {
  /** @deprecated UI에는 티커 대신 nameKo/nameEn(제재 회피 강도)만 표기 */
  ticker: "SES",
  nameKo: "제재 회피 강도",
  nameEn: "Sanctions evasion intensity",
  shortKo: "제재 회피 강도",
  shortEn: "Sanctions evasion intensity",
  fullKo: "제재 회피 강도",
  fullEn: "Sanctions evasion intensity",
  notOfacKo: "OFAC SDN 명단 전체가 아니라, 공개 무역·선박 프록시의 가설 강도입니다.",
  notOfacEn: "Not a full OFAC SDN list — a proxy stress index from public trade/shipping signals.",
  ethicsKo: "우회·단속 예측이 아닙니다. 가설·미확인 신호의 강도입니다.",
  ethicsEn: "Intensity of hypothetical signals — not a forecast of busts or evasion routes.",
} as const;

export function displaySesScore(score: number | null | undefined): number | null {
  if (score == null || !Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function displaySesDelta(delta: number | null | undefined): number | null {
  if (delta == null || !Number.isFinite(delta)) return null;
  if (Math.abs(delta) < SES_BLEND.flatDeltaEps) return null;
  return Math.round(delta * 10) / 10;
}

export function sesBand(score: number): SesBand {
  if (score >= 75) return "high";
  if (score >= 55) return "elevated";
  if (score >= 35) return "moderate";
  return "low";
}

export function sesBandLabel(band: SesBand, ko: boolean): string {
  if (ko) {
    switch (band) {
      case "high":
        return "고조";
      case "elevated":
        return "상승";
      case "moderate":
        return "보통";
      default:
        return "낮음";
    }
  }
  switch (band) {
    case "high":
      return "High";
    case "elevated":
      return "Elevated";
    case "moderate":
      return "Moderate";
    default:
      return "Low";
  }
}

/** UI 칩·패널 제목 — GTS처럼 티커 없이 풀네임만 */
export function formatSesTitle(ko: boolean): string {
  return ko ? SES.nameKo : SES.nameEn;
}

export function formatSesBriefingLead(
  snapshot: SanctionsEvasionSnapshot,
  lang: "ko" | "en",
): string {
  const score = displaySesScore(snapshot.score) ?? 0;
  const band = sesBandLabel(sesBand(snapshot.score), lang === "ko");
  const delta = displaySesDelta(snapshot.deltaScore);
  if (lang === "ko") {
    if (delta == null) {
      return `오늘 ${SES.nameKo}는 ${score}(${band}). 섀도 플릿·원유·회랑 프록시를 합산한 값입니다.`;
    }
    const dir = delta > 0 ? "올랐" : "내렸";
    return `오늘 ${SES.nameKo}는 ${score}(${band}). 직전 기록보다 ${Math.abs(delta)}점 ${dir}습니다.`;
  }
  if (delta == null) {
    return `Today’s ${SES.nameEn} is ${score} (${band}) — shadow-fleet, crude, and corridor proxies combined.`;
  }
  const dir = delta > 0 ? "up" : "down";
  return `Today’s ${SES.nameEn} is ${score} (${band}) — ${Math.abs(delta)} pts ${dir} vs prior reading.`;
}

export function sesMethodologyProseShort(ko: boolean): string {
  if (ko) {
    return `${SES.fullKo} — sanctions-evasion 회랑의 섀도 플릿·원유 적재·모달 스트레스·합성 score를 0–100으로. ${SES.notOfacKo}`;
  }
  return `${SES.fullEn} — shadow fleet, crude load, modal stress, and composite corridor scores → 0–100. ${SES.notOfacEn}`;
}
