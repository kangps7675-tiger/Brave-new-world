import type { StressLevel } from "@/lib/logisticsStress";

/** 초크포인트 글로우·마커 — 물류 스트레스 등급색 */
export function chokeStressRingRgba(level: StressLevel, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  switch (level) {
    case "elevated":
      return `rgba(248, 113, 113, ${a})`; // red-400
    case "watch":
      return `rgba(251, 191, 36, ${a})`; // amber-400
    case "normal":
      return `rgba(52, 211, 153, ${a})`; // emerald-400
    default:
      return `rgba(251, 146, 60, ${a})`; // orange-400 (기존 주황)
  }
}

export function chokeStressHex(level: StressLevel): string {
  switch (level) {
    case "elevated":
      return "#f87171";
    case "watch":
      return "#fbbf24";
    case "normal":
      return "#34d399";
    default:
      return "#fb923c";
  }
}
