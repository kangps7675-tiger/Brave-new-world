/**
 * Statistics of the World (SOTW) — 서버 전용 클라이언트.
 * Docs: https://statisticsoftheworld.com/api-docs
 * Auth: X-API-Key (STATSOFTHEWORLD_API_KEY). API Pro ≈ 50k req/day.
 */

import { getCached, setCached } from "@/lib/apiCache";

export const SOTW_BASE = "https://statisticsoftheworld.com";
export const SOTW_ATTRIBUTION = "Statistics of the World";
export const SOTW_DOCS_URL = "https://statisticsoftheworld.com/api-docs";
export const SOTW_DATA_URL = "https://statisticsoftheworld.com/data";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

/** Common countryHint strings → ISO3 */
export const SOTW_COUNTRY_ISO3: Record<string, string> = {
  iran: "IRN",
  egypt: "EGY",
  yemen: "YEM",
  singapore: "SGP",
  malaysia: "MYS",
  taiwan: "TWN",
  panama: "PAN",
  "united arab emirates": "ARE",
  uae: "ARE",
  qatar: "QAT",
  netherlands: "NLD",
  "united states": "USA",
  "united kingdom": "GBR",
  "hong kong": "HKG",
  "south korea": "KOR",
  korea: "KOR",
  japan: "JPN",
  vietnam: "VNM",
  indonesia: "IDN",
  germany: "DEU",
  china: "CHN",
  ukraine: "UKR",
  australia: "AUS",
  chile: "CHL",
  russia: "RUS",
  turkey: "TUR",
  india: "IND",
  pakistan: "PAK",
  "saudi arabia": "SAU",
  israel: "ISR",
  france: "FRA",
  brazil: "BRA",
  canada: "CAN",
  mexico: "MEX",
  poland: "POL",
  philippines: "PHL",
  thailand: "THA",
  nigeria: "NGA",
  "south africa": "ZAF",
};

export type SotwIndicatorRow = {
  id?: string;
  label?: string;
  category?: string;
  value?: number | null;
  year?: string | number;
  format?: string;
  source?: string;
};

export type SotwCountryPayload = {
  country?: {
    id?: string;
    iso2?: string;
    name?: string;
    region?: string;
    incomeLevel?: string;
    capitalCity?: string;
  };
  indicators?: SotwIndicatorRow[];
};

export type SotwCountryCard = {
  disabled: boolean;
  reason?: string;
  error?: string;
  id?: string;
  name?: string;
  region?: string;
  gdpUsd: number | null;
  gdpPerCapitaUsd: number | null;
  tradePctGdp: number | null;
  population: number | null;
  milSpendPctGdp: number | null;
  yearHints?: Partial<
    Record<
      "gdp" | "population" | "trade" | "mil" | "inflation" | "growth" | "unemployment",
      string
    >
  >;
  attribution: string;
};

export function getSotwApiKey(): string | null {
  const key = process.env.STATSOFTHEWORLD_API_KEY?.trim();
  return key || null;
}

export function resolveSotwCountryIso(hint: string): string | null {
  const trimmed = hint.trim();
  if (!trimmed) return null;
  const mapped = SOTW_COUNTRY_ISO3[trimmed.toLowerCase()];
  if (mapped) return mapped;
  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();
  return null;
}

export function pickSotwIndicator(
  indicators: SotwIndicatorRow[] | undefined,
  ids: string[],
): { value: number | null; year: string | null } {
  if (!indicators?.length) return { value: null, year: null };
  for (const id of ids) {
    const hit = indicators.find((row) => row.id === id);
    if (hit && typeof hit.value === "number" && Number.isFinite(hit.value)) {
      return {
        value: hit.value,
        year: hit.year != null ? String(hit.year) : null,
      };
    }
  }
  return { value: null, year: null };
}

export async function sotwFetchJson<T>(
  path: string,
  init?: { searchParams?: Record<string, string>; cacheKey?: string; ttlMs?: number },
): Promise<T> {
  const apiKey = getSotwApiKey();
  if (!apiKey) {
    throw new Error("STATSOFTHEWORLD_API_KEY not set");
  }

  const cacheKey = init?.cacheKey ?? `sotw:${path}:${JSON.stringify(init?.searchParams ?? {})}`;
  const ttl = init?.ttlMs ?? CACHE_TTL_MS;
  const cached = getCached<T>(cacheKey);
  if (cached !== null) return cached;

  const url = new URL(path.startsWith("http") ? path : `${SOTW_BASE}${path}`);
  if (init?.searchParams) {
    for (const [k, v] of Object.entries(init.searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-API-Key": apiKey,
    },
    next: { revalidate: Math.max(60, Math.floor(ttl / 1000)) },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SOTW ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }

  const data = (await res.json()) as T;
  setCached(cacheKey, data, ttl);
  return data;
}

export function buildCountryCard(
  payload: SotwCountryPayload,
  fallbackName: string,
  iso: string,
): SotwCountryCard {
  const indicators = payload.indicators;
  // Prefer World Bank current-USD series (API Pro reviewed catalog).
  // IMF.NGDPD may be absent/403 on paid keys (277 WB-only catalog).
  const gdp = pickSotwIndicator(indicators, ["NY.GDP.MKTP.CD", "IMF.NGDPD", "GDP"]);
  const gdpPc = pickSotwIndicator(indicators, ["NY.GDP.PCAP.CD", "IMF.NGDPDPC"]);
  const trade = pickSotwIndicator(indicators, ["NE.TRD.GNFS.ZS", "TRADE.PCT.GDP"]);
  const pop = pickSotwIndicator(indicators, ["SP.POP.TOTL", "LP", "POP"]);
  const mil = pickSotwIndicator(indicators, ["MS.MIL.XPND.GD.ZS"]);

  const yearHints: SotwCountryCard["yearHints"] = {};
  if (gdp.year) yearHints.gdp = gdp.year;
  if (pop.year) yearHints.population = pop.year;
  if (trade.year) yearHints.trade = trade.year;
  if (mil.year) yearHints.mil = mil.year;

  return {
    disabled: false,
    id: payload.country?.id ?? iso,
    name: payload.country?.name ?? fallbackName,
    region: payload.country?.region,
    gdpUsd: gdp.value,
    gdpPerCapitaUsd: gdpPc.value,
    tradePctGdp: trade.value,
    population: pop.value,
    milSpendPctGdp: mil.value,
    yearHints: Object.keys(yearHints).length ? yearHints : undefined,
    attribution: SOTW_ATTRIBUTION,
  };
}

export async function fetchSotwCountryCard(hint: string): Promise<SotwCountryCard> {
  if (!getSotwApiKey()) {
    return {
      disabled: true,
      reason: "STATSOFTHEWORLD_API_KEY not set",
      gdpUsd: null,
      gdpPerCapitaUsd: null,
      tradePctGdp: null,
      population: null,
      milSpendPctGdp: null,
      attribution: SOTW_ATTRIBUTION,
    };
  }

  const iso = resolveSotwCountryIso(hint);
  if (!iso) {
    return {
      disabled: false,
      name: hint,
      error: "unmapped country hint",
      gdpUsd: null,
      gdpPerCapitaUsd: null,
      tradePctGdp: null,
      population: null,
      milSpendPctGdp: null,
      attribution: SOTW_ATTRIBUTION,
    };
  }

  const payload = await sotwFetchJson<SotwCountryPayload>(
    `/api/v1/countries/${encodeURIComponent(iso)}`,
    { cacheKey: `sotw:country:${iso}` },
  );
  return buildCountryCard(payload, hint, iso);
}
