import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import {
  MEDIAZONA_CASUALTY_SEED,
  parseMediazonaHomepageCount,
  type MediazonaCasualtySnapshot,
} from "@/lib/mediazonaCasualties";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIVE_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "live",
  "mediazona-casualties.json",
);

async function readSeedFile(): Promise<MediazonaCasualtySnapshot> {
  try {
    const raw = await readFile(LIVE_PATH, "utf8");
    return { ...MEDIAZONA_CASUALTY_SEED, ...(JSON.parse(raw) as MediazonaCasualtySnapshot) };
  } catch {
    return MEDIAZONA_CASUALTY_SEED;
  }
}

async function scrapeLiveCount(): Promise<{ count: number; scrapedAt: string } | null> {
  try {
    const res = await fetch("https://en.zona.media/", {
      headers: { "User-Agent": "BraveNewWorld/1.0 (casualty attribution)" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const count = parseMediazonaHomepageCount(html);
    if (count == null) return null;
    return { count, scrapedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

/**
 * Mediazona × BBC 확인 전사 수 — 전선 HTML 마커용.
 * 라이브 스크레이프 성공 시 갱신, 실패 시 Kaggle 패널 시드.
 */
export async function GET() {
  const seed = await readSeedFile();
  const live = await scrapeLiveCount();

  const body: MediazonaCasualtySnapshot = live
    ? {
        ...seed,
        confirmedNamedDeaths: live.count,
        confirmedNamedDeathsAsOf: live.scrapedAt.slice(0, 10),
        confirmedNamedDeathsSource:
          "Mediazona x BBC Russian Service (en.zona.media homepage scrape)",
        liveScrapedAt: live.scrapedAt,
      }
    : { ...seed, liveScrapedAt: seed.liveScrapedAt ?? null };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
