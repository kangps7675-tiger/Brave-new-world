/**
 * NewFeeds 이란 공격 피드 — 표시 언어 엄격 분리 (KO / EN).
 * 업스트림은 title_en 중심이라 KO는 용어·지명 치환 + 위협/심각도 맵.
 */
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewfeedsSeverity } from "@/lib/newfeeds";
import { severityLabel } from "@/lib/newfeeds";

function pick(entry: { ko: string; en: string } | undefined, lang: LabelLanguage): string | null {
  if (!entry) return null;
  return lang === "en" ? entry.en : entry.ko;
}

const THREAT_I18N: Record<string, { ko: string; en: string }> = {
  MAJOR: { ko: "대규모", en: "MAJOR" },
  HIGH: { ko: "높음", en: "HIGH" },
  ELEVATED: { ko: "상승", en: "ELEVATED" },
  MEDIUM: { ko: "중간", en: "MEDIUM" },
  MODERATE: { ko: "보통", en: "MODERATE" },
  LOW: { ko: "낮음", en: "LOW" },
  GUARDED: { ko: "경계", en: "GUARDED" },
  SEVERE: { ko: "심각", en: "SEVERE" },
  CRITICAL: { ko: "치명", en: "CRITICAL" },
};

const CATEGORY_I18N: Record<string, { ko: string; en: string }> = {
  missile: { ko: "미사일", en: "Missile" },
  missile_strike: { ko: "미사일 타격", en: "Missile strike" },
  airstrike: { ko: "공습", en: "Airstrike" },
  air_strike: { ko: "공습", en: "Airstrike" },
  drone: { ko: "드론", en: "Drone" },
  uav: { ko: "무인기", en: "UAV" },
  interception: { ko: "요격", en: "Interception" },
  intercept: { ko: "요격", en: "Intercept" },
  explosion: { ko: "폭발", en: "Explosion" },
  shelling: { ko: "포격", en: "Shelling" },
  rocket: { ko: "로켓", en: "Rocket" },
  attack: { ko: "공격", en: "Attack" },
  strike: { ko: "타격", en: "Strike" },
  clash: { ko: "교전", en: "Clash" },
  unknown: { ko: "미분류", en: "Unknown" },
};

/** 지명·장소 — 대소문자 무시 exact / includes */
const LOCATION_I18N: Record<string, { ko: string; en: string }> = {
  iran: { ko: "이란", en: "Iran" },
  tehran: { ko: "테헤란", en: "Tehran" },
  isfahan: { ko: "이스파한", en: "Isfahan" },
  esfahan: { ko: "이스파한", en: "Isfahan" },
  bushehr: { ko: "부셰흐르", en: "Bushehr" },
  bandar: { ko: "반다르", en: "Bandar" },
  "bandar abbas": { ko: "반다르압바스", en: "Bandar Abbas" },
  hormuz: { ko: "호르무즈", en: "Hormuz" },
  "strait of hormuz": { ko: "호르무즈 해협", en: "Strait of Hormuz" },
  "persian gulf": { ko: "페르시아만", en: "Persian Gulf" },
  "gulf of oman": { ko: "오만만", en: "Gulf of Oman" },
  iraq: { ko: "이라크", en: "Iraq" },
  baghdad: { ko: "바그다드", en: "Baghdad" },
  syria: { ko: "시리아", en: "Syria" },
  damascus: { ko: "다마스쿠스", en: "Damascus" },
  lebanon: { ko: "레바논", en: "Lebanon" },
  beirut: { ko: "베이루트", en: "Beirut" },
  israel: { ko: "이스라엘", en: "Israel" },
  "tel aviv": { ko: "텔아비브", en: "Tel Aviv" },
  jerusalem: { ko: "예루살렘", en: "Jerusalem" },
  "red sea": { ko: "홍해", en: "Red Sea" },
  yemen: { ko: "예멘", en: "Yemen" },
  "saudi arabia": { ko: "사우디아라비아", en: "Saudi Arabia" },
  bahrain: { ko: "바레인", en: "Bahrain" },
  qatar: { ko: "카타르", en: "Qatar" },
  uae: { ko: "아랍에미리트", en: "UAE" },
  "united arab emirates": { ko: "아랍에미리트", en: "United Arab Emirates" },
  kuwait: { ko: "쿠웨이트", en: "Kuwait" },
  turkey: { ko: "튀르키예", en: "Turkey" },
  azerbaijan: { ko: "아제르바이잔", en: "Azerbaijan" },
  afghanistan: { ko: "아프가니스탄", en: "Afghanistan" },
  pakistan: { ko: "파키스탄", en: "Pakistan" },
  natanz: { ko: "나탄즈", en: "Natanz" },
  fordow: { ko: "포르도", en: "Fordow" },
  kharg: { ko: "하르그", en: "Kharg" },
  mashhad: { ko: "마슈하드", en: "Mashhad" },
  shiraz: { ko: "시라즈", en: "Shiraz" },
  tabriz: { ko: "타브리즈", en: "Tabriz" },
  kermanshah: { ko: "케르만샤", en: "Kermanshah" },
};

