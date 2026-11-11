import { issuerNameKo } from "@/lib/countryName";
import { mediaByHost, type MediaOwnership } from "@/lib/news/mediaRegistry";
import { officialSiteFromHost } from "@/lib/officialSites";
import type { MediaTrustTier } from "@/lib/news/types";

/**
 * 분류 원칙(국적 불문 동일 적용):
 * - Tier 1: 정부로부터 편집적으로 독립된 와이어·언론. 자국 정부에 비판적인 독립·망명 매체도
 *   포함(예: Meduza, The Moscow Times — 러시아 국적이지만 크렘린 편집통제 밖).
 * - Tier 2: 실제 취재하되 편향 논란이 있는 매체.
 * - Tier 3: 정부·군 공보실 발표 / 국영 방송 / 국영 통신사 — 국적 불문 동일 취급.
 *   즉 CENTCOM·DoD도 TASS·신화·조선중앙통신과 원칙적으로 동급(당사자 발표)으로 본다.
 *
 * "국영이면 무조건 Tier3"는 아니다 — 국영이지만 편집 독립성 논쟁이 있는 애매한 경계
 * (예: Ukrinform, Yonhap)는 PRESS_FREEDOM_REFERENCE(하단, RSF 등 언론자유지수 참고
 * 정적 표 · 연 1회 수동 갱신)를 기준으로 판단한다. 라이브 API 연동 아님 — 대상국이
 * 몇 개국으로 고정돼 있고 순위가 자주 안 바뀌어서 실시간 연동은 과함.
 */
export const PRESS_FREEDOM_REFERENCE: Record<string, "free" | "partly-free" | "not-free"> = {
  US: "free",
  GB: "free",
  KR: "free", // Yonhap — 국가기간통신사지만 편집 독립성 인정
  UA: "partly-free", // Ukrinform — 전시 제약 있으나 국가 직접통제형 매체와는 다름
  RU: "not-free",
  CN: "not-free",
  IR: "not-free",
  KP: "not-free",
};

/** Tier 1 — 정부와 편집적으로 독립된 와이어 서비스·주요 언론 (국적 불문) */
const TIER1_SOURCE = [
  "reuters",
  "associated press",
  "ap news",
  "afp",
  "agence france",
  "dpa",
  "efe",
  "ansa",
  "pti",
  "yonhap",
  "ytn",
  "연합뉴스",
  "bbc",
  "washington post",
  "wsj",
  "wall street journal",
  "nyt",
  "new york times",
  "guardian",
  "bloomberg",
  "cnbc",
  "financial times",
  "imf",
  "world bank",
  "kyiv independent",
  "kyiv post",
  "ukrinform",
  "the moscow times",
  "meduza",
  "mediazona",
];

/**
 * Tier 2 — verified but bias controversies. 여기엔 민간 OSINT·안보연구소도 포함(국적 불문,
 * 정부 소속이 아니지만 자금줄·논조 편향 논란이 있는 곳들 — 언론사와 동일 기준 적용).
 */
const TIER2_SOURCE = [
  "cnn",
  "al jazeera",
  "the hindu",
  "times of india",
  "anadolu",
  "fox news",
  "times of israel",
  "jerusalem post",
  "haaretz",
  "ynet",
  "n12",
  "mako",
  "walla",
  "the national",
  "drop site",
  "breaking def",
  "military times",
  "war on rocks",
  "long war",
  "ukrainska pravda",
  "nv",
  "google news",
  "cnbc",
  "financial times",
  // 민간 OSINT·안보연구소 (국적 불문)
  "bellingcat",
  "isw",
  "institute for the study of war",
  "al-monitor",
  "al monitor",
  "the cradle",
  "chatham house",
  "crisis group",
  "international crisis group",
  "oryx",
  "the war zone",
  "twz.com",
  "carnegie",
  "janes",
  "iiss",
  // CRINK 허브 전문 (연구소·OSINT — Tier2)
  "38 north",
  "38north",
  "beyond parallel",
  "csis",
  "amti",
  "chinapower",
  "china power",
  "jamestown",
  "aspi",
  "critical threats",
  "criticalthreats",
  "isis-online",
  "wisconsin project",
  "washington institute",
  "nk news",
  "nknews",
  "iran international",
  "iranintl",
  "russia matters",
  "russiamatters",
];

/**
 * Tier 3 — 정부/군 공보실 발표 · 국영 방송 · 국영 통신사(당사자 발표, 속보 신호로만 참고).
 * 국적 불문 동일 기준 — 미군 CENTCOM·DoD도 TASS·신화·조선중앙통신과 원칙적으로 동급.
 */
