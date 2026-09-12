/**
 * 귀중한 속보 양피지 — **신속·위중** 히어로만.
 * 등불과 동일한 펼침+타전 사운드. 세션당 hero id 1회.
 * 한글 모드: 본문·골격 문장 무조건 한국어 + 전장 fly-to.
 * 출처는 하단 고정 표기.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  deepenSummaryForFlash,
  ensureFlashCopyKorean,
} from "@/lib/news/breakingFlashCopy";
import {
  detectSupplyChainLinks,
  extractFlashActors,
  FLASH_KINETIC_RE,
  FLASH_SOFT_EXCLUDE_RE,
  buildFlashCausalEssay,
  isIranRelatedBreakingText,
} from "@/lib/news/breakingFlashNarrative";
import type { HeroBreakingItem, NewsStreamPayload, NewsTheater } from "@/lib/news/types";
import { S_GRADE_MIN } from "@/lib/news/breakingGrade";
import {
  isChokepointEconomyNews,
  isChokepointSecurityNews,
} from "@/lib/news/chokepointNews";

export { isIranRelatedBreakingText };

export type BreakingFlashBriefing = {
  id: string;
  title: string;
  paragraphs: string[];
  link?: string;
  mode: "conflict" | "economy";
  /** 타전 시 지도 fly 대상 */
  theater: NewsTheater;
  /** 하단 출처 표기 (매체·시각) */
  sourceAttribution: string;
  /**
   * 타전 깔개.
   * dark=지정학 등불 · cheer=지경학 등불 · morse=깔개 없이 모스만(중립·애매).
   */
  dispatchBed: "dark" | "cheer" | "morse";
};

/** 신속 속보 — 이보다 오래된 기사는 타전하지 않음 */
export const FLASH_MAX_AGE_MINUTES = 45;
/** A급 예외는 더 짧은 창만 */
export const FLASH_A_MAX_AGE_MINUTES = 25;

const ECON_STRESS_FLASH_RE =
  /\b(hormuz|suez|malacca|red\s?sea|freight|tanker|embargo|default|bankrupt|record\s?crash|selloff|plunge)\b|호르무즈|수에즈|홍해|운임|봉쇄|디폴트|폭락|급락/i;

/**
 * 지경학 긴급타전 — 국제·거시·공급망에 실제로 닿는 속보만.
 * 지정학과 같은 S/A·시간창 체계를 쓰되, 주제 필터가 더 빡세다.
 * (grade만으로 전부 열지 않음)
 */
const GEOECON_CENTRAL_BANK_RE =
  /\b(federal\s?reserve|fomc|fed\b|ecb|boj|pboc|bank\s?of\s?england|bank\s?of\s?korea|rbi\b|rate\s?hike|rate\s?cut|policy\s?rate|interest\s?rate|quantitative\s?(?:easing|tightening)|qe\b|qt\b)\b|연준|FOMC|금리\s?(?:인상|인하|동결)|기준금리|유럽중앙은행|영란은행|한국은행|인민은행|양적\s?(?:완화|긴축)/i;

const GEOECON_COMMODITY_RE =
  /\b(oil|crude|brent|wti|lng|opec|gold\b|copper|wheat|soy|lithium|nickel|iron\s?ore|coal\b|nat(?:ural)?\s?gas|commodity)\b|원유|유가|브렌트|LNG|OPEC|금\s?값|구리|밀\b|대두|리튬|니켈|철광|석탄|원자재|원자재\s?가격/i;

const GEOECON_CORPORATE_RE =
  /\b(earnings|guidance|profit\s?warning|m&a|merger|acquisition|ipo\b|bankrupt|insolvency|layoff|capex|tsmc|nvidia|samsung|hynix|asml|apple|microsoft|amazon|google|meta|tesla|aramco|exxon|saudi)\b|실적|가이던스|어닝|인수합병|파산|감원|설비투자|엔비디아|삼성전자|하이닉스|대만적체|애플/i;

