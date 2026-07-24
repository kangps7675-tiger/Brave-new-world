import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import {
  buildFirmsAreaUrl,
  clampBbox,
  getFirmsMapKey,
  isFirmsLiveEnabled,
  parseFirmsCsv,
} from "@/lib/firmsParse";
import { readFirmsFromD1, readFirmsFromIngestWorker } from "@/lib/d1LiveSnapshots";
import { firmsFiresQuerySchema, parseSearchParams } from "@/lib/apiQuerySchemas";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 3 * 60 * 1000;
/** 클라이언트 firmsLiveFetchMax와 맞춤 — query max 무시 상한 */
const FIRMS_SERVER_HARD_CAP = 900;
const FIRMS_CDN = publicCacheHeaders(CDN_CACHE.firms);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, firmsFiresQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, fires: [] },
      { status: 400 },
    );
  }
  const q = parsed.data;
  const bbox =
    q.west != null && q.south != null && q.east != null && q.north != null
      ? clampBbox(q.west, q.south, q.east, q.north)
      : clampBbox(-180, -90, 180, 90);
  const dayRange = q.days;
  const source = q.source;
  const max = Math.min(q.max, FIRMS_SERVER_HARD_CAP);
  const preferLive = Boolean(q.live);

  // Cron → D1 스냅샷 우선 (NASA 중복 호출·CSV 파싱 생략)
  if (!preferLive) {
    const fromD1 = await readFirmsFromD1({ ...bbox, max });
    if (fromD1 && fromD1.count > 0) {
      return NextResponse.json(
        {
          receivedAt: fromD1.receivedAt,
          cached: true,
          count: fromD1.count,
          fires: fromD1.fires,
          source: "d1",
          bbox,
          attribution: "NASA FIRMS (via Cloudflare D1 cron ingest)",
        },
        { headers: FIRMS_CDN },
      );
    }
    // D1 바인딩이 없으면(Vercel 등) cron 워커 공개 엔드포인트로 폴백
    const fromWorker = await readFirmsFromIngestWorker({ ...bbox, max });
    if (fromWorker && fromWorker.count > 0) {
      return NextResponse.json(
        {
          receivedAt: fromWorker.receivedAt,
          cached: true,
          count: fromWorker.count,
          fires: fromWorker.fires,
          source: "ingest-worker",
          bbox,
          attribution: "NASA FIRMS (via Cloudflare cron worker)",
        },
        { headers: FIRMS_CDN },
      );
    }
    // D1 비면 NASA 직접 호출 금지 — cron 채움 또는 ?live=1
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        fires: [],
        count: 0,
        source: "d1",
        waiting: true,
        bbox,
        attribution: "NASA FIRMS — D1 empty; wait for cron or ?live=1",
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  if (!isFirmsLiveEnabled()) {
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        fires: [],
        count: 0,
        stub: true,
        error: "FIRMS_MAP_KEY 또는 NASA_FIRMS_API_KEY가 서버 환경변수에 없습니다.",
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  const mapKey = getFirmsMapKey()!;
  const cacheKey = `firms:${source}:${bbox.west.toFixed(1)},${bbox.south.toFixed(1)},${bbox.east.toFixed(1)},${bbox.north.toFixed(1)}:${dayRange}`;

  try {
    const { data, cached } = await cachedFetchJson(cacheKey, TTL_MS, async () => {
      const url = buildFirmsAreaUrl({ mapKey, ...bbox, dayRange, source });
      const response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "text/csv" },
      });
      const csv = await response.text();
      if (!response.ok) {
        throw new Error(`FIRMS HTTP ${response.status}: ${csv.slice(0, 160)}`);
      }
      const head = csv.trim().slice(0, 120).toLowerCase();
      if (
        head.startsWith("<!DOCTYPE") ||
        head.includes("invalid") ||
        head.includes("error") ||
        head.includes("unauthorized") ||
        !head.includes("latitude")
      ) {
        throw new Error(`FIRMS unexpected response: ${csv.trim().slice(0, 160)}`);
      }
      return parseFirmsCsv(csv, max);
    });

    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        cached,
        count: data.length,
        fires: data,
        source,
        bbox,
        attribution: "NASA FIRMS",
      },
      { headers: FIRMS_CDN },
    );
  } catch (error) {
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        fires: [],
        count: 0,
        error: error instanceof Error ? error.message : "FIRMS fetch failed",
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
