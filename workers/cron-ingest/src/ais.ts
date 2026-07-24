import type { AisVesselRow, IngestEnv } from "./env";
import { getAisstreamKey, getMarineTrafficKey } from "./db";

const MT_BASE = "https://services.marinetraffic.com/api";
const AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";

/** 분쟁·해상 chokepoint 위주 (Cron 서브요청·수집 시간 절약) */
const AISSTREAM_BBOXES: Array<[[number, number], [number, number]]> = [
  [[12, 32], [32, 52]], // 중동·홍해
  [[44, 22], [56, 42]], // 동유럽·흑해
  [[20, 100], [42, 130]], // 동아시아·남중국해
  [[-5, 95], [8, 108]], // 말라카
  [[10, -85], [28, -60]], // 카리브
];

const MILITARY_NAME =
  /\b(USS|HMS|HMAS|HMCS|HNLMS|HDMS|HSWMS|FS\s|FGS|ITS\s|ORP\s|ROKS|INS\s|JS\s|KRI\s|BRP\s|BNS\s|PLAN|PLANS|WARSHIP|NAVAL|DESTROYER|FRIGATE|CORVETTE|SUBMARINE|CARRIER|CVN)\b/i;

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
    };
  };
};

function parseNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function classifyCategory(shipType: number | null, shipName: string | null): string {
  if (shipType === 35 || shipType === 55) return "military";
  if (shipName && MILITARY_NAME.test(shipName)) return "military";
  const g = shipType != null && Number.isFinite(shipType) ? Math.floor(shipType / 10) : null;
  if (g === 2 || g === 4 || g === 6 || g === 7 || g === 8) return "commercial";
  return "other";
}

function shipTypeLabel(shipType: number | null): string | null {
  if (shipType == null || !Number.isFinite(shipType)) return null;
  const labels: Record<number, string> = {
    35: "Military",
    55: "Law enforcement",
    60: "Passenger",
    70: "Cargo",
    80: "Tanker",
  };
  if (labels[shipType]) return labels[shipType];
  const g = Math.floor(shipType / 10);
  if (g === 6) return "Passenger";
  if (g === 7) return "Cargo";
  if (g === 8) return "Tanker";
  return null;
}

function rowFromParts(
  mmsi: string,
  lat: number,
  lng: number,
  shipName: string | null,
  shipType: number | null,
  sog: number | null,
  cog: number | null,
  heading: number | null,
  timestamp: string | null,
  provider: string,
): AisVesselRow {
  const category = classifyCategory(shipType, shipName);
  return {
    id: mmsi,
    mmsi,
    ship_name: shipName,
    lat,
    lng,
    sog,
    cog,
    true_heading: heading,
    ship_type: shipType,
    ship_type_label: shipTypeLabel(shipType),
    category,
    provider,
    timestamp,
  };
}

async function fetchMarineTraffic(
  apiKey: string,
  max: number,
): Promise<{ vessels: AisVesselRow[]; errors: string[] }> {
  const shiptypes = [6, 7, 8];
  const vessels: AisVesselRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const shiptype of shiptypes) {
    if (vessels.length >= max) break;
    const url = new URL(`${MT_BASE}/exportvessels/${encodeURIComponent(apiKey)}`);
    url.searchParams.set("v", "8");
    url.searchParams.set("timespan", "10");
    url.searchParams.set("shiptype", String(shiptype));
    url.searchParams.set("protocol", "jsono");

    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        errors.push(`shiptype-${shiptype}: HTTP ${res.status}`);
        continue;
      }
      const data = (await res.json()) as unknown;
      const rows = Array.isArray(data)
        ? data
        : Array.isArray((data as { DATA?: unknown[] })?.DATA)
          ? (data as { DATA: unknown[] }).DATA
          : [];

      for (const row of rows) {
        if (vessels.length >= max) break;
        const r = row as Record<string, unknown>;
        const lat = parseNumber(r.LAT ?? r.lat);
        const lng = parseNumber(r.LON ?? r.lng ?? r.LONGTITUDE);
        const mmsi = r.MMSI != null ? String(r.MMSI) : null;
        if (lat === null || lng === null || !mmsi || seen.has(mmsi)) continue;
        seen.add(mmsi);
        const shipType =
          parseNumber(r.SHIPTYPE ?? r.TYPE ?? shiptype * 10) ?? shiptype * 10;
        const shipName =
          typeof r.SHIPNAME === "string"
            ? r.SHIPNAME
            : typeof r.NAME === "string"
              ? r.NAME
              : null;
        vessels.push(
          rowFromParts(
            mmsi,
            lat,
            lng,
            shipName,
            shipType,
            parseNumber(r.SPEED ?? r.SOG),
            parseNumber(r.COURSE ?? r.COG),
            parseNumber(r.HEADING),
            typeof r.TIMESTAMP === "string" ? r.TIMESTAMP : null,
            "marinetraffic",
          ),
        );
      }
    } catch (error) {
      errors.push(
        `shiptype-${shiptype}: ${error instanceof Error ? error.message : "fetch failed"}`,
      );
    }
  }

  return { vessels, errors };
}

async function websocketDataToText(data: unknown): Promise<string> {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof Blob) return data.text();
  return String(data);
}

