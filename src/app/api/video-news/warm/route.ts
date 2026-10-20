import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { authorizeCronRequest } from "@/lib/auth/cronAuth";
import { NextResponse } from "next/server";
import {
  buildAndCacheVideoNews,
  parseLangParam,
  parsePackagesParam,
  videoNewsCacheKey,
  videoNewsServerFetchMax,
} from "@/lib/news/videoNewsService";
import { videoTopicForPackages } from "@/lib/news/videoFeedCatalog";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewPackageId } from "@/lib/viewPackages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

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
 * Cron 워밍: YouTube Atom 메타 → D1.
 * POST /api/video-news/warm
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
  const max = videoNewsServerFetchMax();

  const packageSets = onlyPackages ? [onlyPackages] : DEFAULT_PACKAGES;
  const langs = onlyLang ? [onlyLang] : DEFAULT_LANGS;

  const startedAt = new Date().toISOString();
  const results: Array<{
    cacheKey: string;
    ok: boolean;
    count?: number;
    error?: string;
  }> = [];

  const seen = new Set<string>();
  for (const packages of packageSets) {
    for (const lang of langs) {
      const topic = videoTopicForPackages(packages);
      const cacheKey = videoNewsCacheKey(topic, lang);
      if (seen.has(cacheKey)) continue;
      seen.add(cacheKey);
      try {
        const payload = await buildAndCacheVideoNews({
          topic,
          lang,
          packages,
          max,
        });
        results.push({ cacheKey, ok: true, count: payload.items.length });
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