const GEOECON_TRADE_MACRO_RE =
  /\b(tariff|sanction|export\s?control|wto\b|recession|inflation|cpi\b|ppi\b|gdp\b|sovereign\s?debt|bank\s?run|svb\b|credit\s?crunch|dollar\b|yuan\b|yen\b|fx\b|devaluat|chips?\s?act|bri\b|belt\s?and\s?road|supply\s?chain)\b|관세|제재|수출\s?통제|경기침체|물가|인플레이션|GDP|국채|뱅크런|환율|평가절하|공급망|일대일로|반도체법/i;

/** 지경학 타전 주제 적격 — 초크·원자재·연준·거시·대형 기업·공급망 */
export function isGeoeconomicImpactFlash(text: string): boolean {
  if (!text.trim()) return false;
  if (isChokepointEconomyNews(text)) return true;
  if (ECON_STRESS_FLASH_RE.test(text)) return true;
  if (GEOECON_CENTRAL_BANK_RE.test(text)) return true;
  if (GEOECON_COMMODITY_RE.test(text)) return true;
  if (GEOECON_CORPORATE_RE.test(text)) return true;
  if (GEOECON_TRADE_MACRO_RE.test(text)) return true;
  if (detectSupplyChainLinks(text).length > 0) return true;
  return false;
}

/** 사건 유형 — 우선순위 높은 것부터 */
export type EconFlashClass =
  | "transit"
  | "policy"
  | "credit"
  | "corporate"
  | "price_only"
  | "unknown";

export type EconFlashPolarity = "ease" | "stress" | "mixed" | "none";

export type EconFlashClassification = {
  eventClass: EconFlashClass;
  polarity: EconFlashPolarity;
};

const TRANSIT_RE =
  /\b(hormuz|suez|malacca|bab[\s-]?el|red\s?sea|taiwan\s?strait|chokepoint|blockade|shipping\s?lane|war[\s-]?risk|tanker\s?(?:attack|hit|struck)|piracy|corridor)\b|호르무즈|수에즈|말라카|홍해|대만\s?해협|초크|봉쇄|항로|전쟁위험|유조선\s?(?:피격|공격)|회랑/i;

const POLICY_RE =
  /\b(federal\s?reserve|fomc|fed\b|ecb|boj|pboc|rate\s?hike|rate\s?cut|sanction|embargo|tariff|export\s?control|entity\s?list|qe\b|qt\b|easing|tightening)\b|연준|FOMC|금리|제재|금수|관세|수출\s?통제|양적\s?(?:완화|긴축)|완화|긴축/i;

const CREDIT_RE =
  /\b(default|bankrupt|insolvency|bank\s?run|credit\s?crunch|sovereign\s?debt|svb\b|recession)\b|디폴트|파산|뱅크런|신용경색|국채|침체/i;

const CORPORATE_RE =
  /\b(earnings|guidance|profit\s?warning|profit\s?beat|beat(?:s|en)?\s?estimates|miss(?:es|ed)?\s?estimates|m&a|merger|acquisition|layoff|ipo\b)\b|실적|가이던스|어닝|호실적|쇼크|인수합병|감원/i;

const ENERGY_PRICE_RE =
  /\b(oil|crude|brent|wti|lng|bunker|nat(?:ural)?\s?gas|opec)\b|원유|유가|브렌트|LNG|벙커|천연가스|OPEC/i;

const FREIGHT_PRICE_RE =
  /\b(freight|shipping\s?rate|container\s?rate|baltic|bunker\s?price)\b|운임|해운\s?운임|컨테이너\s?운임/i;

const GOLD_PRICE_RE =
  /\b(gold\b|bullion|safe[\s-]?haven)\b|금\s?값|금값|안전자산/i;

const PRICE_UP_RE =
  /\b(surg(?:e|es|ed|ing)|soar(?:s|ed|ing)?|spik(?:e|es|ed|ing)|rall(?:y|ies|ied)|jump(?:s|ed|ing)?|climb(?:s|ed|ing)?|record\s?high|all[\s-]?time\s?high|ris(?:e|es|ing)|gain(?:s|ed|ing)?)\b|급등|상승|스파이크|최고치|뛴/i;

