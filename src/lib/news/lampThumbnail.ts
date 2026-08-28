/**
 * 등불 카드 썸네일 테마 — RSS 이미지 없을 때 CSS 그라데이션·위성 폴백.
 */

import { resolveCrinkPlace } from "@/data/crinkPlaceGazetteer";
import { hubThumbFallbacks } from "@/lib/news/hubThumbResolver";

export type LampThumbTheme =
  | "economy"
  | "conflict"
  | "chips"
  | "energy"
  | "shipping"
  | "china"
  | "asia"
  | "middle-east"
  | "europe"
  | "americas"
  | "africa"
  | "russia";

/** Tailwind 그라데이션 — 양피지 톤에 맞춘 어두운 면 */
export const LAMP_THUMB_GRADIENT: Record<LampThumbTheme, string> = {
  economy: "from-[#2a3a2e] via-[#1e2c28] to-[#1a2420]",
  conflict: "from-[#3a2420] via-[#2a1c18] to-[#1a1816]",
  chips: "from-[#1e2a3a] via-[#1a2432] to-[#161e28]",
  energy: "from-[#3a2e1c] via-[#2a2418] to-[#1e1a14]",
  shipping: "from-[#1c2e32] via-[#182428] to-[#141e22]",
  china: "from-[#3a1e20] via-[#2a181a] to-[#1e1416]",
  asia: "from-[#1e2836] via-[#1a222e] to-[#161a24]",
  "middle-east": "from-[#3a2a1a] via-[#2a2016] to-[#1e1812]",
  europe: "from-[#1c2438] via-[#182032] to-[#141a28]",
  americas: "from-[#1e2e28] via-[#1a2620] to-[#161e1a]",
  africa: "from-[#3a2e18] via-[#2a2414] to-[#1e1a12]",
  russia: "from-[#1c2838] via-[#182230] to-[#141c28]",
};

export const LAMP_THUMB_LABEL: Record<
  LampThumbTheme,
  { ko: string; en: string }
> = {
  economy: { ko: "시장", en: "Markets" },
  conflict: { ko: "전황", en: "Sitrep" },
  chips: { ko: "반도체", en: "Chips" },
  energy: { ko: "에너지", en: "Energy" },
  shipping: { ko: "해운", en: "Shipping" },
  china: { ko: "중국", en: "China" },
  asia: { ko: "아시아", en: "Asia" },
  "middle-east": { ko: "중동", en: "MENA" },
  europe: { ko: "유럽", en: "Europe" },
  americas: { ko: "미주", en: "Americas" },
  africa: { ko: "아프리카", en: "Africa" },
  russia: { ko: "러·우", en: "Russia–UA" },
};

/** theater → 지역 컬러 면 (장르보다 우선하되 chips/energy/shipping은 장르가 이김) */
function themeFromTheater(theater: string | undefined): LampThumbTheme | null {
  switch (theater) {
    case "china-taiwan":
      return "china";
    case "middle-east":
      return "middle-east";
    case "korea":
    case "japan":
    case "south-asia":
    case "southeast-asia":
    case "arctic":
      return "asia";
    case "russia-ukraine":
      return "russia";
    case "south-america":
    case "atlantic":
      return "americas";
    case "africa":
      return "africa";
    case "global":
      return null;
    default:
      return null;
  }
}

