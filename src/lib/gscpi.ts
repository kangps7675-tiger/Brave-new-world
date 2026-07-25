/**
 * NY Fed GSCPI — Global Supply Chain Pressure Index (글로벌 공급망 압력 지수).
 *
 * 출처: Federal Reserve Bank of New York. 월간 xlsx 공개.
 *   https://www.newyorkfed.org/medialibrary/research/interactives/gscpi/downloads/gscpi_data.xlsx
 *
 * 값의 의미: 평균 대비 표준편차(z-score, σ). 0 = 역사적 평균.
 *   양수 = 평균보다 공급망 압력 높음(스트레스), 음수 = 낮음(완화).
 *   해상운임·항공운임·PMI 배송지연·백로그를 종합한 표준 거시 지표.
 *
 * PortWatch(초크포인트별 실측)와 짝: GSCPI는 "전 세계 종합 게이지" 하나.
 *   지도에 못 뿌림 → 상단/사이드 게이지 카드로.
 *   월간이라 "실시간" 아님 → 배경 지표로 명시.
 */

export type GscpiPoint = { date: string; value: number };

export type GscpiLevel = "loose" | "normal" | "elevated" | "high";

export type GscpiReading = {
  value: number;
  level: GscpiLevel;
  /** 전월 대비 변화 (없으면 null) */
  deltaFromPrev: number | null;
  date: string;
};

/**
 * z-score → 스트레스 등급.
 * 표준편차 기준(정규분포 가정): ±0.5σ 안=정상, 0.5~1.5σ=경계, >1.5σ=높음, < -0.5σ=완화.
 */
export function gscpiLevel(value: number): GscpiLevel {
  if (value <= -0.5) return "loose";
  if (value < 0.5) return "normal";
  if (value < 1.5) return "elevated";
  return "high";
}

/** 시계열에서 최신 읽기 + 전월 대비 */
export function latestGscpiReading(series: GscpiPoint[]): GscpiReading | null {
  const sorted = [...series]
    .filter((p) => Number.isFinite(p.value) && p.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // 최신 먼저
  if (sorted.length === 0) return null;
  const latest = sorted[0];
  const prev = sorted[1];
  return {
    value: latest.value,
    level: gscpiLevel(latest.value),
    deltaFromPrev: prev ? latest.value - prev.value : null,
    date: latest.date,
  };
}

export function gscpiLevelLabel(level: GscpiLevel, lang: "ko" | "en"): string {
  const map: Record<GscpiLevel, { ko: string; en: string }> = {
    loose: { ko: "원활", en: "Smooth" },
    normal: { ko: "보통", en: "Normal" },
    elevated: { ko: "혼잡", en: "Congested" },
    high: { ko: "매우 혼잡", en: "Severe" },
  };
  return lang === "en" ? map[level].en : map[level].ko;
}

export function gscpiLevelColor(level: GscpiLevel): string {
  switch (level) {
    case "high":
      return "#f87171"; // red-400
    case "elevated":
      return "#fbbf24"; // amber-400
    case "loose":
      return "#38bdf8"; // sky-400 (평균 이하 = 원활)
    default:
      return "#34d399"; // emerald-400 (정상)
  }
}

/** 게이지 표시용: "+1.42σ" */
export function formatSigma(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}σ`;
}

/** 표준편차(-2σ~+4σ)를 일반 사용자용 0~100 점수로 환산 */
export function gscpiScore100(value: number): number {
  return Math.round(Math.max(0, Math.min(100, ((value + 2) / 6) * 100)));
}

export function gscpiDisclaimer(lang: "ko" | "en"): string {
  return lang === "en"
    ? "How congested global shipping is — 0–100 score (100 = most congested). From the NY Fed GSCPI monthly index (freight rates, delivery delays, backlogs). Monthly, not live."
    : "전 세계 물류가 얼마나 막혀 있는지 0~100으로 나타낸 점수(100이면 가장 혼잡). NY Fed 공급망 압력지수(운임·배송지연·주문적체) 기준이며, 실시간이 아닌 월 단위 값입니다.";
}
