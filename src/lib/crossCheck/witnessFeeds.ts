/**
 * 이미 받아 둔 원문으로 둘째 칸을 채운다.
 * 열·경보·항적·지진의 맞음은 "그게 거기 있었다"까지만이다.
 * 당사자 계정 글은 성명 원문이다. 오신트 계정은 여기 넣지 않는다.
 * 전선 면 안이면 그 지도가 원문이다. 누가 쥐고 있는지는 말하지 않는다.
 * 기록이 없다고 해서 어긋남을 찍지 않는다. 수신이 빈 것일 수 있다.
 */

import type { FirmsFire } from "@/data/geoTypes";
import type { StackItem } from "@/lib/incidentStack/build";
import { haversineKm } from "@/lib/vesselIncidentMatch";

export type SensorKind = "heat" | "alert" | "track" | "quake" | "statement" | "record";

export type SensorHit = {
  rank: number;
  result: "match" | "original";
  sensor: SensorKind;
  sourceName: string;
  href: string | null;
  body: string | null;
  /** 텔레그램처럼 앞부분만 받아 둔 글 */
  partial: boolean;
  distanceKm: number | null;
};

export type TrackFix = {
  lat: number;
  lng: number;
  timestamp: string | null;
  callsign: string | null;
};

export type StatementPost = {
  channelUsername: string;
  channelTitle: string;
  text: string;
  receivedAt: string;
  messageUrl?: string | null;
  placeLat?: number | null;
  placeLng?: number | null;
  /** 공개로 나가는 글은 앞부분만이다 */
  textTruncated?: boolean;
};

/** 당사자가 직접 운영하는 계정. 통신사·오신트 계정은 빼 둔다. */
const OFFICIAL = new Set(
  [
    "IDFofficial",
    "sepah",
    "defapress_ir",
    "mod_russia",
    "GeneralStaffZSU",
    "kpszsu",
    "V_Zelenskiy_official",
    "operativnoZSU",
  ].map((name) => name.toLowerCase()),
);

/** 사이렌을 옮기는 계정. 성명이 아니라 경보 기록으로만 쓴다. */
const SIREN = new Set(["rocketalert", "alertisrael"]);

const HOUR = 3_600_000;

function ms(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}

function firmsMs(fire: FirmsFire): number | null {
  if (!fire.acqDate) return null;
  const digits = (fire.acqTime ?? "").replace(/\D/g, "");
  if (digits.length < 3) return ms(fire.acqDate);
  const hhmm = digits.padStart(4, "0");
  return ms(`${fire.acqDate}T${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}:00Z`);
}

function near(at: number, when: number | null, hours: number): boolean {
  if (when == null) return false;
  return Math.abs(when - at) <= hours * HOUR;
}

export function isOfficialVoice(username: string | null | undefined): boolean {
  return OFFICIAL.has((username ?? "").toLowerCase());
}

function heatHit(item: StackItem, fires: readonly FirmsFire[] | null | undefined): SensorHit | null {
  if (!fires || fires.length === 0 || !Number.isFinite(item.at)) return null;
  let best: { fire: FirmsFire; distanceKm: number } | null = null;
  for (const fire of fires) {
    if (!near(item.at, firmsMs(fire), 6)) continue;
    const distanceKm = haversineKm(item.lat, item.lng, fire.lat, fire.lng);
    if (distanceKm > 40) continue;
    if (!best || distanceKm < best.distanceKm) best = { fire, distanceKm };
  }
  if (!best) return null;
  const when = best.fire.acqDate ? `${best.fire.acqDate} ${best.fire.acqTime ?? ""}`.trim() : "";
  return {
    rank: 3,
    result: "match",
    sensor: "heat",
    sourceName: best.fire.satellite || "FIRMS",
    href: null,
    body: [when, best.fire.satellite, `${Math.round(best.distanceKm)}km`].filter(Boolean).join(" · "),
    partial: false,
    distanceKm: best.distanceKm,
  };
}

function trackHit(item: StackItem, tracks: readonly TrackFix[] | null | undefined): SensorHit | null {
  if (!tracks || tracks.length === 0 || !Number.isFinite(item.at)) return null;
  let best: { fix: TrackFix; distanceKm: number } | null = null;
  for (const fix of tracks) {
    if (!near(item.at, ms(fix.timestamp), 1.5)) continue;
    const distanceKm = haversineKm(item.lat, item.lng, fix.lat, fix.lng);
    if (distanceKm > 80) continue;
    if (!best || distanceKm < best.distanceKm) best = { fix, distanceKm };
  }
  if (!best) return null;
  return {
    rank: 1,
    result: "match",
    sensor: "track",
    sourceName: best.fix.callsign || "ADS-B",
    href: null,
    body: [best.fix.callsign, `${Math.round(best.distanceKm)}km`].filter(Boolean).join(" · "),
    partial: false,
    distanceKm: best.distanceKm,
  };
}

