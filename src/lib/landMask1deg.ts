/**
 * Natural Earth 110m → 1° land bitmask (클라/공유).
 * @see scripts/build-land-mask.js · scripts/lib/landMaskGrid.js
 */

import { LAND_MASK_1DEG } from "@/data/landMask1deg";

const WIDTH = LAND_MASK_1DEG.width;
const HEIGHT = LAND_MASK_1DEG.height;

/** 운하·해협 — 마스크가 육지로 칠해도 바다 */
const OCEAN_CORRIDORS: ReadonlyArray<{
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}> = [
  { minLng: 32.2, maxLng: 33.0, minLat: 29.5, maxLat: 31.6 },
  { minLng: -80.1, maxLng: -79.4, minLat: 8.7, maxLat: 9.5 },
  { minLng: 99.5, maxLng: 104.5, minLat: 1.0, maxLat: 6.5 },
  { minLng: 26.0, maxLng: 29.3, minLat: 39.9, maxLat: 41.3 },
  { minLng: -5.8, maxLng: -5.2, minLat: 35.8, maxLat: 36.2 },
  { minLng: 42.5, maxLng: 44.0, minLat: 11.5, maxLat: 13.5 },
  { minLng: 55.5, maxLng: 57.0, minLat: 25.5, maxLat: 27.0 },
  { minLng: 1.0, maxLng: 2.2, minLat: 50.7, maxLat: 51.3 },
  { minLng: 9.4, maxLng: 11.0, minLat: 53.8, maxLat: 54.6 },
  { minLng: 118.5, maxLng: 120.2, minLat: 22.5, maxLat: 25.5 },
  { minLng: 128.5, maxLng: 130.0, minLat: 33.5, maxLat: 35.0 },
];

function decodeBits(base64: string): Uint8Array {
  const bin =
    typeof atob === "function"
      ? atob(base64)
      : Buffer.from(base64, "base64").toString("binary");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const bits = new Uint8Array(WIDTH * HEIGHT);
  for (let i = 0; i < WIDTH * HEIGHT; i += 1) {
    bits[i] = bytes[i >> 3]! & (1 << (i & 7)) ? 1 : 0;
  }
  return bits;
}

const LAND_BITS = decodeBits(LAND_MASK_1DEG.bits);

function inCorridor(lng: number, lat: number): boolean {
  return OCEAN_CORRIDORS.some(
    (b) =>
      lng >= b.minLng &&
      lng <= b.maxLng &&
      lat >= b.minLat &&
      lat <= b.maxLat,
  );
}

function cellIndex(lng: number, lat: number): number {
  const x = Math.max(0, Math.min(WIDTH - 1, Math.floor((((lng + 180) % 360) + 360) % 360)));
  const y = Math.max(0, Math.min(HEIGHT - 1, Math.floor(90 - lat)));
  return y * WIDTH + x;
}

/** 1° 셀 중심이 육지인지 (해협/운하 corridor 제외) */
export function isLandLngLat(lng: number, lat: number): boolean {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
  if (inCorridor(lng, lat)) return false;
  return LAND_BITS[cellIndex(lng, lat)] === 1;
}
