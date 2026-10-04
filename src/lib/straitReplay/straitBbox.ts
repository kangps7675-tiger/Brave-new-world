import type { StraitId } from "@/lib/straitReplay/types";

/** 큐레이션 좌표 검증용 느슨한 bbox (해협 인근). */
export const STRAIT_BBOX: Record<
  StraitId,
  { minLat: number; maxLat: number; minLng: number; maxLng: number }
> = {
  hormuz: { minLat: 24.0, maxLat: 28.5, minLng: 54.0, maxLng: 59.5 },
  red_sea_suez: { minLat: 11.0, maxLat: 32.5, minLng: 31.0, maxLng: 45.5 },
  malacca: { minLat: -2.5, maxLat: 8.5, minLng: 95.0, maxLng: 106.5 },
};

export function isInsideStraitBbox(
  straitId: StraitId,
  lat: number,
  lng: number,
): boolean {
  const b = STRAIT_BBOX[straitId];
  return (
    lat >= b.minLat &&
    lat <= b.maxLat &&
    lng >= b.minLng &&
    lng <= b.maxLng
  );
}

/** Cesium 빈 화면 완화용 해협 앵커 (정적 라벨). */
export const STRAIT_ANCHORS: Record<
  StraitId,
  { lat: number; lng: number; labelKo: string; labelEn: string }
> = {
  hormuz: {
    lat: 26.55,
    lng: 56.25,
    labelKo: "호르무즈 해협",
    labelEn: "Strait of Hormuz",
  },
  red_sea_suez: {
    lat: 29.95,
    lng: 32.55,
    labelKo: "수에즈·홍해",
    labelEn: "Suez · Red Sea",
  },
  malacca: {
    lat: 2.5,
    lng: 101.2,
    labelKo: "말라카 해협",
    labelEn: "Strait of Malacca",
  },
};

/** PortWatch choke id ↔ 리플레이 straitId */
export const STRAIT_TO_PORTWATCH: Record<StraitId, string[]> = {
  hormuz: ["choke-hormuz"],
  red_sea_suez: ["choke-suez", "choke-bab-el-mandeb"],
  malacca: ["choke-malacca"],
};
