import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { authorizeCronRequest } from "@/lib/auth/cronAuth";
import { NextResponse } from "next/server";
import {
  buildAndCacheNewsStream,
  newsCacheKey,
  parseLangParam,
  parsePackagesParam,
} from "@/lib/news/newsStreamService";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewPackageId } from "@/lib/viewPackages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_PACKAGES: Array<ViewPackageId[] | undefined> = [
  undefined,
  ["conflict-watch"],
  ["geo-trader"],
  ["frontline-live"],
];

const DEFAULT_LANGS: LabelLanguage[] = ["ko", "en"];

function authorize(request: Request): boolean {
  return authorizeCronRequest(request, ["INGEST_CRON_SECRET", "NEWS_WARM_SECRET"]);
}

/**
 * Cron / 수동 워밍: RSS를 미리 빌드해 D1에 넣는다.
 * POST /api/news-stream/warm
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const onlyPackages = parsePackagesParam(url.searchParams.get("packages"));
  const onlyLang = url.searchParams.get("lang")
    ? parseLangParam(url.searchParams.get("lang"))
    : null;

  const packageSets = onlyPackages ? [onlyPackages] : DEFAULT_PACKAGES;
  const langs = onlyLang ? [onlyLang] : DEFAULT_LANGS;

  const startedAt = new Date().toISOString();
  const results: Array<{
    cacheKey: string;
    ok: boolean;
    tier1?: number;
    tier2?: number;
    tier3?: number;
    error?: string;
  }> = [];

  for (const packages of packageSets) {
    for (const lang of langs) {
      const cacheKey = newsCacheKey(packages, lang);
      try {
        const payload = await buildAndCacheNewsStream({ packages, lang });
        results.push({
          cacheKey,
          ok: true,
          tier1: payload.stats.tier1,
          tier2: payload.stats.tier2,
          tier3: payload.stats.tier3,
        });
      } catch (error) {
        results.push({
          cacheKey,
          ok: false,
          error: publicErrorMessage(error, "warm failed"),
        });
      }
    }
  }

  const ok = results.every((r) => r.ok);
  return NextResponse.json(
    {
      ok,
      startedAt,
      finishedAt: new Date().toISOString(),
      warmed: results.length,
      results,
    },
    { status: ok ? 200 : 207 },
  );
}

export async function GET(request: Request) {
  return POST(request);
}