export function resolveLampThumbTheme(input: {
  mode?: "economy" | "conflict";
  econGenre?: string;
  theater?: string;
  title?: string;
  summary?: string;
  focusLabel?: string;
}): LampThumbTheme {
  const blob = `${input.title ?? ""} ${input.summary ?? ""} ${input.focusLabel ?? ""}`;

  // 장르 하드 신호는 지역보다 우선 (반도체·에너지·해운 카드 정체성)
  if (input.econGenre === "chips" || /chip|semiconductor|gpu|반도체/i.test(blob)) {
    return "chips";
  }
  if (input.econGenre === "energy" || /oil|lng|opec|brent|유가|원유/i.test(blob)) {
    return "energy";
  }
  if (
    input.econGenre === "shipping" ||
    /shipping|freight|chokepoint|운임|해운/i.test(blob)
  ) {
    return "shipping";
  }

  const fromTheater = themeFromTheater(input.theater);
  if (fromTheater) return fromTheater;

  if (/china|chinese|beijing|미·중|미중|중국/i.test(blob)) return "china";
  if (
    /hormuz|red\s?sea|suez|saudi|aramco|iran|israel|호르무즈|홍해/i.test(blob)
  ) {
    return "middle-east";
  }
  if (
    /korea|japan|taiwan|asean|india|한국|일본|대만|아세안|인도/i.test(blob)
  ) {
    return "asia";
  }
  if (/europe|eu\b|ecb|eurozone|유럽|유로/i.test(blob)) return "europe";
  if (/russia|ukraine|러시아|우크라이나/i.test(blob)) return "russia";
  if (/africa|아프리카/i.test(blob)) return "africa";
  if (/brazil|argentina|latin|남미|브라질/i.test(blob)) return "americas";

  if (input.mode === "conflict") return "conflict";
  return "economy";
}

/** http(s) RSS 이미지만 통과 — 트래커·파비콘·1px 등 소형/비사진 제외 */
export function normalizeLampImageUrl(imageUrl: string | undefined | null): string {
  const raw = typeof imageUrl === "string" ? imageUrl.trim() : "";
  if (raw.length <= 8 || !/^https?:\/\//i.test(raw)) return "";
  // 선명 대형 사진 데스크 — 트래킹 픽셀·아이콘·플레이스홀더 배제
  if (
    /(?:favicon|sprite|pixel|1x1|tracking|badge\.svg|\.svg(?:\?|$)|\/icon[-_/]|\/icons\/|placeholder|data:image)/i.test(
      raw,
    )
  ) {
    return "";
  }
  return raw;
}

/** 등불 카드용 — 유효한 RSS/og 사진 URL이 있는지 (폴백 위성 제외) */
export function hasLampPhoto(imageUrl: string | undefined | null): boolean {
  return normalizeLampImageUrl(imageUrl).length > 0;
}

/** theater 버킷 → 대표 좌표 (군사·외교 RSS 무사진 시 NASA GIBS 폴백) */
const THEATER_CENTROID: Record<string, { lat: number; lng: number }> = {
  korea: { lat: 37.56, lng: 126.98 },
  japan: { lat: 35.68, lng: 139.69 },
  "china-taiwan": { lat: 24.0, lng: 121.0 },
  "middle-east": { lat: 31.5, lng: 34.8 },
  "russia-ukraine": { lat: 48.5, lng: 37.5 },
  "south-asia": { lat: 28.6, lng: 77.2 },
  "southeast-asia": { lat: 1.35, lng: 103.8 },
  "south-america": { lat: -23.55, lng: -46.63 },
  atlantic: { lat: 50.0, lng: -20.0 },
  africa: { lat: 9.0, lng: 18.0 },
  arctic: { lat: 78.0, lng: 15.0 },
  global: { lat: 20.0, lng: 0.0 },
};

/**
 * 등불 히어로 이미지 후보 — RSS/og → CRINK 장소 위성 → theater 중심 → 카테고리 아이콘.
 * think tank·군사 보도 등 og 차단/무사진 기사용.
 */
export function resolveLampImageCandidates(input: {
  imageUrl?: string | null;
  title?: string;
  summary?: string;
  theater?: string;
  dataCdn?: string | null;
}): string[] {
  const urls: string[] = [];
  const normalized = normalizeLampImageUrl(input.imageUrl);
  if (normalized) urls.push(normalized);

  const title = input.title ?? "";
  const summary = input.summary ?? "";
  const place = resolveCrinkPlace(`${title} ${summary}`);
  if (place) {
    urls.push(
      ...hubThumbFallbacks({
        placeId: place.placeId,
        lat: place.lat,
        lng: place.lng,
        title,
        summary,
        dataCdn: input.dataCdn,
      }),
    );
  } else {
    const centroid = input.theater ? THEATER_CENTROID[input.theater] : undefined;
    urls.push(
      ...hubThumbFallbacks({
        lat: centroid?.lat,
        lng: centroid?.lng,
        title,
        summary,
        dataCdn: input.dataCdn,
      }),
    );
  }

  return [...new Set(urls.filter(Boolean))];
}
