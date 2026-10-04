/**
 * 리플레이 outcome용 FRED 시리즈 매핑.
 * `assetVolatilityHint.TICKER_LABEL_TO_SYMBOL` 라벨을 참고하되,
 * FRED에 없는 자산(BDRY ETF 등)은 여기에 넣지 않는다 — outcome을 만들지 않음.
 *
 * Yahoo/CME 심볼을 백필에 쓰지 않는다.
 */
export type FredMetricId = "BZ" | "DXY" | "VIX";

export type FredSeriesEntry = {
  metric: FredMetricId;
  /** 표시 라벨 (언어 중립 고유명) */
  label: string;
  fredSeriesId: string;
  /** FRED 시리즈 설명 한 줄 */
  note: string;
};

export const FRED_SERIES_MAP: readonly FredSeriesEntry[] = [
  {
    metric: "BZ",
    label: "Brent",
    fredSeriesId: "DCOILBRENTEU",
    note: "Crude Oil Prices: Brent — Europe (FRED DCOILBRENTEU)",
  },
  {
    metric: "DXY",
    label: "DXY",
    /** Trade Weighted U.S. Dollar Index: Broad, Goods (daily) */
    fredSeriesId: "DTWEXBGS",
    note: "Trade Weighted U.S. Dollar Index: Broad, Goods (FRED DTWEXBGS)",
  },
  {
    metric: "VIX",
    label: "VIX",
    fredSeriesId: "VIXCLS",
    note: "CBOE Volatility Index: VIX (FRED VIXCLS)",
  },
] as const;

export function fredEntryForMetric(
  metric: string,
): FredSeriesEntry | undefined {
  return FRED_SERIES_MAP.find((e) => e.metric === metric);
}

export function isFredBackedMetric(metric: string): boolean {
  return FRED_SERIES_MAP.some((e) => e.metric === metric);
}