const PRICE_DOWN_RE =
  /\b(plung(?:e|es|ed|ing)|crash(?:es|ed|ing)?|slump(?:s|ed|ing)?|tumbl(?:e|es|ed|ing)|falls?|drop(?:s|ped|ping)?|declin(?:e|es|ed|ing)|sell[\s-]?off)\b|급락|폭락|하락|매도/i;

const EASE_RE =
  /\b(reopen(?:s|ed|ing)?|ceasefire|relief|waive|pause|de[\s-]?escalate|safe\s?passage|corridor\s?open|rate\s?cut|easing|beat(?:s|en)?\s?estimates|profit\s?beat|guidance\s?raise|deal\s?struck|recovery|optimistic)\b|재개|휴전|완화|유예|금리\s?인하|호실적|가이던스\s?상향|합의|회복|낙관/i;

const STRESS_RE =
  /\b(blockade|disrupted?|disruption|attack|strike|war[\s-]?risk|sanction|embargo|tariff\s?hike|rate\s?hike|tightening|default|bankrupt|bank\s?run|credit\s?crunch|miss(?:es|ed)?\s?estimates|profit\s?warning|layoff|fear|risk[\s-]?off|closed?|halt(?:ed|s)?)\b|봉쇄|차질|중단|피습|공습|전쟁위험|제재|금수|관세\s?인상|금리\s?인상|긴축|디폴트|파산|뱅크런|어닝\s?쇼크|가이던스\s?하향|감원|공포|폐쇄|중단/i;

function detectEventClass(text: string): EconFlashClass {
  if (TRANSIT_RE.test(text) || isChokepointEconomyNews(text)) return "transit";
  if (POLICY_RE.test(text)) return "policy";
  if (CREDIT_RE.test(text)) return "credit";
  if (CORPORATE_RE.test(text)) return "corporate";
  if (
    ENERGY_PRICE_RE.test(text) ||
    FREIGHT_PRICE_RE.test(text) ||
    GOLD_PRICE_RE.test(text) ||
    GEOECON_COMMODITY_RE.test(text)
  ) {
    return "price_only";
  }
  return "unknown";
}

function detectPolarity(text: string, eventClass: EconFlashClass): EconFlashPolarity {
  // 가격-only: 방향은 가격 동사로 (유형 전용). 그 외는 ease/stress 키워드.
  if (eventClass === "price_only") {
    const up = PRICE_UP_RE.test(text);
    const down = PRICE_DOWN_RE.test(text);
    if (up && down) return "mixed";
    if (up) return "stress"; // 수요국 가중: 에너지·운임·금 상승은 스트레스로 취급할 재료
    if (down) return "ease";
    return "none";
  }

  const ease = EASE_RE.test(text);
  const stress = STRESS_RE.test(text);
  if (ease && stress) return "mixed";
  if (ease) return "ease";
  if (stress) return "stress";
  return "none";
}

/**
 * 지경학 긴급타전 — 사건 유형 + 방향.
 * 가격 형용사는 price_only에서만 방향을 좌우한다.
 */
export function classifyEconomyFlash(text: string): EconFlashClassification {
  const eventClass = detectEventClass(text);
  const polarity = detectPolarity(text, eventClass);
  return { eventClass, polarity };
}

/**
 * 수요·제조·통행 다수(이타) 렌즈.
 * 유가↑ = 산유 호재+수요 악재 → 순가중 dark.
 */
