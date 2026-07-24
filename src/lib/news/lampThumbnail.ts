/**
 * 등불 카드 썸네일 테마 — RSS 이미지 없을 때 CSS 그라데이션용.
 * (SVG data-URI 폴백은 사용하지 않음)
 */

export type LampThumbTheme =
  | "economy"
  | "conflict"
  | "chips"
  | "energy"
  | "shipping"
  | "china"
  | "asia"
  | "middle-east";

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
};

export function resolveLampThumbTheme(input: {
  mode?: "economy" | "conflict";
  econGenre?: string;
  theater?: string;
  title?: string;
  summary?: string;
  focusLabel?: string;
}): LampThumbTheme {
  const blob = `${input.title ?? ""} ${input.summary ?? ""} ${input.focusLabel ?? ""}`;
  if (/china|chinese|beijing|미·중|미중|중국/i.test(blob) || input.theater === "china-taiwan") {
    if (input.econGenre === "chips" || /chip|semiconductor|tsmc|smic|반도체/i.test(blob)) {
      return "chips";
    }
    return "china";
  }
  if (
    input.theater === "middle-east" ||
    /hormuz|red\s?sea|suez|saudi|aramco|iran|israel|호르무즈|홍해/i.test(blob)
  ) {
    return "middle-east";
  }
  if (
    input.theater === "korea" ||
    input.theater === "japan" ||
    input.theater === "south-asia" ||
    /korea|japan|taiwan|asean|india|한국|일본|대만|아세안|인도/i.test(blob)
  ) {
    return "asia";
  }
  if (input.econGenre === "chips" || /chip|semiconductor|gpu|반도체/i.test(blob)) return "chips";
  if (input.econGenre === "energy" || /oil|lng|opec|brent|유가|원유/i.test(blob)) return "energy";
  if (
    input.econGenre === "shipping" ||
    /shipping|freight|chokepoint|운임|해운/i.test(blob)
  ) {
    return "shipping";
  }
  if (input.mode === "conflict") return "conflict";
  return "economy";
}

/** http(s) RSS 이미지만 통과 — 그 외는 빈 문자열 (CSS 플레이스홀더) */
export function normalizeLampImageUrl(imageUrl: string | undefined | null): string {
  const raw = typeof imageUrl === "string" ? imageUrl.trim() : "";
  if (raw.length > 8 && /^https?:\/\//i.test(raw)) return raw;
  return "";
}
