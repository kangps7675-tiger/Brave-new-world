import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";
import {
  gpsJamCsvUrl,
  gpsJamDateUtc,
  parseGpsJamCsv,
  type GpsJamCell,
} from "@/lib/gpsJam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GPSJam.org 일별 H3 CSV 프록시.
 * 상류는 하루 1회(~04:00 UTC) 발행 — 메모리 6h + CDN 6/12h. 초·분 폴링 금지.
 * 비공식 정적 피드 — User-Agent에 사이트 식별 명시(익명 크롤러 위장 금지).
 */
const TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_KEY = "gpsjam:h3_4";
const GPSJAM_CDN = publicCacheHeaders(CDN_CACHE.gpsjam);
const ATTRIBUTION =
  "GPS interference: GPSJam.org (John Wiseman) · ADS-B Exchange";
const USER_AGENT =
  "BraveNewWorld/1.0 (+https://bravenew.world; contact: kangps7675@gmail.com; non-commercial situational dashboard; GPSJam daily CSV)";

type GpsJamSnapshot = {
  date: string;
  daysAgo: number;
  cells: GpsJamCell[];
  attribution: string;
};

async function fetchCsv(daysAgo: number): Promise<{ date: string; text: string } | null> {
  const date = gpsJamDateUtc(daysAgo);
  const url = gpsJamCsvUrl(date);
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/csv,text/plain,*/*",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text || text.length < 32) return null;
  // HTML 에러 페이지 방어
  if (/^\s*</.test(text) || /<!DOCTYPE/i.test(text)) return null;
  return { date, text };
}

async function loadSnapshot(): Promise<GpsJamSnapshot> {
  // 전일 우선, 발행 지연 시 전전일 폴백
  let hit = await fetchCsv(1);
  let daysAgo = 1;
  if (!hit) {
    hit = await fetchCsv(2);
    daysAgo = 2;
  }
  if (!hit) {
    throw new Error("GPSJam CSV unavailable for yesterday and day-before");
  }
  const cells = parseGpsJamCsv(hit.text); // MIN_AIRCRAFT + low 제외
  return {
    date: hit.date,
    daysAgo,
    cells,
    attribution: ATTRIBUTION,
  };
}

export async function GET() {
  try {
    const { data, cached } = await cachedFetchJson(CACHE_KEY, TTL_MS, loadSnapshot);
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        cached,
        date: data.date,
        daysAgo: data.daysAgo,
        cellCount: data.cells.length,
        cells: data.cells,
        attribution: data.attribution,
      },
      { headers: GPSJAM_CDN },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "GPSJam fetch failed";
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        cached: false,
        date: null,
        daysAgo: null,
        cellCount: 0,
        cells: [] as GpsJamCell[],
        attribution: ATTRIBUTION,
        error: message,
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