function bedFromDemandWeightedLens(
  eventClass: EconFlashClass,
  polarity: EconFlashPolarity,
  text: string,
): "dark" | "cheer" | "morse" {
  // 중립·애매·혼재 → 깔개 없이 모스만
  if (polarity === "mixed" || polarity === "none") return "morse";

  switch (eventClass) {
    case "transit":
      return polarity === "ease" ? "cheer" : "dark";
    case "policy": {
      return polarity === "ease" ? "cheer" : "dark";
    }
    case "credit":
      return polarity === "ease" ? "cheer" : "dark";
    case "corporate":
      return polarity === "ease" ? "cheer" : "dark";
    case "price_only": {
      if (GOLD_PRICE_RE.test(text) && polarity === "stress") return "dark";
      if (GOLD_PRICE_RE.test(text) && polarity === "ease") return "cheer";
      if (
        (ENERGY_PRICE_RE.test(text) || FREIGHT_PRICE_RE.test(text)) &&
        polarity === "stress"
      ) {
        return "dark";
      }
      if (
        (ENERGY_PRICE_RE.test(text) || FREIGHT_PRICE_RE.test(text)) &&
        polarity === "ease"
      ) {
        return "cheer";
      }
      return polarity === "ease" ? "cheer" : "dark";
    }
    case "unknown":
    default:
      return "morse";
  }
}

/**
 * 지경학 긴급타전 깔개.
 * 호재 cheer · 악재 dark · 중립/애매 morse(모스만).
 */
export function resolveEconomyFlashBed(text: string): "dark" | "cheer" | "morse" {
  const { eventClass, polarity } = classifyEconomyFlash(text);
  return bedFromDemandWeightedLens(eventClass, polarity, text);
}

/** 지정학 사건 유형 — 우선순위 높은 것부터 */
export type ConflictFlashClass =
  | "nuclear"
  | "kinetic"
  | "blockade"
  | "diplomacy"
  | "posture"
  | "unknown";

export type ConflictFlashClassification = {
  eventClass: ConflictFlashClass;
  polarity: EconFlashPolarity;
};

const CONFLICT_NUCLEAR_RE =
  /\b(nuclear|warhead|tactical\s?nuke|icbm|hypersonic|nuclear\s?alert|defcon)\b|핵|전술핵|핵탄두|ICBM|핵경보/i;

const CONFLICT_KINETIC_RE =
  /\b(airstrike(?:s)?|missile(?:s)?|artillery|bombard(?:s|ed|ing|ment)?|invasion|massacre|genocide|shelling|drone\s?strike(?:s)?|offensive|assassinate|killed|casualt(?:y|ies)?)\b|공습|미사일|포격|폭격|침공|학살|드론\s?타격|공세|암살|사망|사상/i;

const CONFLICT_BLOCKADE_RE =
  /\b(blockade|seal(?:ed|ing)?\s?off|siege|no[\s-]?fly|closed\s?strait|maritime\s?exclusion)\b|봉쇄|포위|통항\s?금지|해협\s?폐쇄|비행금지/i;

const CONFLICT_DIPLOMACY_RE =
  /\b(ceasefire|truce|peace\s?deal|withdrawal|talks?|negotiat|summit|deal\s?struck|hostage\s?release|de[\s-]?escalat|stand[\s-]?down)\b|휴전|정전|철군|협상|회담|합의|인질\s?석방|긴장\s?완화|철수/i;

const CONFLICT_POSTURE_RE =
  /\b(drill|exercise|deployment|carrier\s?strike|troop\s?buildup|mobiliz)\b|훈련|배치|항모|병력\s?증강|동원/i;

const CONFLICT_EASE_RE =
  /\b(ceasefire|truce|peace\s?deal|withdrawal|reopen(?:s|ed|ing)?|corridor\s?(?:open|safe)|blockade\s?lifted|hostage\s?release|de[\s-]?escalat|stand[\s-]?down|arms\s?control|deal\s?struck|talks?\s?resume|forces?\s?return)\b|휴전|정전|철군|재개|인도적\s?회랑|봉쇄\s?해제|인질\s?석방|긴장\s?완화|철수|군축|합의|협상\s?재개|병력\s?복귀/i;

const CONFLICT_STRESS_RE =
  /\b(airstrike(?:s)?|missile(?:s)?|invasion|massacre|bombard(?:s|ed|ing|ment)?|shelling|blockade(?!\s+lifted)|ultimatum|talks?\s?collapse|escalat(?:e|es|ed|ing|ion)?|offensive|assassinate|nuclear|warhead|siege|killed|casualt(?:y|ies)?)\b|공습|미사일|침공|학살|포격|봉쇄(?!\s*해제)|최후통첩|협상\s?결렬|확전|공세|암살|핵|포위|사망|사상/i;

