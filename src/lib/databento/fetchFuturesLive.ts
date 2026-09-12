/**
 * Databento Historical HTTP — ohlcv-1s → 최근 60초 대비 % (초단위 SPIKE용).
 * 키 없거나 실패 시 빈 배열. 프로세스 메모리 캐시 TTL ~1s.
 */

import { getDatabentoApiKey } from "@/lib/databento/env";
import {
  databentoInstrumentForYahoo,
  DATABENTO_FUTURES_YAHOO_SYMBOLS,
  type DatabentoFuturesYahooSymbol,
} from "@/lib/databento/symbolMap";
import {
  FUTURES_LIVE_CACHE_TTL_MS,
  FUTURES_LIVE_CHANGE_WINDOW_SEC,
  FUTURES_LIVE_LOOKBACK_SEC,
} from "@/lib/databento/futuresLiveConstants";
import { tickerDisplayName } from "@/lib/stockTickers";

export {
  FUTURES_LIVE_CHANGE_WINDOW_SEC,
  FUTURES_LIVE_LOOKBACK_SEC,
} from "@/lib/databento/futuresLiveConstants";

const HIST_URL = "https://hist.databento.com/v0/timeseries.get_range";
const FETCH_TIMEOUT_MS = 12_000;

export type FuturesLiveTicker = {
  symbol: DatabentoFuturesYahooSymbol;
  label: string;
  price: number | null;
  changePercent: number | null;
  changeWindowSec: number;
  asOf: string | null;
};

type OhlcvJsonRow = {
  symbol?: string;
  close?: number | string;
  ts_event?: string | number;
};

type CacheEntry = {
  at: number;
  tickers: FuturesLiveTicker[];
};

let cache: CacheEntry | null = null;
let inflight: Promise<FuturesLiveTicker[]> | null = null;

function basicAuthHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`, "utf8").toString("base64")}`;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizePrice(raw: number): number {
  if (Math.abs(raw) >= 1e6) return raw / 1e9;
  return raw;
}

/** Databento continuous symbol → Yahoo */
function yahooFromDatabentoSymbol(dbSymbol: string): DatabentoFuturesYahooSymbol | null {
  const bare = dbSymbol.split(".")[0] ?? dbSymbol;
  for (const yahoo of DATABENTO_FUTURES_YAHOO_SYMBOLS) {
    const inst = databentoInstrumentForYahoo(yahoo);
    if (!inst) continue;
    if (inst.symbol === dbSymbol || inst.symbol.startsWith(`${bare}.`)) {
      return yahoo;
    }
  }
  const guess = `${bare}=F`;
  if ((DATABENTO_FUTURES_YAHOO_SYMBOLS as readonly string[]).includes(guess)) {
    return guess as DatabentoFuturesYahooSymbol;
  }
  return null;
}

function parseTsMs(ts: string | number | undefined): number | null {
  if (ts == null) return null;
  if (typeof ts === "number" && Number.isFinite(ts)) {
    // ns → ms if huge
    if (ts > 1e15) return Math.floor(ts / 1e6);
    if (ts > 1e12) return Math.floor(ts / 1e3);
    return ts;
  }
  const parsed = Date.parse(String(ts));
  return Number.isFinite(parsed) ? parsed : null;
}

type Bar = { tsMs: number; close: number };

async function fetchOhlcv1sBatch(apiKey: string): Promise<Map<DatabentoFuturesYahooSymbol, Bar[]>> {
  const byYahoo = new Map<DatabentoFuturesYahooSymbol, Bar[]>();
  const instruments = DATABENTO_FUTURES_YAHOO_SYMBOLS.map((y) => ({
    yahoo: y,
    inst: databentoInstrumentForYahoo(y),
  })).filter((x): x is { yahoo: DatabentoFuturesYahooSymbol; inst: NonNullable<ReturnType<typeof databentoInstrumentForYahoo>> } =>
    Boolean(x.inst),
  );
  if (instruments.length === 0) return byYahoo;

  const dataset = instruments[0]!.inst.dataset;
  const symbols = instruments.map((x) => x.inst.symbol).join(",");
  const end = new Date();
  const start = new Date(end.getTime() - FUTURES_LIVE_LOOKBACK_SEC * 1000);

  const body = new URLSearchParams({
    dataset,
    symbols,
    stype_in: "continuous",
    schema: "ohlcv-1s",
    encoding: "json",
    start: start.toISOString(),
    end: end.toISOString(),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(HIST_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(apiKey),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: controller.signal,
    });
    if (!res.ok) return byYahoo;

    const text = await res.text();
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const row = JSON.parse(trimmed) as OhlcvJsonRow;
        const closeRaw = finiteNumber(row.close);
        const tsMs = parseTsMs(row.ts_event);
        if (closeRaw == null || tsMs == null) continue;
        const yahoo = row.symbol
          ? yahooFromDatabentoSymbol(row.symbol)
          : null;
        if (!yahoo) continue;
        const list = byYahoo.get(yahoo) ?? [];
        list.push({ tsMs, close: normalizePrice(closeRaw) });
        byYahoo.set(yahoo, list);
      } catch {
        /* skip */
      }
    }
  } catch {
    return byYahoo;
  } finally {
    clearTimeout(timer);
  }

  for (const [k, bars] of byYahoo) {
    bars.sort((a, b) => a.tsMs - b.tsMs);
    byYahoo.set(k, bars);
  }
  return byYahoo;
}

function changeOverWindow(bars: Bar[], windowSec: number): {
  price: number | null;
  changePercent: number | null;
  asOf: string | null;
} {
  if (bars.length === 0) return { price: null, changePercent: null, asOf: null };
  const latest = bars[bars.length - 1]!;
  const targetTs = latest.tsMs - windowSec * 1000;
  let baseline = bars[0]!;
  for (let i = bars.length - 1; i >= 0; i -= 1) {
    const b = bars[i]!;
    if (b.tsMs <= targetTs) {
      baseline = b;
      break;
    }
  }
  // 창보다 짧은 시리즈면 첫 봉 대비
  const changePercent =
    baseline.close !== 0
      ? ((latest.close - baseline.close) / baseline.close) * 100
      : null;
  return {
    price: latest.close,
    changePercent,
    asOf: new Date(latest.tsMs).toISOString(),
  };
}

async function loadFuturesLiveTickers(): Promise<FuturesLiveTicker[]> {
  const apiKey = getDatabentoApiKey();
  if (!apiKey) return [];

  const byYahoo = await fetchOhlcv1sBatch(apiKey);
  const out: FuturesLiveTicker[] = [];
  for (const yahoo of DATABENTO_FUTURES_YAHOO_SYMBOLS) {
    const bars = byYahoo.get(yahoo) ?? [];
    const { price, changePercent, asOf } = changeOverWindow(
      bars,
      FUTURES_LIVE_CHANGE_WINDOW_SEC,
    );
    out.push({
      symbol: yahoo,
      label: tickerDisplayName(yahoo, "en"),
      price,
      changePercent,
      changeWindowSec: FUTURES_LIVE_CHANGE_WINDOW_SEC,
      asOf,
    });
  }
  return out;
}

/** 캐시+인플라이트 합친 초단위 선물 스냅샷 */
export async function fetchFuturesLiveTickersCached(): Promise<FuturesLiveTicker[]> {
  const now = Date.now();
  if (cache && now - cache.at < FUTURES_LIVE_CACHE_TTL_MS) {
    return cache.tickers;
  }
  if (inflight) return inflight;

  inflight = loadFuturesLiveTickers()
    .then((tickers) => {
      cache = { at: Date.now(), tickers };
      return tickers;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