const TIER3_SOURCE = [
  "presstv",
  "irna",
  "fars news",
  "tasnim",
  "xinhua",
  "cctv",
  "people's daily",
  "tass",
  "rt",
  "rt.com",
  "kcna",
  "sputnik",
  "global times",
  "china daily",
  "centcom",
  "dod",
  "defense.gov",
  "u.s. department of defense",
];

function normalizeKey(value: string): string {
  return value.toLowerCase().trim();
}

function matchesAny(haystack: string, needles: string[]): boolean {
  const key = normalizeKey(haystack);
  return needles.some((needle) => key.includes(normalizeKey(needle)));
}

export function extractHostname(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function classifyMediaTier(source: string, link = ""): MediaTrustTier {
  const host = extractHostname(link);

  // 1) 주소가 확실한 경우: 정부·군·기구 공식 도메인, 그리고 등록된 매체 도메인. 이름 조각보다 먼저 본다.
  const official = officialSiteFromHost(host);
  if (official) return 3;
  const registered = mediaByHost(host);
  if (registered) return registered.tier;

  // 2) 주소가 목록에 없으면 매체 이름으로만 본다. 주소·경로 안의 단어는 보지 않는다
  //    ("reuters.com.fake.example"나 "/reuters/" 경로에 속지 않는다).
  const blob = source;
  if (matchesAny(blob, TIER3_SOURCE)) return 3;
  if (matchesAny(blob, TIER1_SOURCE)) return 1;
  if (matchesAny(blob, TIER2_SOURCE)) return 2;

  // Unknown outlet from Google News aggregation → conservative Tier 2
  if (/google\.com/i.test(host) || /news\.google/i.test(source)) return 2;

  return 2;
}

export const TIER_LABELS: Record<MediaTrustTier, string> = {
  1: "Tier 1 · 확인 매체",
  2: "Tier 2 · 보완 매체",
  3: "Tier 3 · 당사자 입장",
};

export const ECONOMY_TIER_LABELS: Record<
  MediaTrustTier,
  { label: string; detail: string; labelEn: string; detailEn: string }
> = {
  1: {
    label: "공식·와이어",
    detail: "Reuters · WSJ · FT · IMF · BBC",
    labelEn: "Official / wire",
    detailEn: "Reuters · WSJ · FT · IMF · BBC",
  },
  2: {
    label: "시장 매체",
    detail: "CNBC · Google · 기업·산업 RSS",
    labelEn: "Market press",
    detailEn: "CNBC · Google · industry RSS",
  },
  3: {
    label: "미확인 속보",
    detail: "참고용",
    labelEn: "Unverified",
    detailEn: "For reference",
  },
};

export type MediaProfile = {
  tier: MediaTrustTier;
  /** 정부·군·기구 공식 사이트이거나 등록된 매체일 때 그 성격. 모르면 null. */
  ownership: MediaOwnership | "government" | "military" | "organization" | null;
  countryCode: string | null;
  /** 화면에 붙일 짧은 말. 예: "러시아 국영", "미국 정부 발표". 알 수 없으면 null. */
  label: string | null;
};

const OWNERSHIP_KO: Record<NonNullable<MediaProfile["ownership"]>, string> = {
  wire: "통신사",
  independent: "민간 언론",
  public: "공영 매체",
  state: "국영",
  party: "정파·무장단체 계열",
  osint: "OSINT",
  "think-tank": "연구소",
  government: "정부 1차 원문",
  military: "군 1차 원문",
  organization: "기구 1차 원문",
};

/** 매체·사이트의 성격을 화면용으로 풀어 준다. 이름만 있고 주소가 없으면 라벨을 지어내지 않는다. */
export function describeMedia(source: string, link = ""): MediaProfile {
  const tier = classifyMediaTier(source, link);
  const host = extractHostname(link);
  const official = officialSiteFromHost(host);
  if (official) {
    const name = issuerNameKo(official.issuerId);
    const label = official.kind === "organization" ? `${name} ${OWNERSHIP_KO.organization}` : `${name} ${OWNERSHIP_KO[official.kind]}`;
    return { tier, ownership: official.kind, countryCode: official.kind === "organization" ? null : official.issuerId, label };
  }
  const registered = mediaByHost(host);
  if (registered) {
    const prefix = registered.country && (registered.ownership === "state" || registered.ownership === "party") ? `${issuerNameKo(registered.country)} ` : "";
    return { tier, ownership: registered.ownership, countryCode: registered.country, label: `${prefix}${OWNERSHIP_KO[registered.ownership]}` };
  }
  return { tier, ownership: null, countryCode: null, label: null };
}
