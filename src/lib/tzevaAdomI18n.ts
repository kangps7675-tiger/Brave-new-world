import type { LabelLanguage } from "@/lib/layerPrefs";

const HEBREW_RE = /[\u0590-\u05FF]/;

/** Hebrew Oref region / fragment → KO / EN */
const REGION_I18N: Record<string, { ko: string; en: string }> = {
  "תל אביב": { ko: "텔아비브", en: "Tel Aviv" },
  "מרכז העיר": { ko: "도심", en: "City Center" },
  מזרח: { ko: "동부", en: "East" },
  דרום: { ko: "남부", en: "South" },
  צפון: { ko: "북부", en: "North" },
  מערב: { ko: "서부", en: "West" },
  "תל אביב - מרכז העיר": { ko: "텔아비브 — 도심", en: "Tel Aviv — City Center" },
  "תל אביב - מזרח": { ko: "텔아비브 — 동부", en: "Tel Aviv — East" },
  ירושלים: { ko: "예루살렘", en: "Jerusalem" },
  "ירושלים - דרום": { ko: "예루살렘 — 남부", en: "Jerusalem — South" },
  חיפה: { ko: "하이파", en: "Haifa" },
  "כרמל ועיר תחתית": { ko: "카르멜·하부 시가지", en: "Carmel & Lower City" },
  "חיפה - כרמל ועיר תחתית": {
    ko: "하이파 — 카르멜·하부 시가지",
    en: "Haifa — Carmel & Lower City",
  },
  "באר שבע": { ko: "브에르셰바", en: "Be'er Sheva" },
  אשקלון: { ko: "아슈켈론", en: "Ashkelon" },
  שדרות: { ko: "스데롯", en: "Sderot" },
  נתניה: { ko: "네타냐", en: "Netanya" },
  אשדוד: { ko: "아슈도드", en: "Ashdod" },
  "ראשון לציון": { ko: "리숀레치온", en: "Rishon LeZion" },
  "פתח תקווה": { ko: "페타티크바", en: "Petah Tikva" },
  חולון: { ko: "홀론", en: "Holon" },
  "בני ברק": { ko: "브네이브라크", en: "Bnei Brak" },
  "רמת גן": { ko: "라마트간", en: "Ramat Gan" },
  הרצליה: { ko: "헤르츨리야", en: "Herzliya" },
  "כפר סבא": { ko: "크파르사바", en: "Kfar Saba" },
  רעננה: { ko: "라아나나", en: "Ra'anana" },
  מודיעין: { ko: "모디인", en: "Modi'in" },
  "בית שמש": { ko: "베이트셰메시", en: "Beit Shemesh" },
  עפולה: { ko: "아풀라", en: "Afula" },
  טבריה: { ko: "티베리아스", en: "Tiberias" },
  צפת: { ko: "츠파트", en: "Safed" },
  נצרת: { ko: "나사렛", en: "Nazareth" },
  עכו: { ko: "아크레", en: "Acre" },
  נהריה: { ko: "나하리야", en: "Nahariya" },
  "קריית שמונה": { ko: "키르야트슈모나", en: "Kiryat Shmona" },
  כרמיאל: { ko: "카르미엘", en: "Karmiel" },
  דימונה: { ko: "디모나", en: "Dimona" },
  אילת: { ko: "에일라트", en: "Eilat" },
  "עין גדי": { ko: "아인게디", en: "Ein Gedi" },
  "עוטף עזה": { ko: "가자 접경", en: "Gaza Envelope" },
  "גוש דן": { ko: "구시단 (텔아비브 권역)", en: "Gush Dan" },
  "קו העימות": { ko: "전선 접경", en: "Confrontation Line" },
};

const TITLE_I18N: Record<string, { ko: string; en: string }> = {
  "צבע אדום": { ko: "적색 경보", en: "Red Alert" },
  "ירי רקטות וטילים": { ko: "로켓·미사일 발사", en: "Rocket and missile fire" },
  "ירי רקטות וטילים - האירוע הסתיים": {
    ko: "로켓·미사일 — 사건 종료",
    en: "Rocket and missile fire — event ended",
  },
  "חדירת כלי טיס עוין": {
    ko: "적대 항공기 침투",
    en: "Hostile aircraft infiltration",
  },
  "חדירת מחבלים": { ko: "테러리스트 침투", en: "Terrorist infiltration" },
  "רעידת אדמה": { ko: "지진", en: "Earthquake" },
  צונאמי: { ko: "쓰나미", en: "Tsunami" },
  "חומרים מסוכנים": { ko: "위험 물질", en: "Hazardous materials" },
  "אירוע רדיולוגי": { ko: "방사능 사고", en: "Radiological event" },
  "בדקות הקרובות צפויות להתקבל התרעות באיזורים הבאים:": {
    ko: "수 분 내 다음 지역에 경보가 발령될 예정입니다",
    en: "Alerts expected shortly in the following areas",
  },
};

