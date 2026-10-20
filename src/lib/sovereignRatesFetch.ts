/**
 * 주요국 금리 FRED 수집 → 숫자 + 장단기차 스파크라인.
 */

import { fetchFredSeriesReading, hasFredApiKey } from "@/lib/fred";
import {
  SOVEREIGN_RATE_COUNTRIES,
  type SovereignRateCountry,
  type SovereignRateRow,
} from "@/lib/sovereignRates";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";
const FETCH_TIMEOUT_MS = 14_000;
/** 일간(미국) 스프레드 그래프 */
const DAILY_LIMIT = 90;
/** 월간(OECD) 스프레드 그래프 */
const MONTHLY_LIMIT = 36;

type Obs = { date: string; value: number };

async function fetchFredObservations(
  seriesId: string,
  limit: number,
): Promise<Obs[]> {
  const apiKey = process.env.FRED_API_KEY?.trim();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: String(Math.max(2, limit)),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${FRED_BASE}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      observations?: Array<{ date: string; value: string }>;
    };
    return (json.observations ?? [])
      .map((o) => ({ date: o.date, value: Number(o.value) }))
      .filter((o) => Number.isFinite(o.value));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function latest(obs: Obs[]): Obs | null {
  return obs[0] ?? null;
}

/** 두 시계열을 날짜 교집합으로 맞춰 A−B (오래된→최신) */
function alignedDiff(longObs: Obs[], shortObs: Obs[], maxPoints: number): number[] {
  const shortByDate = new Map(shortObs.map((o) => [o.date, o.value]));
  const diffs: { date: string; value: number }[] = [];
  for (const lo of longObs) {
    const s = shortByDate.get(lo.date);
    if (s == null) continue;
    diffs.push({ date: lo.date, value: lo.value - s });
  }
  // desc → take newest maxPoints → reverse to ascending for sparkline
  return diffs
    .slice(0, maxPoints)
    .reverse()
    .map((d) => d.value);
}

function isDailyCountry(c: SovereignRateCountry): boolean {
  return c.id === "US";
}

async function buildCountryRow(country: SovereignRateCountry): Promise<SovereignRateRow> {
  const limit = isDailyCountry(country) ? DAILY_LIMIT : MONTHLY_LIMIT;

  const seriesIds = [
    country.policySeries,
    country.shortSeries,
    country.longSeries,
    country.spreadSeries,
  ].filter((id): id is string => Boolean(id));

  const unique = [...new Set(seriesIds)];
  const obsMap = new Map<string, Obs[]>();
  await Promise.all(
    unique.map(async (id) => {
      obsMap.set(id, await fetchFredObservations(id, limit));
    }),
  );

  const policyObs = country.policySeries ? obsMap.get(country.policySeries) ?? [] : [];
  const shortObs = country.shortSeries ? obsMap.get(country.shortSeries) ?? [] : [];
  const longObs = obsMap.get(country.longSeries) ?? [];
  const spreadObs = country.spreadSeries ? obsMap.get(country.spreadSeries) ?? [] : [];

  const policy = latest(policyObs);
  const short = latest(shortObs);
  const long = latest(longObs);

  let spread: number | null = null;
  let spreadAsOf: string | null = null;
  let spreadSparkline: number[] = [];

  if (spreadObs.length >= 2) {
    const latestSpread = latest(spreadObs);
    spread = latestSpread?.value ?? null;
    spreadAsOf = latestSpread?.date ?? null;
    spreadSparkline = spreadObs
      .slice(0, limit)
      .reverse()
      .map((o) => o.value);
  } else if (longObs.length && shortObs.length) {
    spreadSparkline = alignedDiff(longObs, shortObs, limit);
    if (spreadSparkline.length) {
      spread = spreadSparkline[spreadSparkline.length - 1] ?? null;
      // asOf = long's latest shared date
      const shortDates = new Set(shortObs.map((o) => o.date));
      const shared = longObs.find((o) => shortDates.has(o.date));
      spreadAsOf = shared?.date ?? long?.date ?? null;
    }
  }

  return {
    id: country.id,
    nameKo: country.nameKo,
    nameEn: country.nameEn,
    policyRate: policy?.value ?? null,
    policyAsOf: policy?.date ?? null,
    shortYield: short?.value ?? null,
    shortAsOf: short?.date ?? null,
    longYield: long?.value ?? null,
    longAsOf: long?.date ?? null,
    spread,
    spreadAsOf,
    spreadLabelKo: country.spreadLabelKo,
    spreadLabelEn: country.spreadLabelEn,
    spreadSparkline,
  };
}

/** FRED 키 없으면 빈 배열. 키 있으면 국가별 병렬 수집. */
export async function fetchSovereignRates(): Promise<SovereignRateRow[]> {
  if (!hasFredApiKey()) return [];

  const rows = await Promise.all(SOVEREIGN_RATE_COUNTRIES.map((c) => buildCountryRow(c)));
  // 장기금리가 하나도 없으면 시리즈 실패로 보고 제외
  return rows.filter((r) => r.longYield != null || r.policyRate != null || r.spread != null);
}

/** stub / 키 없을 때 레이아웃용 빈 행 */
export function stubSovereignRates(): SovereignRateRow[] {
  return SOVEREIGN_RATE_COUNTRIES.map((c) => ({
    id: c.id,
    nameKo: c.nameKo,
    nameEn: c.nameEn,
    policyRate: null,
    policyAsOf: null,
    shortYield: null,
    shortAsOf: null,
    longYield: null,
    longAsOf: null,
    spread: null,
    spreadAsOf: null,
    spreadLabelKo: c.spreadLabelKo,
    spreadLabelEn: c.spreadLabelEn,
    spreadSparkline: [],
  }));
}

/** 스모크 — FRED 단일 시리즈 읽기 가능 여부 */
export async function pingFredSeries(seriesId: string): Promise<boolean> {
  const reading = await fetchFredSeriesReading(seriesId, 3);
  return reading != null && reading.price != null;
}
