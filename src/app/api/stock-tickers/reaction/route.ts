import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { enforceIpRateLimit, RATE_PRESETS } from "@/lib/apiRateLimit";
import {
  parseSearchParams,
  stockReactionQuerySchema,
} from "@/lib/apiQuerySchemas";
import { logApiRoute } from "@/lib/apiRouteLog";
import { isApiStubMode } from "@/lib/apiStubMode";
import {
  fetchDailyVolatilityPercent,
  fetchPriceNearTimestamp,
  fetchStockTickers,
  isUsMarketLikelyOpen,
} from "@/lib/stockTickersFetch";
import {
  THEATER_ASSETS,
  theaterAssetSymbols,
  type TheaterMarketFilter,
} from "@/lib/theaterAssets";
import {
  resolveMarketBacktraceMs,
  type EventMarketAnchor,
} from "@/lib/eventMarketAnchors";
import type { LogisticsChokepointId } from "@/data/majorEventTimeline";
import type { ViewerMode } from "@/lib/viewPackages";
import {
  verdictFromSigma,
  type MarketReactionItem,
  type MarketReactionVerdict,
} from "@/lib/stockTickers";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 전장당 연관 선물·지수 전부 (테이블 길이만큼) */
const MAX_SYMBOLS = 16;
/** 앵커 가격은 시간이 지나도 바뀌지 않는 과거 값이라 넉넉하게 캐시 */
const ANCHOR_TTL_MS = 6 * 60 * 60 * 1000;
const LIVE_TTL_MS = 10 * 60 * 1000;
/** 평소 변동폭(σ)은 하루 단위로 거의 안 변함 — 아주 길게 캐시 */
const VOLATILITY_TTL_MS = 24 * 60 * 60 * 1000;
/** 15분 버킷 — 최근 사건용. 일봉 앵커는 날짜 키로 캐시 */
const BUCKET_MS = 15 * 60 * 1000;
/** 시장 전체 흐름 제거용 벤치마크 (S&P500) */
const BENCHMARK_SYMBOL = "^GSPC";

function isTheaterMarketFilter(value: string): value is TheaterMarketFilter {
  return value in THEATER_ASSETS;
}

