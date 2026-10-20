/**
 * "여기 어디게" — 실제 FIRMS·GDELT·AIS 좌표로 지형만 보고 전장/해협을 맞추는 미니게임.
 * 새 데이터 수집 없음. 이미 로드된 이벤트 좌표만 재활용.
 */

export type WhereIsItSource = "gdelt" | "firms" | "ais";

export type WhereIsItRegion = {
  id: string;
  labelKo: string;
  labelEn: string;
  lat: number;
  lng: number;
};

/** 찍을 선택지 — 전장·초크포인트 (지식 과시용으로 좁게) */
export const WHERE_IS_IT_REGIONS: WhereIsItRegion[] = [
  { id: "taiwan-strait", labelKo: "대만 해협", labelEn: "Taiwan Strait", lat: 24.5, lng: 119.5 },
  { id: "hormuz", labelKo: "호르무즈 해협", labelEn: "Strait of Hormuz", lat: 26.5, lng: 56.5 },
  { id: "bab-el-mandeb", labelKo: "바브엘만데브", labelEn: "Bab el-Mandeb", lat: 12.6, lng: 43.3 },
  { id: "suez", labelKo: "수에즈 · 홍해", labelEn: "Suez / Red Sea", lat: 28.5, lng: 33.0 },
  { id: "black-sea", labelKo: "흑해 · 우크라 해안", labelEn: "Black Sea / Ukraine", lat: 45.3, lng: 34.5 },
  { id: "donbas", labelKo: "돈바스 전선", labelEn: "Donbas front", lat: 48.5, lng: 38.0 },
  { id: "dmz", labelKo: "한반도 DMZ", labelEn: "Korean DMZ", lat: 38.0, lng: 127.0 },
  { id: "south-china-sea", labelKo: "남중국해", labelEn: "South China Sea", lat: 12.0, lng: 114.0 },
  { id: "malacca", labelKo: "말라카 해협", labelEn: "Strait of Malacca", lat: 2.5, lng: 101.5 },
  { id: "persian-gulf", labelKo: "페르시아만", labelEn: "Persian Gulf", lat: 27.0, lng: 51.5 },
  { id: "gaza-levant", labelKo: "가자 · 레반트", labelEn: "Gaza / Levant", lat: 31.5, lng: 34.5 },
  { id: "giuk", labelKo: "GIUK 갭", labelEn: "GIUK Gap", lat: 62.0, lng: -8.0 },
];

export type WhereIsItSpot = {
  lat: number;
  lng: number;
  source: WhereIsItSource;
  regionId: string;
  /** 원본 이벤트 id (디버그) */
  eventId?: string;
};

export type WhereIsItPoolItem = {
  lat: number;
  lng: number;
  source: WhereIsItSource;
  id?: string;
};

const R_EARTH_KM = 6371;

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearestWhereIsItRegion(lat: number, lng: number): WhereIsItRegion {
  let best = WHERE_IS_IT_REGIONS[0];
  let bestD = Infinity;
  for (const r of WHERE_IS_IT_REGIONS) {
    const d = haversineKm(lat, lng, r.lat, r.lng);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

/** 너무 먼(어느 전장에도 안 붙는) 점은 제외 — 맞출 맛이 없음 */
const MAX_MATCH_KM = 1200;

export function buildWhereIsItSpot(item: WhereIsItPoolItem): WhereIsItSpot | null {
  if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return null;
  if (Math.abs(item.lat) > 85) return null;
  const region = nearestWhereIsItRegion(item.lat, item.lng);
  const d = haversineKm(item.lat, item.lng, region.lat, region.lng);
  if (d > MAX_MATCH_KM) return null;
  return {
    lat: item.lat,
    lng: item.lng,
    source: item.source,
    regionId: region.id,
    eventId: item.id,
  };
}

export function pickWhereIsItSpot(
  pool: WhereIsItPoolItem[],
  avoidIds: Set<string> = new Set(),
): WhereIsItSpot | null {
  const candidates: WhereIsItSpot[] = [];
  for (const item of pool) {
    const key = item.id ?? `${item.source}:${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
    if (avoidIds.has(key)) continue;
    const spot = buildWhereIsItSpot(item);
    if (spot) candidates.push(spot);
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

/** 정답 포함 4지선다 */
export function buildWhereIsItChoices(
  correctId: string,
  count = 4,
): WhereIsItRegion[] {
  const correct = WHERE_IS_IT_REGIONS.find((r) => r.id === correctId);
  if (!correct) return WHERE_IS_IT_REGIONS.slice(0, count);
  const others = WHERE_IS_IT_REGIONS.filter((r) => r.id !== correctId)
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(0, count - 1));
  return [correct, ...others].sort(() => Math.random() - 0.5);
}

export function whereIsItSourceLabel(source: WhereIsItSource, ko: boolean): string {
  if (source === "gdelt") return ko ? "GDELT 사건" : "GDELT event";
  if (source === "firms") return ko ? "FIRMS 열원" : "FIRMS hot spot";
  return ko ? "AIS 선박" : "AIS vessel";
}

/** 지형만 보이게 — 도시 라벨 끄고 포인트 줌 */
export const WHERE_IS_IT_ALTITUDE = 0.52;
export const WHERE_IS_IT_ROUNDS = 3;
