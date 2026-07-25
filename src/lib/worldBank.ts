/**
 * World Bank Open Data (api.worldbank.org) — 국가별 거시지표.
 *
 * "지국(支局) 경제 위험도 그래프"의 데이터원. API 키가 필요 없다(공개).
 * 국가 클릭 시 ISO A3 코드로 GDP성장·물가·실업·부채·경상수지를 읽어
 * 단순 가중 위험 점수(0–100)로 합산한다.
 *
 * 주의: World Bank는 **연간** 지표라 최신값도 1~2년 지연될 수 있다.
 * 실시간 티커가 아니라 "구조적 취약성" 스냅샷 용도.
 */

const WB_BASE = "https://api.worldbank.org/v2";

export const WORLD_BANK_ATTRIBUTION = "World Bank Open Data (api.worldbank.org)";

export type WbIndicatorId =
  | "gdpGrowth"
  | "inflation"
  | "unemployment"
  | "govDebt"
  | "currentAccount";

type IndicatorConfig = {
  id: WbIndicatorId;
  code: string;
  labelKo: string;
  labelEn: string;
  unit: string;
  /** true면 값이 높을수록 위험, false면 낮을수록/음수일수록 위험 */
  higherIsRiskier: boolean;
  /** 위험 0점 기준값 */
  safe: number;
  /** 위험 100점 기준값 */
  danger: number;
  weight: number;
};

const INDICATORS: IndicatorConfig[] = [
  {
    id: "inflation",
    code: "FP.CPI.TOTL.ZG",
    labelKo: "물가상승률",
    labelEn: "Inflation (CPI)",
    unit: "%",
    higherIsRiskier: true,
    safe: 2,
    danger: 20,
    weight: 0.25,
  },
  {
    id: "gdpGrowth",
    code: "NY.GDP.MKTP.KD.ZG",
    labelKo: "GDP 성장률",
    labelEn: "GDP growth",
    unit: "%",
    higherIsRiskier: false,
    safe: 3,
    danger: -5,
    weight: 0.25,
  },
  {
    id: "unemployment",
    code: "SL.UEM.TOTL.ZS",
    labelKo: "실업률",
    labelEn: "Unemployment",
    unit: "%",
    higherIsRiskier: true,
    safe: 3,
    danger: 25,
    weight: 0.2,
  },
  {
    id: "govDebt",
    code: "GC.DOD.TOTL.GD.ZS",
    labelKo: "정부부채/GDP",
    labelEn: "Gov debt / GDP",
    unit: "%",
    higherIsRiskier: true,
    safe: 30,
    danger: 150,
    weight: 0.2,
  },
  {
    id: "currentAccount",
    code: "BN.CAB.XOKA.GD.ZS",
    labelKo: "경상수지/GDP",
    labelEn: "Current account / GDP",
    unit: "%",
    higherIsRiskier: false,
    safe: 2,
    danger: -12,
    weight: 0.1,
  },
];

export type WbIndicatorReading = {
  id: WbIndicatorId;
  labelKo: string;
  labelEn: string;
  unit: string;
  value: number | null;
  year: string | null;
  /** 이 지표의 위험 기여도 0–100 (값 없으면 null) */
  riskScore: number | null;
  /** 오래된→최신 순 값 (스파크라인용) */
  history: Array<{ year: string; value: number }>;
};

export type CountryEconomicRisk = {
  iso3: string;
  /** 종합 위험 점수 0–100 (구성 지표 없으면 null) */
  riskScore: number | null;
  band: "low" | "moderate" | "elevated" | "high" | "unknown";
  indicators: WbIndicatorReading[];
  attribution: string;
};

type WbRow = {
  date: string;
  value: number | null;
  countryiso3code?: string;
};

const FETCH_TIMEOUT_MS = 12_000;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** 지표 값 → 0–100 위험 기여. safe→0, danger→100 선형 (방향 반영) */
function indicatorRisk(config: IndicatorConfig, value: number): number {
  const span = config.danger - config.safe;
  if (span === 0) return 0;
  const t = clamp01((value - config.safe) / span);
  return Math.round(t * 100);
}

function bandFromScore(score: number | null): CountryEconomicRisk["band"] {
  if (score == null) return "unknown";
  if (score >= 70) return "high";
  if (score >= 50) return "elevated";
  if (score >= 30) return "moderate";
  return "low";
}

export function riskBandLabel(band: CountryEconomicRisk["band"], ko: boolean): string {
  switch (band) {
    case "high":
      return ko ? "고위험" : "High risk";
    case "elevated":
      return ko ? "위험 상승" : "Elevated";
    case "moderate":
      return ko ? "보통" : "Moderate";
    case "low":
      return ko ? "안정" : "Low risk";
    default:
      return ko ? "데이터 없음" : "No data";
  }
}

async function fetchIndicatorRows(iso3: string, code: string): Promise<WbRow[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `${WB_BASE}/country/${encodeURIComponent(
      iso3,
    )}/indicator/${code}?format=json&per_page=60&date=2004:2026`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    // 응답: [meta, rows] — rows가 null이면 데이터 없음
    if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) return [];
    return json[1] as WbRow[];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** 단일 국가의 경제 위험도 스냅샷. iso3는 Natural Earth ISO_A3. */
export async function fetchCountryEconomicRisk(iso3: string): Promise<CountryEconomicRisk> {
  const code = iso3.trim().toUpperCase();

  const readings = await Promise.all(
    INDICATORS.map(async (config): Promise<WbIndicatorReading> => {
      const rows = await fetchIndicatorRows(code, config.code);
      // World Bank는 최신(date desc)순 → 유효값만, 스파크라인은 오름차순
      const valid = rows
        .filter((r): r is WbRow & { value: number } => typeof r.value === "number")
        .map((r) => ({ year: r.date, value: r.value }));
      const latest = valid[0] ?? null;
      const history = valid.slice().reverse();
      const riskScore =
        latest != null ? indicatorRisk(config, latest.value) : null;
      return {
        id: config.id,
        labelKo: config.labelKo,
        labelEn: config.labelEn,
        unit: config.unit,
        value: latest?.value ?? null,
        year: latest?.year ?? null,
        riskScore,
        history,
      };
    }),
  );

  // 가중 평균 (값 있는 지표만, 가중치 재정규화)
  let weighted = 0;
  let weightSum = 0;
  for (const config of INDICATORS) {
    const reading = readings.find((r) => r.id === config.id);
    if (reading && reading.riskScore != null) {
      weighted += reading.riskScore * config.weight;
      weightSum += config.weight;
    }
  }
  const riskScore = weightSum > 0 ? Math.round(weighted / weightSum) : null;

  return {
    iso3: code,
    riskScore,
    band: bandFromScore(riskScore),
    indicators: readings,
    attribution: WORLD_BANK_ATTRIBUTION,
  };
}
