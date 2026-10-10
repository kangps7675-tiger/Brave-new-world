/**
 * 사건 날짜 기준 통제 구역 — DeepState Map 이력 스냅샷.
 * 사건 시각 직전 스냅샷에서 지점이 점령지 폴리곤 안인지, 경계까지 몇 km인지 계산한다.
 * 우크라이나 전선만 다룬다.
 */

import type { MultiPolygon, Polygon, Position } from "geojson";
import { deepstateToOccupiedGeoJson } from "@/lib/deepstate/toOccupiedGeoJson";
import { isInUkraineFrontTheater } from "@/lib/ukraineFrontGeojson";
import { sealServerFrozenPayload, type ServerFrozenPayload } from "@/lib/caseFile/serverFreeze";
import type { CaseIncident } from "@/lib/caseFile/types";

const HISTORY_LIST_URL = "https://deepstatemap.live/api/history/public";
const historyGeoJsonUrl = (id: number) => `https://deepstatemap.live/api/history/${id}/geojson`;
const FETCH_TIMEOUT_MS = 20_000;
const LIST_CACHE_MS = 60 * 60_000;
/** 사건 시각과 스냅샷 시각이 이보다 멀면 근거로 약함 */
export const CONTROL_SNAPSHOT_MAX_AGE_DAYS = 7;

export type ControlStatus = "occupied" | "annexed" | "contested" | "ukraine-held";

export type ControlZoneResults = {
  status: ControlStatus;
  /** 스냅샷 id·시각 */
  snapshot: { id: number; datetime: string };
  /** 사건 시각 − 스냅샷 시각 (일) */
  snapshotAgeDays: number;
  /** 가장 가까운 점령지 경계까지 (km) */
  boundaryKm: number | null;
  featureName: string | null;
  lat: number;
  lng: number;
  attribution: string;
};