function detectConflictEventClass(text: string): ConflictFlashClass {
  if (CONFLICT_NUCLEAR_RE.test(text)) return "nuclear";
  if (CONFLICT_KINETIC_RE.test(text)) return "kinetic";
  if (CONFLICT_BLOCKADE_RE.test(text) || isChokepointSecurityNews(text)) {
    return "blockade";
  }
  if (CONFLICT_DIPLOMACY_RE.test(text)) return "diplomacy";
  if (CONFLICT_POSTURE_RE.test(text)) return "posture";
  return "unknown";
}

function detectConflictPolarity(
  text: string,
  eventClass: ConflictFlashClass,
): EconFlashPolarity {
  const ease = CONFLICT_EASE_RE.test(text);
  const stress = CONFLICT_STRESS_RE.test(text);

  // 키네틱·핵: 승전/타격 성공 뉴스는 cheer 금지 — stress만 인정, ease는 외교 병기만
  if (eventClass === "kinetic" || eventClass === "nuclear") {
    if (stress && ease) return "mixed";
    if (stress) return "stress";
    if (ease && eventClass === "nuclear") return "ease";
    // 키네틱으로 분류됐으면 형용사 없어도 악화로 본다
    if (eventClass === "kinetic") return "stress";
    return "none";
  }

  if (ease && stress) return "mixed";
  if (ease) return "ease";
  if (stress) return "stress";
  return "none";
}

/**
 * 지정학 긴급타전 — 사건 유형 + 방향.
 * 렌즈: 민간·확전·억지 안정 (승전 환호 금지).
 */
export function classifyConflictFlash(text: string): ConflictFlashClassification {
  const eventClass = detectConflictEventClass(text);
  const polarity = detectConflictPolarity(text, eventClass);
  return { eventClass, polarity };
}

function bedFromSecurityLens(
  eventClass: ConflictFlashClass,
  polarity: EconFlashPolarity,
): "dark" | "cheer" | "morse" {
  // 중립·애매·혼재 → 깔개 없이 모스만
  if (polarity === "mixed" || polarity === "none") return "morse";

  switch (eventClass) {
    case "kinetic":
      // 키네틱은 기본적으로 dark. ease만으로 cheer 주지 않음.
      return "dark";
    case "nuclear":
      return polarity === "ease" ? "cheer" : "dark";
    case "blockade":
      return polarity === "ease" ? "cheer" : "dark";
    case "diplomacy":
      return polarity === "ease" ? "cheer" : "dark";
    case "posture":
      return polarity === "ease" ? "cheer" : "dark";
    case "unknown":
    default:
      return "morse";
  }
}

/**
 * 지정학 긴급타전 깔개.
 * 확전·키네틱 → dark · 휴전·회랑 등 진정 → cheer · 애매 → morse.
 */
export function resolveConflictFlashBed(text: string): "dark" | "cheer" | "morse" {
  const { eventClass, polarity } = classifyConflictFlash(text);
  return bedFromSecurityLens(eventClass, polarity);
}

/** 세션 중 이미 타전한 귀중 속보 id — 동일 기사 재타전 방지 */
const claimedFlashIds = new Set<string>();
let lastClaimedFlashId: string | null = null;

export function claimBreakingFlash(id: string): boolean {
  if (!id || claimedFlashIds.has(id)) return false;
  claimedFlashIds.add(id);
  lastClaimedFlashId = id;
  return true;
}

export function wasBreakingFlashClaimed(id: string): boolean {
  return Boolean(id) && claimedFlashIds.has(id);
}

/** 티커 SOS와 양피지 중복 방지용 */
export function peekBreakingFlashClaim(): string | null {
  return lastClaimedFlashId;
}