/**
 * 영문 헤드라인 → 한국어 치환 (긴 구문 우선).
 * EN 모드에서는 원문 유지.
 */
const TITLE_PHRASE_KO: [RegExp, string][] = [
  [/\bStrait of Hormuz\b/gi, "호르무즈 해협"],
  [/\bPersian Gulf\b/gi, "페르시아만"],
  [/\bGulf of Oman\b/gi, "오만만"],
  [/\bRed Sea\b/gi, "홍해"],
  [/\bBandar Abbas\b/gi, "반다르압바스"],
  [/\bTel Aviv\b/gi, "텔아비브"],
  [/\bSaudi Arabia\b/gi, "사우디아라비아"],
  [/\bUnited Arab Emirates\b/gi, "아랍에미리트"],
  [/\bIslamic Revolutionary Guard Corps\b/gi, "이슬람혁명수비대"],
  [/\bRevolutionary Guard\b/gi, "혁명수비대"],
  [/\bair defense\b/gi, "방공"],
  [/\bair defence\b/gi, "방공"],
  [/\bair strike\b/gi, "공습"],
  [/\bairstrike\b/gi, "공습"],
  [/\bmissile strike\b/gi, "미사일 타격"],
  [/\bdrone strike\b/gi, "드론 타격"],
  [/\bdrone attack\b/gi, "드론 공격"],
  [/\bmissile attack\b/gi, "미사일 공격"],
  [/\brocket attack\b/gi, "로켓 공격"],
  [/\bballistic missile\b/gi, "탄도미사일"],
  [/\bcruise missile\b/gi, "순항미사일"],
  [/\bintercepted\b/gi, "요격됨"],
  [/\binterception\b/gi, "요격"],
  [/\bintercepts?\b/gi, "요격"],
  [/\bexplosion\b/gi, "폭발"],
  [/\bexplosions\b/gi, "폭발"],
  [/\bshelling\b/gi, "포격"],
  [/\bbombardment\b/gi, "폭격"],
  [/\bstrike\b/gi, "타격"],
  [/\bstrikes\b/gi, "타격"],
  [/\battack\b/gi, "공격"],
  [/\battacks\b/gi, "공격"],
  [/\bmissile\b/gi, "미사일"],
  [/\bmissiles\b/gi, "미사일"],
  [/\brocket\b/gi, "로켓"],
  [/\brockets\b/gi, "로켓"],
  [/\bdrone\b/gi, "드론"],
  [/\bdrones\b/gi, "드론"],
  [/\bUAV\b/g, "무인기"],
  [/\bIRGC\b/g, "혁명수비대"],
  [/\bIDF\b/g, "이스라엘군"],
  [/\bIran\b/gi, "이란"],
  [/\bIraqi?\b/gi, "이라크"],
  [/\bSyria\b/gi, "시리아"],
  [/\bLebanon\b/gi, "레바논"],
  [/\bIsrael\b/gi, "이스라엘"],
  [/\bYemen\b/gi, "예멘"],
  [/\bTehran\b/gi, "테헤란"],
  [/\bIsfahan\b/gi, "이스파한"],
  [/\bEsfahan\b/gi, "이스파한"],
  [/\bDamascus\b/gi, "다마스쿠스"],
  [/\bBaghdad\b/gi, "바그다드"],
  [/\bBeirut\b/gi, "베이루트"],
  [/\bNatanz\b/gi, "나탄즈"],
  [/\bFordow\b/gi, "포르도"],
  [/\breported\b/gi, "보도"],
  [/\breports?\b/gi, "보도"],
  [/\bnear\b/gi, "인근"],
  [/\bover\b/gi, "상공"],
  [/\btargets?\b/gi, "목표"],
  [/\bmilitary\b/gi, "군사"],
  [/\bnuclear\b/gi, "핵"],
  [/\bbase\b/gi, "기지"],
  [/\bport\b/gi, "항구"],
  [/\bairport\b/gi, "공항"],
  [/\boil\b/gi, "석유"],
  [/\bfacility\b/gi, "시설"],
  [/\bfacilities\b/gi, "시설"],
];

