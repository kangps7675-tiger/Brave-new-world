/**
 * 초크포인트 C급(대리지표) 신호 — 초크포인트마다 연동된 자산(relatedTickers)의
 * 선물·지수 등락을 "변동성 hint"로 변환한다.
 *
 * 원칙
 * - 단독으로 해협 사건을 확증하지 않는다 (logisticsStress.ts C급과 동일).
 * - 여러 티커 중 최대 등락을 고르지 않는다 — 항상 튀어 보이기 때문.
 * - relatedTickers 목록의 **첫 번째 해석 가능 티커**(대표)만 본다.
 * - 절대 % 임계가 아니라, 자산군 대략 일중 σ 대비 |z|로 elevated/high를 나눈다.
 */

import { TICKER_SPIKE_THRESHOLD_PERCENT } from "@/lib/news/intelStackMode";

export type AssetVolatilityHint = {
  /** 표시용 자산명 — Brent·NASDAQ처럼 이미 언어 중립적인 고유명사라 ko/en 분리하지 않는다. */
  assetLabel: string;
  hint: "high" | "elevated" | "normal";
  /** |일중 등락%| / 대표 σ — UI·디버그용 */
  zScore: number;
  symbol: string;
  changePercent: number;
  observedAt: string;
  isDemo: false;
};

/** logisticsRiskPoints.ts meta.relatedTickers 표시 라벨 → 실제 야후 심볼 코드(stockTickers.ts 기준). */
export const TICKER_LABEL_TO_SYMBOL: Record<string, string> = {
  Brent: "BZ=F",
  WTI: "CL=F",
  DXY: "DX-Y.NYB",
  VIX: "^VIX",
  Gold: "GC=F",
  Silver: "SI=F",
  Copper: "HG=F",
  NatGas: "NG=F",
  Wheat: "ZW=F",
  Corn: "ZC=F",
  /** Breakwave Dry Bulk Shipping ETF — 운임(프레이트) 대리지표. BDI 상장 티커는 없음. */
  Shipping: "BDRY",
  "S&P 500": "^GSPC",
  NASDAQ: "^IXIC",
  Shanghai: "000001.SS",
  "Hang Seng": "^HSI",
  TSMC: "TSM",
  Semis: "SMH",
  Taiwan: "^TWII",
};

/**
 * 일중 등락(%) 대략 σ — 역사 시계열이 없을 때 z-score 분모.
 * “오늘은 평소보다 얼마나 튀었나”만 보기 위한 거친 기준선이지, 해협 확증이 아니다.
 */
export const TYPICAL_DAILY_SIGMA_PERCENT: Record<string, number> = {
  "BZ=F": 1.6,
  "CL=F": 1.6,
  "NG=F": 3.2,
  "GC=F": 0.9,
  "SI=F": 1.4,
  "HG=F": 1.3,
  "ZW=F": 1.5,
  "ZC=F": 1.4,
  "DX-Y.NYB": 0.45,
  "^VIX": 6.0,
  BDRY: 2.4,
  "^GSPC": 0.85,
  "^IXIC": 1.0,
  "000001.SS": 1.0,
  "^HSI": 1.1,
  TSM: 1.8,
  SMH: 1.7,
  "^TWII": 1.0,
};

const DEFAULT_SIGMA = TICKER_SPIKE_THRESHOLD_PERCENT; // 1.25
/** |z| ≥ 이 값이면 elevated */
const Z_ELEVATED = 1.0;
/** |z| ≥ 이 값이면 high */
const Z_HIGH = 2.0;

/** relatedTickers 문자열 → 심볼 목록 (미등록 라벨은 건너뜀 — 지어내지 않음). */
export function relatedTickerLabelsToSymbols(
  relatedTickersLabel: string | undefined,
): string[] {
  if (!relatedTickersLabel) return [];
  return relatedTickersLabel
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label) => TICKER_LABEL_TO_SYMBOL[label])
    .filter((sym): sym is string => Boolean(sym));
}

/** relatedTickers 순서상 첫 해석 가능 라벨 = 대표 티커 */
export function primaryRelatedTicker(
  relatedTickersLabel: string | undefined,
): { label: string; symbol: string } | null {
  if (!relatedTickersLabel) return null;
  for (const label of relatedTickersLabel
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const symbol = TICKER_LABEL_TO_SYMBOL[label];
    if (symbol) return { label, symbol };
  }
  return null;
}

export function volatilityZScore(
  changePercent: number,
  symbol: string,
): number {
  const sigma = TYPICAL_DAILY_SIGMA_PERCENT[symbol] ?? DEFAULT_SIGMA;
  if (!(sigma > 0) || !Number.isFinite(changePercent)) return 0;
  return Math.abs(changePercent) / sigma;
}

function hintFromZ(z: number): AssetVolatilityHint["hint"] {
  if (z >= Z_HIGH) return "high";
  if (z >= Z_ELEVATED) return "elevated";
  return "normal";
}

/**
 * @param relatedTickersLabel `logisticsRiskPoints.ts`의 `meta.relatedTickers`
 *   (예: "Brent · DXY · VIX"). **첫 번째** 해석 가능 티커만 사용한다.
 * @param tickerChangeBySymbol 심볼 → 전일 대비 등락률(%) 스냅샷.
 */
export function assetVolatilityHintForPoint(
  relatedTickersLabel: string | undefined,
  tickerChangeBySymbol: Map<string, number | null>,
): AssetVolatilityHint | null {
  const primary = primaryRelatedTicker(relatedTickersLabel);
  if (!primary) return null;

  const pct = tickerChangeBySymbol.get(primary.symbol);
  if (typeof pct !== "number" || !Number.isFinite(pct)) return null;

  const zScore = volatilityZScore(pct, primary.symbol);
  return {
    assetLabel: primary.label,
    hint: hintFromZ(zScore),
    zScore,
    symbol: primary.symbol,
    changePercent: pct,
    observedAt: new Date().toISOString(),
    isDemo: false,
  };
}
