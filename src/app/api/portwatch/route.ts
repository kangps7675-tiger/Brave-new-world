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
 * IMF PortWatch 초크포인트 통과량 프록시.
 * 상류는 주간(화 09:00 ET) 갱신이라 초·분 폴링이 무의미 — 메모리 6h + CDN 6/12h.
 */
const TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_KEY = "portwatch:chokepoints";
const PORTWATCH_CDN = publicCacheHeaders(CDN_CACHE.portwatch);
const ATTRIBUTION = "Chokepoint transits: IMF PortWatch (IMF/Oxford)";
/** 9개 초크 × 최근 수개월 일별 — 기준선(30일) 계산에 충분 */
const RESULT_RECORD_COUNT = 1000;

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
  /** 초크 id → logisticsStress aisObservation (B급 실측) */
  byChokeId: Record<string, ChokepointAisObservation>;
  /** 초크 id → 통과량 평균·기준선 상세 */
  transits: Record<string, ChokeTransitStress>;
};

async function loadSnapshot(): Promise<PortWatchSnapshot> {
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
  // ArcGIS는 쿼리 오류도 HTTP 200 + {error:{...}} 로 준다
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

  const snapshot: PortWatchSnapshot = { byChokeId: {}, transits: {} };
  for (const [chokepointId, portId] of Object.entries(CHOKE_TO_PORTWATCH)) {
    const rows = byPortId.get(portId);
    if (!rows || rows.length === 0) continue;
    const stress = computeTransitStress(rows);
    snapshot.transits[chokepointId] = stress;
    const observation = toStressObservation(stress);
    if (observation) snapshot.byChokeId[chokepointId] = observation;
  }
  return snapshot;
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
        attribution: ATTRIBUTION,
      },
      { headers: PORTWATCH_CDN },
    );
  } catch (error) {
    // 실패 시 빈 맵 — 호출부는 관측 부족으로 폴백한다
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        count: 0,
        byChokeId: {},
        transits: {},
        attribution: ATTRIBUTION,
        error: publicErrorMessage(error, "PortWatch fetch failed"),
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
