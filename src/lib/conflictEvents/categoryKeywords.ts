import { CONFLICT_THEATER_META, CONFLICT_THEATER_ORDER } from "@/lib/conflictEvents/theaterMeta";
import type { ConflictEventCategory, ConflictTheater } from "@/lib/conflictEvents/types";

export type CategoryHit = {
  category: ConflictEventCategory;
  keywords: string[];
};

const CATEGORY_RULES: { category: ConflictEventCategory; re: RegExp; token: string }[] = [
  {
    category: "airstrike",
    re: /\bairstrikes?\b|\bair\s*strikes?\b|\bbombing\b|\bbombardment\b|\b공습\b|\b폭격\b/i,
    token: "airstrike",
  },
  {
    category: "missile",
    re: /\bmissiles?\b|\bballistic\b|\bcruise\s*missile\b|\brockets?\b|\bicbm\b|\batacms\b|\b미사일\b|\b탄도\b|\b로켓\b/i,
    token: "missile",
  },
  {
    category: "drone",
    re: /\bdrones?\b|\buavs?\b|\bshahed\b|\bkamikaze\b|\b무인기\b|\b드론\b/i,
    token: "drone",
  },
  {
    category: "explosion",
    re: /\bexplosions?\b|\bblasts?\b|\b폭발\b/i,
    token: "explosion",
  },
  {
    category: "incursion",
    re: /\bincursion\b|\bcrossing\b|\badiz\b|\bairspace\b|\b월선\b|\b침범\b|\b영공\b/i,
    token: "incursion",
  },
  {
    category: "clash",
    re: /\bclash(?:es)?\b|\bfirefight\b|\bcombat\b|\bshelling\b|\b교전\b|\b충돌\b|\b포격\b/i,
    token: "clash",
  },
];

const PRIORITY: ConflictEventCategory[] = [
  "missile",
  "airstrike",
  "drone",
  "explosion",
  "incursion",
  "clash",
];

export function matchConflictCategory(text: string): CategoryHit | null {
  const hits: CategoryHit["keywords"] = [];
  const cats = new Set<ConflictEventCategory>();
  for (const rule of CATEGORY_RULES) {
    if (!rule.re.test(text)) continue;
    cats.add(rule.category);
    hits.push(rule.token);
  }
  if (cats.size === 0) return null;
  const category =
    PRIORITY.find((c) => cats.has(c)) ?? Array.from(cats)[0] ?? "clash";
  return { category, keywords: hits };
}

export const CONFLICT_CATEGORY_LABEL: Record<
  ConflictEventCategory | "unknown",
  { ko: string; en: string }
> = {
  airstrike: { ko: "공습", en: "Airstrike" },
  missile: { ko: "미사일", en: "Missile" },
  drone: { ko: "드론", en: "Drone" },
  clash: { ko: "교전", en: "Clash" },
  explosion: { ko: "폭발", en: "Explosion" },
  incursion: { ko: "월선", en: "Incursion" },
  unknown: { ko: "미분류", en: "Unknown" },
};

export const CONFLICT_THEATER_LABEL: Record<ConflictTheater, { ko: string; en: string }> =
  Object.fromEntries(
    CONFLICT_THEATER_ORDER.map((id) => [
      id,
      { ko: CONFLICT_THEATER_META[id].ko, en: CONFLICT_THEATER_META[id].en },
    ]),
  ) as Record<ConflictTheater, { ko: string; en: string }>;
