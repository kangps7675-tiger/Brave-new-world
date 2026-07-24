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
  /**
   * 매칭 정밀도.
   *  - "city": 도시·오블라스트·해협 등 좁은 지점 (사건 발생지로 신뢰)
   *  - "country": 국가 단위 (부수 언급이 많아 발생지 신뢰도 낮음 — 제목 매칭일 때만 채택 권장)
   */
  precision: "city" | "country";
};

type PlaceEntry = {
  name: string;
  lat: number;
  lng: number;
  source: TelegramPlaceHit["source"];
  precision: "city" | "country";
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
    .replace(/\s+/g, " ")
    // NFKD로 쪼개진 한글을 음절로 재결합 (조사 경계 매칭을 위해 필수)
    .normalize("NFC");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 너무 짧아 오탐 위험이 큰 키인지.
 * 라틴/키릴은 3자 미만 배제(us, un 등), 한글/한자는 2자부터 허용(이란·예멘·가자).
 */
function isTooShortKey(key: string): boolean {
  const hasCjk = /[가-힣぀-ヿ一-鿿]/.test(key);
  return hasCjk ? key.length < 2 : key.length < 3;
}

/**
 * 한국어 조사 화이트리스트 — 지명 바로 뒤에 이것들이 오면 경계로 인정한다.
 * "이란을/이란에/이란은" = 매칭, "이란성(쌍둥이)/대이란" = 비매칭.
 * 긴 조사를 먼저 (에서 > 에). 형태소 분석기 없이 A의 핵심 감각만 가져온 것.
 */
const KO_JOSA =
  "에서|에게|한테|으로|까지|부터|보다|이나|을|를|은|는|이|가|에|의|와|과|로|도|만|랑|나|께";

/**
 * 단어 경계 안에서 지명 등장 여부.
 * 앞: 라틴·한글 등 글자/숫자가 붙어 있으면 비매칭(대이란 등 부수언급 차단).
 * 뒤: 글자/숫자가 없거나(영어 표준 경계), 한국어 조사가 붙은 경우만 인정.
 */
function textHasExactPlace(haystackNorm: string, placeNorm: string): boolean {
  if (!placeNorm || isTooShortKey(placeNorm)) return false;
  if (!haystackNorm.includes(placeNorm)) return false;
  const esc = escapeRegExp(placeNorm);
  try {
    const re = new RegExp(
      `(?<![\\p{L}\\p{N}])${esc}(?:${KO_JOSA})?(?![\\p{L}\\p{N}])`,
      "iu",
    );
    return re.test(haystackNorm);
  } catch {
    // 구형 엔진 폴백 — 공백/구두점 경계 + 조사
    const re = new RegExp(
      `(^|[^\\p{L}\\p{N}])${esc}(?:${KO_JOSA})?([^\\p{L}\\p{N}]|$)`,
      "iu",
    );
    return re.test(haystackNorm);
  }
}

/** 국가 단위 라벨 — 부수 언급이 많아 발생지 신뢰도가 낮은 항목 */
const COUNTRY_LEVEL_LABELS = new Set<string>([
  "Iran",
  "Syria",
  "Lebanon",
  "Yemen",
  "Iraq",
]);

function buildGazetteer(): PlaceEntry[] {
  const entries: PlaceEntry[] = [];

  for (const z of listUkraineAlertZones()) {
    const key = normalizePlaceKey(z.name);
    if (isTooShortKey(key)) continue;
    entries.push({
      name: z.name,
      lat: z.lat,
      lng: z.lng,
      source: "ukraine",
      precision: "city",
      label: UA_LABEL_BY_NORM.get(key) ?? z.name.replace(/\s+Oblast$/i, "").replace(/\s+City$/i, ""),
    });
  }

  for (const z of israelOrefZones as Array<{ name: string; lat: number; lng: number }>) {
    const key = normalizePlaceKey(z.name);
    if (isTooShortKey(key)) continue;
    entries.push({
      name: z.name,
      lat: z.lat,
      lng: z.lng,
      source: "israel",
      precision: "city",
      label: z.name,
    });
  }

  for (const place of MIDDLE_EAST_PLACES) {
    const precision: "city" | "country" = COUNTRY_LEVEL_LABELS.has(place.label)
      ? "country"
      : "city";
    for (const alias of place.aliases) {
      const key = normalizePlaceKey(alias);
      if (isTooShortKey(key)) continue;
      entries.push({
        name: alias,
        lat: place.lat,
        lng: place.lng,
        source: "middle-east",
        precision,
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

  const precisionRank = (p: "city" | "country") => (p === "city" ? 0 : 1);

  for (const entry of GAZETTEER) {
    const placeNorm = normalizePlaceKey(entry.name);
    if (!textHasExactPlace(haystack, placeNorm)) continue;
    const pri = sourcePriority(regionHint, entry.source);
    let better = false;
    if (!best) {
      better = true;
    } else if (pri !== bestPri) {
      better = pri < bestPri;
    } else if (precisionRank(entry.precision) !== precisionRank(best.precision)) {
      // 같은 소스면 도시(city)를 국가(country)보다 우선 — 부수 국가언급 오탐 방지
      better = precisionRank(entry.precision) < precisionRank(best.precision);
    } else {
      better = entry.name.length > best.name.length;
    }
    if (better) {
      best = entry;
      bestPri = pri;
    }
  }

  if (!best) return null;
  return {
    label: best.label,
    lat: best.lat,
    lng: best.lng,
    source: best.source,
    precision: best.precision,
  };
}

/**
 * 공격국/피격국(발생지) 구분 — 여러 지명이 나올 때 "사건이 벌어진 곳"을 고른다.
 *
 * 정확도 원칙(과잉 추론 금지):
 *  - 명확한 신호가 있을 때만 override. 애매하면 resolveTelegramPlace(기존 최선)로 폴백.
 *  - 한국어("X를 공습")와 영어("strike on X")는 어순이 반대라, 언어별 신호를 각각 본다.
 *  - 발사·출처 신호(from/by, "X발", "X이 발사")가 붙은 지명은 발생지에서 제외(=공격국).
 */

// 피격지(발생지) 근처에 오는 신호
const IMPACT_CUE_EN =
  /\b(on|at|in|into|toward|towards|hits?|struck|strikes?\s+on|shelling|bombard\w*|bombed|near|targets?|targeting)\b/i;
const IMPACT_CUE_KO = /(공습|공격|타격|폭격|포격|피격|피습|사상자|폭발|미사일\s*낙하|를|을|에|향해)/;

// 공격 주체(출처) 신호(영어) — 이 지명은 발생지가 아님. (한국어는 주격 조사로 판정)
const SOURCE_CUE_EN = /\b(from|by|launched\s+by|fired\s+(from|by))\b/i;

type PlaceOccurrence = { hit: TelegramPlaceHit; index: number; matchLen: number };

/** 텍스트에서 매칭된 지명들을 등장 위치·매칭 길이와 함께 (라벨당 최초 1회) */
function collectPlaceOccurrences(
  rawText: string,
  regionHint?: TelegramAlertRegion,
): PlaceOccurrence[] {
  const haystack = normalizePlaceKey(rawText);
  if (haystack.length < 3) return [];
  const byLabel = new Map<string, PlaceOccurrence>();

  for (const entry of GAZETTEER) {
    const placeNorm = normalizePlaceKey(entry.name);
    if (isTooShortKey(placeNorm)) continue;
    if (!textHasExactPlace(haystack, placeNorm)) continue;
    const idx = haystack.indexOf(placeNorm);
    if (idx < 0) continue;
    const prev = byLabel.get(entry.label);
    if (prev && prev.index <= idx) continue;
    byLabel.set(entry.label, {
      index: idx,
      matchLen: placeNorm.length,
      hit: {
        label: entry.label,
        lat: entry.lat,
        lng: entry.lng,
        source: entry.source,
        precision: entry.precision,
      },
    });
  }
  return [...byLabel.values()];
}

/** 지명 바로 뒤에 붙은 한국어 조사 하나 (없으면 null) */
const JOSA_TARGET = /^(을|를|에서|에게|에)/; // 목적·처소 → 사건 대상/발생지
const JOSA_SUBJECT = /^(이|가)(?![가-힣])/; // 주격 → 행위자(공격 주체)
function immediateJosa(afterImm: string): "target" | "subject" | null {
  if (JOSA_TARGET.test(afterImm)) return "target";
  if (JOSA_SUBJECT.test(afterImm)) return "subject";
  return null;
}

/** 지명 주변 창(window)에 신호가 있는지 — 앞뒤 각각 확인 */
function windowAround(hay: string, index: number, len: number, span = 14): { before: string; after: string } {
  const before = hay.slice(Math.max(0, index - span), index);
  const after = hay.slice(index + len, index + len + span);
  return { before, after };
}

/**
 * 발생지 우선 매칭. 명확한 신호가 있을 때만 기존 최선과 다르게 고른다.
 */
export function resolveImpactPlace(
  text: string,
  regionHint?: TelegramAlertRegion,
): TelegramPlaceHit | null {
  const raw = text?.trim();
  if (!raw) return null;
  const fallback = resolveTelegramPlace(raw, regionHint);

  const occ = collectPlaceOccurrences(raw, regionHint);
  if (occ.length <= 1) return fallback; // 지명 0~1개면 구분할 게 없음

  const haystack = normalizePlaceKey(raw);
  let best: { occ: PlaceOccurrence; score: number } | null = null;

  for (const o of occ) {
    const { before, after } = windowAround(haystack, o.index, o.matchLen);
    const afterImm = haystack.slice(o.index + o.matchLen);
    let score = 0;

    // 한국어 문법: 지명 바로 뒤 조사가 핵심 신호
    //  - 목적/처소격(을/를/에/에서) → 사건 대상·발생지 (강한 +)
    //  - 주격(이/가) → 행위자(공격 주체) → 발생지 아님 (강한 -)
    const josa = immediateJosa(afterImm);
    if (josa === "target") score += 3;
    else if (josa === "subject") score -= 3;

    // 영어 어순: 전치사 뒤(strike ON x) = 대상 / from·by = 출처
    if (IMPACT_CUE_EN.test(before)) score += 2;
    if (SOURCE_CUE_EN.test(before)) score -= 3;

    // 한국어 약한 보조: 근처에 공습·폭격 등 동사가 있으면 +1 (조사 없을 때 대비)
    if (josa == null && IMPACT_CUE_KO.test(after)) score += 1;

    // 도시(city)는 발생지일 확률↑ (약한 가중)
    if (o.hit.precision === "city") score += 1;

    if (!best || score > best.score) best = { occ: o, score };
  }

  // 신호가 뚜렷할 때만 override (score >= 2). 아니면 기존 최선 유지.
  if (best && best.score >= 2) return best.occ.hit;
  return fallback;
}
