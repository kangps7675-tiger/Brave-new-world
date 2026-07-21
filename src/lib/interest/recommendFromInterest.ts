import type { NewsTheater } from "@/lib/news/types";
import { THEATER_CHIP_LABELS } from "@/lib/news/theaterMap";
import type {
  InterestProfile,
  InterestRecommendChip,
} from "@/lib/interest/interestTypes";

const NEWS_THEATERS = new Set<string>(Object.keys(THEATER_CHIP_LABELS));

const THEME_LABELS: Record<string, { ko: string; en: string; layerKey?: string }> = {
  ais: { ko: "해상 AIS", en: "Maritime AIS", layerKey: "showAis" },
  carriers: { ko: "미 항모", en: "US carriers", layerKey: "showUsCarriers" },
  firms: { ko: "열점·화재", en: "FIRMS fires", layerKey: "showFirmsFires" },
  military: { ko: "군용 항적", en: "Mil aircraft", layerKey: "showMilitaryActivity" },
  airTraffic: { ko: "민간 항공", en: "Air traffic", layerKey: "showAirTraffic" },
};

/** 지경학에서 추천하지 않는 군용·전투 테마 */
const ECONOMY_BLOCKED_THEMES = new Set(["military", "carriers", "firms"]);

function theaterLabel(id: string): { ko: string; en: string } {
  if (NEWS_THEATERS.has(id) && id in THEATER_CHIP_LABELS) {
    const label = THEATER_CHIP_LABELS[id as NewsTheater];
    return { ko: label, en: label };
  }
  return { ko: id, en: id };
}

/** 프로필 → 추천 칩 2~4개. 신호 부족하면 빈 배열. */
export function recommendFromInterest(
  profile: InterestProfile,
  mode: "conflict" | "economy" = "conflict",
): InterestRecommendChip[] {
  if (profile.eventCount < 2 && profile.buckets.length === 0) return [];
  if (profile.buckets.every((b) => b.score < 0.35) && profile.eventCount < 3) {
    return [];
  }

  const chips: InterestRecommendChip[] = [];
  const used = new Set<string>();

  for (const b of profile.topTheaters.slice(0, 2)) {
    const key = `theater:${b.id}`;
    if (used.has(key)) continue;
    used.add(key);
    const labels = theaterLabel(b.label || b.id);
    const theaterId = NEWS_THEATERS.has(b.id) ? b.id : "global";
    chips.push({
      id: key,
      kind: "theater",
      labelKo: labels.ko,
      labelEn: labels.en,
      score: b.score,
      action: { type: "fly-theater", theater: theaterId },
    });
  }

  for (const b of profile.topThemes.slice(0, 3)) {
    if (mode === "economy" && ECONOMY_BLOCKED_THEMES.has(b.id)) continue;
    const key = `theme:${b.id}`;
    if (used.has(key)) continue;
    used.add(key);
    const meta = THEME_LABELS[b.id] ?? {
      ko: b.label || b.id,
      en: b.label || b.id,
    };
    const labelKo = mode === "economy" && b.id === "ais" ? "민간 AIS" : meta.ko;
    const labelEn =
      mode === "economy" && b.id === "ais" ? "Commercial AIS" : meta.en;
    chips.push({
      id: key,
      kind: "theme",
      labelKo,
      labelEn,
      score: b.score,
      action: meta.layerKey
        ? { type: "enable-layer", layerKey: meta.layerKey }
        : { type: "open-sheet" },
    });
    break;
  }

  for (const b of profile.topSymbols.slice(0, 1)) {
    const key = `symbol:${b.id}`;
    if (used.has(key)) continue;
    used.add(key);
    chips.push({
      id: key,
      kind: "symbol",
      labelKo: b.label || b.id,
      labelEn: b.label || b.id,
      score: b.score,
      action: { type: "open-sheet", theater: "all" },
    });
  }

  return chips.slice(0, 4);
}

export function isNewsTheaterId(id: string): id is NewsTheater {
  return NEWS_THEATERS.has(id);
}
