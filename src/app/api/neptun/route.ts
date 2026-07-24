import fs from "fs";
import { NextResponse } from "next/server";
import { isApiStubMode } from "@/lib/apiStubMode";
import { resolveNeptunSeedPath } from "@/lib/streamPublicJson";
import { getServerDataProfile, isNeptunEnabled } from "@/lib/serverEnv";
import {
  NEPTUN_API_BASE,
  isInNeptunOpsBox,
  rebaseNeptunStubPayload,
  type NeptunAlerts,
  type NeptunPayload,
  type NeptunThreat,
  type NeptunThreatsResponse,
} from "@/lib/neptun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_MS = 5000;

let cacheAt = 0;
let cachePayload: NeptunPayload | null = null;

function readSeedPayload(): NeptunPayload {
  const seedPath = resolveNeptunSeedPath(getServerDataProfile());
  if (!seedPath) {
    return {
      fetchedAt: new Date().toISOString(),
      serverTime: new Date().toISOString(),
      live: false,
      stub: true,
      threats: [],
      alerts: { raions: [], oblasts: [] },
    };
  }
  try {
    return JSON.parse(fs.readFileSync(seedPath, "utf8")) as NeptunPayload;
  } catch {
    return {
      fetchedAt: new Date().toISOString(),
      serverTime: new Date().toISOString(),
      live: false,
      stub: true,
      threats: [],
      alerts: { raions: [], oblasts: [] },
    };
  }
}

function stubSeedResponse(extraHeaders?: Record<string, string>): NextResponse {
  const seed = rebaseNeptunStubPayload(readSeedPayload());
  return NextResponse.json(
    { ...seed, live: false, stub: true },
    {
      headers: {
        "X-Neptun-Stub": "true",
        "X-Neptun-Live": "false",
        "Cache-Control": "no-store",
        ...extraHeaders,
      },
    },
  );
}

async function fetchNeptunLive(): Promise<NeptunPayload> {
  const headers = {
    Accept: "application/json",
    "User-Agent": "BraveNewWorld/1.0 (+https://neptun.in.ua/)",
  };

  const [threatsRes, alertsRes] = await Promise.all([
    fetch(`${NEPTUN_API_BASE}/api/v1/threats`, {
      headers,
      next: { revalidate: 0 },
    }),
    fetch(`${NEPTUN_API_BASE}/api/v1/alerts`, {
      headers,
      next: { revalidate: 0 },
    }),
  ]);

  if (!threatsRes.ok) {
    throw new Error(`NEPTUN threats HTTP ${threatsRes.status}`);
  }

  const threatsData = (await threatsRes.json()) as NeptunThreatsResponse;
  let alerts: NeptunAlerts = { raions: [], oblasts: [] };

  if (alertsRes.ok) {
    alerts = (await alertsRes.json()) as NeptunAlerts;
  }

  return {
    fetchedAt: new Date().toISOString(),
    serverTime: threatsData.serverTime,
    live: true,
    threats: (Array.isArray(threatsData.threats) ? threatsData.threats : []).filter(
      (threat: NeptunThreat) =>
        Number.isFinite(threat.lat) &&
        Number.isFinite(threat.lon) &&
        isInNeptunOpsBox(threat.lat, threat.lon),
    ),
    alerts,
  };
}

export async function GET() {
  if (!isNeptunEnabled() || isApiStubMode()) {
    return stubSeedResponse();
  }

  const now = Date.now();
  if (cachePayload && now - cacheAt < CACHE_MS) {
    return NextResponse.json(cachePayload, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=5" },
    });
  }

  try {
    const payload = await fetchNeptunLive();
    cachePayload = payload;
    cacheAt = now;
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=5" },
    });
  } catch (err) {
    console.error("NEPTUN fetch error:", err);
    return stubSeedResponse({ "X-Neptun-Fallback": "true" });
  }
}