type HistoryEntry = { id: number; datetime: string };
let listCache: { at: number; entries: HistoryEntry[] } | null = null;

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "BraveNewWorld-CaseFile/1.0" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`DeepState HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function historyEntries(): Promise<HistoryEntry[]> {
  if (listCache && Date.now() - listCache.at < LIST_CACHE_MS) return listCache.entries;
  const raw = await fetchJson(HISTORY_LIST_URL);
  const rows = Array.isArray(raw) ? raw : [];
  const entries: HistoryEntry[] = [];
  for (const r of rows as Array<{ id?: unknown; datetime?: unknown; createdAt?: unknown }>) {
    const id = typeof r.id === "number" ? r.id : Number(r.id);
    const dt = typeof r.datetime === "string" ? r.datetime : typeof r.createdAt === "string" ? r.createdAt : "";
    if (!Number.isFinite(id) || !Number.isFinite(Date.parse(dt))) continue;
    entries.push({ id, datetime: new Date(Date.parse(dt)).toISOString() });
  }
  entries.sort((a, b) => a.datetime.localeCompare(b.datetime));
  listCache = { at: Date.now(), entries };
  return entries;
}

/** 사건 시각 이전 마지막 스냅샷 (없으면 이후 첫 스냅샷) */
export function pickSnapshotFor(entries: HistoryEntry[], incidentIso: string): HistoryEntry | null {
  let before: HistoryEntry | null = null;
  for (const e of entries) {
    if (e.datetime <= incidentIso) before = e;
    else return before ?? e;
  }
  return before;
}

function pointInRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = Number(ring[i]![0]);
    const yi = Number(ring[i]![1]);
    const xj = Number(ring[j]![0]);
    const yj = Number(ring[j]![1]);
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointInPolygonGeometry(lng: number, lat: number, g: Polygon | MultiPolygon): boolean {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  return polys.some((rings) => {
    if (!rings[0] || !pointInRing(lng, lat, rings[0])) return false;
    return !rings.slice(1).some((hole) => pointInRing(lng, lat, hole));
  });
}

/** 지점 ↔ 폴리곤 경계 최단 거리 (km, 등장방형 근사) */
export function distanceToBoundaryKm(lng: number, lat: number, g: Polygon | MultiPolygon): number {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const ky = 110.57;
  let best = Infinity;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const rings of polys) {
    for (const ring of rings) {
      for (let i = 1; i < ring.length; i += 1) {
        const ax = (Number(ring[i - 1]![0]) - lng) * kx;
        const ay = (Number(ring[i - 1]![1]) - lat) * ky;
        const bx = (Number(ring[i]![0]) - lng) * kx;
        const by = (Number(ring[i]![1]) - lat) * ky;
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = dx * dx + dy * dy;
        const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
        const px = ax + t * dx;
        const py = ay + t * dy;
        best = Math.min(best, Math.hypot(px, py));
      }
    }
  }
  return best;
}

export async function freezeControlZoneEvidence(
  incident: CaseIncident,
): Promise<{ payload: ServerFrozenPayload; results: ControlZoneResults; shows: string; limits: string } | { error: string }> {
  const { place, occurredAt } = incident;
  if (!place || !occurredAt) return { error: "사건 위치·시각을 먼저 설정하세요." };
  if (!isInUkraineFrontTheater(place.lng, place.lat)) {
    return { error: "통제 구역 이력은 우크라이나 전선만 지원합니다" };
  }
  const incidentIso = new Date(Date.parse(occurredAt)).toISOString();

  const entries = await historyEntries();
  const snap = pickSnapshotFor(entries, incidentIso);
  if (!snap) return { error: "DeepState 이력 스냅샷을 찾지 못했습니다" };

  const fc = deepstateToOccupiedGeoJson(await fetchJson(historyGeoJsonUrl(snap.id)));
  let status: ControlStatus = "ukraine-held";
  let featureName: string | null = null;
  let boundaryKm = Infinity;
  for (const f of fc.features) {
    const g = f.geometry as Polygon | MultiPolygon;
    if (g.type !== "Polygon" && g.type !== "MultiPolygon") continue;
    boundaryKm = Math.min(boundaryKm, distanceToBoundaryKm(place.lng, place.lat, g));
    if (status === "ukraine-held" && pointInPolygonGeometry(place.lng, place.lat, g)) {
      const props = (f.properties ?? {}) as { role?: string; fill?: string; name?: string };
      featureName = props.name ?? null;
      status =
        props.fill === "#880e4f" ? "annexed" : props.role === "ru-claimed" ? "contested" : "occupied";
    }
  }

  const snapshotAgeDays =
    Math.round(((Date.parse(incidentIso) - Date.parse(snap.datetime)) / 86_400_000) * 10) / 10;
  const results: ControlZoneResults = {
    status,
    snapshot: snap,
    snapshotAgeDays,
    boundaryKm: Number.isFinite(boundaryKm) ? Math.round(boundaryKm * 10) / 10 : null,
    featureName,
    lat: place.lat,
    lng: place.lng,
    attribution: "DeepStateMap.live",
  };

  const label: Record<ControlStatus, string> = {
    occupied: "러시아 점령지 안",
    annexed: "러시아 병합 주장 지역 안",
    contested: "통제 불명(회색) 지역 안",
    "ukraine-held": "우크라이나 통제 지역",
  };
  const shows = `${snap.datetime.slice(0, 10)} 기준 ${label[status]}${
    results.boundaryKm != null ? ` · 점령지 경계까지 ${results.boundaryKm}km` : ""
  }`;
  const limits = [
    "DeepState 지도는 공개 정보 기반 추정 — 경계는 수 km 오차 가능",
    Math.abs(snapshotAgeDays) > CONTROL_SNAPSHOT_MAX_AGE_DAYS
      ? `스냅샷이 사건과 ${Math.abs(snapshotAgeDays)}일 차이`
      : null,
    results.boundaryKm != null && results.boundaryKm < 3 ? "경계 3km 이내 — 통제 판단 불확실" : null,
    "상업 이용은 DeepState 허락 필요",
  ]
    .filter(Boolean)
    .join(" · ");

  const payload = sealServerFrozenPayload({
    serverProven: true,
    sourceKind: "control-zone",
    queriedAt: new Date().toISOString(),
    query: {
      lat: place.lat,
      lng: place.lng,
      radiusKm: 0,
      incidentIso,
      provider: "deepstate-history",
    },
    resultHash: "",
    resultCount: 1,
    results,
    pickId: String(snap.id),
  });

  return { payload, results, shows, limits };
}
