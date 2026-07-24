import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStubResponse } from "@/lib/apiStub";
import { parseSearchParams } from "@/lib/apiQuerySchemas";
import {
  readBriefingStatsFromD1,
  readBriefingStatsFromIngestWorker,
  type BriefingPeriodStats,
} from "@/lib/briefingPeriodStats";
import { rewriteLampNarrative } from "@/lib/llm/lampNarrative";
import { buildBriefingFromStats } from "@/lib/news/periodicBriefing";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BRIEFING_CDN = publicCacheHeaders(CDN_CACHE.briefing);

const briefingStatsQuerySchema = z
  .object({
    key: z.string().min(3).max(64).optional(),
    tier: z.enum(["daily", "weekly", "monthly"]).optional(),
    lang: z.enum(["ko", "en"]).optional(),
    viewerMode: z.enum(["conflict", "economy"]).optional(),
  })
  .refine((v) => Boolean(v.key || v.tier), {
    message: "Provide key or tier",
  });

/**
 * 일/주/월 브리핑용 D1 집계 — LLM 없음.
 * D1 바인딩 우선, 없으면 cron 워커 /briefing-stats 폴백.
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("briefing-stats", request);
  if (stub) return stub;

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, briefingStatsQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, stats: null },
      { status: 400 },
    );
  }

  const { key, tier, lang, viewerMode } = parsed.data;
  const respond = async (
    stats: BriefingPeriodStats | null,
    source: "d1" | "ingest-worker" | "empty",
  ) => {
    let briefing = null;
    if (stats && tier && lang && viewerMode) {
      const draft = buildBriefingFromStats(
        stats,
        tier,
        stats.periodKey,
        lang,
        viewerMode,
      );
      if (draft) {
        const rewritten = await rewriteLampNarrative({
          mode: viewerMode,
          lang,
          periodKey: stats.periodKey,
          title: draft.title,
          paragraphs: draft.paragraphs,
        });
        briefing = {
          ...draft,
          title: rewritten.title,
          paragraphs: rewritten.paragraphs,
          llmEnhanced: rewritten.llmEnhanced,
          model: rewritten.model,
        };
      }
    }
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        source,
        stats,
        briefing,
      },
      { headers: BRIEFING_CDN },
    );
  };

  const fromD1 = await readBriefingStatsFromD1({ key, tier });
  if (fromD1) {
    return respond(fromD1, "d1");
  }

  const fromWorker = await readBriefingStatsFromIngestWorker({ key, tier });
  return respond(fromWorker, fromWorker ? "ingest-worker" : "empty");
}
