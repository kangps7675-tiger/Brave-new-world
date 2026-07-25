/**
 * FRED — Federal Reserve Bank of St. Louis (api.stlouisfed.org).
 *
 * FININT 티커의 **원자재·달러 보완** 소스. 주요 증시 지수(VIX·S&P·나스닥·아시아)는
 * Yahoo 15분 폴링이 담당하고, FRED는 유가·가스·금·달러처럼 지경학 위기가
 * 자원 가격에 미치는 일간 공식 수치를 얹는다.
 *
 * 주의:
 * - FRED는 **일간/영업일 관측**이라 실시간이 아니다(보통 하루~며칠 지연).
 * - API 키가 필요하다. 키는 서버 env `FRED_API_KEY`에서만 읽는다(NEXT_PUBLIC_ 금지).
 *   키가 없으면 `null`을 돌려주고, 호출부가 Yahoo로 폴백한다.
 */

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

export const FRED_ATTRIBUTION =
  "FRED · Federal Reserve Bank of St. Louis (api.stlouisfed.org)";

/**
 * Yahoo 심볼 → FRED series id.
 * 증시 지수(^VIX/^GSPC/^IXIC/아시아)는 여기 넣지 않는다 — Yahoo 15분 폴링 전용.
 */
export const FRED_SERIES_BY_SYMBOL: Record<string, string> = {
  "CL=F": "DCOILWTICO", // WTI Crude Oil (Cushing)
  "BZ=F": "DCOILBRENTEU", // Brent Crude (Europe)
  "NG=F": "DHHNGSP", // Henry Hub Natural Gas Spot
  "GC=F": "GOLDAMGBD228NLBM", // Gold, London PM fixing (USD)
  "DX-Y.NYB": "DTWEXBGS", // Nominal Broad USD Index
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