async function fetchAisstream(
  apiKey: string,
  max: number,
  durationMs = 4500,
): Promise<{ vessels: AisVesselRow[]; errors: string[] }> {
  const errors: string[] = [];
  const vessels = new Map<string, AisVesselRow>();
  const staticByMmsi = new Map<string, { shipType: number | null; shipName: string | null }>();

  return new Promise((resolve) => {
    const ws = new WebSocket(AISSTREAM_URL);
    let settled = false;

    const finish = (err?: string) => {
      if (settled) return;
      settled = true;
      if (err) errors.push(err);
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {
        // no-op
      }
      const merged = Array.from(vessels.values()).map((v) => {
        const cached = staticByMmsi.get(v.mmsi);
        if (!cached) return v;
        return rowFromParts(
          v.mmsi,
          v.lat,
          v.lng,
          v.ship_name || cached.shipName,
          cached.shipType ?? v.ship_type,
          v.sog,
          v.cog,
          v.true_heading,
          v.timestamp,
          "aisstream",
        );
      });
      resolve({ vessels: merged.slice(0, max), errors });
    };

    const timer = setTimeout(() => finish(), durationMs);

    ws.addEventListener("open", () => {
      try {
        ws.send(
          JSON.stringify({
            APIKey: apiKey,
            BoundingBoxes: AISSTREAM_BBOXES,
            FilterMessageTypes: ["PositionReport", "ShipStaticData"],
          }),
        );
      } catch (error) {
        clearTimeout(timer);
        finish(error instanceof Error ? error.message : "aisstream subscribe failed");
      }
    });

    ws.addEventListener("message", async (event) => {
      try {
        const parsed = JSON.parse(await websocketDataToText(event.data)) as AisRawMessage;

        if (parsed.MessageType === "ShipStaticData") {
          const mmsi =
            parsed.MetaData?.MMSI != null
              ? String(parsed.MetaData.MMSI)
              : parsed.Message?.PositionReport?.UserID != null
                ? String(parsed.Message.PositionReport.UserID)
                : null;
          if (!mmsi) return;
          const staticMsg = parsed.Message?.ShipStaticData;
          const shipType = parseNumber(staticMsg?.Type);
          const shipName =
            staticMsg?.Name?.trim() || parsed.MetaData?.ShipName?.trim() || null;
          const prev = staticByMmsi.get(mmsi);
          staticByMmsi.set(mmsi, {
            shipType: shipType ?? prev?.shipType ?? null,
            shipName: shipName || prev?.shipName || null,
          });
          return;
        }

        if (parsed.MessageType && parsed.MessageType !== "PositionReport") return;
        const position = parsed.Message?.PositionReport;
        const lat = parseNumber(position?.Latitude ?? parsed.MetaData?.latitude);
        const lng = parseNumber(position?.Longitude ?? parsed.MetaData?.longitude);
        const mmsiSource = parsed.MetaData?.MMSI ?? position?.UserID;
        const mmsi = mmsiSource ? String(mmsiSource) : null;
        if (lat === null || lng === null || !mmsi) return;

        const cached = staticByMmsi.get(mmsi);
        const shipName = parsed.MetaData?.ShipName?.trim() || cached?.shipName || null;
        vessels.set(
          mmsi,
          rowFromParts(
            mmsi,
            lat,
            lng,
            shipName,
            cached?.shipType ?? null,
            parseNumber(position?.Sog),
            parseNumber(position?.Cog),
            parseNumber(position?.TrueHeading),
            parsed.MetaData?.time_utc || null,
            "aisstream",
          ),
        );

        if (vessels.size >= max * 2) {
          clearTimeout(timer);
          finish();
        }
      } catch {
        // ignore malformed frames
      }
    });

    ws.addEventListener("error", () => {
      clearTimeout(timer);
      finish("aisstream websocket error");
    });

    ws.addEventListener("close", () => {
      clearTimeout(timer);
      finish();
    });
  });
}

export async function fetchAisVessels(
  env: IngestEnv,
  max = 400,
): Promise<{ vessels: AisVesselRow[]; errors: string[] }> {
  const mtKey = getMarineTrafficKey(env);
  const aisstreamKey = getAisstreamKey(env);
  const errors: string[] = [];
  const byMmsi = new Map<string, AisVesselRow>();

  // 지경학용 민간(화물·탱커·여객) — MarineTraffic
  if (mtKey) {
    const mt = await fetchMarineTraffic(mtKey, max);
    errors.push(...mt.errors);
    for (const vessel of mt.vessels) {
      byMmsi.set(vessel.mmsi, vessel);
    }
  }

  // 지정학용 군함 포함 — aisstream (MT만 쓰면 민간만 D1에 쌓여 지정학에 일반 AIS가 섞이거나 군용이 비는 문제)
  if (aisstreamKey) {
    const stream = await fetchAisstream(aisstreamKey, max);
    errors.push(...stream.errors);
    for (const vessel of stream.vessels) {
      const prev = byMmsi.get(vessel.mmsi);
      // 군함은 stream 분류 우선, 그 외는 기존(MT) 유지
      if (!prev || vessel.category === "military") {
        byMmsi.set(vessel.mmsi, vessel);
      }
    }
  }

  if (!mtKey && !aisstreamKey) {
    errors.push("MARINETRAFFIC_API_KEY and AISSTREAM_API_KEY missing — AIS skipped");
  } else if (!mtKey) {
    errors.push("MARINETRAFFIC_API_KEY missing — using aisstream only");
  } else if (!aisstreamKey) {
    errors.push("AISSTREAM_API_KEY missing — commercial MT only (no military AIS warm)");
  }

  return { vessels: Array.from(byMmsi.values()).slice(0, max), errors };
}
