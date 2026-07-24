import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { AisVessel, MilitaryAircraft, StaticPoint } from "@/data/geoTypes";
import { SUBMARINE_TUNNEL_SEED } from "@/data/submarineTunnels";
import { getDb } from "@/db";
import { adsbAircraft, aisVessels, submarineTunnels } from "@/db/schema";
import { enrichAisClassification } from "@/lib/aisVesselClass";
import { ingestWorkerBase } from "@/lib/d1LiveSnapshots";

/** AIS/ADS-B D1 신선도 (Cron 10분 주기보다 약간 길게) */
export const AIS_D1_TTL_MS = 15 * 60_000;
export const ADSB_D1_TTL_MS = 12 * 60_000;

function isFresh(ingestedAt: string, maxAgeMs: number): boolean {
  const ts = Date.parse(ingestedAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= maxAgeMs;
}

function rowToAis(row: typeof aisVessels.$inferSelect): AisVessel {
  const classified = enrichAisClassification({
    shipType: row.shipType,
    shipName: row.shipName,
  });
  return {
    id: row.id,
    mmsi: row.mmsi,
    shipName: row.shipName,
    lat: row.lat,
    lng: row.lng,
    speedOverGround: row.sog,
    courseOverGround: row.cog,
    trueHeading: row.trueHeading,
    timestamp: row.timestamp,
    shipType: row.shipType,
    shipTypeLabel: classified.shipTypeLabel ?? row.shipTypeLabel,
    category: classified.category,
    militaryKind: classified.militaryKind,
  };
}

function ensureMilitaryKind(vessel: AisVessel): AisVessel {
  if (vessel.militaryKind != null || vessel.category !== "military") {
    if (vessel.category !== "military") return { ...vessel, militaryKind: null };
    return vessel;
  }
  const classified = enrichAisClassification({
    shipType: vessel.shipType,
    shipName: vessel.shipName,
  });
  return {
    ...vessel,
    category: classified.category,
    shipTypeLabel: classified.shipTypeLabel ?? vessel.shipTypeLabel,
    militaryKind: classified.militaryKind,
  };
}

export async function readAisFromD1(options: {
  category?: "military" | "commercial" | "other" | "all";
  max: number;
  maxAgeMs?: number;
}): Promise<{ vessels: AisVessel[]; count: number; source: "d1"; receivedAt: string } | null> {
  try {
    const db = await getDb();
    const maxAge = options.maxAgeMs ?? AIS_D1_TTL_MS;
    const rows = await db
      .select()
      .from(aisVessels)
      .orderBy(desc(aisVessels.ingestedAt))
      .limit(Math.min(options.max * 3, 2000));

    const fresh = rows.filter((r) => isFresh(r.ingestedAt, maxAge));
    const filtered =
      !options.category || options.category === "all"
        ? fresh
        : fresh.filter((r) => r.category === options.category);
    const vessels = filtered.slice(0, options.max).map(rowToAis);
    if (vessels.length === 0) return null;
    return {
      source: "d1",
      receivedAt: new Date().toISOString(),
      count: vessels.length,
      vessels,
    };
  } catch {
    return null;
  }
}

export async function writeAisToD1(
  vessels: AisVessel[],
  provider: string,
): Promise<number> {
  if (vessels.length === 0) return 0;
  const db = await getDb();
  const ingestedAt = new Date().toISOString();
  let written = 0;
  const chunk = 40;
  for (let i = 0; i < vessels.length; i += chunk) {
    const slice = vessels.slice(i, i + chunk);
    await db
      .insert(aisVessels)
      .values(
        slice.map((v) => ({
          id: v.mmsi || v.id,
          mmsi: v.mmsi,
          shipName: v.shipName,
          lat: v.lat,
          lng: v.lng,
          sog: v.speedOverGround,
          cog: v.courseOverGround,
          trueHeading: v.trueHeading,
          shipType: v.shipType,
          shipTypeLabel: v.shipTypeLabel,
          category: v.category,
          provider,
          timestamp: v.timestamp,
          ingestedAt,
        })),
      )
      .onConflictDoUpdate({
        target: aisVessels.id,
        set: {
          shipName: sql`excluded.ship_name`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          sog: sql`excluded.sog`,
          cog: sql`excluded.cog`,
          trueHeading: sql`excluded.true_heading`,
          shipType: sql`excluded.ship_type`,
          shipTypeLabel: sql`excluded.ship_type_label`,
          category: sql`excluded.category`,
          provider: sql`excluded.provider`,
          timestamp: sql`excluded.timestamp`,
          ingestedAt: sql`excluded.ingested_at`,
        },
      });
    written += slice.length;
  }
  return written;
}

function parsePayload(raw: string | null): MilitaryAircraft | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MilitaryAircraft;
  } catch {
    return null;
  }
}

