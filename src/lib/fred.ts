/**
 * FRED — Federal Reserve Bank of St. Louis (api.stlouisfed.org).
 *
 * FININT 티커의 **원자재·달러·환율·금리 보완** 소스. 등락은 Yahoo와 같이 **전일(직전 관측) 대비**.
 * 주요 증시 지수는 Yahoo가 담당하고, FRED는 유가·가스·금·달러·환율·국채·연준금리의 일간 공식 수치를 얹는다.
 *
 * 주의:
 * - FRED는 **일간/영업일 관측**이라 실시간이 아니다(보통 하루~며칠 지연).
 * - changePercent는 최신 관측 ÷ 직전 관측 — 전일 대비와 같은 축.
 * - API 키가 필요하다. 키는 서버 env `FRED_API_KEY`에서만 읽는다(NEXT_PUBLIC_ 금지).
 *   키가 없으면 `null`을 돌려주고, 호출부가 Yahoo로 폴백한다.
 */

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

export const FRED_ATTRIBUTION =
  "FRED · Federal Reserve Bank of St. Louis (api.stlouisfed.org)";

/**
 * Yahoo 심볼 → FRED series id.
 * 증시 지수(^VIX/^GSPC/^IXIC/아시아)는 여기 넣지 않는다 — Yahoo 15분 폴링 전용.
 * 환율·국채·연준금리는 FRED 일간 공식값이 있으면 덮어쓴다.
 */
export const FRED_SERIES_BY_SYMBOL: Record<string, string> = {
  "CL=F": "DCOILWTICO", // WTI Crude Oil (Cushing)
  "BZ=F": "DCOILBRENTEU", // Brent Crude (Europe)
  "NG=F": "DHHNGSP", // Henry Hub Natural Gas Spot
  "GC=F": "GOLDAMGBD228NLBM", // Gold, London PM fixing (USD)
  "DX-Y.NYB": "DTWEXBGS", // Nominal Broad USD Index
  "KRW=X": "DEXKOUS", // South Korean Won to One U.S. Dollar
  "JPY=X": "DEXJPUS", // Japanese Yen to One U.S. Dollar
  "CNY=X": "DEXCHUS", // Chinese Yuan to One U.S. Dollar
  "EURUSD=X": "DEXUSEU", // U.S. Dollars to One Euro
  "^IRX": "DTB3", // 3-Month Treasury Bill
  "^FVX": "DGS5", // 5-Year Treasury
  "^TNX": "DGS10", // 10-Year Treasury
  "^TYX": "DGS30", // 30-Year Treasury
  /** Yahoo에 없는 FRED 전용 — stockTickersFetch에서 따로 합침 */
  FEDFUNDS: "FEDFUNDS", // Effective Federal Funds Rate
};

export function getFredApiKey(): string | null {
  const key = process.env.FRED_API_KEY?.trim();
  return key ? key : null;
}

export function hasFredApiKey(): boolean {
  return getFredApiKey() !== null;
}

export function symbolHasFredSeries(symbol: string): boolean {
  return symbol in FRED_SERIES_BY_SYMBOL;
}

export type FredReading = {
  /** 최신 관측치 */
  price: number | null;
  /** 직전 관측 대비 % */
  changePercent: number | null;
  /** 오래된→최신 순 종가 (스파크라인용) */
  sparkline: number[];
  /** 최신 관측 날짜 (YYYY-MM-DD) */
  asOf: string | null;
};

type FredObservation = { date: string; value: string };
type FredResponse = { observations?: FredObservation[] };

const FETCH_TIMEOUT_MS = 12_000;

async function fetchJsonWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`FRED HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 단일 series의 최근 관측을 읽어 최신값·직전대비·스파크라인으로 정규화.
 * @param limit 스파크라인용으로 받아올 최근 관측 개수 (내림차순 요청 후 오름차순 반전)
 */
export async function fetchFredSeriesReading(
  seriesId: string,
  limit = 40,
): Promise<FredReading | null> {
  const apiKey = getFredApiKey();
  if (!apiKey) return null;

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: String(Math.max(2, limit)),
  });

  try {
    const json = await fetchJsonWithTimeout<FredResponse>(`${FRED_BASE}?${params.toString()}`);
    const obs = json.observations ?? [];
    // FRED는 결측치를 "."로 준다. 유효 숫자만.
    const valid = obs
      .map((o) => ({ date: o.date, value: Number(o.value) }))
      .filter((o) => Number.isFinite(o.value));
    if (valid.length === 0) return null;

    // desc로 받았으니 valid[0]이 최신
    const latest = valid[0]!;
    const prev = valid[1];
    const changePercent =
      prev && prev.value !== 0 ? ((latest.value - prev.value) / prev.value) * 100 : null;

    // 스파크라인은 오름차순(과거→현재)
    const sparkline = valid
      .slice()
      .reverse()
      .map((o) => o.value);

    return {
      price: latest.value,
      changePercent: changePercent != null && Number.isFinite(changePercent) ? changePercent : null,
      sparkline,
      asOf: latest.date,
    };
  } catch {
    return null;
  }
}

/** 여러 심볼을 한 번에 — 심볼별 FRED series를 병렬로 조회. */
export async function fetchFredReadingsBySymbol(
  symbols: string[],
): Promise<Map<string, FredReading>> {
  const out = new Map<string, FredReading>();
  if (!hasFredApiKey()) return out;

  const targets = symbols.filter(symbolHasFredSeries);
  const results = await Promise.all(
    targets.map(async (symbol) => {
      const reading = await fetchFredSeriesReading(FRED_SERIES_BY_SYMBOL[symbol]!);
      return [symbol, reading] as const;
    }),
  );
  for (const [symbol, reading] of results) {
    if (reading && reading.price != null) out.set(symbol, reading);
  }
  return out;
}
