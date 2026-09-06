/**
 * Databento Historical HTTP — ohlcv-1d → StockTickerItem 필드.
 * 키 없거나 실패 시 null (호출부가 Yahoo 폴백).
 */

import { getDatabentoApiKey } from "@/lib/databento/env";
import {
  databentoInstrumentForYahoo,
  DATABENTO_FUTURES_YAHOO_SYMBOLS,
  type DatabentoFuturesYahooSymbol,
} from "@/lib/databento/symbolMap";
import type { StockTickerItem } from "@/lib/stockTickers";

const HIST_URL = "https://hist.databento.com/v0/timeseries.get_range";
const FETCH_TIMEOUT_MS = 18_000;
const SPARK_DAYS = 40;

type OhlcvJsonRow = {
  symbol?: string;
  close?: number | string;
  ts_event?: string;
};

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

/** DBN fixed-point 잔여값이면 스케일 다운 */
function normalizePrice(raw: number): number {
  if (Math.abs(raw) >= 1e6) return raw / 1e9;
  return raw;
}

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function fetchOhlcv1d(
  apiKey: string,
  yahooSymbol: DatabentoFuturesYahooSymbol,
): Promise<number[]> {
  const inst = databentoInstrumentForYahoo(yahooSymbol);
  if (!inst) return [];

  const start = isoDateDaysAgo(SPARK_DAYS + 5);
  const end = isoDateDaysAgo(0);
  const body = new URLSearchParams({
    dataset: inst.dataset,
    symbols: inst.symbol,
    stype_in: inst.stypeIn,
    schema: "ohlcv-1d",
    encoding: "json",
    start,
    end,
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
    if (!res.ok) {
      return [];
    }
    const text = await res.text();
    const closes: number[] = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const row = JSON.parse(trimmed) as OhlcvJsonRow;
        const close = finiteNumber(row.close);
        if (close != null) closes.push(normalizePrice(close));
      } catch {
        // skip non-json lines
      }
    }
    return closes;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function toTickerItem(
  yahooSymbol: DatabentoFuturesYahooSymbol,
  label: string,
  sparkline: number[],
): StockTickerItem | null {
  if (sparkline.length < 1) return null;
  const price = sparkline[sparkline.length - 1]!;
  const prev = sparkline.length >= 2 ? sparkline[sparkline.length - 2]! : null;
  const changePercent =
    prev != null && prev !== 0 ? ((price - prev) / prev) * 100 : null;
  return {
    symbol: yahooSymbol,
    label,
    price,
    changePercent,
    changeBasis: "prev-day",
    asOf: new Date().toISOString().slice(0, 10),
    sparkline,
  };
}

/**
 * 화이트리스트 선물에 대해 Databento ohlcv-1d를 가져와 Yahoo 심볼 키로 반환.
 * 부분 실패 시 성공분만 포함.
 */
export async function fetchDatabentoFuturesTickers(
  labelBySymbol: Map<string, string>,
): Promise<Map<string, StockTickerItem>> {
  const apiKey = getDatabentoApiKey();
  const out = new Map<string, StockTickerItem>();
  if (!apiKey) return out;

  await Promise.all(
    DATABENTO_FUTURES_YAHOO_SYMBOLS.map(async (yahooSymbol) => {
      const sparkline = await fetchOhlcv1d(apiKey, yahooSymbol);
      const label = labelBySymbol.get(yahooSymbol) ?? yahooSymbol;
      const item = toTickerItem(yahooSymbol, label, sparkline);
      if (item) out.set(yahooSymbol, item);
    }),
  );

  return out;
}
