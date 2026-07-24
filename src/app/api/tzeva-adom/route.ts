import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { isApiStubMode } from "@/lib/apiStubMode";
import { isTzevaAdomEnabled } from "@/lib/serverEnv";
import { geocodeOrefRegion } from "@/lib/israelAlertZones";
import { fetchOrefAlerts } from "@/lib/tzevaAdomFetch";
import { getTzevaAdomStore, replaceTzevaAdomData } from "@/lib/tzevaAdomStore";
import type { TzevaAdomAlert, TzevaAdomPayload } from "@/lib/tzevaAdom";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZEVA_CDN = publicCacheHeaders(CDN_CACHE.tzeva);

const LIVE_FILE = path.join(process.cwd(), "public", "data", "live", "tzeva-adom.json");
const SEED_FILE = path.join(process.cwd(), "public", "data", "tzeva-adom-seed.json");

let cacheAt = 0;
let cachePayload: TzevaAdomPayload | null = null;
const CACHE_MS = 2500;

function tzevaAdomEnabled(): boolean {
  return isTzevaAdomEnabled();
}

function readLivePayload(): TzevaAdomPayload | null {
  if (!fs.existsSync(LIVE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(LIVE_FILE, "utf8")) as TzevaAdomPayload;
  } catch {
    return null;
  }
}

function readSeedPayload(): TzevaAdomPayload {
  if (!fs.existsSync(SEED_FILE)) {
    return {
      fetchedAt: new Date().toISOString(),
      live: false,
      active: [],
      history: [],
      stub: true,
    };
  }
  return JSON.parse(fs.readFileSync(SEED_FILE, "utf8")) as TzevaAdomPayload;
}

function enrichAlert(alert: TzevaAdomAlert): TzevaAdomAlert {
  if (Number.isFinite(alert.lat) && Number.isFinite(alert.lng)) return alert;
  const coords = geocodeOrefRegion(alert.region);
  return { ...alert, lat: coords.lat, lng: coords.lng };
}

function enrichPayload(payload: TzevaAdomPayload): TzevaAdomPayload {
  return {
    ...payload,
    active: (payload.active ?? []).map(enrichAlert),
    history: (payload.history ?? []).map(enrichAlert),
  };
}

export async function GET() {
  if (!tzevaAdomEnabled()) {
    const seed = readSeedPayload();
    return NextResponse.json(
      { ...seed, live: false, stub: true },
      { headers: NO_STORE_HEADERS },
    );
  }

  const livePayload = readLivePayload();
  if (livePayload) {
    const enriched = enrichPayload(livePayload);
    replaceTzevaAdomData(enriched.active ?? [], enriched.history ?? [], enriched.fetchedAt);
    return NextResponse.json(enriched, { headers: TZEVA_CDN });
  }

  if (isApiStubMode()) {
    return NextResponse.json(readSeedPayload(), { headers: NO_STORE_HEADERS });
  }

  const now = Date.now();
  if (cachePayload && now - cacheAt < CACHE_MS) {
    return NextResponse.json(cachePayload, { headers: TZEVA_CDN });
  }

  const result = await fetchOrefAlerts({
    historyUrl: process.env.OREF_HISTORY_URL,
    activeUrl: process.env.OREF_ACTIVE_URL,
  });

  const store = getTzevaAdomStore();
  // 업스트림이 빈 active를 주면 해제로 신뢰한다. store fallback은
  // 경보가 꺼진 뒤에도 UI·마커가 남는 원인이다.
  const nextActive = result.active;
  const nextHistory = result.history.length > 0 ? result.history : store.history;
  const payload: TzevaAdomPayload = {
    fetchedAt: new Date().toISOString(),
    live: !result.error && !result.geoRestricted,
    active: nextActive,
    history: nextHistory,
    geoRestricted: result.geoRestricted,
    error: result.error,
  };

  // 성공 응답(빈 active 포함)은 항상 store에 반영해 해제를 고정한다.
  if (!result.error) {
    replaceTzevaAdomData(payload.active, payload.history, payload.fetchedAt);
  }

  cachePayload = enrichPayload(payload);
  cacheAt = now;
  return NextResponse.json(cachePayload, {
    headers: result.error ? NO_STORE_HEADERS : TZEVA_CDN,
  });
}
