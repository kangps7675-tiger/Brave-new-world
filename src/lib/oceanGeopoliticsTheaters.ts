/**
 * 태평양·대서양·북극해 — 지정학 경쟁·외교 GDELT 전장 bbox.
 * (날짜선 넘는 태평양은 minLng > maxLng 로 wrap)
 */

export type OceanGeopoliticsTheaterId = "pacific" | "atlantic" | "arctic";

export type OceanGeopoliticsTheater = {
  id: OceanGeopoliticsTheaterId;
  labelKo: string;
  labelEn: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export const OCEAN_GEOPOLITICS_THEATERS: OceanGeopoliticsTheater[] = [
  {
    id: "pacific",
    labelKo: "태평양 지정학",
    labelEn: "Pacific geopolitics",
    minLat: -50,
    maxLat: 62,
    minLng: 120,
    maxLng: -70,
  },
  {
    id: "atlantic",
    labelKo: "대서양 지정학",
    labelEn: "Atlantic geopolitics",
    minLat: -50,
    maxLat: 70,
    minLng: -80,
    maxLng: 20,
  },
  {
    id: "arctic",
    labelKo: "북극해 지정학",
    labelEn: "Arctic geopolitics",
    minLat: 66,
    maxLat: 90,
    minLng: -180,
    maxLng: 180,
  },
];

function normalizeLng(lng: number): number {
  let value = lng;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

export function inLngRangeWrapped(lng: number, minLng: number, maxLng: number): boolean {
  const n = normalizeLng(lng);
  const min = normalizeLng(minLng);
  const max = normalizeLng(maxLng);
  if (min <= max) return n >= min && n <= max;
  return n >= min || n <= max;
}

export function isInOceanGeopoliticsTheater(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return OCEAN_GEOPOLITICS_THEATERS.some(
    (t) =>
      lat >= t.minLat &&
      lat <= t.maxLat &&
      inLngRangeWrapped(lng, t.minLng, t.maxLng),
  );
}

export function resolveOceanGeopoliticsTheater(
  lat: number,
  lng: number,
): OceanGeopoliticsTheater | null {
  for (const t of OCEAN_GEOPOLITICS_THEATERS) {
    if (
      lat >= t.minLat &&
      lat <= t.maxLat &&
      inLngRangeWrapped(lng, t.minLng, t.maxLng)
    ) {
      return t;
    }
  }
  return null;
}

/** query_tag / 이름에 대양 전장 표식이 있는지 */
export function isOceanGeopoliticsTag(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return /pacific|atlantic|arctic|태평양|대서양|북극/i.test(raw);
}
