import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import {
  buildMacroBriefing,
  flattenNewsStreamItems,
  type MacroDomain,
  type MacroRssInputItem,
} from "@/lib/macroBriefing";
import { loadMacroGdeltEvents } from "@/lib/macroBriefing/loadGdelt";
import { parseLangParam, resolveNewsStream } from "@/lib/news/newsStreamService";
import type { NewsStreamItem, NewsStreamPayload } from "@/lib/news/types";
import type { ViewPackageId } from "@/lib/viewPackages";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function parseDomain(raw: string | null): MacroDomain {
  return raw === "econ" ? "econ" : "geo";
}

function packagesForDomain(domain: MacroDomain): ViewPackageId[] {
  return domain === "econ" ? ["geo-trader"] : ["conflict-watch"];
}

function toMacroRss(item: NewsStreamItem & Partial<MacroRssInputItem>): MacroRssInputItem {
  return {
    id: item.id,
    title: item.title,
    titleKo: item.titleKo,
    link: item.link,
    source: item.source,
    publisher: item.publisher,
    pubDate: item.pubDate,
    theater: item.theater,
    trustTier: item.trustTier,
    feedTopic: item.feedTopic,
    econGenre: item.econGenre,
    summary: item.summary,
    bodyKo: item.bodyKo,
    urgencyScore: item.urgencyScore,
    breakingGrade: item.breakingGrade,
    ageMinutes: item.ageMinutes,
  };
}

function flattenPayload(payload: NewsStreamPayload): MacroRssInputItem[] {
  return flattenNewsStreamItems({
    hero: payload.hero ? toMacroRss(payload.hero) : null,
    flashHeroes: (payload.flashHeroes ?? []).map(toMacroRss),
    verified: payload.verified.map(toMacroRss),
    stateMedia: payload.stateMedia.map(toMacroRss),
  });
}

/**
 * GET /api/macro-briefing?domain=geo|econ&lang=ko|en
 * RSS news-stream + GDELT density → 거시 토픽 Top 5
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const domain = parseDomain(url.searchParams.get("domain"));
    const lang = parseLangParam(url.searchParams.get("lang"));
    const packages = packagesForDomain(domain);

    const [news, gdelt] = await Promise.all([
      resolveNewsStream({ packages, lang }),
      loadMacroGdeltEvents(800),
    ]);

    const payload = buildMacroBriefing({
      domain,
      lang,
      rssItems: flattenPayload(news.payload),
      gdeltEvents: gdelt.events,
      newsSource: news.source,
      gdeltSource: gdelt.source,
    });

    return NextResponse.json(payload, {
      headers: {
        ...publicCacheHeaders(CDN_CACHE.briefing),
        "X-Macro-News-Source": news.source,
        "X-Macro-Gdelt-Source": gdelt.source,
      },
    });
  } catch (error) {
    const message = publicErrorMessage(error, "거시 요약본 로드 실패");
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        domain: "geo",
        lang: "ko",
        topics: [],
        sources: { news: "empty", gdelt: "empty" },
        error: message,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
