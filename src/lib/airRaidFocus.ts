import { emitDashboardSound } from "@/components/SoundEffectsBridge";
import type { AudioEventId } from "@/data/audioManifest";
import type { TransportPath } from "@/data/geoTypes";
import { geometryHatchPathsOnly, TENSION_GRADE_STYLES } from "@/lib/disputeHatch";
import type { Polygon } from "geojson";

export const AIR_RAID_SIREN_MS = 10000;
export const AIR_RAID_SIREN_VOLUME_SCALE = 1.45;
/** fly 시작 후 사이렌 시작 지연 — 수동 칩 클릭용(이동 직후). 자동 fly는 AIR_RAID_FLY_MS로 도착 맞춤. */
export const AIR_RAID_SIREN_DELAY_MS = 650;
/**
 * 공습경보 포커스 — 국가 전체가 아니라 경보 발령 지역(시·군·구역) 스케일.
 * ~0.72 ≈ 도시·권역이 읽히는 LOD (구 2.0 전역 줌 폐지).
 */
export const AIR_RAID_FLY_ALTITUDE = 0.72;
export const AIR_RAID_FLY_MS = 900;
/** 포커스 빗금·테두리 표시 시간 (사이렌 + 여유) */
export const AIR_RAID_FOCUS_HATCH_MS = AIR_RAID_FLY_MS + AIR_RAID_SIREN_DELAY_MS + AIR_RAID_SIREN_MS;

/** 지역 단위 공습경보 구역 테두리 */
export const AIR_RAID_FOCUS_OUTLINE = "rgba(127, 29, 29, 1)";
export const AIR_RAID_FOCUS_HATCH = "rgba(185, 28, 28, 0.82)";

/** UA / IL / IR(NewFeeds) 동일 지역 포커스 스타일 */
export type AirRaidSirenKind = "tzeva" | "neptun" | "newfeeds";

const SIREN_EVENT: Partial<Record<AirRaidSirenKind, AudioEventId>> = {
  tzeva: "tzeva-red-alert",
  neptun: "neptun-air-alert",
  // newfeeds: 국영·OSINT 마커 — 사이렌 없이 시각 포커스만
};

/**
 * 경보 단위 대략 반경(도) — 시·군·구역 스케일 (국가 박스 금지)
 * tzeva ≈ 도시권, neptun ≈ raion, newfeeds ≈ 공격 지점 주변
 */
const HATCH_HALF_SPAN_DEG: Record<AirRaidSirenKind, number> = {
  tzeva: 0.38,
  neptun: 0.48,
  newfeeds: 0.42,
};

export function isAirRaidFocusPath(path: TransportPath): boolean {
  return path.id.startsWith("air-raid-focus-");
}

/**
 * 지역 이동 직후 짧게·약간 크게 공습경보음 (음소거 시 무시). NewFeeds는 시각만.
 * `isLayerActive`가 false면 재생하지 않음 — 레이어 OFF면 사이렌 없음.
 */
export function playAirRaidSirenAfterFly(
  kind: AirRaidSirenKind,
  delayMs = AIR_RAID_SIREN_DELAY_MS,
  isLayerActive?: () => boolean,
) {
  const eventId = SIREN_EVENT[kind];
  if (!eventId) return;
  if (isLayerActive && !isLayerActive()) return;
  window.setTimeout(() => {
    if (isLayerActive && !isLayerActive()) return;
    emitDashboardSound(eventId, {
      durationMs: AIR_RAID_SIREN_MS,
      volumeScale: AIR_RAID_SIREN_VOLUME_SCALE,
      force: true,
    });
  }, delayMs);
}

/**
 * 공습경보 포커스 — 경보 지역 중심 진한 사각 테두리 + 빗금.
 * 우크라·이스라엘·이란(NewFeeds) 동일 스타일.
 */
export type AirRaidFocusBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export function buildAirRaidFocusBox(
  lat: number,
  lng: number,
  kind: AirRaidSirenKind,
): AirRaidFocusBox | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const half = HATCH_HALF_SPAN_DEG[kind];
  return {
    minLat: lat - half,
    maxLat: lat + half,
    minLng: lng - half,
    maxLng: lng + half,
  };
}

/** MapLibre fill용 — 정면에서도 빗금만으로 안 묻히게 면 채움 */
export function airRaidFocusBoxPolygon(box: AirRaidFocusBox): Polygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [box.minLng, box.minLat],
        [box.maxLng, box.minLat],
        [box.maxLng, box.maxLat],
        [box.minLng, box.maxLat],
        [box.minLng, box.minLat],
      ],
    ],
  };
}

export function buildAirRaidFocusHatchPaths(
  lat: number,
  lng: number,
  kind: AirRaidSirenKind,
  label?: string,
): TransportPath[] {
  const box = buildAirRaidFocusBox(lat, lng, kind);
  if (!box) return [];
  const combat = TENSION_GRADE_STYLES.combat;
  const stamp = Date.now().toString(36);
  const idBase = `air-raid-focus-${kind}-${stamp}`;

  const outline: TransportPath = {
    id: `${idBase}-outline`,
    kind: "dispute-zone",
    name: label ?? null,
    scalerank: 1,
    lengthKm: null,
    accentColor: AIR_RAID_FOCUS_OUTLINE,
    bbox: box,
    points: [
      { lat: box.minLat, lng: box.minLng },
      { lat: box.minLat, lng: box.maxLng },
      { lat: box.maxLat, lng: box.maxLng },
      { lat: box.maxLat, lng: box.minLng },
      { lat: box.minLat, lng: box.minLng },
    ],
  };

  const hatches = geometryHatchPathsOnly(
    idBase,
    label ?? null,
    box,
    combat.pattern,
    "conflict-hatch",
  ).map((path) => ({
    ...path,
    accentColor: AIR_RAID_FOCUS_HATCH,
  }));

  return [outline, ...hatches];
}
