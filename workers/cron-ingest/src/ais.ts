import { thinWorldwide } from "../../../src/lib/adsbWorld";
import type { AisVesselRow, IngestEnv } from "./env";
import { getAisstreamKey, getMarineTrafficKey } from "./db";

const MT_BASE = "https://services.marinetraffic.com/api";
const AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";

/**
 * AISstream 구독 bbox — 연안·주요 항로 전 지구 허브 + 초크포인트.
 * 밀집 해역이 캡을 잠식하지 않도록 fetch 후 `thinWorldwide`로 균등 샘플한다.
 * WS ~10s + early-exit(max*2) 유지.
 *
 * 형식: [[latMin, lonMin], [latMax, lonMax]] (aisstream.io)
 */
export const AISSTREAM_BBOXES: Array<[[number, number], [number, number]]> = [
  // —— 전 지구 연안·항로 허브 (~ADSB_WORLD_HUBS 해역판) ——
  [[30, -85], [42, -65]], // US East / Atlantic approaches
  [[30, -130], [42, -112]], // US West
  [[55, -170], [68, -140]], // Alaska / North Pacific
  [[15, -165], [28, -150]], // Hawaii approaches
  [[15, -110], [30, -85]], // Mexico / Gulf
  [[-25, -60], [-2, -30]], // Brazil / South Atlantic
  [[-25, -85], [-5, -65]], // Andes Pacific
  [[-45, -75], [-28, -50]], // South Cone
  [[42, -10], [58, 15]], // NW Europe / Channel
  [[48, 25], [62, 50]], // Baltic–Barents approaches
  [[-5, -20], [18, 15]], // West Africa / Gulf of Guinea
  [[-12, 25], [12, 50]], // East Africa / Indian Ocean west
  [[-38, 10], [-18, 40]], // South Africa / Cape
  [[12, 32], [32, 52]], // 중동·홍해
  [[8, 65], [28, 90]], // India / Arabian Sea east
  [[-5, 95], [12, 120]], // SE Asia / Malacca belt
  [[20, 115], [42, 145]], // East Asia / NW Pacific
  [[-40, 110], [-10, 155]], // Australia
  [[-50, 160], [-32, 180]], // New Zealand
  [[-40, -180], [-20, -160]], // South Pacific (dateline west)
  // —— 초크포인트 전용 (신호 집중) ——
  [[44, 22], [56, 42]], // 동유럽·흑해
  [[22, 118], [26, 121.5]], // 대만해협
  [[6, 110], [12, 117]], // 남중국해 — 스프래틀리
  [[19, 120], [22, 123]], // 바시해협
  [[54.5, 9.5], [56.5, 13.5]], // 덴마크해협
  [[59, 22], [60.5, 30.5]], // 핀란드만
  [[41, 27], [47, 42]], // 흑해
  [[64.3, -169], [66.5, -165]], // 베링 해협
  [[66, -180], [72, -155]], // 추크치해
  [[36.5, 47], [47, 55]], // 카스피해
];

const AISSTREAM_DURATION_MS = 10_000;

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
      MaximumStaticDraught?: number;
      Destination?: string;
      Dimension?: {
        A?: number;
        B?: number;
        C?: number;
        D?: number;
      };
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
  draught: number | null = null,
  destination: string | null = null,
  lengthM: number | null = null,
  beamM: number | null = null,
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
    draught,
    destination,
    length_m: lengthM,
    beam_m: beamM,
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
  durationMs = AISSTREAM_DURATION_MS,
): Promise<{ vessels: AisVesselRow[]; errors: string[] }> {
  const errors: string[] = [];
  const vessels = new Map<string, AisVesselRow>();
  const staticByMmsi = new Map<
    string,
    {
      shipType: number | null;
      shipName: string | null;
      draught: number | null;
      destination: string | null;
      lengthM: number | null;
      beamM: number | null;
    }
  >();

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
          cached.draught ?? v.draught,
          cached.destination || v.destination,
          cached.lengthM ?? v.length_m,
          cached.beamM ?? v.beam_m,
        );
      });
      resolve({ vessels: merged, errors });
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
          // MaximumStaticDraught: 만재 설계 흘수 상한(실측 흘수 아님) — DWT 가중 물동량의 크기
          // 프록시로만 사용. Dimension A+B=선수+선미 길이, C+D=좌+우 폭 (AIS 안테나 기준 분할값).
          const draught = parseNumber(staticMsg?.MaximumStaticDraught);
          const destination = staticMsg?.Destination?.trim() || null;
          const dim = staticMsg?.Dimension;
          const lengthM =
            dim?.A != null && dim?.B != null ? parseNumber(dim.A)! + parseNumber(dim.B)! : null;
          const beamM =
            dim?.C != null && dim?.D != null ? parseNumber(dim.C)! + parseNumber(dim.D)! : null;
          const prev = staticByMmsi.get(mmsi);
          staticByMmsi.set(mmsi, {
            shipType: shipType ?? prev?.shipType ?? null,
            shipName: shipName || prev?.shipName || null,
            draught: draught ?? prev?.draught ?? null,
            destination: destination || prev?.destination || null,
            lengthM: lengthM ?? prev?.lengthM ?? null,
            beamM: beamM ?? prev?.beamM ?? null,
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
            cached?.draught ?? null,
            cached?.destination ?? null,
            cached?.lengthM ?? null,
            cached?.beamM ?? null,
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
  max = 800,
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

  const merged = Array.from(byMmsi.values());
  // 밀집 해역(말라카 등)이 전량 잠식하지 않도록 셀 단위 라운드로빈
  const thinned = thinWorldwide(merged, {
    cellDeg: 10,
    perCell: 24,
    max,
  });
  return { vessels: thinned, errors };
}
