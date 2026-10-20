import type { GeoJsonGeometry, UkraineControlZone } from "@/data/geoTypes";
import { EXTREME_ZOOM_ALTITUDE } from "@/lib/globeCamera";
import { getGlobeLod, globeLodFromTier, type GlobeLod, type GlobeLodTier } from "@/lib/globeLod";
import { haversineDistanceKm } from "@/lib/viewportCull";

export type ViinaLod = GlobeLod & {
  mode: "hidden" | "overview" | "detail";
  maxFeatures: number;
};

export type ViinaPolygonLayers = {
  ruZones: UkraineControlZone[];
  /** 점령 면 채움 — 상세 줌에서는 단순화 폴리곤만 */
  ruFillZones: UkraineControlZone[];
  uaZones: UkraineControlZone[];
  contestedZones: UkraineControlZone[];
  zones: UkraineControlZone[];
  lod: ViinaLod;
};

type ViewState = { lat: number; lng: number; altitude: number };

/** 우크라이나 극동부 박스 대략 경계 — 이 밖 폴리곤은 버림 */
const UA_BOUNDS = {
  minLng: 21.5,
  maxLng: 41.5,
  minLat: 43.5,
  maxLat: 53.5,
};

const MAX_FEATURES: Record<ViinaLod["tier"], number> = {
  global: 900,
  continent: 1200,
  regional: 2800,
  near: 2200,
  village: 2800,
};

/** 극근접 줌 — 폴리곤 feature 상한 (WebGL 정점 부하) */
const EXTREME_ZOOM_MAX_FEATURES: Partial<Record<ViinaLod["tier"], number>> = {
  near: 620,
  village: 720,
};

/** Near/Village 줌 정착지 HTML 라벨 — 화면 내 tier·거리 기준 budget */
export const VIINA_SETTLEMENT_LABEL_BUDGET: Record<"near" | "village", number> = {
  near: 16,
  village: 22,
};

export const VIINA_SETTLEMENT_LABEL_RADIUS_KM: Record<"near" | "village", number> = {
  near: 36,
  village: 28,
};

export type ViinaSettlementLabelCandidate = {
  lat: number;
  lng: number;
  tierRank: number;
};

export function filterViinaSettlementLabelsByViewport<T extends ViinaSettlementLabelCandidate>(
  labels: T[],
  tier: GlobeLodTier,
  centerLat: number,
  centerLng: number,
): T[] {
  if (tier !== "near" && tier !== "village") return labels;

  const budget = VIINA_SETTLEMENT_LABEL_BUDGET[tier];
  const radiusKm = VIINA_SETTLEMENT_LABEL_RADIUS_KM[tier];

  return labels
    .filter(
      (label) =>
        haversineDistanceKm(centerLat, centerLng, label.lat, label.lng) <= radiusKm,
    )
    .sort((a, b) => {
      if (b.tierRank !== a.tierRank) return b.tierRank - a.tierRank;
      return (
        haversineDistanceKm(centerLat, centerLng, a.lat, a.lng) -
        haversineDistanceKm(centerLat, centerLng, b.lat, b.lng)
      );
    })
    .slice(0, budget);
}

const LAYER_SHARE = {
  ru: 0.32,
  contested: 0.18,
  ua: 0.28,
} as const;

/** RU 점령 영토 — 물감 채움 (전장 고정, 줌 컬링 없음) */
const RU_FILL_MAX: Record<ViinaLod["mode"], number> = {
  hidden: 0,
  overview: 900,
  detail: 2200,
};

const UA_FILL_MAX: Record<ViinaLod["mode"], number> = {
  hidden: 0,
  overview: 700,
  detail: 1800,
};

const CONTESTED_FILL_MAX: Record<ViinaLod["mode"], number> = {
  hidden: 0,
  overview: 400,
  detail: 900,
};

