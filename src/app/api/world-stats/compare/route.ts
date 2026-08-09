import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { getSotwApiKey, SOTW_ATTRIBUTION } from "@/lib/sotw";
import { composeMarketLampParagraphs, fetchSotwMacroDeepMany } from "@/lib/sotwMacro";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/world-stats/compare?countries=USA,CHN,DEU&lang=ko
 * Side-by-side macro compare for geoeconomics panels.
 */
export async function GET(request: Request) {
  if (!getSotwApiKey()) {
    return NextResponse.json({
      disabled: true,
      reason: "STATSOFTHEWORLD_API_KEY not set",
      attribution: SOTW_ATTRIBUTION,
    }, { headers: publicCacheHeaders(CDN_CACHE.worldStats) });
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("countries")?.trim() || searchParams.get("country")?.trim();
  if (!raw) {
    return NextResponse.json({ error: "countries query required (comma-separated)" }, { status: 400 });
  }
  const lang = (searchParams.get("lang")?.trim() === "en" ? "en" : "ko") as LabelLanguage;
  const hints = raw.split(/[,|]/).map((s) => s.trim()).filter(Boolean);

  try {
    const macros = await fetchSotwMacroDeepMany(hints);
    return NextResponse.json({
      disabled: false,
      count: macros.length,
      countries: macros.map((m) => ({
        id: m.id,
        name: m.name,
        gdpUsd: m.gdpUsd,
        gdpPerCapitaUsd: m.gdpPerCapitaUsd,
        gdpGrowthPct: m.gdpGrowthPct,
        inflationPct: m.inflationPct,
        unemploymentPct: m.unemploymentPct,
        tradePctGdp: m.tradePctGdp,
        milSpendPctGdp: m.milSpendPctGdp,
        currentAccountPctGdp: m.currentAccountPctGdp,
        govDebtPctGdp: m.govDebtPctGdp,
        inflationShock: m.shocks.inflation
          ? {
              latest: m.shocks.inflation.latest,
              deltaPp: m.shocks.inflation.deltaPp,
              rangePp: m.shocks.inflation.rangePp,
              latestYear: m.shocks.inflation.latestYear,
            }
          : null,
        growthShock: m.shocks.growth
          ? {
              latest: m.shocks.growth.latest,
              deltaPp: m.shocks.growth.deltaPp,
              rangePp: m.shocks.growth.rangePp,
              latestYear: m.shocks.growth.latestYear,
            }
          : null,
      })),
      paragraphs: composeMarketLampParagraphs(macros, lang),
      attribution: SOTW_ATTRIBUTION,
    }, { headers: publicCacheHeaders(CDN_CACHE.worldStats) });
  } catch (error) {
    return NextResponse.json(
      {
        disabled: false,
        error: publicErrorMessage(error, "compare failed"),
        attribution: SOTW_ATTRIBUTION,
      },
      { status: 502 },
    );
  }
}
