import { NextResponse } from "next/server";

export const runtime = "nodejs";

export interface FreightIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  unit: string;
  updatedAt: string;
}

type YahooChartPayload = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: {
      code?: string;
      description?: string;
    } | null;
  };
};

const SHIPPING_ASSETS = [
  { symbol: "BDRY", name: "건화물 운임 ETF", unit: "USD" },
  { symbol: "ZIM", name: "ZIM 컨테이너 해운", unit: "USD" },
  { symbol: "SBLK", name: "스타벌크 벌크선", unit: "USD" },
] as const;

function round(value: number): number {
  return Number(value.toFixed(2));
}

async function fetchFreightIndex(
  asset: (typeof SHIPPING_ASSETS)[number],
): Promise<FreightIndex> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${asset.symbol}` +
    "?interval=1d&range=5d";
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Yahoo ${asset.symbol}: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as YahooChartPayload;
  const result = payload.chart?.result?.[0];
  const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  if (closes.length < 2) {
    const detail = payload.chart?.error?.description;
    throw new Error(
      `Yahoo ${asset.symbol}: ${detail || "latest and previous closes unavailable"}`,
    );
  }

  const value = closes[closes.length - 1];
  const previous = closes[closes.length - 2];
  const change = value - previous;
  const timestamps = result?.timestamp ?? [];
  const latestTimestamp = timestamps[timestamps.length - 1];

  return {
    ...asset,
    value: round(value),
    change: round(change),
    changePercent: previous === 0 ? 0 : round((change / previous) * 100),
    updatedAt:
      typeof latestTimestamp === "number"
        ? new Date(latestTimestamp * 1000).toISOString()
        : new Date().toISOString(),
  };
}

export async function GET() {
  const settled = await Promise.all(
    SHIPPING_ASSETS.map(async (asset) => {
      try {
        return await fetchFreightIndex(asset);
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : `Yahoo ${asset.symbol} failed`,
        };
      }
    }),
  );

  const indices = settled.filter((item): item is FreightIndex => !("error" in item));
  const errors = settled
    .filter((item): item is { error: string } => "error" in item)
    .map((item) => item.error);

  if (indices.length === 0) {
    return NextResponse.json(
      {
        indices: [],
        updatedAt: new Date().toISOString(),
        error: errors[0] ?? "freight-indices failed",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    indices,
    updatedAt: new Date().toISOString(),
    ...(errors.length > 0 ? { partialErrors: errors } : {}),
  });
}
