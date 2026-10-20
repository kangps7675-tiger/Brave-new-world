import type { LabelLanguage } from "@/lib/layerPrefs";

type SeaRegion = {
  nameKo: string;
  nameEn: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  /** 클수록 좁은 해역·해협을 우선 */
  priority: number;
};

function normalizeLng(lng: number): number {
  let value = lng;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function inLngRange(lng: number, minLng: number, maxLng: number): boolean {
  const normalized = normalizeLng(lng);
  const min = normalizeLng(minLng);
  const max = normalizeLng(maxLng);
  if (min <= max) return normalized >= min && normalized <= max;
  return normalized >= min || normalized <= max;
}

function inSeaRegion(lat: number, lng: number, region: SeaRegion): boolean {
  return (
    lat >= region.minLat &&
    lat <= region.maxLat &&
    inLngRange(lng, region.minLng, region.maxLng)
  );
}

/** 주요 해역·해협·대양 (bbox 근사). 좁은 구역일수록 priority를 높게 둡니다. */
const SEA_REGIONS: SeaRegion[] = [
  { nameKo: "서해", nameEn: "West Sea / Yellow Sea", minLat: 31, maxLat: 40.5, minLng: 119, maxLng: 126.5, priority: 120 },
  { nameKo: "황해", nameEn: "Yellow Sea", minLat: 31, maxLat: 40.5, minLng: 119, maxLng: 126, priority: 110 },
  { nameKo: "동해", nameEn: "East Sea", minLat: 34, maxLat: 43, minLng: 128, maxLng: 142, priority: 120 },
  { nameKo: "대한해협", nameEn: "Korea Strait", minLat: 33.5, maxLat: 35.8, minLng: 128, maxLng: 130.5, priority: 130 },
  { nameKo: "대만해협", nameEn: "Taiwan Strait", minLat: 22.5, maxLat: 26.5, minLng: 117.5, maxLng: 121, priority: 130 },
  { nameKo: "남중국해", nameEn: "South China Sea", minLat: 0, maxLat: 23, minLng: 105, maxLng: 121, priority: 100 },
  { nameKo: "동중국해", nameEn: "East China Sea", minLat: 23, maxLat: 33.5, minLng: 120, maxLng: 131, priority: 100 },
  { nameKo: "필리핀해", nameEn: "Philippine Sea", minLat: 5, maxLat: 30, minLng: 125, maxLng: 145, priority: 90 },
  { nameKo: "홍해", nameEn: "Red Sea", minLat: 12, maxLat: 30, minLng: 32, maxLng: 44, priority: 100 },
  { nameKo: "페르시아만", nameEn: "Persian Gulf", minLat: 23.5, maxLat: 30.5, minLng: 48, maxLng: 57, priority: 110 },
  { nameKo: "호르무즈 해협", nameEn: "Strait of Hormuz", minLat: 25, maxLat: 27.5, minLng: 55.5, maxLng: 57.5, priority: 130 },
  { nameKo: "아덴만", nameEn: "Gulf of Aden", minLat: 10, maxLat: 15.5, minLng: 43, maxLng: 53, priority: 110 },
  { nameKo: "지중해", nameEn: "Mediterranean Sea", minLat: 30, maxLat: 46, minLng: -6, maxLng: 36, priority: 100 },
  { nameKo: "흑해", nameEn: "Black Sea", minLat: 40.5, maxLat: 47.5, minLng: 27, maxLng: 42, priority: 110 },
  { nameKo: "아조프해", nameEn: "Sea of Azov", minLat: 45, maxLat: 47.5, minLng: 34.5, maxLng: 39.5, priority: 120 },
  { nameKo: "발트해", nameEn: "Baltic Sea", minLat: 53, maxLat: 66, minLng: 10, maxLng: 30, priority: 100 },
  { nameKo: "북해", nameEn: "North Sea", minLat: 51, maxLat: 62, minLng: -4, maxLng: 9, priority: 100 },
  { nameKo: "카리브해", nameEn: "Caribbean Sea", minLat: 9, maxLat: 22, minLng: -88, maxLng: -60, priority: 100 },
  { nameKo: "멕시코만", nameEn: "Gulf of Mexico", minLat: 18, maxLat: 30.5, minLng: -98, maxLng: -82, priority: 110 },
  { nameKo: "벵골만", nameEn: "Bay of Bengal", minLat: 5, maxLat: 22, minLng: 80, maxLng: 95, priority: 100 },
  { nameKo: "아라비아해", nameEn: "Arabian Sea", minLat: 0, maxLat: 25, minLng: 50, maxLng: 78, priority: 90 },
  { nameKo: "오호츠크해", nameEn: "Sea of Okhotsk", minLat: 44, maxLat: 61, minLng: 137, maxLng: 163, priority: 100 },
  { nameKo: "베링해", nameEn: "Bering Sea", minLat: 52, maxLat: 66, minLng: 162, maxLng: -158, priority: 100 },
  { nameKo: "산호해", nameEn: "Coral Sea", minLat: -25, maxLat: -10, minLng: 145, maxLng: 162, priority: 100 },
  { nameKo: "태즈만해", nameEn: "Tasman Sea", minLat: -45, maxLat: -28, minLng: 148, maxLng: 175, priority: 100 },
  { nameKo: "북극해", nameEn: "Arctic Ocean", minLat: 66, maxLat: 90, minLng: -180, maxLng: 180, priority: 40 },
  { nameKo: "남극해", nameEn: "Southern Ocean", minLat: -90, maxLat: -60, minLng: -180, maxLng: 180, priority: 40 },
  { nameKo: "북태평양", nameEn: "North Pacific Ocean", minLat: 0, maxLat: 66, minLng: 120, maxLng: -70, priority: 30 },
  { nameKo: "남태평양", nameEn: "South Pacific Ocean", minLat: -60, maxLat: 0, minLng: 120, maxLng: -70, priority: 30 },
  { nameKo: "북대서양", nameEn: "North Atlantic Ocean", minLat: 0, maxLat: 66, minLng: -80, maxLng: 20, priority: 30 },
  { nameKo: "남대서양", nameEn: "South Atlantic Ocean", minLat: -60, maxLat: 0, minLng: -70, maxLng: 20, priority: 30 },
  { nameKo: "인도양", nameEn: "Indian Ocean", minLat: -60, maxLat: 30, minLng: 20, maxLng: 120, priority: 25 },
];

export type OceanLookup = {
  title: string;
  detail: string;
};

export function lookupOceanName(
  lat: number,
  lng: number,
  language: LabelLanguage = "ko",
): OceanLookup {
  let best: SeaRegion | null = null;
  for (const region of SEA_REGIONS) {
    if (!inSeaRegion(lat, lng, region)) continue;
    if (!best || region.priority > best.priority) best = region;
  }

  const title = best
    ? language === "ko"
      ? best.nameKo
      : best.nameEn
    : language === "ko"
      ? "대양"
      : "Ocean";

  const latLabel = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"}`;
  const lngLabel = `${Math.abs(lng).toFixed(1)}°${lng >= 0 ? "E" : "W"}`;

  return {
    title,
    detail: `${latLabel} · ${lngLabel}`,
  };
}