function longitudeDistance(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function zoneDistanceDeg(zone: UkraineControlZone, view: ViewState) {
  const latDist = Math.abs(view.lat - zone.center.lat);
  const lngDist = longitudeDistance(view.lng, zone.center.lng);
  return Math.sqrt(latDist ** 2 + lngDist ** 2);
}

function zoneInUkraineTheater(zone: UkraineControlZone) {
  const { lat, lng } = zone.center;
  return (
    lng >= UA_BOUNDS.minLng &&
    lng <= UA_BOUNDS.maxLng &&
    lat >= UA_BOUNDS.minLat &&
    lat <= UA_BOUNDS.maxLat
  );
}

function zoneHasUsableGeometry(zone: UkraineControlZone) {
  const geometry = zone.geometry;
  if (!geometry) return false;
  const polys =
    geometry.type === "Polygon"
      ? [geometry.coordinates as number[][][]]
      : geometry.type === "MultiPolygon"
        ? (geometry.coordinates as number[][][][])
        : [];
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring || ring.length < 4) continue;
    if (Math.abs(ringSignedArea(ring)) > 1e-10) return true;
  }
  return false;
}

/** shoelace — lng/lat에서 양수면 CCW. three-globe는 CW(분쟁지와 동일)를 기대 */
function ringSignedArea(ring: number[][]) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return area / 2;
}

function ensureClockwiseRing(ring: number[][]) {
  if (!Array.isArray(ring) || ring.length < 4) return ring;
  if (ringSignedArea(ring) > 0) {
    return ring.slice().reverse();
  }
  return ring;
}

function normalizeGeometryWinding(geometry: GeoJsonGeometry): GeoJsonGeometry {
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates as number[][][];
    return {
      type: "Polygon",
      coordinates: coords.map((ring, index) => {
        const fixed = ensureClockwiseRing(ring);
        // holes should be opposite of exterior (CCW when exterior is CW)
        if (index > 0 && ringSignedArea(fixed) < 0) return fixed.slice().reverse();
        return fixed;
      }),
    };
  }
  if (geometry.type === "MultiPolygon") {
    const coords = geometry.coordinates as number[][][][];
    return {
      type: "MultiPolygon",
      coordinates: coords.map(
        (polygon) =>
          polygon.map((ring, index) => {
            const fixed = ensureClockwiseRing(ring);
            if (index > 0 && ringSignedArea(fixed) < 0) return fixed.slice().reverse();
            return fixed;
          }) as number[][][],
      ),
    };
  }
  return geometry;
}

export function normalizeViinaZoneWinding(zone: UkraineControlZone): UkraineControlZone {
  return {
    ...zone,
    geometry: normalizeGeometryWinding(zone.geometry),
  };
}

function simplifyRing(ring: number[][], maxPoints = 6) {
  if (!Array.isArray(ring) || ring.length <= maxPoints) return ensureClockwiseRing(ring);
  const step = Math.ceil(ring.length / maxPoints);
  const sampled = ring.filter((_, index) => index % step === 0);
  const last = ring[ring.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return ensureClockwiseRing(sampled);
}

function simplifyGeometry(geometry: GeoJsonGeometry, maxPoints = 6): GeoJsonGeometry {
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates as number[][][];
    return {
      type: "Polygon",
      coordinates: coords.map((ring) => simplifyRing(ring, maxPoints)),
    };
  }
  if (geometry.type === "MultiPolygon") {
    const coords = geometry.coordinates as number[][][][];
    return {
      type: "MultiPolygon",
      coordinates: coords.map((polygon) =>
        polygon.map((ring) => simplifyRing(ring, maxPoints)),
      ),
    };
  }
  return geometry;
}

export function getViinaLod(altitude: number, tier?: GlobeLodTier): ViinaLod {
  const base = tier ? globeLodFromTier(tier) : getGlobeLod(altitude);
  let mode: ViinaLod["mode"];
  if (base.tier === "global") mode = "overview";
  else if (base.tier === "continent") mode = "overview";
  else mode = "detail";

  let maxFeatures = MAX_FEATURES[base.tier];
  if (altitude < EXTREME_ZOOM_ALTITUDE && maxFeatures > 0) {
    const extremeCap = EXTREME_ZOOM_MAX_FEATURES[base.tier];
    maxFeatures = Math.min(maxFeatures, extremeCap ?? 900);
  }

  return {
    ...base,
    mode,
    maxFeatures,
  };
}

export function buildOverviewFromDetail(zones: UkraineControlZone[]): UkraineControlZone[] {
  return zones.map((zone, index) => ({
    ...zone,
    id: `viina-${zone.controlStatus.toLowerCase()}-overview-${index}`,
    geometry: simplifyGeometry(zone.geometry, 6),
  }));
}

