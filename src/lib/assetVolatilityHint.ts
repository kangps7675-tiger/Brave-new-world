/**
 * 초크포인트 C급(대리지표) 신호 — 초크포인트마다 실제로 연동된 자산(relatedTickers)의
 * 선물·지수 등락률을 "변동성 hint"로 변환한다.
 *
 * 유가로 한정하지 않는다: 호르무즈·수에즈는 Brent·DXY·VIX가 맞지만, 대만해협은
 * 반도체 관련주·아시아 증시(NASDAQ·Hang Seng·Shanghai), 보스포루스는 유가·금·S&P 500처럼
 * 초크포인트마다 실제로 흔들리는 자산이 다르다 — `logisticsRiskPoints.ts`의 각 지점이
 * 이미 `meta.relatedTickers`로 그 답을 갖고 있으므로 그걸 그대로 심볼로 풀어 쓴다.
 *
 * `logisticsStress.ts`의 C급 규칙과 동일한 원칙: 단독으로 등급을 정하지 않는다,
 * 연동 자산 시세를 하나도 못 구하면 null을 반환한다 — 없는 신호를 지어내지 않는다.
 */

import { TICKER_SPIKE_THRESHOLD_PERCENT } from "@/lib/news/intelStackMode";

export type AssetVolatilityHint = {
  /** 표시용 자산명 — Brent·NASDAQ처럼 이미 언어 중립적인 고유명사라 ko/en 분리하지 않는다. */
  assetLabel: string;
  hint: "high" | "elevated" | "normal";
  observedAt: string;
  isDemo: false;
};

/** logisticsRiskPoints.ts meta.relatedTickers 표시 라벨 → 실제 야후 심볼 코드(stockTickers.ts 기준). */
const TICKER_LABEL_TO_SYMBOL: Record<string, string> = {
  Brent: "BZ=F",
  WTI: "CL=F",
  DXY: "DX-Y.NYB",
  VIX: "^VIX",
  Gold: "GC=F",
  Silver: "SI=F",
  Copper: "HG=F",
  Wheat: "ZW=F",
  Corn: "ZC=F",
  /** Breakwave Dry Bulk Shipping ETF — 운임(프레이트) 대리지표. 개별 선사 주가보다 노이즈가 적다. */
  Shipping: "BDRY",
  "S&P 500": "^GSPC",
  NASDAQ: "^IXIC",
  Shanghai: "000001.SS",
  "Hang Seng": "^HSI",
};

/**
 * @param relatedTickersLabel `logisticsRiskPoints.ts`의 `meta.relatedTickers` 문자열
 *   (예: "Brent · DXY · VIX"). "·" 구분 라벨을 심볼로 풀어, 그중 등락폭이 가장 큰
 *   자산 하나를 대표 신호로 쓴다(여러 자산을 합성하지 않는다 — logisticsStress.ts 원칙과 동일).
 * @param tickerChangeBySymbol 심볼 → 전일 대비 등락률(%) 스냅샷.
 */
export function assetVolatilityHintForPoint(
  relatedTickersLabel: string | undefined,
  tickerChangeBySymbol: Map<string, number | null>,
): AssetVolatilityHint | null {
  if (!relatedTickersLabel) return null;
  const labels = relatedTickersLabel
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);

  const resolved = labels
    .map((label) => ({ label, symbol: TICKER_LABEL_TO_SYMBOL[label] }))
    .filter((entry): entry is { label: string; symbol: string } => Boolean(entry.symbol));
  if (resolved.length === 0) return null;

  let maxAbs = -1;
  let maxLabel: string | null = null;
  for (const { label, symbol } of resolved) {
    const pct = tickerChangeBySymbol.get(symbol);
    if (typeof pct !== "number" || !Number.isFinite(pct)) continue;
    if (Math.abs(pct) > maxAbs) {
      maxAbs = Math.abs(pct);
      maxLabel = label;
    }
  }
  if (maxLabel === null) return null;

  const hint: AssetVolatilityHint["hint"] =
    maxAbs >= TICKER_SPIKE_THRESHOLD_PERCENT
      ? "high"
      : maxAbs >= TICKER_SPIKE_THRESHOLD_PERCENT / 2
        ? "elevated"
        : "normal";

  return {
    assetLabel: maxLabel,
    hint,
    observedAt: new Date().toISOString(),
    isDemo: false,
  };
}
