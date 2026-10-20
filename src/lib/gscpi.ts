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

/**
 * 공급망 압력 1–5 (1=원활 · 5=최고 압력).
 * NY Fed GSCPI z-score를 DEFCON과 같은 “단계 칩” 문법으로 읽기 위한 UI 매핑.
 * 번호 방향은 DEFCON과 반대(숫자가 클수록 더 막힘) — 직관적 압력 표기.
 */
export type ScpLevel = 1 | 2 | 3 | 4 | 5;

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

/** GSCPI σ → 공급망 압력 1–5 */
export function gscpiPressureLevel(value: number): ScpLevel {
  if (value <= -0.5) return 1;
  if (value < 0.5) return 2;
  if (value < 1.0) return 3;
  if (value < 1.5) return 4;
  return 5;
}

export function gscpiPressureLabel(level: ScpLevel, lang: "ko" | "en"): string {
  if (lang === "en") {
    switch (level) {
      case 1:
        return "Smooth";
      case 2:
        return "Normal";
      case 3:
        return "Tight";
      case 4:
        return "Stressed";
      case 5:
        return "Severe";
    }
  }
  switch (level) {
    case 1:
      return "원활";
    case 2:
      return "보통";
    case 3:
      return "타이트";
    case 4:
      return "압박";
    case 5:
      return "심각";
  }
}

export function gscpiPressureColor(level: ScpLevel, light = false): string {
  if (light) {
    switch (level) {
      case 5:
        return "#be123c";
      case 4:
        return "#c2410c";
      case 3:
        return "#b45309";
      case 2:
        return "#047857";
      case 1:
        return "#0369a1";
    }
  }
  switch (level) {
    case 5:
      return "#f87171";
    case 4:
      return "#fb923c";
    case 3:
      return "#fbbf24";
    case 2:
      return "#34d399";
    case 1:
      return "#38bdf8";
  }
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
    ? "Supply-chain pressure 1–5 from the NY Fed GSCPI (freight, delays, backlogs). Monthly, not live. Not a military DEFCON."
    : "공급망 압력 1~5 — NY Fed GSCPI(운임·배송지연·주문적체) 기준. 월 단위라 실시간이 아닙니다. 군사 DEFCON과 무관.";
}
