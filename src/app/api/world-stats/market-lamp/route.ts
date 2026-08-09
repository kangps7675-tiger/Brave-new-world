import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { allEconInsightBriefs } from "@/data/econInsightBriefs";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { rewriteLampNarrative } from "@/lib/llm/lampNarrative";
import { getSotwApiKey, SOTW_ATTRIBUTION } from "@/lib/sotw";
import {
  composeMarketLampParagraphs,
  fetchSotwMacroDeep,
  fetchSotwMacroDeepMany,
} from "@/lib/sotwMacro";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashKeyToIndex(key: string, mod: number): number {
  if (mod <= 0) return 0;
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

/**
 * GET /api/world-stats/market-lamp?dayKey=daily-2026-07-16&lang=ko
 * Economy periodic lamp paragraphs enriched with live SOTW macros.
 */
export async function GET(request: Request) {
  if (!getSotwApiKey()) {
    return NextResponse.json({
      disabled: true,
      reason: "STATSOFTHEWORLD_API_KEY not set",
      attribution: SOTW_ATTRIBUTION,
      paragraphs: [] as string[],
    }, { headers: publicCacheHeaders(CDN_CACHE.worldStats) });
  }

  const { searchParams } = new URL(request.url);
  const dayKey = searchParams.get("dayKey")?.trim() || "daily";
  const lang = (searchParams.get("lang")?.trim() === "en" ? "en" : "ko") as LabelLanguage;
  const countryParam = searchParams.get("country")?.trim();
  const compare = searchParams.get("compare")?.trim();

  try {
    if (countryParam) {
      const hints = [countryParam, ...(compare ? compare.split(",").map((s) => s.trim()) : [])].filter(
        Boolean,
      );
      const macros = await fetchSotwMacroDeepMany(hints);
      return NextResponse.json({
        disabled: false,
        dayKey,
        countries: macros.map((m) => m.id ?? m.name),
        paragraphs: composeMarketLampParagraphs(macros, lang, {
          focusTitle: lang === "en" ? countryParam : undefined,
        }),
        macros,
        attribution: SOTW_ATTRIBUTION,
      }, { headers: publicCacheHeaders(CDN_CACHE.worldStats) });
    }

    const briefs = allEconInsightBriefs().filter((b) => Boolean(b.countryHint));
    if (briefs.length === 0) {
      return NextResponse.json({
        disabled: false,
        dayKey,
        paragraphs: [],
        attribution: SOTW_ATTRIBUTION,
      }, { headers: publicCacheHeaders(CDN_CACHE.worldStats) });
    }

    const primary = briefs[hashKeyToIndex(dayKey, briefs.length)]!;
    const secondary = briefs[hashKeyToIndex(`${dayKey}-b`, briefs.length)]!;
    const hints = [primary.countryHint!, secondary.countryHint!].filter(
      (h, i, arr) => arr.indexOf(h) === i,
    );

    // Prefer two distinct countries when possible
    let macros = await fetchSotwMacroDeepMany(hints);
    if (macros.length < 2 && briefs.length > 2) {
      const tertiary = briefs[hashKeyToIndex(`${dayKey}-c`, briefs.length)]!;
      if (tertiary.countryHint && !hints.includes(tertiary.countryHint)) {
        const extra = await fetchSotwMacroDeep(tertiary.countryHint);
        if (!extra.disabled && !extra.error) macros = [...macros, extra].slice(0, 2);
      }
    }

    const titleSeed = lang === "en" ? primary.titleEn : primary.titleKo;
    const koreanExtras =
      lang === "ko"
        ? primary.paragraphs.filter((p) => {
            const koChars = (p.match(/[\uac00-\ud7a3]/g) ?? []).length;
            const latin = (p.match(/[A-Za-z]/g) ?? []).length;
            return koChars >= 6 && koChars >= latin * 0.5;
          })
        : [];
    const draftParagraphs = composeMarketLampParagraphs(macros, lang, {
      focusTitle: titleSeed,
      koreanExtras,
    });
    const narrative = await rewriteLampNarrative({
      mode: "economy",
      lang,
      periodKey: dayKey,
      title: titleSeed,
      paragraphs: draftParagraphs,
    });

    return NextResponse.json({
      disabled: false,
      dayKey,
      focusNavId: primary.navId,
      focusTitle: narrative.title,
      impactLine: lang === "en" ? primary.impactLine : undefined,
      countries: macros.map((m) => m.name ?? m.id),
      paragraphs: narrative.paragraphs,
      llmEnhanced: narrative.llmEnhanced,
      model: narrative.model,
      macros,
      attribution: SOTW_ATTRIBUTION,
    }, { headers: publicCacheHeaders(CDN_CACHE.worldStats) });
  } catch (error) {
    return NextResponse.json(
      {
        disabled: false,
        error: publicErrorMessage(error, "market-lamp failed"),
        paragraphs: [],
        attribution: SOTW_ATTRIBUTION,
      },
      { status: 502 },
    );
  }
}