function sirenHit(item: StackItem, posts: readonly StatementPost[] | null | undefined): SensorHit | null {
  if (!posts || !Number.isFinite(item.at)) return null;
  let best: { post: StatementPost; distanceKm: number } | null = null;
  for (const post of posts) {
    if (!SIREN.has(post.channelUsername.toLowerCase())) continue;
    if (!near(item.at, ms(post.receivedAt), 3)) continue;
    if (post.placeLat == null || post.placeLng == null) continue;
    const distanceKm = haversineKm(item.lat, item.lng, post.placeLat, post.placeLng);
    if (distanceKm > 80) continue;
    if (!best || distanceKm < best.distanceKm) best = { post, distanceKm };
  }
  if (!best) return null;
  return {
    rank: 4,
    result: "match",
    sensor: "alert",
    sourceName: best.post.channelTitle,
    href: best.post.messageUrl ?? null,
    body: best.post.text.trim() || null,
    partial: best.post.textTruncated === true,
    distanceKm: best.distanceKm,
  };
}

export function strikeHitFromFeeds(
  item: StackItem,
  feeds: {
    fires?: readonly FirmsFire[] | null;
    tracks?: readonly TrackFix[] | null;
    posts?: readonly StatementPost[] | null;
    remote?: SensorHit | null;
  },
): SensorHit | null {
  const hits = [heatHit(item, feeds.fires), trackHit(item, feeds.tracks), sirenHit(item, feeds.posts), feeds.remote ?? null].filter(
    (hit): hit is SensorHit => hit != null,
  );
  hits.sort((a, b) => b.rank - a.rank);
  return hits[0] ?? null;
}

export function statementHit(item: StackItem, posts: readonly StatementPost[] | null | undefined): SensorHit | null {
  if (!posts || posts.length === 0 || !Number.isFinite(item.at)) return null;
  let best: { post: StatementPost; distanceKm: number | null; score: number } | null = null;
  for (const post of posts) {
    if (!isOfficialVoice(post.channelUsername)) continue;
    const when = ms(post.receivedAt);
    if (!near(item.at, when, 12) || when == null) continue;
    let distanceKm: number | null = null;
    if (post.placeLat != null && post.placeLng != null) {
      distanceKm = haversineKm(item.lat, item.lng, post.placeLat, post.placeLng);
      if (distanceKm > 250) continue;
    } else if (Math.abs(when - item.at) > 6 * HOUR) {
      continue;
    }
    const score = Math.abs(when - item.at) + (distanceKm ?? 200);
    if (!best || score < best.score) best = { post, distanceKm, score };
  }
  if (!best) return null;
  return {
    rank: 0,
    result: "original",
    sensor: "statement",
    sourceName: best.post.channelTitle,
    href: best.post.messageUrl ?? null,
    body: best.post.text.trim() || null,
    partial: best.post.textTruncated === true,
    distanceKm: best.distanceKm,
  };
}

export function feedsWereSearched(list: readonly unknown[] | null | undefined): boolean {
  return Array.isArray(list) && list.length > 0;
}

type QuakeFeature = {
  properties?: { mag?: number; place?: string; url?: string; time?: number };
};