const CATEGORY_I18N: Record<number, { ko: string; en: string }> = {
  1: { ko: "로켓·미사일 발사", en: "Rocket and missile fire" },
  2: { ko: "적대 항공기 침투", en: "Hostile aircraft infiltration" },
  3: { ko: "로켓·미사일 발사", en: "Rocket and missile fire" },
  4: { ko: "로켓·미사일 발사", en: "Rocket and missile fire" },
  6: { ko: "무단 항공기", en: "Unauthorized aircraft" },
  7: { ko: "적대 항공기 침투", en: "Hostile aircraft infiltration" },
  8: { ko: "침투", en: "Infiltration" },
  9: { ko: "쓰나미", en: "Tsunami" },
  10: { ko: "지진", en: "Earthquake" },
  11: { ko: "방사능", en: "Radiological" },
  12: { ko: "위험 물질", en: "Hazardous materials" },
  13: { ko: "경보 해제", en: "All clear" },
  14: { ko: "사전 경고", en: "Pre-warning" },
};

function pick(entry: { ko: string; en: string } | undefined, lang: LabelLanguage): string | null {
  if (!entry) return null;
  return lang === "en" ? entry.en : entry.ko;
}

function regionFallback(lang: LabelLanguage): string {
  return lang === "en" ? "Israel alert zone" : "이스라엘 경보 구역";
}

function titleFallback(lang: LabelLanguage): string {
  return lang === "en" ? "Air raid alert" : "공습 경보";
}

function translateToken(token: string, lang: LabelLanguage): string {
  const exact = pick(REGION_I18N[token], lang);
  if (exact) return exact;
  for (const [he, loc] of Object.entries(REGION_I18N)) {
    if (token.includes(he) || he.includes(token)) return pick(loc, lang) ?? regionFallback(lang);
  }
  if (HEBREW_RE.test(token)) return regionFallback(lang);
  return token;
}

export function translateOrefRegion(region: string, lang: LabelLanguage): string {
  const normalized = region.trim();
  if (!normalized) return regionFallback(lang);
  const exact = pick(REGION_I18N[normalized], lang);
  if (exact) return exact;

  if (normalized.includes(" - ")) {
    return normalized
      .split(/\s*-\s*/)
      .map((part) => translateToken(part.trim(), lang))
      .join(" — ");
  }

  if (normalized.includes(",")) {
    return normalized
      .split(",")
      .map((part) => translateToken(part.trim(), lang))
      .join(", ");
  }

  return translateToken(normalized, lang);
}

export function translateOrefTitle(
  title: string,
  lang: LabelLanguage,
  category?: number,
): string {
  const normalized = title.trim();
  const exact = pick(TITLE_I18N[normalized], lang);
  if (exact) return exact;

  for (const [he, loc] of Object.entries(TITLE_I18N)) {
    if (normalized.includes(he)) return pick(loc, lang) ?? titleFallback(lang);
  }

  if (typeof category === "number") {
    const byCat = pick(CATEGORY_I18N[category], lang);
    if (byCat) return byCat;
  }

  if (!normalized || HEBREW_RE.test(normalized)) return titleFallback(lang);
  return normalized;
}

export const TZEVA_UI = {
  brand: { ko: "이스라엘 공습 경보", en: "Israel Air Raid Alert" },
  subtitle: { ko: "홈프론트 커맨드 · 실시간", en: "Home Front Command · Live" },
  active: { ko: "활성 경보", en: "Active alerts" },
  recent: { ko: "최근 이력", en: "Recent" },
  alert: { ko: "경보", en: "ALERT" },
  live: { ko: "LIVE", en: "LIVE" },
  connecting: { ko: "연결 중", en: "Connecting" },
  geoBlocked: { ko: "지역 제한", en: "Geo-blocked" },
  demo: { ko: "데모", en: "Demo" },
  idle: { ko: "대기", en: "Standby" },
  awaiting: { ko: "경보 없음", en: "No alerts" },
  geoHint: {
    ko: "해외 IP에서는 이스라엘 홈프론트 API가 제한될 수 있습니다.",
    en: "Home Front API may be blocked outside Israeli IPs.",
  },
  source: {
    ko: "출처: Pikud HaOref (비공식)",
    en: "Source: Pikud HaOref (unofficial)",
  },
  activeBadge: { ko: "활성", en: "ACTIVE" },
  openList: { ko: "전체 경보 보기", en: "Show all alerts" },
} as const;

export function tzevaUi(key: keyof typeof TZEVA_UI, lang: LabelLanguage): string {
  return TZEVA_UI[key][lang];
}
