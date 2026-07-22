/**
 * 텔레그램 본문 → 지명 사전 정확 매칭.
 * 사전 hit만 반환 (국가 중심 폴백·퍼지·LLM 없음).
 */

import israelOrefZones from "@/data/israel-oref-zones.json";
import { listUkraineAlertZones } from "@/lib/ukraineAlertZones";
import type { TelegramAlertRegion } from "@/lib/telegramAlerts";

export type TelegramPlaceHit = {
  label: string;
  lat: number;
  lng: number;
  source: "ukraine" | "israel" | "middle-east";
};

type PlaceEntry = {
  name: string;
  lat: number;
  lng: number;
  source: TelegramPlaceHit["source"];
  /** 표시용 라벨 (영문 우선) */
  label: string;
};

/** 중동·걸프 주요 지점 — 영·한·현지 별칭 */
const MIDDLE_EAST_PLACES: Array<{
  label: string;
  lat: number;
  lng: number;
  aliases: string[];
}> = [
  { label: "Tehran", lat: 35.6892, lng: 51.389, aliases: ["Tehran", "Teheran", "تهران", "테헤란"] },
  { label: "Damascus", lat: 33.5138, lng: 36.2765, aliases: ["Damascus", "Dimashq", "دمشق", "다마스쿠스"] },
  { label: "Beirut", lat: 33.8938, lng: 35.5018, aliases: ["Beirut", "Beyrouth", "بيروت", "베이루트"] },
  { label: "Gaza", lat: 31.5017, lng: 34.4668, aliases: ["Gaza", "Gaza City", "Gaza Strip", "עזה", "غزة", "가자"] },
  { label: "Rafah", lat: 31.287, lng: 34.25, aliases: ["Rafah", "رفح", "רפיח", "라파"] },
  { label: "Khan Yunis", lat: 31.346, lng: 34.302, aliases: ["Khan Yunis", "Khan Younis", "خان يونس"] },
  { label: "Baghdad", lat: 33.3152, lng: 44.3661, aliases: ["Baghdad", "بغداد", "바그다드"] },
  { label: "Basra", lat: 30.508, lng: 47.783, aliases: ["Basra", "Basrah", "البصرة"] },
  { label: "Mosul", lat: 36.34, lng: 43.13, aliases: ["Mosul", "الموصل"] },
  { label: "Erbil", lat: 36.1911, lng: 44.0092, aliases: ["Erbil", "Irbil", "أربيل"] },
  { label: "Sanaa", lat: 15.3694, lng: 44.191, aliases: ["Sanaa", "Sana'a", "صنعاء", "사나"] },
  { label: "Aden", lat: 12.7855, lng: 45.0187, aliases: ["Aden", "عدن"] },
  { label: "Hodeidah", lat: 14.7978, lng: 42.9545, aliases: ["Hodeidah", "Hodeida", "Al Hudaydah", "الحديدة"] },
  { label: "Strait of Hormuz", lat: 26.5667, lng: 56.25, aliases: ["Hormuz", "Strait of Hormuz", "Hormuz Strait", "호르무즈"] },
  { label: "Strait of Bab el-Mandeb", lat: 12.5833, lng: 43.3333, aliases: ["Bab el-Mandeb", "Bab al-Mandab", "Bab-el-Mandeb"] },
  { label: "Red Sea", lat: 20.0, lng: 38.5, aliases: ["Red Sea", "البحر الأحمر", "홍해"] },
  { label: "Persian Gulf", lat: 26.0, lng: 52.0, aliases: ["Persian Gulf", "Arabian Gulf", "페르시아만"] },
  { label: "Tel Aviv", lat: 32.0853, lng: 34.7818, aliases: ["Tel Aviv", "Tel-Aviv", "Tel Aviv-Yafo", "텔아비브"] },
  { label: "Jerusalem", lat: 31.7683, lng: 35.2137, aliases: ["Jerusalem", "Yerushalayim", "القدس", "예루살렘"] },
  { label: "Haifa", lat: 32.794, lng: 34.9896, aliases: ["Haifa", "חיפה", "하이파"] },
  { label: "Ashkelon", lat: 31.6688, lng: 34.5743, aliases: ["Ashkelon", "Ashqelon", "אשקלון"] },
  { label: "Ashdod", lat: 31.8044, lng: 34.6553, aliases: ["Ashdod", "אשדוד"] },
  { label: "Beersheba", lat: 31.2518, lng: 34.7915, aliases: ["Beersheba", "Beer Sheva", "Be'er Sheva", "באר שבע"] },
  { label: "Sderot", lat: 31.525, lng: 34.596, aliases: ["Sderot", "שדרות"] },
  { label: "Netanya", lat: 32.3215, lng: 34.8532, aliases: ["Netanya", "נתניה"] },
  { label: "Dimona", lat: 31.0694, lng: 35.0333, aliases: ["Dimona", "דימונה"] },
  { label: "Eilat", lat: 29.5577, lng: 34.9519, aliases: ["Eilat", "אילת"] },
  { label: "Kiryat Shmona", lat: 33.2079, lng: 35.5702, aliases: ["Kiryat Shmona", "Kiryat Shemona", "קריית שמונה"] },
  { label: "Lebanon", lat: 33.8547, lng: 35.8623, aliases: ["Lebanon", "Lebanese", "لبنان", "레바논"] },
  { label: "Syria", lat: 34.8021, lng: 38.9968, aliases: ["Syria", "Syrian", "سوريا", "시리아"] },
  { label: "Iran", lat: 32.4279, lng: 53.688, aliases: ["Iran", "إيران", "이란"] },
  { label: "Yemen", lat: 15.5527, lng: 48.5164, aliases: ["Yemen", "Houthi", "اليمن", "예멘"] },
  { label: "Iraq", lat: 33.2232, lng: 43.6793, aliases: ["Iraq", "Iraqi", "العراق", "이라크"] },
];

