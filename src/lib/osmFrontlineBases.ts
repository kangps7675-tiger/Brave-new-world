/**
 * 전선 부근 OSM 군시설 — 한국·일본·필리핀·동유럽 NATO.
 * 사격장·창고·무명 폴리곤은 제외. 공군·해군 거점 + 이름 있는 base만.
 */

export type OsmFrontlineTheater = "korea-japan" | "south-china-sea" | "eastern-nato";

export type OsmFrontlineCountry = {
  iso: string;
  name: string;
  theater: OsmFrontlineTheater;
  /** south, west, north, east */
  bbox: [number, number, number, number];
  cap: number;
};

export const OSM_FRONTLINE_COUNTRIES: readonly OsmFrontlineCountry[] = [
  { iso: "KR", name: "South Korea", theater: "korea-japan", bbox: [33.0, 124.4, 38.75, 129.55], cap: 70 },
  { iso: "JP", name: "Japan", theater: "korea-japan", bbox: [24.0, 122.9, 45.8, 146.2], cap: 90 },
  { iso: "PH", name: "Philippines", theater: "south-china-sea", bbox: [4.6, 114.0, 21.3, 126.8], cap: 50 },
  { iso: "PL", name: "Poland", theater: "eastern-nato", bbox: [49.0, 14.1, 54.9, 24.2], cap: 50 },
  { iso: "EE", name: "Estonia", theater: "eastern-nato", bbox: [57.5, 21.7, 59.8, 28.3], cap: 25 },
  { iso: "LV", name: "Latvia", theater: "eastern-nato", bbox: [55.6, 20.9, 58.1, 28.3], cap: 25 },
  { iso: "LT", name: "Lithuania", theater: "eastern-nato", bbox: [53.9, 20.9, 56.5, 26.9], cap: 25 },
  { iso: "FI", name: "Finland", theater: "eastern-nato", bbox: [59.7, 19.3, 70.1, 31.6], cap: 40 },
  { iso: "RO", name: "Romania", theater: "eastern-nato", bbox: [43.6, 20.2, 48.3, 29.8], cap: 40 },
  { iso: "SK", name: "Slovakia", theater: "eastern-nato", bbox: [47.7, 16.8, 49.7, 22.6], cap: 20 },
];

const KEEP_MILITARY = new Set(["airfield", "naval_base", "base"]);
const SKIP_NAME_RE =
  /\b(range|shooting|paintball|cadet|recruiting|museum|memorial)\b|사격장|예비군|동원훈련|비상활주로/i;

export function osmMilitaryDisplayName(tags: Record<string, string | undefined>): string | null {
  const name =
    tags["name:en"] ||
    tags.name ||
    tags["name:ko"] ||
    tags["official_name"] ||
    tags.ref ||
    tags["icao"] ||
    null;
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return null;
  if (SKIP_NAME_RE.test(trimmed)) return null;
  return trimmed;
}

export function osmMilitaryKind(tags: Record<string, string | undefined>): string | null {
  const military = (tags.military || "").toLowerCase();
  if (KEEP_MILITARY.has(military)) return military;
  const aeroway = (tags.aeroway || "").toLowerCase();
  if (aeroway === "aerodrome" && (military === "yes" || military === "airfield")) {
    return "airfield";
  }
  return null;
}

export function osmMilitaryTier(kind: string): number {
  if (kind === "airfield" || kind === "naval_base") return 1;
  return 2;
}

export function shouldKeepOsmMilitary(tags: Record<string, string | undefined>): boolean {
  if (tags.abandoned === "yes" || tags.disused === "yes") return false;
  if ((tags.military || "").toLowerCase() === "abandoned") return false;
  const kind = osmMilitaryKind(tags);
  if (!kind) return false;
  return osmMilitaryDisplayName(tags) != null;
}

export function osmFrontlineCoordKey(lat: number, lng: number, digits = 2): string {
  return `${Number(lat).toFixed(digits)},${Number(lng).toFixed(digits)}`;
}

export function isUsMilitaryOperator(country: unknown): boolean {
  return /^(USA|United States|US)$/i.test(String(country ?? "").trim());
}

/** 필리핀 bbox가 말레이시아 사바를 살짝 먹을 때 제외. 술루·칼라야안은 유지. */
export function isPhilippinesFrontlinePoint(lat: number, lng: number): boolean {
  if (lat < 7.5 && lng < 119.0) return false;
  return lat >= 4.6 && lat <= 21.3 && lng >= 114.0 && lng <= 126.8;
}
