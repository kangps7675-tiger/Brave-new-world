import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import type { AisVessel } from "@/data/geoTypes";
import { apiStubResponse } from "@/lib/apiStub";
import {
  enrichAisClassification,
  matchesAisClassFilter,
  parseAisClassFilter,
  type AisClassFilter,
} from "@/lib/aisVesselClass";
import { readAisFromD1, readAisFromIngestWorker } from "@/lib/d1MaritimeAir";
import {
  fetchMarineTrafficCommercial,
  getMarineTrafficApiKey,
} from "@/lib/marineTrafficFetch";
import { demoAisVessels } from "@/lib/maritimeAirDemo";
import { aisQuerySchema, parseSearchParams } from "@/lib/apiQuerySchemas";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AIS_CDN = publicCacheHeaders(CDN_CACHE.ais);
const AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";

type AisRawMessage = {
  MessageType?: string;
  MetaData?: {
    MMSI?: number | string;
    ShipName?: string;
    latitude?: number;
    longitude?: number;
    time_utc?: string;
  };
  Message?: {
    PositionReport?: {
      UserID?: number | string;
      Latitude?: number;
      Longitude?: number;
      Sog?: number;
      Cog?: number;
      TrueHeading?: number;
    };
    ShipStaticData?: {
      Type?: number;
      Name?: string;
      CallSign?: string;
      Destination?: string;
    };
  };
};

type StaticCache = {
  shipType: number | null;
  shipName: string | null;
};

function parseNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildVessel(
  partial: Omit<
    AisVessel,
    "shipType" | "shipTypeLabel" | "category" | "militaryKind" | "disguised" | "disguisedKind"
  > & {
    shipType?: number | null;
  },
): AisVessel {
  const shipType = partial.shipType ?? null;
  const shipName = partial.shipName;
  const classified = enrichAisClassification({
    shipType,
    shipName,
    mmsi: partial.mmsi,
  });
  return {
    ...partial,
    shipType,
    shipTypeLabel: classified.shipTypeLabel,
    category: classified.category,
    militaryKind: classified.militaryKind,
    disguised: classified.disguised || undefined,
    disguisedKind: classified.disguisedKind,
  };
}

function normalizePosition(
  raw: AisRawMessage,
  staticByMmsi: Map<string, StaticCache>,
): AisVessel | null {
  if (raw.MessageType && raw.MessageType !== "PositionReport") return null;

  const position = raw.Message?.PositionReport;
  const lat = parseNumber(position?.Latitude ?? raw.MetaData?.latitude);
  const lng = parseNumber(position?.Longitude ?? raw.MetaData?.longitude);
  const mmsiSource = raw.MetaData?.MMSI ?? position?.UserID;
  const mmsi = mmsiSource ? String(mmsiSource) : null;
  if (lat === null || lng === null || !mmsi) return null;

  const cached = staticByMmsi.get(mmsi);
  const shipName =
    raw.MetaData?.ShipName?.trim() || cached?.shipName || null;

  return buildVessel({
    id: mmsi,
    mmsi,
    shipName,
    lat,
    lng,
    speedOverGround: parseNumber(position?.Sog),
    courseOverGround: parseNumber(position?.Cog),
    trueHeading: parseNumber(position?.TrueHeading),
    timestamp: raw.MetaData?.time_utc || null,
    shipType: cached?.shipType ?? null,
  });
}

function ingestStaticData(raw: AisRawMessage, staticByMmsi: Map<string, StaticCache>) {
  if (raw.MessageType !== "ShipStaticData") return;
  const mmsiSource = raw.MetaData?.MMSI ?? raw.Message?.PositionReport?.UserID;
  const mmsi = mmsiSource ? String(mmsiSource) : null;
  if (!mmsi) return;
  const staticMsg = raw.Message?.ShipStaticData;
  const shipType = parseNumber(staticMsg?.Type);
  const shipName =
    staticMsg?.Name?.trim() || raw.MetaData?.ShipName?.trim() || null;
  const prev = staticByMmsi.get(mmsi);
  staticByMmsi.set(mmsi, {
    shipType: shipType ?? prev?.shipType ?? null,
    shipName: shipName || prev?.shipName || null,
  });
}

function parseBoundingBoxes(searchParams: URLSearchParams) {
  const bbox = searchParams.get("bbox");
  if (!bbox) return [[[-90, -180], [90, 180]]];

  const values = bbox.split(",").map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    return [[[-90, -180], [90, 180]]];
  }

  const [minLat, minLng, maxLat, maxLng] = values;
  return [[[minLat, minLng], [maxLat, maxLng]]];
}

