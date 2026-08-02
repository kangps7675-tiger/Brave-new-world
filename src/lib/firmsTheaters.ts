/**
 * FIRMS 표시·수집 전장 박스.
 * Cron ingest(`workers/cron-ingest/src/firms.ts`)와 동일 권역 — 산불 등 전역 열점은 제외.
 */

export type FirmsTheaterBbox = {
  id: string;
  west: number;
  south: number;
  east: number;
  north: number;
};

/** 전장·분쟁 해역만 — 아마존·호주 산불 등은 여기에 안 들어옴 */
export const FIRMS_THEATER_BBOXES: readonly FirmsTheaterBbox[] = [
  { id: "ukraine", west: 22, south: 44, east: 41, north: 53 },
  { id: "middle-east", west: 24.5, south: 22, east: 50, north: 38 },
  { id: "taiwan", west: 116, south: 20, east: 125, north: 27 },
  { id: "korea", west: 123, south: 33, east: 132, north: 43 },
  { id: "red-sea", west: 32, south: 10, east: 48, north: 28 },
  /** 흑해·크림 남쪽 확장 */
  { id: "black-sea", west: 28, south: 41, east: 42, north: 47 },
  /** 남중국해·필리핀 해상 마찰 */
  { id: "south-china-sea", west: 105, south: 5, east: 122, north: 23 },
] as const;

export function isPointInFirmsTheater(
  lat: number,
  lng: number,
  theaters: readonly FirmsTheaterBbox[] = FIRMS_THEATER_BBOXES,
): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  for (const box of theaters) {
    if (lat >= box.south && lat <= box.north && lng >= box.west && lng <= box.east) {
      return true;
    }
  }
  return false;
}

/** FIRMS 포인트 배열에서 전장 밖 제거 */
export function filterFirmsToTheaters<T extends { lat: number; lng: number }>(
  fires: T[],
  theaters: readonly FirmsTheaterBbox[] = FIRMS_THEATER_BBOXES,
): T[] {
  return fires.filter((fire) => isPointInFirmsTheater(fire.lat, fire.lng, theaters));
}