export function localizeNewfeedsThreatLabel(
  label: string | null | undefined,
  lang: LabelLanguage,
): string | null {
  if (!label) return null;
  const key = label.trim().toUpperCase();
  const mapped = pick(THREAT_I18N[key], lang);
  if (mapped) return mapped;
  if (lang === "en") return label.trim();
  return label.trim();
}

export function localizeNewfeedsCategory(
  category: string | null | undefined,
  lang: LabelLanguage,
): string {
  if (!category) return lang === "en" ? "Unknown" : "미분류";
  const key = category.trim().toLowerCase().replace(/\s+/g, "_");
  const mapped = pick(CATEGORY_I18N[key], lang);
  if (mapped) return mapped;
  if (lang === "en") return category;
  // snake_case → 공백 후 구문 치환
  return localizeNewfeedsTitle(category.replace(/_/g, " "), lang);
}

export function localizeNewfeedsLocation(
  location: string | null | undefined,
  lang: LabelLanguage,
): string {
  if (!location) return "";
  const raw = location.trim();
  if (!raw) return "";
  if (lang === "en") return raw;

  const lower = raw.toLowerCase();
  const exact = pick(LOCATION_I18N[lower], lang);
  if (exact) return exact;

  // 긴 키 우선 includes
  const keys = Object.keys(LOCATION_I18N).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key)) {
      const loc = pick(LOCATION_I18N[key], lang);
      if (loc) return loc;
    }
  }
  return localizeNewfeedsTitle(raw, lang);
}

export function localizeNewfeedsTitle(title: string, lang: LabelLanguage): string {
  const t = title.trim();
  if (!t) return lang === "en" ? "Attack event" : "공격 이벤트";
  if (lang === "en") return t;

  let out = t;
  for (const [re, ko] of TITLE_PHRASE_KO) {
    out = out.replace(re, ko);
  }
  // 남은 흔한 접속어
  out = out
    .replace(/\bin\b/gi, "에서")
    .replace(/\band\b/gi, "및")
    .replace(/\bvs\.?\b/gi, "대")
    .replace(/\s{2,}/g, " ")
    .trim();
  return out;
}

export function localizeNewfeedsSummary(
  summary: string | null | undefined,
  lang: LabelLanguage,
): string {
  if (!summary?.trim()) return "";
  if (lang === "en") return summary.trim();
  return localizeNewfeedsTitle(summary, lang);
}

export function formatNewfeedsSeverityMeta(
  severity: NewfeedsSeverity,
  lang: LabelLanguage,
): string {
  return severityLabel(severity, lang === "en" ? "en" : "ko");
}

export const NEWFEEDS_UI = {
  brand: { ko: "이란 · NewFeeds", en: "Iran · NewFeeds" },
  brandShort: { ko: "이란", en: "IR" },
  titleAttr: { ko: "이란 지도 이벤트 · NewFeeds", en: "Iran mapped events · NewFeeds" },
  empty: {
    ko: "이란 관련 지도 이벤트가 아직 없습니다.",
    en: "No Iran-linked mapped events yet.",
  },
  loading: { ko: "불러오는 중…", en: "Loading…" },
  feedError: { ko: "피드 오류", en: "Feed error" },
  mappedCount: (n: number, lang: LabelLanguage) =>
    lang === "en" ? `${n} mapped events` : `지도 ${n}건`,
  threatCount: (threat: string, n: number, lang: LabelLanguage) =>
    lang === "en" ? `${threat} · ${n} events` : `${threat} · ${n}건`,
  sourceLine: (short: string, lang: LabelLanguage) =>
    lang === "en" ? `Source: ${short} (MIT) · GitHub` : `출처: ${short} (MIT) · GitHub`,
  hoverHint: {
    ko: "클릭하면 해당 위치로 이동",
    en: "Click to fly to location",
  },
  popupBrand: { ko: "NewFeeds · 이란", en: "NewFeeds · Iran" },
} as const;

export function newfeedsUi(
  key: keyof typeof NEWFEEDS_UI,
  lang: LabelLanguage,
): string {
  const entry = NEWFEEDS_UI[key];
  if (typeof entry === "function") return "";
  return lang === "en" ? entry.en : entry.ko;
}

/** 뉴스 스트림 카드 — NewFeeds Iran 항목만 KO 치환 */
export function displayNewsItemTitle(
  item: { title: string; category?: string | null; source?: string | null },
  lang: LabelLanguage,
): string {
  const fromNewfeeds =
    item.category === "NewFeeds Iran" ||
    (typeof item.source === "string" && /NewFeeds/i.test(item.source));
  if (fromNewfeeds) return localizeNewfeedsTitle(item.title, lang);
  return item.title;
}