async function websocketDataToText(data: MessageEvent["data"]) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf-8");
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf-8");
  }
  if (data instanceof Blob) return data.text();
  return String(data);
}

function filterVessels(vessels: AisVessel[], classFilter: AisClassFilter, max: number) {
  const matched = vessels.filter((v) =>
    matchesAisClassFilter(v.category, classFilter, v.disguised),
  );
  // 지정학 military인데 군함이 없으면 전부 표시 (빈 체크박스 방지)
  if (matched.length === 0 && classFilter === "military" && vessels.length > 0) {
    return vessels.slice(0, max);
  }
  return matched.slice(0, max);
}

async function collectFromAisstream(options: {
  apiKey: string;
  maxVessels: number;
  durationMs: number;
  bbox: ReturnType<typeof parseBoundingBoxes>;
  classFilter: AisClassFilter;
  debug: boolean;
}): Promise<{
  vessels: AisVessel[];
  error?: string;
  rawSamples?: unknown[];
  diagnostics?: Record<string, unknown>;
}> {
  const vessels = new Map<string, AisVessel>();
  const staticByMmsi = new Map<string, StaticCache>();
  const rawSamples: unknown[] = [];
  const diagnostics = {
    opened: false,
    subscribed: false,
    closeCode: null as number | null,
    closeReason: null as string | null,
    staticCount: 0,
  };

  return new Promise((resolve) => {
    const ws = new WebSocket(AISSTREAM_URL);
    let resolved = false;

    const finish = (statusError?: string) => {
      if (resolved) return;
      resolved = true;
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {
        // no-op
      }

      // re-classify with latest static cache
      const merged = Array.from(vessels.values()).map((v) => {
        const cached = staticByMmsi.get(v.mmsi);
        if (!cached) return v;
        return buildVessel({
          ...v,
          shipName: v.shipName || cached.shipName,
          shipType: cached.shipType ?? v.shipType,
        });
      });

      diagnostics.staticCount = staticByMmsi.size;
      resolve({
        vessels: filterVessels(merged, options.classFilter, options.maxVessels),
        error: statusError,
        rawSamples: options.debug ? rawSamples : undefined,
        diagnostics: options.debug ? diagnostics : undefined,
      });
    };

    const timer = setTimeout(() => finish(), options.durationMs);

    ws.addEventListener("open", () => {
      diagnostics.opened = true;
      const subscription = JSON.stringify({
        APIKey: options.apiKey,
        BoundingBoxes: options.bbox,
        FilterMessageTypes: ["PositionReport", "ShipStaticData"],
      });
      try {
        ws.send(subscription);
        diagnostics.subscribed = true;
      } catch (error) {
        clearTimeout(timer);
        finish(publicErrorMessage(error, "AIS 구독 메시지 전송 실패"));
      }
    });

    ws.addEventListener("message", async (event) => {
      try {
        const parsed = JSON.parse(await websocketDataToText(event.data)) as AisRawMessage;
        if (options.debug && rawSamples.length < 5) rawSamples.push(parsed);

        if (parsed.MessageType === "ShipStaticData") {
          ingestStaticData(parsed, staticByMmsi);
          const mmsi = parsed.MetaData?.MMSI != null ? String(parsed.MetaData.MMSI) : null;
          if (mmsi && vessels.has(mmsi)) {
            const prev = vessels.get(mmsi)!;
            const cached = staticByMmsi.get(mmsi);
            vessels.set(
              mmsi,
              buildVessel({
                ...prev,
                shipName: prev.shipName || cached?.shipName || null,
                shipType: cached?.shipType ?? prev.shipType,
              }),
            );
          }
          return;
        }

        const vessel = normalizePosition(parsed, staticByMmsi);
        if (!vessel) return;
        vessels.set(vessel.mmsi, vessel);

        if (vessels.size >= options.maxVessels * 3) {
          // 버퍼가 커지면 조기 종료 후 필터
          clearTimeout(timer);
          finish();
        }
      } catch {
        // ignore malformed frames
      }
    });

    ws.addEventListener("error", (event) => {
      clearTimeout(timer);
      const message =
        "message" in event && typeof event.message === "string"
          ? event.message
          : "AIS WebSocket error";
      finish(message);
    });

    ws.addEventListener("close", (event) => {
      diagnostics.closeCode = event.code;
      diagnostics.closeReason = event.reason || null;
      clearTimeout(timer);
      finish();
    });
  });
}