/** 브라우저에서 같은 집의 경보 기록과 지진 기록을 읽는다. */
export async function loadStrikeOriginals(item: {
  lat: number;
  lng: number;
  at: number;
}): Promise<{ hit: SensorHit | null; looked: boolean }> {
  if (!Number.isFinite(item.at) || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)) {
    return { hit: null, looked: false };
  }
  const at = new Date(item.at).toISOString();
  const raidUrl = `/api/air-raid-history?lat=${item.lat}&lng=${item.lng}&at=${encodeURIComponent(at)}&windowHours=3&radiusKm=50`;
  const quakeUrl = `/api/cross-check/quake?lat=${item.lat}&lng=${item.lng}&at=${encodeURIComponent(at)}`;
  const [raid, quake] = await Promise.all([
    fetch(raidUrl).then((res) => (res.ok ? res.json() : null)).catch(() => null),
    fetch(quakeUrl).then((res) => (res.ok ? res.json() : null)).catch(() => null),
  ]);
  const hits: SensorHit[] = [];
  const summary = raid?.summary as { evidenceGradeAlertCount?: number; threatCount?: number } | undefined;
  if ((summary?.evidenceGradeAlertCount ?? 0) > 0 || (summary?.threatCount ?? 0) > 0) {
    const distanceKm =
      (raid?.threats?.[0]?.distanceKm as number | undefined) ??
      (raid?.alerts?.find((row: { evidenceGrade?: boolean }) => row.evidenceGrade)?.distanceKm as number | undefined) ??
      null;
    hits.push({
      rank: 5,
      result: "match",
      sensor: "alert",
      sourceName: "alert",
      href: null,
      body: distanceKm != null ? `${Math.round(distanceKm)}km` : null,
      partial: false,
      distanceKm,
    });
  }
  const feature = quake?.hit as QuakeFeature["properties"] | null | undefined;
  if (feature && typeof feature.mag === "number") {
    hits.push({
      rank: 2,
      result: "match",
      sensor: "quake",
      sourceName: "USGS",
      href: typeof feature.url === "string" ? feature.url : null,
      body: [`M${feature.mag}`, feature.place].filter(Boolean).join(" · "),
      partial: false,
      distanceKm: null,
    });
  }
  hits.sort((a, b) => b.rank - a.rank);
  return { hit: hits[0] ?? null, looked: raid != null || quake != null };
}

export type FrontMap = {
  features?: {
    properties?: { name?: unknown } | null;
    geometry?: { type?: string; coordinates?: unknown } | null;
  }[];
} | null;

function ringHolds(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = Number(ring[i]?.[0]);
    const yi = Number(ring[i]?.[1]);
    const xj = Number(ring[j]?.[0]);
    const yj = Number(ring[j]?.[1]);
    if (![xi, yi, xj, yj].every(Number.isFinite)) continue;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi) inside = !inside;
  }
  return inside;
}

function geometryHolds(lng: number, lat: number, geometry: { type?: string; coordinates?: unknown } | null | undefined): boolean {
  if (!geometry) return false;
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    const rings = geometry.coordinates as number[][][];
    if (!rings[0] || !ringHolds(lng, lat, rings[0])) return false;
    return !rings.slice(1).some((hole) => ringHolds(lng, lat, hole));
  }
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return (geometry.coordinates as number[][][][]).some((poly) =>
      geometryHolds(lng, lat, { type: "Polygon", coordinates: poly }),
    );
  }
  return false;
}

function areaLabel(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const t = name.trim();
  if (!t || t.startsWith("liveua-control-")) return null;
  return t;
}

/** 점이 받아 둔 전선 면 안이면 그 면이 원문이다. 통제 주체는 적지 않는다. */
export function frontRecord(item: { lat: number; lng: number }, map: FrontMap): SensorHit | null {
  const features = map?.features ?? [];
  for (const feature of features) {
    if (!geometryHolds(item.lng, item.lat, feature.geometry)) continue;
    const name = areaLabel(feature.properties?.name);
    return {
      rank: 0,
      result: "original",
      sensor: "record",
      sourceName: name ?? "LiveUA",
      href: null,
      body: name ?? "통제면",
      partial: false,
      distanceKm: null,
    };
  }
  return null;
}

export function frontMapReady(map: FrontMap): boolean {
  return (map?.features?.length ?? 0) > 0;
}

let frontCache: { at: number; map: FrontMap } | null = null;

/** 화면에 전선 면이 아직 없으면, 지도가 읽는 같은 기록을 한 번 받는다. */
export async function loadFrontMap(): Promise<FrontMap> {
  if (frontCache && Date.now() - frontCache.at < 60_000 && frontMapReady(frontCache.map)) return frontCache.map;
  const regions = ["ukraine", "iran", "yemen", "lebanon", "israel-palestine"];
  const features: NonNullable<FrontMap>["features"] = [];
  await Promise.all(
    regions.map(async (region) => {
      try {
        const res = await fetch(`/api/deepstate/frontlines?region=${region}&liveuaOnly=1`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { source?: string; occupied?: FrontMap };
        if (body.source === "liveuamap" && body.occupied?.features?.length) features.push(...body.occupied.features);
      } catch {
        // 한 지역이 비어도 나머지는 쓴다
      }
    }),
  );
  const map: FrontMap = features.length ? { features } : null;
  if (features.length) frontCache = { at: Date.now(), map };
  return map;
}
