/**
 * 서태평양 주간 함정 이동기 — 해군(국가)별 실루엣 색 (확정).
 * solid fill 기준. AIS 군함 마커와는 별개.
 *
 * USN=금 · JMSDF=파랑 · PLAN=빨강 · ROKN=초록 · RU=주황 · 미상=회색
 * CN / CN-CG는 PLAN 계열로 매핑.
 */

export const SHIP_NAVY_COLORS = {
  USN: "#d4a017",
  JMSDF: "#3b82f6",
  PLAN: "#ef4444",
  CN: "#ef4444",
  "CN-CG": "#f43f5e",
  RU: "#f97316",
  ROKN: "#22c55e",
  UNKNOWN: "#94a3b8",
} as const;

export type ShipNavyColorCode = keyof typeof SHIP_NAVY_COLORS;

export type ShipNavyLegendEntry = {
  code: ShipNavyColorCode;
  color: string;
  labelKo: string;
  labelEn: string;
};

/** 패널 범례용 (주요 해군만) */
export const SHIP_NAVY_LEGEND: readonly ShipNavyLegendEntry[] = [
  { code: "USN", color: SHIP_NAVY_COLORS.USN, labelKo: "미 해군", labelEn: "U.S. Navy" },
  { code: "JMSDF", color: SHIP_NAVY_COLORS.JMSDF, labelKo: "해상자위대", labelEn: "JMSDF" },
  { code: "PLAN", color: SHIP_NAVY_COLORS.PLAN, labelKo: "중국 해군", labelEn: "PLA Navy" },
  { code: "ROKN", color: SHIP_NAVY_COLORS.ROKN, labelKo: "한국 해군", labelEn: "ROK Navy" },
  { code: "RU", color: SHIP_NAVY_COLORS.RU, labelKo: "러시아 해군", labelEn: "Russian Navy" },
  { code: "UNKNOWN", color: SHIP_NAVY_COLORS.UNKNOWN, labelKo: "기타·미상", labelEn: "Other / unknown" },
] as const;

function normalizeNavyCode(code: string | null | undefined): string {
  return (code || "").trim().toUpperCase();
}

/** 실루엣 fill · 펄스 · 경로 accent */
export function shipNavyFillColor(navyCode: string | null | undefined): string {
  const code = normalizeNavyCode(navyCode);
  if (code === "USN" || code === "US") return SHIP_NAVY_COLORS.USN;
  if (code === "JMSDF" || code === "JPN") return SHIP_NAVY_COLORS.JMSDF;
  if (code === "PLAN" || code === "CN" || code === "PRC") return SHIP_NAVY_COLORS.PLAN;
  if (code === "CN-CG" || code === "CCG") return SHIP_NAVY_COLORS["CN-CG"];
  if (code === "RU" || code === "RFS" || code === "RFN") return SHIP_NAVY_COLORS.RU;
  if (code === "ROKN" || code === "ROK" || code === "KR") return SHIP_NAVY_COLORS.ROKN;
  return SHIP_NAVY_COLORS.UNKNOWN;
}

/** 펄스 링용 반투명 */
export function shipNavyPulseColor(navyCode: string | null | undefined): string {
  const hex = shipNavyFillColor(navyCode);
  const n = Number.parseInt(hex.slice(1), 16);
  if (!Number.isFinite(n)) return "rgba(148, 163, 184, 0.5)";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, 0.62)`;
}

/** 추정 경로 accent */
export function shipNavyTrailColor(
  navyCode: string | null | undefined,
  dashed: boolean,
): string {
  const hex = shipNavyFillColor(navyCode);
  const n = Number.parseInt(hex.slice(1), 16);
  if (!Number.isFinite(n)) return dashed ? "rgba(148, 163, 184, 0.65)" : "rgba(148, 163, 184, 0.85)";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return dashed ? `rgba(${r}, ${g}, ${b}, 0.68)` : `rgba(${r}, ${g}, ${b}, 0.88)`;
}