const UA_LABEL_BY_NORM = new Map<string, string>([
  ["kyiv", "Kyiv"],
  ["киев", "Kyiv"],
  ["київ", "Kyiv"],
  ["kharkiv", "Kharkiv"],
  ["харків", "Kharkiv"],
  ["odesa", "Odesa"],
  ["odessa", "Odesa"],
  ["одеса", "Odesa"],
  ["dnipro", "Dnipro"],
  ["дніпро", "Dnipro"],
  ["zaporizhzhia", "Zaporizhzhia"],
  ["zaporizhzhya", "Zaporizhzhia"],
  ["запоріжжя", "Zaporizhzhia"],
  ["donetsk", "Donetsk"],
  ["донецьк", "Donetsk"],
  ["luhansk", "Luhansk"],
  ["луганськ", "Luhansk"],
  ["sumy", "Sumy"],
  ["суми", "Sumy"],
  ["chernihiv", "Chernihiv"],
  ["чернігів", "Chernihiv"],
  ["kherson", "Kherson"],
  ["херсон", "Kherson"],
  ["mykolaiv", "Mykolaiv"],
  ["миколаїв", "Mykolaiv"],
  ["lviv", "Lviv"],
  ["львів", "Lviv"],
  ["crimea", "Crimea"],
  ["sevastopol", "Sevastopol"],
]);

function normalizePlaceKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`ʼ]/g, "")
    .replace(/\s+/g, " ");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 단어 경계(유니코드 글자·숫자) 안에서 지명 등장 여부 */
function textHasExactPlace(haystackNorm: string, placeNorm: string): boolean {
  if (!placeNorm || placeNorm.length < 3) return false;
  if (!haystackNorm.includes(placeNorm)) return false;
  try {
    const re = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(placeNorm)}(?![\\p{L}\\p{N}])`,
      "iu",
    );
    return re.test(haystackNorm);
  } catch {
    // 구형 엔진 폴백 — 공백/구두점 경계
    const re = new RegExp(
      `(^|[^\\p{L}\\p{N}])${escapeRegExp(placeNorm)}([^\\p{L}\\p{N}]|$)`,
      "iu",
    );
    return re.test(haystackNorm);
  }
}

function buildGazetteer(): PlaceEntry[] {
  const entries: PlaceEntry[] = [];

  for (const z of listUkraineAlertZones()) {
    const key = normalizePlaceKey(z.name);
    if (key.length < 3) continue;
    entries.push({
      name: z.name,
      lat: z.lat,
      lng: z.lng,
      source: "ukraine",
      label: UA_LABEL_BY_NORM.get(key) ?? z.name.replace(/\s+Oblast$/i, "").replace(/\s+City$/i, ""),
    });
  }

  for (const z of israelOrefZones as Array<{ name: string; lat: number; lng: number }>) {
    const key = normalizePlaceKey(z.name);
    if (key.length < 3) continue;
    entries.push({
      name: z.name,
      lat: z.lat,
      lng: z.lng,
      source: "israel",
      label: z.name,
    });
  }

  for (const place of MIDDLE_EAST_PLACES) {
    for (const alias of place.aliases) {
      const key = normalizePlaceKey(alias);
      if (key.length < 3) continue;
      entries.push({
        name: alias,
        lat: place.lat,
        lng: place.lng,
        source: "middle-east",
        label: place.label,
      });
    }
  }

  // 긴 이름 우선 (Kharkiv Oblast > Kharkiv, Strait of Hormuz > Hormuz)
  entries.sort((a, b) => b.name.length - a.name.length);
  return entries;
}

const GAZETTEER = buildGazetteer();

function sourcePriority(regionHint: TelegramAlertRegion | undefined, source: PlaceEntry["source"]): number {
  if (regionHint === "ukraine") {
    if (source === "ukraine") return 0;
    if (source === "middle-east" || source === "israel") return 1;
    return 2;
  }
  if (regionHint === "middle-east") {
    if (source === "israel" || source === "middle-east") return 0;
    if (source === "ukraine") return 1;
    return 2;
  }
  return 0;
}

/**
 * 본문에서 사전 지명이 정확히 잡히면 좌표 반환.
 * 여러 개면 지역 힌트 우선 → 더 긴 이름.
 */
export function resolveTelegramPlace(
  text: string,
  regionHint?: TelegramAlertRegion,
): TelegramPlaceHit | null {
  const raw = text?.trim();
  if (!raw) return null;
  const haystack = normalizePlaceKey(raw);
  if (haystack.length < 3) return null;

  let best: PlaceEntry | null = null;
  let bestPri = 99;

  for (const entry of GAZETTEER) {
    const placeNorm = normalizePlaceKey(entry.name);
    if (!textHasExactPlace(haystack, placeNorm)) continue;
    const pri = sourcePriority(regionHint, entry.source);
    if (
      !best ||
      pri < bestPri ||
      (pri === bestPri && entry.name.length > best.name.length)
    ) {
      best = entry;
      bestPri = pri;
      // 이미 길이순 정렬이라 같은 소스면 첫 hit가 최장 — 힌트 우선만 계속 스캔
      if (pri === 0 && entry.name.length >= 12) break;
    }
  }

  if (!best) return null;
  return {
    label: best.label,
    lat: best.lat,
    lng: best.lng,
    source: best.source,
  };
}