function formatAgeShort(ageMinutes: number | undefined, ko: boolean): string | null {
  if (ageMinutes == null || !Number.isFinite(ageMinutes)) return null;
  const m = Math.max(0, Math.round(ageMinutes));
  if (ko) {
    if (m < 1) return "방금";
    if (m < 60) return `약 ${m}분 전`;
    return `약 ${Math.round(m / 60)}시간 전`;
  }
  if (m < 1) return "just now";
  if (m < 60) return `~${m} min ago`;
  return `~${Math.round(m / 60)}h ago`;
}

export function formatFlashSourceAttribution(
  hero: HeroBreakingItem,
  lang: LabelLanguage,
): string {
  const ko = lang !== "en";
  const outlet =
    (hero.publisher || hero.source || "").trim() || (ko ? "미상 매체" : "Unknown outlet");
  const age = formatAgeShort(hero.ageMinutes, ko);
  if (ko) {
    return age ? `출처: ${outlet} · 보도 ${age}` : `출처: ${outlet}`;
  }
  return age ? `Source: ${outlet} · ${age}` : `Source: ${outlet}`;
}

/**
 * 신속·위중 속보만 타전.
 * - 지정학: **S급**이어도 키네틱 또는 초크만 (grade만으로 열지 않음). A급은 핵·침공·공습 등 + grade≥8 + 더 짧은 시간창.
 * - 지경학: 같은 S/A·시간창이지만 **국제 지경학 영향** 주제만 (연준·원자재·초크·대형기업·거시·공급망).
 * - 연예·스포츠·사설 제외. **45분** 초과 제외 (신속 속보).
 * - Tier3 단독은 S 미만 불가.
 * - 공급망과의 연결은 별도 양피지가 아니라 본문 「공급망과의 연결」 단락으로만 붙인다.
 */
export function shouldOpenBreakingFlash(
  hero: HeroBreakingItem | null | undefined,
  preferEconomy: boolean,
): boolean {
  if (!hero?.id) return false;
  const grade = hero.breakingGrade ?? 0;
  const rank = hero.breakingRank;
  const age = typeof hero.ageMinutes === "number" ? hero.ageMinutes : 999;
  if (age > FLASH_MAX_AGE_MINUTES) return false;

  const blob = `${hero.title} ${hero.summary ?? ""}`;
  if (FLASH_SOFT_EXCLUDE_RE.test(blob)) return false;

  const iranKinetic =
    isIranRelatedBreakingText(blob) && FLASH_KINETIC_RE.test(blob);

  // Tier3 단독은 원래 S 미만 불가(상한 7). 이란 키네틱만 A급(≥7) 예외.
  if (hero.trustTier === 3 && grade < S_GRADE_MIN) {
    if (
      !(
        iranKinetic &&
        rank === "A" &&
        grade >= 7 &&
        age <= FLASH_A_MAX_AGE_MINUTES
      )
    ) {
      return false;
    }
  }

  if (preferEconomy || hero.feedTopic === "economy") {
    // 지정학과 동일 등급 창 — 주제만 지경학 영향력으로 좁힘
    if (rank === "S") {
      return isGeoeconomicImpactFlash(blob);
    }
    if (
      rank === "A" &&
      grade >= 8 &&
      age <= FLASH_A_MAX_AGE_MINUTES &&
      isGeoeconomicImpactFlash(blob)
    ) {
      return true;
    }
    return false;
  }

  // 정세 — 신속·위중만 (S급도 키네틱·초크 필수; grade만으로 미시 기사 타전 금지)
  if (rank === "S") {
    return FLASH_KINETIC_RE.test(blob) || isChokepointSecurityNews(blob);
  }
  // A급: 키네틱 + 더 짧은 창 (이란 Tier3는 grade≥7 허용)
  const aGradeMin = iranKinetic && hero.trustTier === 3 ? 7 : 8;
  if (
    rank === "A" &&
    grade >= aGradeMin &&
    age <= FLASH_A_MAX_AGE_MINUTES &&
    FLASH_KINETIC_RE.test(blob)
  ) {
    return true;
  }
  return false;
}

/**
 * 전역 hero + flashHeroes(전선별 보조) 중
 * 아직 타전하지 않은 최고 등급 후보를 고른다.
 */
