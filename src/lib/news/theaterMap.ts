import type { NewsTheater } from "@/lib/news/types";
import type { TelegramAlertRegion } from "@/lib/telegramAlerts";

export type IntelTheaterFilter = NewsTheater | "all";

export type MapFlyTarget =
  | { kind: "coords"; lat: number; lng: number; altitude?: number }
  | { kind: "theater"; theater: NewsTheater };

/**
 * 시트 상단 전장 칩 순서 (지정학 Intel 시트 전용).
 * 동남아·남미·아프리카는 지정학만 — 지경학 시트에서는 TheaterChipBar 자체가 숨겨짐.
 */
export const THEATER_CHIP_ORDER: NewsTheater[] = [
  "middle-east",
  "russia-ukraine",
  "china-taiwan",
  "korea",
  "japan",
  "southeast-asia",
  "south-america",
  "africa",
  "global",
];

export const THEATER_CHIP_LABELS: Record<NewsTheater, string> = {
  "middle-east": "중동",
  "russia-ukraine": "러·우",
  "china-taiwan": "중·대",
  korea: "한반도",
  japan: "일본",
  "south-asia": "남아시아",
  "southeast-asia": "동남아",
  "south-america": "남미",
  africa: "아프리카",
  arctic: "북극",
  atlantic: "대서양",
  global: "글로벌",
};

export const THEATER_FLY_TO: Record<NewsTheater, { lat: number; lng: number; altitude: number }> = {
  "middle-east": { lat: 29.2, lng: 42.5, altitude: 2.05 },
  "russia-ukraine": { lat: 48.5, lng: 34, altitude: 1.72 },
  /** 대만 해협 중심 핀포인트 (북위 24°29′ · 동경 119°30′) */
  "china-taiwan": { lat: 24.48, lng: 119.5, altitude: 0.98 },
  /** 한반도 거의 풀프레임 — navRegions `korea` 과 맞춤 */
  korea: { lat: 38.0, lng: 127.3, altitude: 0.7 },
  japan: { lat: 36, lng: 138, altitude: 1.7 },
  "south-asia": { lat: 22, lng: 78, altitude: 1.75 },
  /** 남중국해·동남아 프레임 */
  "southeast-asia": { lat: 8, lng: 115, altitude: 1.85 },
  /** 남미 대륙 — 베네수엘라·가이아나 쪽 강조 */
  "south-america": { lat: -15, lng: -58, altitude: 2.05 },
  /** 사헬·중부 아프리카 프레임 */
  africa: { lat: 8, lng: 18, altitude: 2.1 },
  /** 북극해·그린란드·바렌츠 프레임 */
  arctic: { lat: 75, lng: 40, altitude: 1.9 },
  /** 북대서양·GIUK 갭 프레임 */
  atlantic: { lat: 55, lng: -30, altitude: 2.0 },
  global: { lat: 25, lng: 20, altitude: 2.2 },
};

export function newsTheaterFromCoords(lat: number, lng: number): NewsTheater {
  if (lat >= 66) return "arctic";
  if (lat >= 40 && lat <= 70 && lng >= -60 && lng <= -5) return "atlantic";
  if (lat >= 12 && lat <= 42 && lng >= 34 && lng <= 63) return "middle-east";
  if (lat >= 44 && lat <= 62 && lng >= 22 && lng <= 45) return "russia-ukraine";
  if (lat >= 33 && lat <= 43 && lng >= 124 && lng <= 132) return "korea";
  if (lat >= 22 && lat <= 26 && lng >= 118 && lng <= 123) return "china-taiwan";
  if (lat >= 30 && lat <= 46 && lng >= 129 && lng <= 146) return "japan";
  if (lat >= 5 && lat <= 35 && lng >= 60 && lng <= 95) return "south-asia";
  // 동남아 — 중국·대만 광역 박스보다 먼저
  if (lat >= -11 && lat <= 23 && lng >= 95 && lng <= 141) return "southeast-asia";
  if (lat >= 18 && lat <= 45 && lng >= 100 && lng <= 130) return "china-taiwan";
  if (lat >= -56 && lat <= 13 && lng >= -82 && lng <= -34) return "south-america";
  // 중동 박스 밖의 아프리카
  if (lat >= -35 && lat <= 20 && lng >= -18 && lng <= 52) return "africa";
  return "global";
}

export function newsTheaterFromNavId(id: string): IntelTheaterFilter {
  const key = id.toLowerCase();
  // 서태평양 함선 이동기 — 인도태평양·중·대 전장으로 스코프
  if (
    key.includes("westpac") ||
    key.includes("ship-movement") ||
    key.includes("fleet-tracker")
  ) {
    return "china-taiwan";
  }
  // 국경·영토 분쟁 개요 — 잡식 global 대신 동아시아 중심(세부 매칭은 에피소드 패널)
  if (key.includes("territorial-disputes") || key.includes("dispute-hotspot")) {
    return "china-taiwan";
  }
  if (key.includes("ukraine") || key.includes("west-russia") || key === "hub-rus" || key.startsWith("claim-rus") || key.startsWith("ally-rus")) {
    return "russia-ukraine";
  }
  if (
    key.includes("middle-east") ||
    key.includes("gulf") ||
    key.includes("israel") ||
    key.includes("iran") ||
    key.includes("yemen") ||
    key.includes("red-sea") ||
    key === "hub-irn" ||
    key.startsWith("claim-irn") ||
    key.startsWith("ally-irn")
  ) {
    return "middle-east";
  }
  if (
    key.includes("taiwan") ||
    key.includes("china") ||
    key.includes("south-china") ||
    key === "hub-chn" ||
    key.startsWith("claim-chn") ||
    key.startsWith("ally-chn")
  ) {
    return "china-taiwan";
  }
  if (
    key.includes("korea") ||
    key.includes("dmz") ||
    key === "hub-prk" ||
    key.startsWith("claim-prk") ||
    key.startsWith("ally-prk")
  ) {
    return "korea";
  }
  if (key.includes("japan")) return "japan";
  if (key.includes("india") || key.includes("pakistan") || key.includes("south-asia")) {
    return "south-asia";
  }
  if (
    key.includes("southeast") ||
    key.includes("asean") ||
    key.includes("myanmar") ||
    key.includes("philippines") ||
    key.includes("vietnam") ||
    key.includes("malacca")
  ) {
    return "southeast-asia";
  }
  if (
    key.includes("south-america") ||
    key.includes("latin") ||
    key.includes("venezuela") ||
    key.includes("guyana") ||
    key.includes("colombia")
  ) {
    return "south-america";
  }
  if (
    key.includes("africa") ||
    key.includes("sahel") ||
    key.includes("sudan") ||
    key.includes("congo") ||
    key.includes("somalia")
  ) {
    return "africa";
  }
  if (key.includes("arctic") || key.includes("greenland") || key.includes("svalbard")) {
    return "arctic";
  }
  if (key.includes("atlantic") || key.includes("giuk") || key.includes("iceland")) {
    return "atlantic";
  }
  return "all";
}

export function telegramRegionToTheater(region: TelegramAlertRegion): NewsTheater {
  if (region === "ukraine") return "russia-ukraine";
  if (region === "middle-east") return "middle-east";
  return "global";
}

export function matchesTheaterFilter(
  theater: NewsTheater,
  filter: IntelTheaterFilter,
): boolean {
  return filter === "all" || theater === filter;
}

export function flyTargetForTheater(theater: NewsTheater): MapFlyTarget {
  const center = THEATER_FLY_TO[theater];
  return { kind: "coords", lat: center.lat, lng: center.lng, altitude: center.altitude };
}
