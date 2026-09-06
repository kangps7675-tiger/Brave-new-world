import fs from "fs";
import path from "path";
import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { cachedFetchJson } from "@/lib/apiCache";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";
import type { ChokepointAisObservation } from "@/lib/chokepointStressForUi";
import {
  CHOKE_TO_PORTWATCH,
  computeTransitStress,
  parsePortWatchResponse,
  PORTWATCH_CHOKEPOINTS_URL,
  toStressObservation,
  type ChokeTransitStress,
  type PortWatchDaily,
} from "@/lib/portWatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * IMF PortWatch 초크포인트 통과량.
 * 1) 로컬 bulk 캐시 (parse/fetch chokepoint-transit → chokepoint-transit-daily.json)
 * 2) ArcGIS live query (fallback, 1000 rows cap)
 */
const TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_KEY = "portwatch:chokepoints";
const PORTWATCH_CDN = publicCacheHeaders(CDN_CACHE.portwatch);
const ATTRIBUTION = "Chokepoint transits: IMF PortWatch (IMF/Oxford)";
const RESULT_RECORD_COUNT = 1000;

const LOCAL_DAILY_PATHS = [
  path.join(process.cwd(), "public", "data", "crink", "chokepoint-transit-daily.json"),
  path.join(process.cwd(), "scripts", "data", "chokepoint-transit-daily.json"),
];

type LocalDailyCache = {
  generatedAt?: string;
  latestDate?: string | null;
  historyDays?: number;
  sourceFile?: string;
  byChokeId?: Record<string, PortWatchDaily[]>;
};

function buildQueryUrl(): string {
  const portIds = Object.values(CHOKE_TO_PORTWATCH);
  const params = new URLSearchParams({
    where: `portid IN (${portIds.map((id) => `'${id}'`).join(",")})`,
    outFields: "portid,date,n_total,capacity",
    orderByFields: "date DESC",
    resultRecordCount: String(RESULT_RECORD_COUNT),
    returnGeometry: "false",
    f: "json",
  });
  return `${PORTWATCH_CHOKEPOINTS_URL}?${params.toString()}`;
}

type PortWatchSnapshot = {
  byChokeId: Record<string, ChokepointAisObservation>;
  transits: Record<string, ChokeTransitStress>;
  source: "local-bulk" | "arcgis-live";
  localGeneratedAt?: string | null;
  localLatestDate?: string | null;
};

function snapshotFromDailyRows(
  byChokeIdRows: Record<string, PortWatchDaily[]>,
  meta: Pick<PortWatchSnapshot, "source" | "localGeneratedAt" | "localLatestDate">,
): PortWatchSnapshot {
  const snapshot: PortWatchSnapshot = {
    byChokeId: {},
    transits: {},
    ...meta,
  };
  for (const chokepointId of Object.keys(CHOKE_TO_PORTWATCH)) {
    const rows = byChokeIdRows[chokepointId];
    if (!rows?.length) continue;
    const stress = computeTransitStress(rows);
    snapshot.transits[chokepointId] = stress;
    const observation = toStressObservation(stress);
    if (observation) snapshot.byChokeId[chokepointId] = observation;
  }
  return snapshot;
}

function loadLocalDailyCache(): LocalDailyCache | null {
  for (const filePath of LOCAL_DAILY_PATHS) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as LocalDailyCache;
      if (raw?.byChokeId && typeof raw.byChokeId === "object") {
        return raw;
      }
    } catch {
      /* try next path */
    }
  }
  return null;
}

async function loadSnapshotFromArcgis(): Promise<PortWatchSnapshot> {
  const response = await fetch(buildQueryUrl(), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`PortWatch HTTP ${response.status}: ${text.slice(0, 160)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`PortWatch non-JSON response: ${text.slice(0, 160)}`);
  }
  const upstreamError = (json as { error?: { message?: string } }).error;
  if (upstreamError) {
    throw new Error(`PortWatch query error: ${upstreamError.message ?? "unknown"}`);
  }

  const byPortId = new Map<string, PortWatchDaily[]>();
  for (const row of parsePortWatchResponse(json)) {
    const bucket = byPortId.get(row.portid);
    if (bucket) bucket.push(row);
    else byPortId.set(row.portid, [row]);
  }

  const byChokeIdRows: Record<string, PortWatchDaily[]> = {};
  for (const [chokepointId, portId] of Object.entries(CHOKE_TO_PORTWATCH)) {
    const rows = byPortId.get(portId);
    if (rows?.length) byChokeIdRows[chokepointId] = rows;
  }
  return snapshotFromDailyRows(byChokeIdRows, { source: "arcgis-live" });
}

async function loadSnapshot(): Promise<PortWatchSnapshot> {
  const local = loadLocalDailyCache();
  if (local?.byChokeId) {
    return snapshotFromDailyRows(local.byChokeId, {
      source: "local-bulk",
      localGeneratedAt: local.generatedAt ?? null,
      localLatestDate: local.latestDate ?? null,
    });
  }
  return loadSnapshotFromArcgis();
}

export async function GET() {
  try {
    const { data, cached } = await cachedFetchJson(CACHE_KEY, TTL_MS, loadSnapshot);
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        cached,
        count: Object.keys(data.byChokeId).length,
        byChokeId: data.byChokeId,
        transits: data.transits,
        source: data.source,
        localGeneratedAt: data.localGeneratedAt ?? null,
        localLatestDate: data.localLatestDate ?? null,
        attribution: ATTRIBUTION,
      },
      { headers: PORTWATCH_CDN },
    );
  } catch (error) {
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        count: 0,
        byChokeId: {},
        transits: {},
        source: "arcgis-live",
        attribution: ATTRIBUTION,
        error: publicErrorMessage(error, "PortWatch fetch failed"),
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
