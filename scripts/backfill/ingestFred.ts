/**
 * FRED 일별 시리즈 → fred_daily.
 * API 키: FRED_API_KEY (없으면 스킵 — 가격 outcome은 만들지 않음).
 *
 *   npx tsx scripts/backfill/ingestFred.ts
 */
import { getDb } from "@/db";
import { fredDaily } from "@/db/schema";
import { FRED_SERIES_MAP } from "@/lib/straitReplay/fredSeriesMap";

async function fetchSeries(
  seriesId: string,
  apiKey: string,
): Promise<Array<{ date: string; value: number }>> {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("observation_start", "2018-01-01");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId} HTTP ${res.status}`);
  const json = (await res.json()) as {
    observations?: Array<{ date: string; value: string }>;
  };
  const out: Array<{ date: string; value: number }> = [];
  for (const o of json.observations ?? []) {
    if (o.value === ".") continue;
    const v = Number(o.value);
    if (!Number.isFinite(v)) continue;
    out.push({ date: o.date, value: v });
  }
  return out;
}

async function main() {
  const apiKey = process.env.FRED_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[ingestFred] FRED_API_KEY missing — skip (no fabricated prices)");
    return;
  }
  const db = await getDb();
  const vintage = new Date().toISOString();
  let total = 0;
  for (const entry of FRED_SERIES_MAP) {
    const rows = await fetchSeries(entry.fredSeriesId, apiKey);
    for (const r of rows) {
      await db
        .insert(fredDaily)
        .values({
          seriesId: entry.fredSeriesId,
          date: r.date,
          value: r.value,
          sourceVintage: vintage,
        })
        .onConflictDoUpdate({
          target: [fredDaily.seriesId, fredDaily.date],
          set: { value: r.value, sourceVintage: vintage },
        });
      total += 1;
    }
    console.log(`[ingestFred] ${entry.fredSeriesId}: ${rows.length}`);
  }
  console.log(`[ingestFred] upserted ${total} observations`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
