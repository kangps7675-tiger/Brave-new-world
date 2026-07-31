/** 전장 박스 — 콜아웃은 전체, 전장(포격) 사운드는 실제 교전만 */

export type CombatTheaterId =
  | "russia-ukraine"
  | "middle-east"
  | "china-taiwan"
  | "korea";

/** 실제 교전 중 — 전장 앰비언트·원샷 대상 */
export const ACTIVE_WAR_THEATER_IDS = ["russia-ukraine", "middle-east"] as const;
export type ActiveWarTheaterId = (typeof ACTIVE_WAR_THEATER_IDS)[number];

/** 긴장·억제 전장 — 긴장 rumble만 (포격 사운드 없음) */
export const TENSION_THEATER_IDS = ["china-taiwan", "korea"] as const;
export type TensionTheaterId = (typeof TENSION_THEATER_IDS)[number];

type TheaterBox = {
  id: CombatTheaterId;
  south: number;
  north: number;
  west: number;
  east: number;
};

const THEATER_BOXES: TheaterBox[] = [
  { id: "russia-ukraine", south: 43.5, north: 53.5, west: 21.5, east: 41.5 },
  { id: "middle-east", south: 12, north: 42, west: 32, east: 63 },
  { id: "china-taiwan", south: 20, north: 27, west: 116, east: 124 },
  { id: "korea", south: 33, north: 43, west: 124, east: 132 },
];

/** 전장 박스 한 변(°) — 사상자 글자 크기(영토 대비)용 */
export function getCombatTheaterSpanDeg(theaterId: string): number {
  const box = THEATER_BOXES.find((b) => b.id === theaterId);
  if (!box) return 10;
  const latSpan = Math.max(1, box.north - box.south);
  const lngSpan = Math.max(1, box.east - box.west);
  return Math.sqrt(latSpan * lngSpan);
}
export function isActiveWarTheater(id: CombatTheaterId): id is ActiveWarTheaterId {
  return (ACTIVE_WAR_THEATER_IDS as readonly string[]).includes(id);
}

export function isTensionTheater(id: CombatTheaterId): id is TensionTheaterId {
  return (TENSION_THEATER_IDS as readonly string[]).includes(id);
}

export function isInCombatTheater(
  theater: CombatTheaterId,
  lat: number,
  lng: number,
): boolean {
  const box = THEATER_BOXES.find((b) => b.id === theater);
  if (!box) return false;
  return lat >= box.south && lat <= box.north && lng >= box.west && lng <= box.east;
}

/** 카메라 중심이 속한 전장 (우선순위: 우크라 > 중동 > 대만 > 한반도) */
export function resolveCombatTheaterAt(
  lat: number,
  lng: number,
): CombatTheaterId | null {
  for (const box of THEATER_BOXES) {
    if (lat >= box.south && lat <= box.north && lng >= box.west && lng <= box.east) {
      return box.id;
    }
  }
  return null;
}

/** 실제 교전 전장만 (우크라 · 중동/이란) — 전장 사운드용 */
export function resolveActiveWarTheaterAt(
  lat: number,
  lng: number,
): ActiveWarTheaterId | null {
  const theater = resolveCombatTheaterAt(lat, lng);
  if (theater && isActiveWarTheater(theater)) return theater;
  return null;
}

/**
 * 포격·총성(frontline) 앰비언트 허용 여부.
 * 카메라(또는 활성 에피소드 좌표)가 **실제 교전 전장** 안에 있을 때만 true.
 * 대만·한반도 등 긴장 구역에서는 레이어 ON·에피소드와 무관하게 false.
 */
export function allowsFrontlineCombatSound(args: {
  cameraLat: number;
  cameraLng: number;
  /** 분쟁 외교사 에피소드 좌표 — active war 안에 있고 뷰포트에 보일 때만 허용 */
  episodeCenter?: { lat: number; lng: number } | null;
  episodeInView?: boolean;
}): boolean {
  if (resolveActiveWarTheaterAt(args.cameraLat, args.cameraLng) != null) {
    return true;
  }
  const ep = args.episodeCenter;
  if (ep && args.episodeInView) {
    return resolveActiveWarTheaterAt(ep.lat, ep.lng) != null;
  }
  return false;
}

export function combatTheaterLabel(theater: CombatTheaterId, lang: "ko" | "en" = "ko"): string {
  const labels: Record<CombatTheaterId, { ko: string; en: string }> = {
    "russia-ukraine": { ko: "우크라이나 전선", en: "Ukraine front" },
    "middle-east": { ko: "중동·이란 전선", en: "Middle East / Iran front" },
    "china-taiwan": { ko: "대만 해협", en: "Taiwan Strait" },
    korea: { ko: "한반도", en: "Korean Peninsula" },
  };
  return labels[theater][lang];
}