export async function GET(request: Request) {
  const stub = apiStubResponse("ais", request);
  if (stub) return stub;

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, aisQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues, vessels: [] },
      { status: 400 },
    );
  }
  const maxVessels = parsed.data.max;
  const durationMs = Math.min(parsed.data.seconds * 1000, 20000);
  const debug = Boolean(parsed.data.debug);
  const classFilter = parseAisClassFilter(parsed.data.class ?? null);
  const provider = parsed.data.provider;
  const preferLive = Boolean(parsed.data.live);

  // Cron → D1 스냅샷 우선 (유저 토글 시 클라우드 로그)
  if (!preferLive && provider !== "aisstream" && provider !== "marinetraffic") {
    const d1Category =
      classFilter === "commercial"
        ? "commercial"
        : classFilter === "military"
          ? "military"
          : "all";
    const fromD1 = await readAisFromD1({
      category: d1Category,
      max: maxVessels,
    });
    if (fromD1 && fromD1.count > 0) {
      const vessels = filterVessels(fromD1.vessels, classFilter, maxVessels);
      if (vessels.length > 0) {
        return NextResponse.json(
          {
            receivedAt: fromD1.receivedAt,
            vessels,
            provider: "d1",
            classFilter,
            source: "d1",
            cached: true,
          },
          { headers: AIS_CDN },
        );
      }
    }
    const fromWorker = await readAisFromIngestWorker({
      category: d1Category,
      max: maxVessels,
    });
    if (fromWorker && fromWorker.count > 0) {
      const vessels = filterVessels(fromWorker.vessels, classFilter, maxVessels);
      if (vessels.length > 0) {
        return NextResponse.json(
          {
            receivedAt: fromWorker.receivedAt,
            vessels,
            provider: "ingest-worker",
            classFilter,
            source: "ingest-worker",
            cached: true,
          },
          { headers: AIS_CDN },
        );
      }
    }
    // 캐시가 비었거나 필터 후 0척: waiting 빈 배열 대신 라이브/데모로 폴백.
    // 지정학(군용)은 aisstream, 지경학(민간)은 MT → aisstream 경로.
  }

  const mtKey = getMarineTrafficApiKey();
  const aisstreamKey = process.env.AISSTREAM_API_KEY;

  // 지경학 + MarineTraffic 키: 민간 화물/탱커/여객 우선
  if (
    classFilter === "commercial" &&
    mtKey &&
    (provider === "marinetraffic" || provider === "auto" || !provider)
  ) {
    try {
      const mtVessels = await fetchMarineTrafficCommercial(mtKey, maxVessels);
      if (mtVessels.length > 0) {
        return NextResponse.json(
          {
            receivedAt: new Date().toISOString(),
            vessels: filterVessels(mtVessels, "commercial", maxVessels),
            provider: "marinetraffic",
            classFilter,
            source: "live",
          },
          { headers: AIS_CDN },
        );
      }
    } catch {
      // fall through to aisstream
    }
  }

  if (aisstreamKey) {
    const result = await collectFromAisstream({
      apiKey: aisstreamKey,
      maxVessels,
      durationMs,
      bbox: parseBoundingBoxes(searchParams),
      classFilter,
      debug,
    });
    if (result.vessels.length > 0) {
      return NextResponse.json(
        {
          receivedAt: new Date().toISOString(),
          vessels: result.vessels,
          provider: "aisstream",
          classFilter,
          source: "live",
          rawSamples: result.rawSamples,
          diagnostics: result.diagnostics,
          error: result.error,
        },
        { headers: AIS_CDN },
      );
    }
  }

  // 최후 — 데모 시드 (체크박스 ON 시 무조건 마커)
  const demo = demoAisVessels(classFilter === "disguised" ? "all" : classFilter);
  return NextResponse.json(
    {
      receivedAt: new Date().toISOString(),
      vessels: demo.slice(0, maxVessels),
      provider: "demo",
      classFilter,
      source: "demo",
      demo: true,
      cached: false,
      note: aisstreamKey
        ? "live empty — showing demo seeds"
        : "AISSTREAM_API_KEY missing — showing demo seeds",
    },
    { headers: NO_STORE_HEADERS },
  );
}