export async function GET(request: Request) {
  const limited = enforceIpRateLimit(request, RATE_PRESETS.stockReaction);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, stockReactionQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues },
      { status: 400 },
    );
  }

  const theaterRaw = parsed.data.theater;
  const theater: TheaterMarketFilter = isTheaterMarketFilter(theaterRaw)
    ? theaterRaw
    : "all";
  const ageMinutes = parsed.data.ageMinutes;
  const anchorDate = parsed.data.anchorDate ?? null;
  const anchorId = parsed.data.anchorId ?? null;
  const chokepointId = parsed.data.chokepointId;
  const viewerMode: ViewerMode = parsed.data.viewerMode;
  /** counterfactual = 모드별 타임테이블 카탈로그 / reaction = 뉴스 age만 */
  const mode = parsed.data.mode;

  if (isApiStubMode()) {
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      stub: true,
      items: [] as MarketReactionItem[],
      verdict: "pending" as MarketReactionVerdict,
      marketOpen: false,
      anchor: null as EventMarketAnchor | null,
      at: null as string | null,
      source: "age" as const,
    }, { headers: publicCacheHeaders(CDN_CACHE.stock) });
  }

  try {
    const backtrace =
      mode === "counterfactual"
        ? resolveMarketBacktraceMs({
            theater,
            ageMinutes,
            anchorDate,
            anchorId,
            chokepointId: (chokepointId as LogisticsChokepointId | null) || null,
            viewerMode,
          })
        : {
            atMs: Date.now() - ageMinutes * 60_000,
            anchor: null as EventMarketAnchor | null,
            source: "age" as const,
          };

    const preferred = backtrace.anchor?.preferredSymbols ?? [];
    const theaterSymbols = theaterAssetSymbols(theater, viewerMode);
    // 선호 심볼(금·유가·물류)은 전장 테이블에 없어도 우선 포함
    const symbols = [
      ...preferred,
      ...theaterSymbols.filter((s) => !preferred.includes(s)),
    ].slice(0, MAX_SYMBOLS);

    const atMs = backtrace.atMs;
    const ageMs = Date.now() - atMs;
    const useDailyBucket = ageMs > 5 * 24 * 60 * 60 * 1000;
    const bucketKey = useDailyBucket
      ? new Date(atMs).toISOString().slice(0, 10)
      : String(Math.round(atMs / BUCKET_MS) * BUCKET_MS);
    const marketOpen = isUsMarketLikelyOpen();

    const anchorPrice = (symbol: string) =>
      cachedFetchJson(`stock-price-at-${symbol}-${bucketKey}`, ANCHOR_TTL_MS, () =>
        fetchPriceNearTimestamp(symbol, atMs),
      );

    const [{ data: liveTickers }, priceAtEntries, volEntries, benchAnchor, benchNow] =
      await Promise.all([
        cachedFetchJson("stock-tickers-v10-fx-rates", LIVE_TTL_MS, fetchStockTickers),
        Promise.all(
          symbols.map(async (symbol) => {
            const { data } = await anchorPrice(symbol);
            return [symbol, data] as const;
          }),
        ),
        Promise.all(
          symbols.map(async (symbol) => {
            const { data } = await cachedFetchJson(
              `stock-vol-${symbol}`,
              VOLATILITY_TTL_MS,
              () => fetchDailyVolatilityPercent(symbol),
            );
            return [symbol, data] as const;
          }),
        ),
        anchorPrice(BENCHMARK_SYMBOL),
        cachedFetchJson(`stock-price-now-${BENCHMARK_SYMBOL}`, LIVE_TTL_MS, () =>
          fetchPriceNearTimestamp(BENCHMARK_SYMBOL, Date.now()),
        ),
      ]);

    const liveBySymbol = new Map(liveTickers.map((t) => [t.symbol, t.price]));
    const priceAtBySymbol = new Map(priceAtEntries);
    const volBySymbol = new Map(volEntries);

    /** 벤치마크가 같은 구간에 얼마나 움직였나 — 매크로 장세에서의 가짜 양성 제거 */
    const benchAt = benchAnchor.data;
    const benchLatest = benchNow.data;
    const benchmarkChangePercent =
      benchAt != null && benchLatest != null && benchAt !== 0
        ? ((benchLatest - benchAt) / benchAt) * 100
        : null;

    const items: MarketReactionItem[] = symbols.map((symbol) => {
      const priceAt = priceAtBySymbol.get(symbol) ?? null;
      const priceNow = liveBySymbol.get(symbol) ?? null;
      const changePercentSinceEvent =
        priceAt != null && priceNow != null && priceAt !== 0
          ? ((priceNow - priceAt) / priceAt) * 100
          : null;

      const excessChangePercent =
        changePercentSinceEvent != null && benchmarkChangePercent != null
          ? changePercentSinceEvent - benchmarkChangePercent
          : changePercentSinceEvent;

      const vol = volBySymbol.get(symbol) ?? null;
      const sigma =
        excessChangePercent != null && vol != null && vol > 0
          ? excessChangePercent / vol
          : null;

      return {
        symbol,
        priceAt,
        priceNow,
        changePercentSinceEvent,
        excessChangePercent,
        sigma,
      };
    });

    // 전장 전체 판정 = 가장 크게 움직인 종목 기준
    const sigmas = items
      .map((item) => item.sigma)
      .filter((s): s is number => s != null && Number.isFinite(s));
    const peakSigma =
      sigmas.length > 0
        ? sigmas.reduce((max, s) => (Math.abs(s) > Math.abs(max) ? s : max), sigmas[0]!)
        : null;
    const verdict = verdictFromSigma(peakSigma, marketOpen);

    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      items,
      verdict,
      peakSigma,
      benchmarkChangePercent,
      marketOpen,
      at: new Date(atMs).toISOString(),
      source: backtrace.source,
      preferredSymbols: preferred,
      anchor: backtrace.anchor
        ? {
            id: backtrace.anchor.id,
            theater: backtrace.anchor.theater,
            anchorDate: backtrace.anchor.anchorDate,
            labelKo: backtrace.anchor.labelKo,
            labelEn: backtrace.anchor.labelEn,
            preferredSymbols: backtrace.anchor.preferredSymbols,
            domain: backtrace.anchor.domain ?? null,
            chokepointId: backtrace.anchor.chokepointId ?? null,
          }
        : null,
    }, { headers: publicCacheHeaders(CDN_CACHE.stock) });
  } catch (error) {
    const message = publicErrorMessage(error, "market-reaction failed");
    logApiRoute("/api/stock-tickers/reaction", "error", "fetch_failed", { message });
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        items: [] as MarketReactionItem[],
        verdict: "pending" as MarketReactionVerdict,
        marketOpen: false,
        anchor: null,
        at: null,
        source: "age",
        error: message,
      },
      { status: 502 },
    );
  }
}