function rowToAircraft(row: typeof adsbAircraft.$inferSelect): MilitaryAircraft {
  const fromJson = parsePayload(row.payloadJson);
  if (fromJson) return fromJson;
  return {
    id: row.hex,
    hex: row.hex,
    callsign: row.callsign,
    registration: row.registration,
    lat: row.lat,
    lng: row.lng,
    altitude: row.altitude,
    altitudeGeom: row.altitudeGeom,
    groundSpeed: row.groundSpeed,
    indicatedAirspeed: null,
    trueAirspeed: null,
    mach: null,
    track: row.track,
    trackRate: null,
    roll: null,
    magHeading: null,
    trueHeading: null,
    baroRate: null,
    geomRate: null,
    squawk: row.squawk,
    emergency: row.emergency,
    type: row.type,
    category: row.category,
    dbFlags: row.dbFlags,
    windDirection: null,
    windSpeed: null,
    navAltitudeMcp: null,
    navHeading: null,
    navModes: null,
    seen: null,
    seenPos: null,
    rssi: null,
    acasAdvisory: null,
    timestamp: row.ingestedAt,
  };
}

export async function readAdsbFromD1(options: {
  mode: "mil" | "civ";
  max: number;
  west?: number;
  south?: number;
  east?: number;
  north?: number;
  maxAgeMs?: number;
}): Promise<{
  aircraft: MilitaryAircraft[];
  count: number;
  source: "d1";
  receivedAt: string;
} | null> {
  try {
    const db = await getDb();
    const maxAge = options.maxAgeMs ?? ADSB_D1_TTL_MS;
    const hasBbox =
      options.west != null &&
      options.south != null &&
      options.east != null &&
      options.north != null;

    const rows = hasBbox
      ? await db
          .select()
          .from(adsbAircraft)
          .where(
            and(
              eq(adsbAircraft.mode, options.mode),
              gte(adsbAircraft.lat, options.south!),
              lte(adsbAircraft.lat, options.north!),
              gte(adsbAircraft.lng, options.west!),
              lte(adsbAircraft.lng, options.east!),
            ),
          )
          .orderBy(desc(adsbAircraft.ingestedAt))
          .limit(options.max)
      : await db
          .select()
          .from(adsbAircraft)
          .where(eq(adsbAircraft.mode, options.mode))
          .orderBy(desc(adsbAircraft.ingestedAt))
          .limit(options.max);

    const aircraft = rows
      .filter((r) => isFresh(r.ingestedAt, maxAge))
      .map(rowToAircraft);
    if (aircraft.length === 0) return null;
    return {
      source: "d1",
      receivedAt: new Date().toISOString(),
      count: aircraft.length,
      aircraft,
    };
  } catch {
    return null;
  }
}

