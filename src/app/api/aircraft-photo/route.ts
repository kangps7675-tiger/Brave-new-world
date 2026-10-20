import { NextRequest, NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 항공기 클릭 상세 카드용 사진 조회 — planespotters.net 공개 API(무료·키 불필요) 프록시.
 * 브라우저에서 직접 호출하면 CORS로 막히므로 서버에서 중계한다.
 * @see https://www.planespotters.net/photo/api
 */

const TTL_MS = 24 * 60 * 60 * 1000; // 사진은 자주 안 바뀜 — 24h 캐시
const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT = "BraveNewWorld/1.0 (+https://bravenew.world; aircraft photo lookup)";

export type AircraftPhotoResult = {
  photoUrl: string | null;
  photoUrlLarge: string | null;
  link: string | null;
  photographer: string | null;
};

const EMPTY: AircraftPhotoResult = {
  photoUrl: null,
  photoUrlLarge: null,
  link: null,
  photographer: null,
};

type PlanespottersPhoto = {
  thumbnail?: { src?: string };
  thumbnail_large?: { src?: string };
  link?: string;
  photographer?: string;
};

async function fetchPlanespotters(
  kind: "hex" | "reg",
  value: string,
): Promise<AircraftPhotoResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `https://api.planespotters.net/pub/photos/${kind}/${encodeURIComponent(value)}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) return EMPTY;
    const json = (await res.json()) as { photos?: PlanespottersPhoto[] };
    const photo = Array.isArray(json.photos) ? json.photos[0] : null;
    if (!photo) return EMPTY;
    return {
      photoUrl: photo.thumbnail?.src ?? null,
      photoUrlLarge: photo.thumbnail_large?.src ?? photo.thumbnail?.src ?? null,
      link: photo.link ?? null,
      photographer: photo.photographer ?? null,
    };
  } catch {
    return EMPTY;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hex = searchParams.get("hex")?.trim().toLowerCase() || "";
  const reg = searchParams.get("reg")?.trim().toUpperCase() || "";

  if (!hex && !reg) {
    return NextResponse.json(EMPTY, { headers: NO_STORE_HEADERS });
  }

  const cacheKey = `aircraft-photo:${hex || reg}`;
  const { data } = await cachedFetchJson(cacheKey, TTL_MS, async () => {
    if (hex) {
      const byHex = await fetchPlanespotters("hex", hex);
      if (byHex.photoUrl) return byHex;
    }
    if (reg) {
      const byReg = await fetchPlanespotters("reg", reg);
      if (byReg.photoUrl) return byReg;
    }
    return EMPTY;
  });

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