export function pickNextBreakingFlashHero(
  payload: Pick<NewsStreamPayload, "hero" | "flashHeroes"> | null | undefined,
  preferEconomy: boolean,
): HeroBreakingItem | null {
  if (!payload) return null;
  const seen = new Set<string>();
  const candidates: HeroBreakingItem[] = [];
  for (const h of [payload.hero, ...(payload.flashHeroes ?? [])]) {
    if (!h?.id || seen.has(h.id)) continue;
    seen.add(h.id);
    candidates.push(h);
  }

  let best: HeroBreakingItem | null = null;
  for (const h of candidates) {
    if (wasBreakingFlashClaimed(h.id)) continue;
    if (!shouldOpenBreakingFlash(h, preferEconomy)) continue;
    if (
      !best ||
      (h.breakingGrade ?? 0) > (best.breakingGrade ?? 0) ||
      ((h.breakingGrade ?? 0) === (best.breakingGrade ?? 0) &&
        (h.ageMinutes ?? 999) < (best.ageMinutes ?? 999))
    ) {
      best = h;
    }
  }
  return best;
}

export function buildBreakingFlashBriefing(
  hero: HeroBreakingItem,
  lang: LabelLanguage,
  preferEconomy: boolean,
  opts?: { title?: string; summary?: string },
): BreakingFlashBriefing {
  const ko = lang !== "en";
  const economy = preferEconomy || hero.feedTopic === "economy";
  const titleText = (opts?.title ?? hero.title).replace(/\s+/g, " ").trim();
  const summaryRaw = opts?.summary ?? hero.summary;
  const blob = `${titleText} ${summaryRaw ?? ""}`;

  const kicker = economy
    ? ko
      ? "지경학 신속 속보"
      : "Geoeconomic flash"
    : ko
      ? "정세 신속 속보"
      : "Situation flash";

  const actors = extractFlashActors(blob, lang);
  const body = deepenSummaryForFlash(summaryRaw, titleText, lang);

  const gradeLine =
    hero.breakingRank != null
      ? ko
        ? `관측 메모: 등급 ${hero.breakingRank} · 내부 ${hero.breakingGrade ?? "—"} (자동 순위, 최종 진실이 아님)`
        : `Desk note: rank ${hero.breakingRank} · grade ${hero.breakingGrade ?? "—"} (automated—not final truth)`
      : null;

  const essay = buildFlashCausalEssay({
    title: titleText,
    summary: body,
    theater: hero.theater,
    lang,
    economy,
    actors,
    ageMinutes: hero.ageMinutes,
    source: hero.source,
    trustTier:
      hero.trustTier === 1 || hero.trustTier === 2 || hero.trustTier === 3
        ? hero.trustTier
        : undefined,
  });

  const paragraphs =
    gradeLine && essay.length > 0
      ? [...essay.slice(0, -1), `${essay[essay.length - 1]} ${gradeLine}`]
      : essay.filter((p) => p.trim().length > 0);

  return {
    id: hero.id,
    title: `${kicker}\n${titleText}`,
    paragraphs,
    link: hero.link,
    mode: economy ? "economy" : "conflict",
    theater: hero.theater,
    sourceAttribution: formatFlashSourceAttribution(hero, lang),
    dispatchBed: economy
      ? resolveEconomyFlashBed(blob)
      : resolveConflictFlashBed(blob),
  };
}

/** 한글 UI — 번역 후 타전 브리핑 생성 */
export async function buildBreakingFlashBriefingForLang(
  hero: HeroBreakingItem,
  lang: LabelLanguage,
  preferEconomy: boolean,
): Promise<BreakingFlashBriefing> {
  if (lang === "en") {
    return buildBreakingFlashBriefing(hero, lang, preferEconomy);
  }
  const { title, summary } = await ensureFlashCopyKorean({
    title: hero.title,
    summary: hero.summary,
  });
  return buildBreakingFlashBriefing(hero, "ko", preferEconomy, {
    title,
    summary,
  });
}