function splitByStatus(zones: UkraineControlZone[]) {
  const ruZones: UkraineControlZone[] = [];
  const uaZones: UkraineControlZone[] = [];
  const contestedZones: UkraineControlZone[] = [];

  for (const zone of zones) {
    if (!zoneInUkraineTheater(zone) || !zoneHasUsableGeometry(zone)) continue;
    if (zone.controlStatus === "RU") ruZones.push(zone);
    else if (zone.controlStatus === "CONTESTED") contestedZones.push(zone);
    else uaZones.push(zone);
  }

  return { ruZones, uaZones, contestedZones };
}

export function filterViinaZones(
  zones: UkraineControlZone[],
  view: ViewState,
  lod: ViinaLod,
  maxCount?: number,
  options?: { /** 국경처럼 전장 전체 유지 — 카메라 반경 컬링 생략 */ theaterPinned?: boolean },
): UkraineControlZone[] {
  const budget = maxCount ?? lod.maxFeatures;
  if (lod.mode === "hidden" || budget <= 0) return [];

  const theater = zones.filter(zoneInUkraineTheater);
  const theaterPinned = options?.theaterPinned === true;
  const candidates =
    !theaterPinned && lod.radiusDeg > 0
      ? theater.filter((zone) => zoneDistanceDeg(zone, view) <= lod.radiusDeg)
      : theater;

  if (candidates.length <= budget) return candidates;

  return candidates
    .slice()
    .sort((a, b) => zoneDistanceDeg(a, view) - zoneDistanceDeg(b, view))
    .slice(0, budget);
}

export function selectViinaPolygons(
  detail: UkraineControlZone[],
  overview: UkraineControlZone[],
  view: ViewState,
  altitude: number,
  lodTier?: GlobeLodTier,
): ViinaPolygonLayers {
  const lod = getViinaLod(altitude, lodTier);

  if (lod.mode === "hidden") {
    return {
      ruZones: [],
      ruFillZones: [],
      uaZones: [],
      contestedZones: [],
      zones: [],
      lod,
    };
  }

  const detailSplit = splitByStatus(detail);
  const overviewSplit = splitByStatus(overview);

  const ruOverview =
    overviewSplit.ruZones.length > 0
      ? overviewSplit.ruZones
      : buildOverviewFromDetail(detailSplit.ruZones);
  const uaOverview =
    overviewSplit.uaZones.length > 0
      ? overviewSplit.uaZones
      : buildOverviewFromDetail(detailSplit.uaZones);
  const contestedOverview =
    overviewSplit.contestedZones.length > 0
      ? overviewSplit.contestedZones
      : buildOverviewFromDetail(detailSplit.contestedZones);

  const ruSource = lod.mode === "overview" ? ruOverview : detailSplit.ruZones;
  const uaSource = lod.mode === "overview" ? uaOverview : detailSplit.uaZones;
  const contestedSource =
    lod.mode === "overview" ? contestedOverview : detailSplit.contestedZones;

  // 점령·주장 면: 맵리브레 지면에 국경처럼 고정 — 줌인해도 theater 전체 유지
  const pin = { theaterPinned: true as const };
  const ruFillZones = filterViinaZones(
    lod.mode === "detail" ? detailSplit.ruZones : ruOverview,
    view,
    lod,
    RU_FILL_MAX[lod.mode],
    pin,
  ).map(normalizeViinaZoneWinding);
  const uaZones = filterViinaZones(
    uaSource,
    view,
    lod,
    UA_FILL_MAX[lod.mode],
    pin,
  ).map(normalizeViinaZoneWinding);
  const contestedZones = filterViinaZones(
    contestedSource,
    view,
    lod,
    CONTESTED_FILL_MAX[lod.mode],
    pin,
  ).map(normalizeViinaZoneWinding);

  // 전선 edge 추출용 — 면과 동일 소스를 쓰면 확대 시에도 경계선이 끊기지 않음
  const ruZones = filterViinaZones(
    ruSource,
    view,
    lod,
    Math.max(RU_FILL_MAX[lod.mode], Math.floor(lod.maxFeatures * LAYER_SHARE.ru)),
    pin,
  ).map(normalizeViinaZoneWinding);

  const zones = [...ruFillZones, ...contestedZones, ...uaZones];

  return { ruZones, ruFillZones, uaZones, contestedZones, zones, lod };
}
