/**
 * 주요국 기준금리 · 국채금리 · 장단기 금리차.
 *
 * 숫자는 최신 관측치(%), 장단기차는 시계열로 그래프.
 * 미국은 FRED 일간(DGS·T10Y2Y), 그 외는 OECD→FRED 월간 시리즈.
 */

export type SovereignRateCountryId =
  | "US"
  | "EA"
  | "DE"
  | "JP"
  | "GB"
  | "KR"
  | "CA"
  | "AU";

export type SovereignRateCountry = {
  id: SovereignRateCountryId;
  /** 표시 이름 */
  nameKo: string;
  nameEn: string;
  /** 기준·정책금리 FRED series (없으면 null) */
  policySeries: string | null;
  /** 단기(≈2Y 또는 3M) */
  shortSeries: string | null;
  /** 장기(≈10Y) */
  longSeries: string;
  /**
   * 장단기 금리차 전용 시리즈가 있으면 그걸 쓴다 (예: T10Y2Y).
   * 없으면 long − short 로 계산.
   */
  spreadSeries: string | null;
  /** 스프레드 설명 */
  spreadLabelKo: string;
  spreadLabelEn: string;
};

/**
 * 주요국 정본 테이블.
 * series id는 FRED 공개 식별자 — 키가 있을 때만 서버에서 조회.
 */
export const SOVEREIGN_RATE_COUNTRIES: SovereignRateCountry[] = [
  {
    id: "US",
    nameKo: "미국",
    nameEn: "United States",
    policySeries: "FEDFUNDS",
    shortSeries: "DGS2",
    longSeries: "DGS10",
    spreadSeries: "T10Y2Y",
    spreadLabelKo: "10년−2년",
    spreadLabelEn: "10Y−2Y",
  },
  {
    id: "EA",
    nameKo: "유로존",
    nameEn: "Euro area",
    policySeries: "ECBDFR",
    shortSeries: "IR3TIB01EZM156N",
    longSeries: "IRLTLT01EZM156N",
    spreadSeries: null,
    spreadLabelKo: "10년−3개월",
    spreadLabelEn: "10Y−3M",
  },
  {
    id: "DE",
    nameKo: "독일",
    nameEn: "Germany",
    policySeries: "ECBDFR",
    shortSeries: "IR3TIB01DEM156N",
    longSeries: "IRLTLT01DEM156N",
    spreadSeries: null,
    spreadLabelKo: "10년−3개월",
    spreadLabelEn: "10Y−3M",
  },
  {
    id: "JP",
    nameKo: "일본",
    nameEn: "Japan",
    policySeries: "IRSTCI01JPM156N",
    shortSeries: "IR3TIB01JPM156N",
    longSeries: "IRLTLT01JPM156N",
    spreadSeries: null,
    spreadLabelKo: "10년−3개월",
    spreadLabelEn: "10Y−3M",
  },
  {
    id: "GB",
    nameKo: "영국",
    nameEn: "United Kingdom",
    policySeries: "IRSTCI01GBM156N",
    shortSeries: "IR3TIB01GBM156N",
    longSeries: "IRLTLT01GBM156N",
    spreadSeries: null,
    spreadLabelKo: "10년−3개월",
    spreadLabelEn: "10Y−3M",
  },
  {
    id: "KR",
    nameKo: "한국",
    nameEn: "Korea",
    policySeries: "IRSTCI01KRM156N",
    shortSeries: "IR3TIB01KRM156N",
    longSeries: "IRLTLT01KRM156N",
    spreadSeries: null,
    spreadLabelKo: "10년−3개월",
    spreadLabelEn: "10Y−3M",
  },
  {
    id: "CA",
    nameKo: "캐나다",
    nameEn: "Canada",
    policySeries: "IRSTCI01CAM156N",
    shortSeries: "IR3TIB01CAM156N",
    longSeries: "IRLTLT01CAM156N",
    spreadSeries: null,
    spreadLabelKo: "10년−3개월",
    spreadLabelEn: "10Y−3M",
  },
  {
    id: "AU",
    nameKo: "호주",
    nameEn: "Australia",
    policySeries: "IRSTCI01AUM156N",
    shortSeries: "IR3TIB01AUM156N",
    longSeries: "IRLTLT01AUM156N",
    spreadSeries: null,
    spreadLabelKo: "10년−3개월",
    spreadLabelEn: "10Y−3M",
  },
];

export type SovereignRateRow = {
  id: SovereignRateCountryId;
  nameKo: string;
  nameEn: string;
  /** 기준·정책금리 % */
  policyRate: number | null;
  policyAsOf: string | null;
  /** 단기 % */
  shortYield: number | null;
  shortAsOf: string | null;
  /** 장기(10Y) % */
  longYield: number | null;
  longAsOf: string | null;
  /** 장단기 금리차 %p (음수면 역전) */
  spread: number | null;
  spreadAsOf: string | null;
  spreadLabelKo: string;
  spreadLabelEn: string;
  /** 오래된→최신 스프레드 시계열 (그래프용) */
  spreadSparkline: number[];
};

export const SOVEREIGN_RATES_ATTRIBUTION =
  "FRED · St. Louis Fed · OECD interest-rate series · not investment advice";