/** Vercel 등 D1 바인딩 없을 때 cron 워커 /ais 로 폴백 */
export async function readAisFromIngestWorker(options: {
  category?: "military" | "commercial" | "other" | "all";
  max: number;
}): Promise<{ vessels: AisVessel[]; count: number; source: "d1"; receivedAt: string } | null> {
  const base = ingestWorkerBase();
  if (!base) return null;
  const category = options.category ?? "all";
  try {
    const qs = new URLSearchParams({
      max: String(options.max),
      category,
    });
    const res = await fetch(`${base}/ais?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { vessels?: AisVessel[] };
    if (!Array.isArray(payload.vessels) || payload.vessels.length === 0) return null;
    const vessels = payload.vessels
      .map(ensureMilitaryKind)
      .filter((v) => {
        if (!options.category || options.category === "all") return true;
        return v.category === options.category;
      });
    if (vessels.length === 0) return null;
    return {
      source: "d1",
      receivedAt: new Date().toISOString(),
      count: vessels.length,
      vessels,
    };
  } catch {
    return null;
  }
}

/** Vercel 등 D1 바인딩 없을 때 cron 워커 /adsb 로 폴백 */
export async function readAdsbFromIngestWorker(options: {
  mode: "mil" | "civ";
  max: number;
  west?: number;
  south?: number;
  east?: number;
  north?: number;
}): Promise<{
  aircraft: MilitaryAircraft[];
  count: number;
  source: "d1";
  receivedAt: string;
} | null> {
  const base = ingestWorkerBase();
  if (!base) return null;
  try {
    const qs = new URLSearchParams({
      mode: options.mode,
      max: String(options.max),
    });
    if (options.west != null) qs.set("west", String(options.west));
    if (options.south != null) qs.set("south", String(options.south));
    if (options.east != null) qs.set("east", String(options.east));
    if (options.north != null) qs.set("north", String(options.north));
    const res = await fetch(`${base}/adsb?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { aircraft?: MilitaryAircraft[] };
    if (!Array.isArray(payload.aircraft) || payload.aircraft.length === 0) return null;
    return {
      source: "d1",
      receivedAt: new Date().toISOString(),
      count: payload.aircraft.length,
      aircraft: payload.aircraft,
    };
  } catch {
    return null;
  }
}

export async function writeAdsbToD1(
  aircraft: MilitaryAircraft[],
  mode: "mil" | "civ",
  hub?: string,
): Promise<number> {
  if (aircraft.length === 0) return 0;
  const db = await getDb();
  const ingestedAt = new Date().toISOString();
  let written = 0;
  const chunk = 30;
  for (let i = 0; i < aircraft.length; i += chunk) {
    const slice = aircraft.slice(i, i + chunk);
    await db
      .insert(adsbAircraft)
      .values(
        slice.map((ac) => ({
          id: `${mode}:${ac.hex}`,
          hex: ac.hex,
          mode,
          callsign: ac.callsign,
          registration: ac.registration,
          lat: ac.lat,
          lng: ac.lng,
          altitude: ac.altitude,
          altitudeGeom: ac.altitudeGeom,
          groundSpeed: ac.groundSpeed,
          track: ac.track,
          type: ac.type,
          category: ac.category,
          dbFlags: ac.dbFlags,
          squawk: ac.squawk,
          emergency: ac.emergency,
          payloadJson: JSON.stringify(ac),
          hub: hub ?? null,
          ingestedAt,
        })),
      )
      .onConflictDoUpdate({
        target: adsbAircraft.id,
        set: {
          callsign: sql`excluded.callsign`,
          registration: sql`excluded.registration`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          altitude: sql`excluded.altitude`,
          altitudeGeom: sql`excluded.altitude_geom`,
          groundSpeed: sql`excluded.ground_speed`,
          track: sql`excluded.track`,
          type: sql`excluded.type`,
          category: sql`excluded.category`,
          dbFlags: sql`excluded.db_flags`,
          squawk: sql`excluded.squawk`,
          emergency: sql`excluded.emergency`,
          payloadJson: sql`excluded.payload_json`,
          hub: sql`excluded.hub`,
          ingestedAt: sql`excluded.ingested_at`,
        },
      });
    written += slice.length;
  }
  return written;
}

function tunnelRowToPoint(row: typeof submarineTunnels.$inferSelect): StaticPoint {
  return {
    id: row.id,
    kind: "submarine-tunnel",
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    tier: row.tier,
    meta: {
      nameEn: row.nameEn,
      country: row.country,
      lengthKm: row.lengthKm,
      startLat: row.startLat,
      startLng: row.startLng,
      endLat: row.endLat,
      endLng: row.endLng,
      riskNote: row.riskNote,
      relatedTickers: row.relatedTickers,
    },
  };
}

export async function readSubmarineTunnelsFromD1(): Promise<{
  tunnels: StaticPoint[];
  count: number;
  source: "d1" | "seed";
} | null> {
  try {
    const db = await getDb();
    const rows = await db.select().from(submarineTunnels).limit(200);
    if (rows.length === 0) {
      return { tunnels: SUBMARINE_TUNNEL_SEED, count: SUBMARINE_TUNNEL_SEED.length, source: "seed" };
    }
    return {
      source: "d1",
      count: rows.length,
      tunnels: rows.map(tunnelRowToPoint),
    };
  } catch {
    return { tunnels: SUBMARINE_TUNNEL_SEED, count: SUBMARINE_TUNNEL_SEED.length, source: "seed" };
  }
}

/** 시드가 D1에 없으면 한 번 채워 둔다 (warm) */
export async function ensureSubmarineTunnelsSeeded(): Promise<number> {
  try {
    const db = await getDb();
    const existing = await db.select({ id: submarineTunnels.id }).from(submarineTunnels).limit(1);
    if (existing.length > 0) return 0;
    const ingestedAt = new Date().toISOString();
    await db.insert(submarineTunnels).values(
      SUBMARINE_TUNNEL_SEED.map((t) => ({
        id: t.id,
        name: t.name,
        nameEn: typeof t.meta?.nameEn === "string" ? t.meta.nameEn : null,
        lat: t.lat,
        lng: t.lng,
        startLat: typeof t.meta?.startLat === "number" ? t.meta.startLat : null,
        startLng: typeof t.meta?.startLng === "number" ? t.meta.startLng : null,
        endLat: typeof t.meta?.endLat === "number" ? t.meta.endLat : null,
        endLng: typeof t.meta?.endLng === "number" ? t.meta.endLng : null,
        country: typeof t.meta?.country === "string" ? t.meta.country : null,
        lengthKm: typeof t.meta?.lengthKm === "number" ? t.meta.lengthKm : null,
        riskNote: typeof t.meta?.riskNote === "string" ? t.meta.riskNote : null,
        relatedTickers:
          typeof t.meta?.relatedTickers === "string" ? t.meta.relatedTickers : null,
        tier: t.tier ?? 1,
        ingestedAt,
      })),
    );
    return SUBMARINE_TUNNEL_SEED.length;
  } catch {
    return 0;
  }
}
