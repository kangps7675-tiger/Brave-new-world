/**
 * 지도 위 속보 지점(네온)과, 그 지점 양피지에 붙는 "같은 지역 최근 사건".
 * 최근 6시간 안의 것은 밝게, 그보다 오래된 건 흐리게 남긴다.
 */
export type NeonCategory = "flash" | "ship" | "strike" | "charge" | "exercise" | "closure" | "posture" | "front";

export const NEON_COLOR: Record<NeonCategory, string> = {
  flash: "#9dff6b",
  strike: "#ff4d5e",
  ship: "#ff9a3c",
  charge: "#b58cff",
  exercise: "#2fd6c4",
  closure: "#ffe14d",
  posture: "#4db8ff",
  front: "#ff7ad9",
};

export const NEON_FRESH_MS = 6 * 3_600_000;
export const NEON_MAX = 120;

export type NeonSource = { id: string; lat: number; lng: number; at: number };

export type FlashNeonPoint = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  /** 1 = 최근 6시간 안 */
  fresh: 0 | 1;
  /** 1 = 지금 좌측 양피지에 열려 있는 사건 */
  selected: 0 | 1;
};

export function buildFlashNeonPoints(
  items: readonly NeonSource[],
  catOf: (id: string) => NeonCategory,
  now: number,
  selectedId: string | null,
): FlashNeonPoint[] {
  const seen = new Set<string>();
  const out: FlashNeonPoint[] = [];
  for (const item of items) {
    if (seen.has(item.id) || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)) continue;
    if (Math.abs(item.lat) > 90 || Math.abs(item.lng) > 180) continue;
    seen.add(item.id);
    out.push({
      id: item.id,
      lat: item.lat,
      lng: item.lng,
      color: NEON_COLOR[catOf(item.id)],
      fresh: now - item.at <= NEON_FRESH_MS ? 1 : 0,
      selected: item.id === selectedId ? 1 : 0,
    });
    if (out.length >= NEON_MAX) break;
  }
  return out;
}

const EARTH_KM = 6371;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const NEARBY_KM = 250;
export const NEARBY_WINDOW_MS = 7 * 24 * 3_600_000;
export const NEARBY_MAX = 5;

/** 같은 지역(250km 안)의 최근 7일 사건. 가까운 것이 아니라 최근 것부터 최대 5건. */
export function nearbyItems<T extends NeonSource>(item: T, all: readonly T[], now: number): T[] {
  return all
    .filter(
      (row) =>
        row.id !== item.id &&
        Number.isFinite(row.lat) &&
        Number.isFinite(row.lng) &&
        now - row.at <= NEARBY_WINDOW_MS &&
        row.at <= now + 3_600_000 &&
        distanceKm(item, row) <= NEARBY_KM,
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, NEARBY_MAX);
}
