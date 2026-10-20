/**
 * 귀중한 속보 양피지 — **신속·위중** 히어로만.
 * 등불과 동일한 펼침+타전 사운드. 세션당 hero id 1회.
 * 한글 모드: 본문·골격 문장 무조건 한국어 + 전장 fly-to.
 * 출처는 하단 고정 표기.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import { isMostlyEnglish } from "@/lib/koreanTranslate";
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

export { FLASH_KINETIC_RE, FLASH_SOFT_EXCLUDE_RE };
import { resolveRssFlashPlace } from "@/lib/news/rssFlashPlace";
import type { HeroBreakingItem, NewsStreamPayload, NewsTheater } from "@/lib/news/types";
import { S_GRADE_MIN } from "@/lib/news/breakingGrade";
import {
  isChokepointEconomyNews,
  isChokepointSecurityNews,
} from "@/lib/news/chokepointNews";
import { isEnergySupplyChainFlash } from "@/lib/news/energySupplyFlash";
import { hasLampPhoto } from "@/lib/news/lampThumbnail";
import {
  buildSummitDiplomacyParagraphs,
  extractSummitDiplomacyMeta,
  isSummitDiplomacyText,
} from "@/lib/news/summitDiplomacyFlash";
import { SHOW_INVESTMENT_UI } from "@/lib/investmentUi";

export { isIranRelatedBreakingText };

export type BreakingFlashBriefing = {
  id: string;
  title: string;
  paragraphs: string[];
  link?: string;
  mode: "conflict" | "economy";
  /** 타전 시 지도 fly 대상 (버튼으로만) */
  theater: NewsTheater;
  /** 하단 출처 표기 (매체·시각) */
  sourceAttribution: string;
  /**
   * 타전 깔개.
   * dark=지정학 등불 · cheer=지경학 등불 · morse=깔개 없이 모스만(중립·애매).
   */
  dispatchBed: "dark" | "cheer" | "morse";
  imageUrl?: string;
  /** 사진이 여러 장일 때 전체 (첫 장이 imageUrl) */
  imageUrls?: string[];
  videoUrl?: string;
  /** 수동 「위치로 가기」. RSS는 도시·마을 지명, Liveuamap은 피드 좌표. */
  coords?: { lat: number; lng: number };
  /**
   * 「위치로 가기」 좌표를 어디서 어떻게 얻었는지 — 정확한 지점인지 대표 도시 추정인지 구분해 표기한다.
   * coords 가 있는데 place 가 없으면 전장 사전(제목 지명) 또는 LIVEUA 피드 좌표다.
   */
  place?: {
    label: string;
    precision: "city" | "landmark" | "country-rep";
    country?: string;
    from: "title" | "caption" | "summary";
  };
  /** liveuamap이면 피드 좌표를 그대로 쓴다 */
  flashSource?: "rss" | "liveuamap";
  verbatim?: boolean;
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
  if (isPriceThreatInfrastructureFlash(text)) return true;
  return false;
}

/**
 * 유가·곡물·물가에 직접 닿는 인프라 타격
 * (유정·정유·곡창·수출항 — 호르무즈뿐 아니라 우크라↔러 사례 포함).
 */
export const PRICE_THREAT_INFRA_RE =
  /\b(oil\s?(?:field|well|depot|terminal|refiner(?:y|ies)?|storage|facility|rig)|oilfield|refiner(?:y|ies)?|fuel\s?depot|pipeline|lng\s?terminal|gas\s?(?:plant|processing|compressor)|power\s?(?:plant|station|grid)|energy\s?(?:infra|grid|facility)|grain\s?(?:silo|elevator|terminal|export|port)|wheat|flour|corn\s?export|food\s?export|fertilizer|ammonia\s?plant|port\s?(?:of\s?)?(?:odesa|odessa|mykolaiv|novorossiysk)|chornomorsk|kremenchuk|lisichansk|shebelinka)\b|유정|유전|정유(?:소|공장)?|유류\s?저장|연료\s?저장|송유관|가스\s?(?:플랜트|처리)|발전소|전력망|에너지\s?(?:인프라|시설)|곡물\s?(?:창고|엘리베이터|수출)|밀\b|밀가루|곡창|오데사|미콜라이우|노보로시스크|크레멘추크|리시찬스크|셰벨린카/i;

export function isPriceThreatInfrastructureFlash(text: string): boolean {
  return PRICE_THREAT_INFRA_RE.test(text);
}

/** 우크라·러·흑해 전장 에너지 인프라 타격 — 병목 양피지와 같은 에너지 데스크 후보. */
export const ENERGY_INFRA_THEATER_RE =
  /\b(ukraine|ukrainian|russia|russian|black\s?sea|donbas|donetsk|luhansk|kherson|zaporizh|crimea|belgorod|kursk|bryansk|tuapse|ryazan|novorossiysk|odesa|odessa|mykolaiv|kremenchuk|lisichansk|lysychansk|shebelinka)\b|우크라이나|우크라|러시아|흑해|돈바스|도네츠크|루한스크|헤르손|자포리자|크림|벨고로드|쿠르스크|브랸스크|투압세|랴잔|노보로시스크|오데사|미콜라이우|크레멘추크|리시찬스크|셰벨린카/i;

export const ENERGY_INFRA_KINETIC_RE =
  /\b(strike|struck|hit|attack|bomb(?:ed|ing)?|missile|drone|shahed|explosion|destroyed|damaged|shell(?:ed|ing)?)\b|타격|폭격|피격|공습|미사일|드론|폭발|파괴|손상|포격/i;

export function isUkraineRussiaEnergyInfraStrike(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (!isPriceThreatInfrastructureFlash(t)) return false;
  if (!ENERGY_INFRA_THEATER_RE.test(t)) return false;
  if (!ENERGY_INFRA_KINETIC_RE.test(t)) return false;
  return true;
}

/** 일상 포격·미확인 루틴 — 단독으로는 타전 금지 */
export const FLASH_ROUTINE_SHELLING_RE =
  /\b(routine\s?shelling|daily\s?shelling|artillery\s?duel|sporadic\s?fire|unconfirmed\s?report|according\s?to\s?unverified)\b|일상\s?포격|산발\s?교전|미확인\s?보도|확인되지\s?않은/i;

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
  | "hybrid"
  | "security_threat"
  | "election_integrity"
  | "civil_unrest"
  | "political_emergence"
  | "weapons"
  | "realignment"
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
  /\b(drills?|exercises?|war\s?games?|wargames?|live[\s-]?fire|maneuvers?|manoeuvres?|amphibious\s?(?:landing|assault|exercise)|deployment|carrier\s?strike|troop\s?buildup|mobiliz\w*)\b|훈련|연습|실사격|기동|배치|항모|병력\s?증강|동원/i;

/** 훈련·연습 자체를 가리키는 표현만 (병력 배치·동원은 posture 일반 규칙에 남긴다) */
const CONFLICT_EXERCISE_RE =
  /\b(drills?|exercises?|war\s?games?|wargames?|live[\s-]?fire|maneuvers?|manoeuvres?|amphibious\s?(?:landing|assault|exercise))\b|훈련|연습|실사격/i;

/**
 * 신무기 — 시험(발사·비행시험), 실전배치(취역·인도·작전배치), 전장 첫 사용, 전쟁이 만든 무기 개발.
 * 타격 결과(피격·사망) 기사는 kinetic 이 가져가므로 무기 이름만 나온 보도를 여기서 먼저 잡는다.
 */
const WEAPONS_TEST_RE =
  /\b(test[\s-]?(?:fire[sd]?|launch(?:es|ed)?|flight|flew)|flight\s?test|successful(?:ly)?\s?test\w*|test(?:ed|s)\s?(?:a|its|new)\s?[\w\s-]{0,24}(?:missile|weapon|system|drone|warhead|engine)|launch(?:ed|es)\s?(?:a|its|new)\s?[\w\s-]{0,24}(?:missile|rocket|icbm|slbm))\b|시험\s?발사|발사\s?시험|비행\s?시험|성공적\s?시험|시험\s?비행/i;
const WEAPONS_DEPLOY_RE =
  /\b(?:enter(?:s|ed)?\s?service|commission(?:s|ed|ing)?|induct(?:s|ed|ion)|operational(?:ly)?\s?deploy\w*|put\s?into\s?service|initial\s?operating\s?capability|full[\s-]?rate\s?production|delivered\s?to|first\s?deliver\w*|(?:deploys?|deployed)\s?(?:new|its|the\s?first|first)\b)|실전\s?배치|작전\s?배치|취역|인수|전력화|양산\s?돌입|납품/i;
const WEAPONS_COMBAT_RE =
  /\b(?:first\s?(?:combat\s?)?use|combat\s?debut|battlefield\s?debut|first\s?used\s?in\s?(?:combat|battle)|(?:used|deployed|employed|fired)\s?in\s?(?:combat|battle|action)\s?for\s?the\s?first\s?time|used\s?for\s?the\s?first\s?time|combat[\s-]?tested|battle[\s-]?tested|combat[\s-]?proven|first\s?time\s?in\s?combat)\b|전장\s?(?:투입|첫\s?사용)|실전\s?투입|첫\s?실전|전투\s?검증/i;
const WEAPONS_DEV_RE =
  /\b(?:lessons?\s?from\s?(?:the\s?war\s?in\s?)?(?:ukraine|gaza|the\s?war)|wartime\s?(?:innovation|production|development)|war[\s-]?driven|developed\s?(?:in|during)\s?(?:the\s?)?war|new\s?(?:generation|type)\s?of\s?(?:drones?|weapons?|munitions?)|unveil(?:s|ed)\s?(?:a\s?|its\s?)?new|prototype|next[\s-]?generation\s?(?:drone|missile|weapon|fighter|tank)|counter[\s-]?drone\s?(?:system|laser)|loitering\s?munition)\b|전쟁\s?(?:교훈|경험)|신형|신무기|차세대|시제품|개발\s?완료/i;
/** 무기 시험·배치 기사가 아니라 타격·사상 결과 보도 */
const WEAPONS_STRIKE_OUTCOME_RE =
  /\b(?:struck|hit|killed|dead|wounded|casualt\w*|injured|destroyed|shot\s?down|intercept\w*)\b|피격|사망|부상|격추|요격/i;


/** 하이브리드전 — 사이버·사보타주·정보전·회색지대 도발 */
const HYBRID_WARFARE_RE =
  /\b(cyber\s?attack|cyberattack|hack(?:ed|ing)?|sabotage|gray[\s-]?zone|disinformation|influence\s?operation|espionage|spy\s?ring|submarine\s?cable\s?(?:cut|damaged)|gps\s?jamming|election\s?interference|airspace\s?(?:violation|breach|incursion)|border\s?(?:violation|incursion)|drone\s?incursion|trash\s?balloons?|maritime\s?militia|water\s?cannon|undersea\s?cable)\b|사이버\s?공격|해킹|사보타주|회색지대|허위정보|정보전|첩보|간첩|해저케이블|GPS\s?재밍|선거\s?개입|영공\s?침범|국경\s?침범|오물\s?풍선|물대포/i;

/** 안보 위협 — 테러·쿠데타·내란·계엄 등 국가 안보 사건 */
const SECURITY_THREAT_RE =
  /\b(security\s?threat|terror(?:ist)?\s?(?:attack|plot)|militia|insurgent|coup|uprising|unrest|riot|martial\s?law)\b|안보\s?위협|테러|쿠데타|봉기|소요|계엄/i;

/**
 * 국가적 소요·정치 혼란 — 대규모 시위, 지지율 급락, 탄핵·불신임, 정부·연정 붕괴, 총파업.
 * 군사 충돌은 아니지만 정권 안정·치안·시장에 번지는 사건이라 타전 대상이다.
 */
const CIVIL_UNREST_RE =
  /\b(protest(?:s|ers?|ing)?|demonstrat(?:ion|ions|ors?)|mass\s?rall(?:y|ies)|anti[\s-]?government|general\s?strike|nation[\s-]?wide\s?strike|curfew|state\s?of\s?emergency|crackdown|tear\s?gas|impeach\w*|no[\s-]?confidence|approval\s?(?:rating|ratings)|snap\s?election|government\s?(?:collapse[sd]?|falls?)|coalition\s?collapse\w*|cabinet\s?resign\w*|political\s?(?:crisis|turmoil|deadlock)|power\s?struggle|opposition\s?(?:leader|party)\s?(?:arrested|detained|banned))\b|시위|집회|대규모\s?시위|총파업|통행금지|비상사태|무력\s?진압|탄핵|불신임|지지율|조기\s?총선|정부\s?붕괴|연정\s?붕괴|정국\s?혼란|정치\s?위기/i;

/**
 * 선거 공정성 — 부정선거·부실 관리·결과 불복·재검표·무효·개표 조작 주장.
 * 투표일 일정 기사가 아니라 선거 체제 자체가 의심받는 사건만 잡는다.
 */
const ELECTION_INTEGRITY_RE =
  /\b(election[s]?\s?(?:fraud|rigg(?:ed|ing)|manipulat\w*|irregularit\w*|interference|meddling|annul\w*|cancel\w*|postpone\w*|dispute[sd]?|crisis)|(?:rigged|stolen|disputed|contested|flawed|sham|fraudulent)\s?(?:election|vote|poll|ballot|result)s?|vote[\s-]?(?:rigging|buying|fraud|tampering|count\s?(?:halted|dispute))|ballot[\s-]?(?:stuffing|box\s?(?:theft|tamper\w*))|(?:recount|re[\s-]?run|runoff\s?(?:dispute|annul\w*))|results?\s?(?:rejected|annulled|contested|disputed|delayed|withheld)|electoral\s?(?:commission|body|fraud|irregularit\w*|malpractice)|(?:opposition|candidate)\s?(?:rejects?|refuses?\s?to\s?concede|claims?\s?(?:victory|fraud)|boycott\w*)|election\s?observers?|osce\s?observers?|post[\s-]?election\s?(?:violence|unrest|crackdown))\b|부정\s?선거|부실\s?선거|선거\s?(?:조작|부정|불복|무효|연기|취소|논란|개입)|개표\s?(?:조작|중단|논란)|재검표|결과\s?불복|선관위|선거\s?관리\s?(?:부실|논란)|투표\s?(?:조작|부정)/i;

/**
 * 차기 정치인 부상 — 선두 주자·여론조사 1위·출마 선언·후계 구도·정치 신예·야권 약진.
 * 사람 이름을 지어내지 않고, 이런 신호가 기사에 있다는 사실만 표시한다.
 */
const POLITICAL_EMERGENCE_RE =
  /\b(front[\s-]?runner|poll\s?(?:leader|lead|tops?|surge)|leads?\s?(?:the\s?)?polls?|(?:announces?|declares?|launches?|confirms?)\s?(?:a\s?)?(?:presidential\s?|prime[\s-]?ministerial\s?|leadership\s?)?(?:bid|candidacy|run|campaign)|runs?\s?for\s?(?:president|prime\s?minister|office|leader)|presidential\s?(?:bid|hopeful|contender|candidate)|(?:heir|successor|likely\s?successor|anointed\s?successor)|(?:rising|new)\s?(?:star|face|leader)|dark[\s-]?horse|political\s?(?:newcomer|outsider)|(?:wins?|clinch(?:es)?)\s?(?:the\s?)?(?:primary|party\s?leadership|nomination)|opposition\s?(?:surge|wave|gains?|landslide)|landslide\s?(?:win|victory)|exit\s?polls?)\b|차기\s?(?:대선|대통령|총리|주자|후보|지도자)|대선\s?(?:주자|출마|후보)|출마\s?선언|여론조사\s?(?:1위|선두)|지지율\s?(?:1위|선두|급등|급락)|후계\s?(?:구도|자)|정치\s?신예|출구조사|압승|돌풍/i;

/** 안보 재편 — 동맹·방위조약·주둔 합의 등 안보 구조 변화 */
const SECURITY_REALIGNMENT_RE =
  /\b(nato|defense\s?pact|basing\s?agreement|troop\s?deployment|security\s?guarantee|joint\s?command|defense\s?treaty|pivot\s?to|strategic\s?alliance)\b|나토|방위조약|주둔\s?합의|안보\s?재편|안보\s?보장|연합사|전략적\s?동맹/i;

const CONFLICT_EASE_RE =
  /\b(ceasefire|truce|peace\s?deal|withdrawal|reopen(?:s|ed|ing)?|corridor\s?(?:open|safe)|blockade\s?lifted|hostage\s?release|de[\s-]?escalat|stand[\s-]?down|arms\s?control|deal\s?struck|talks?\s?resume|forces?\s?return)\b|휴전|정전|철군|재개|인도적\s?회랑|봉쇄\s?해제|인질\s?석방|긴장\s?완화|철수|군축|합의|협상\s?재개|병력\s?복귀/i;

const CONFLICT_STRESS_RE =
  /\b(airstrike(?:s)?|missile(?:s)?|invasion|massacre|bombard(?:s|ed|ing|ment)?|shelling|blockade(?!\s+lifted)|ultimatum|talks?\s?collapse|escalat(?:e|es|ed|ing|ion)?|offensive|assassinate|nuclear|warhead|siege|killed|casualt(?:y|ies)?)\b|공습|미사일|침공|학살|포격|봉쇄(?!\s*해제)|최후통첩|협상\s?결렬|확전|공세|암살|핵|포위|사망|사상/i;

export type WeaponsFlashKind = "test" | "deployment" | "combat" | "development";

/** 신무기 보도의 성격 — 실전 투입 > 시험 > 배치 > 개발 순으로 강한 신호를 먼저 본다 */
export function weaponsFlashKind(text: string): WeaponsFlashKind | null {
  if (WEAPONS_COMBAT_RE.test(text)) return "combat";
  if (WEAPONS_TEST_RE.test(text)) return "test";
  if (WEAPONS_DEPLOY_RE.test(text)) return "deployment";
  if (WEAPONS_DEV_RE.test(text)) return "development";
  return null;
}

export function isWeaponsFlashText(text: string): boolean {
  if (!weaponsFlashKind(text)) return false;
  // 전장 첫 사용 보도는 타격 결과가 같이 있어도 신무기 사건이다
  if (WEAPONS_COMBAT_RE.test(text)) return true;
  return !WEAPONS_STRIKE_OUTCOME_RE.test(text);
}

function detectConflictEventClass(text: string): ConflictFlashClass {
  if (CONFLICT_NUCLEAR_RE.test(text)) return "nuclear";
  if (isWeaponsFlashText(text)) return "weapons";
  // "미사일 훈련"·"실사격 훈련"은 타격이 아니라 훈련 — 사상·피격 결과가 없을 때만
  if (CONFLICT_EXERCISE_RE.test(text) && !WEAPONS_STRIKE_OUTCOME_RE.test(text)) return "posture";
  if (CONFLICT_KINETIC_RE.test(text)) return "kinetic";
  if (CONFLICT_BLOCKADE_RE.test(text) || isChokepointSecurityNews(text)) {
    return "blockade";
  }
  if (HYBRID_WARFARE_RE.test(text)) return "hybrid";
  if (SECURITY_THREAT_RE.test(text)) return "security_threat";
  if (ELECTION_INTEGRITY_RE.test(text)) return "election_integrity";
  if (CIVIL_UNREST_RE.test(text)) return "civil_unrest";
  if (POLITICAL_EMERGENCE_RE.test(text)) return "political_emergence";
  // "NATO 훈련"은 동맹 재편이 아니라 훈련이다 — realignment 가 NATO 단어를 먼저 가져가지 않게 앞에서 판정
  if (CONFLICT_EXERCISE_RE.test(text)) return "posture";
  if (SECURITY_REALIGNMENT_RE.test(text)) return "realignment";
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
    case "hybrid":
      return polarity === "ease" ? "cheer" : "dark";
    case "security_threat":
      return polarity === "ease" ? "cheer" : "dark";
    case "civil_unrest":
      return polarity === "ease" ? "cheer" : "dark";
    case "election_integrity":
      return polarity === "ease" ? "cheer" : "dark";
    case "political_emergence":
      // 승패·부상은 가치중립 — 깔개 없이 모스만
      return "morse";
    case "weapons":
      // 성능 과시·시험은 우열이 없다 — 깔개 없이 모스만
      return "morse";
    case "realignment":
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

/**
 * 정치 신호 한 줄 — 이 속보가 어떤 정치 사건 유형으로 분류됐는지만 밝힌다.
 * 인물·결과를 지어내지 않는다. 판단은 원문이 한다.
 */
function politicalSignalNote(
  eventClass: ConflictFlashClass | "unknown",
  ko: boolean,
  text = "",
): string | null {
  switch (eventClass) {
    case "weapons": {
      const kind = weaponsFlashKind(text);
      const koKind =
        kind === "combat"
          ? "전장 첫 투입"
          : kind === "test"
            ? "시험·발사"
            : kind === "deployment"
              ? "실전배치·취역"
              : "개발·공개";
      const enKind =
        kind === "combat"
          ? "first combat use"
          : kind === "test"
            ? "test / launch"
            : kind === "deployment"
              ? "deployment / commissioning"
              : "development / unveiling";
      return ko
        ? `분류: 신무기 — ${koKind}. 성능·성과는 발표 주체의 주장일 수 있어 독립 검증 전까지 참고용입니다.`
        : `Signal: new weapons — ${enKind}. Performance claims come from the announcing party and are not independently verified.`;
    }
    case "posture":
      return ko
        ? "분류: 군사훈련·병력 배치 — 일정·규모는 발표 기준이며 실제 전개와 다를 수 있습니다."
        : "Signal: military exercise or deployment — schedule and scale are as announced and may differ in practice.";
    case "election_integrity":
      return ko
        ? "분류: 선거 공정성 논란 — 부정·부실 관리·결과 불복 주장은 당사자 주장일 수 있어 원문 출처로 확인이 필요합니다."
        : "Signal: election integrity dispute — fraud or mismanagement claims may be partisan; check the original source.";
    case "political_emergence":
      return ko
        ? "분류: 차기 주자 부상 신호 — 여론조사·출마·후계 구도 관련 보도입니다. 이후 정권 향방의 선행 신호로 볼 수 있으나 결과는 확정이 아닙니다."
        : "Signal: rising political contender — polls, candidacy or succession reporting; an early sign of leadership change, not a result.";
    case "civil_unrest":
      return ko
        ? "분류: 국가적 소요·정치 혼란 — 시위 규모와 정부 대응 수위에 따라 사태가 커질 수 있습니다."
        : "Signal: civil unrest or political turmoil — scale and the state's response determine whether it escalates.";
    default:
      return null;
  }
}

/** 세션 중 이미 타전한 귀중 속보 id — 동일 기사 재타전 방지 */
const claimedFlashIds = new Set<string>();
const claimedFlashAt = new Map<string, number>();
let lastClaimedFlashId: string | null = null;

/** 관측(Cesium) — 후보가 소진돼도 이 시간이 지나면 재타전 (빈도 유지) */
export const OBSERVE_FLASH_RECYCLE_MS = 90_000;

export function claimBreakingFlash(id: string): boolean {
  if (!id || claimedFlashIds.has(id)) return false;
  claimedFlashIds.add(id);
  claimedFlashAt.set(id, Date.now());
  lastClaimedFlashId = id;
  return true;
}

/**
 * 관측 모드 재타전 — 이미 claim된 id도 recycle 창이 지났으면 다시 연다.
 * 일반 모드에서는 쓰지 말 것.
 */
export function claimBreakingFlashAllowRecycle(
  id: string,
  recycleAfterMs = OBSERVE_FLASH_RECYCLE_MS,
): boolean {
  if (!id) return false;
  const at = claimedFlashAt.get(id);
  if (at != null && Date.now() - at < recycleAfterMs) return false;
  claimedFlashIds.add(id);
  claimedFlashAt.set(id, Date.now());
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
 * - 지정학: **S급**은 전쟁·긴장·하이브리드전·안보위협·핵·군사훈련·지정학적 갈등·안보재편·외교 등
 *   분류 가능한 주제면 전부 타전 (2026-09-22부터 키네틱·초크 한정 폐지). A급은 grade≥7 + 더 짧은 시간창.
 * - 지경학: 같은 S/A·시간창이지만 **국제 지경학 영향** 주제만 (연준·원자재·초크·대형기업·거시·공급망).
 * - 연예·스포츠·사설·휴먼스토리 제외. **45분** 초과 제외 (신속 속보).
 * - Tier3 단독은 S 미만 불가.
 * - 공급망과의 연결은 별도 양피지가 아니라 본문 「공급망과의 연결」 단락으로만 붙인다.
 */
export function shouldOpenBreakingFlash(
  hero: HeroBreakingItem | null | undefined,
  preferEconomy: boolean,
  opts?: { energySupplyOnly?: boolean },
): boolean {
  if (!hero?.id) return false;
  const grade = hero.breakingGrade ?? 0;
  const rank = hero.breakingRank;
  const age = typeof hero.ageMinutes === "number" ? hero.ageMinutes : 999;
  if (age > FLASH_MAX_AGE_MINUTES) return false;

  const blob = `${hero.title} ${hero.titleKo ?? ""} ${hero.summary ?? ""} ${hero.bodyKo ?? ""}`;
  if (FLASH_SOFT_EXCLUDE_RE.test(blob)) return false;
  if (FLASH_ROUTINE_SHELLING_RE.test(blob) && !isPriceThreatInfrastructureFlash(blob)) {
    return false;
  }

  const energySupply =
    isEnergySupplyChainFlash(blob) || isPriceThreatInfrastructureFlash(blob);

  // 관측대 — 유가·가스·초크·공급망만. 등급 문턱을 낮추고 개수 제한 없음.
  if (opts?.energySupplyOnly) {
    if (!energySupply) return false;
    // Tier3 단독은 얇은 제보 남발 방지
    if (hero.trustTier === 3 && grade < 7) return false;
    return true;
  }

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

  const priceThreat = isPriceThreatInfrastructureFlash(blob);

  if (preferEconomy || hero.feedTopic === "economy") {
    // 지경학 신속 속보(시장·연준·원자재)는 투자 화면과 함께 일단 내린다 (2026-10-20)
    if (!SHOW_INVESTMENT_UI) return false;
    // 지정학과 동일 등급 창 — 주제만 지경학 영향력으로 좁힘
    if (rank === "S") {
      return isGeoeconomicImpactFlash(blob) || priceThreat;
    }
    if (
      rank === "A" &&
      grade >= 7 &&
      age <= FLASH_A_MAX_AGE_MINUTES &&
      (isGeoeconomicImpactFlash(blob) || priceThreat)
    ) {
      return true;
    }
    return false;
  }

  // 정세 — 지정학 갈등 전반 (2026-09-22 확장, 필성 요청):
  // 전쟁(키네틱)·긴장·하이브리드전·안보위협·핵·국가적 군사훈련·지정학적 갈등·
  // 안보 재편·외교까지 분류된 주제는 전부 타전 (키네틱·초크 한정 폐지).
  // 단, 완전히 무관한(unknown) 텍스트는 가격위협이 아닌 한 계속 막는다.
  const conflictClass = detectConflictEventClass(blob);
  const conflictEligible = conflictClass !== "unknown" || priceThreat;
  if (rank === "S") {
    return conflictEligible;
  }
  // A급: 분류된 주제 + 더 짧은 창
  const aGradeMin = 7;
  if (
    rank === "A" &&
    grade >= aGradeMin &&
    age <= FLASH_A_MAX_AGE_MINUTES &&
    conflictEligible
  ) {
    return true;
  }
  return false;
}

export type PickBreakingFlashOpts = {
  /**
   * 관측(Cesium) — 미타전 후보가 없으면 recycleAfterMs가 지난 claim을 다시 고른다.
   * 기본 null = 재타전 없음.
   */
  recycleAfterMs?: number | null;
  /** 관측대 — 유가·가스·초크·공급망 속보만 */
  energySupplyOnly?: boolean;
};

/**
 * 전역 hero + flashHeroes(전선별 보조) 중
 * 아직 타전하지 않은 최고 등급 후보를 고른다.
 */
export function pickNextBreakingFlashHero(
  payload: Pick<NewsStreamPayload, "hero" | "flashHeroes"> | null | undefined,
  preferEconomy: boolean,
  opts?: PickBreakingFlashOpts,
): HeroBreakingItem | null {
  if (!payload) return null;
  const recycleAfterMs = opts?.recycleAfterMs ?? null;
  const seen = new Set<string>();
  const candidates: HeroBreakingItem[] = [];
  for (const h of [payload.hero, ...(payload.flashHeroes ?? [])]) {
    if (!h?.id || seen.has(h.id)) continue;
    seen.add(h.id);
    candidates.push(h);
  }

  const scoreHero = (h: HeroBreakingItem): number => {
    const blob = `${h.title} ${h.titleKo ?? ""} ${h.summary ?? ""} ${h.bodyKo ?? ""}`;
    const summit = isSummitDiplomacyText(blob);
    const photo = hasLampPhoto(h.imageUrl);
    // 등급 우선 · 동점이면 회담+사진 > 회담 > 사진 > 신선도
    return (
      (h.breakingGrade ?? 0) * 1_000_000 +
      (summit && photo ? 400_000 : summit ? 250_000 : photo ? 80_000 : 0) +
      Math.max(0, 10_000 - (h.ageMinutes ?? 999) * 10)
    );
  };

  const openOpts = { energySupplyOnly: Boolean(opts?.energySupplyOnly) };

  let best: HeroBreakingItem | null = null;
  let bestScore = -Infinity;
  for (const h of candidates) {
    if (wasBreakingFlashClaimed(h.id)) continue;
    if (!shouldOpenBreakingFlash(h, preferEconomy, openOpts)) continue;
    const score = scoreHero(h);
    if (!best || score > bestScore) {
      best = h;
      bestScore = score;
    }
  }
  if (best) return best;

  // 관측 모드: 큐가 비면 오래된 claim을 재활용해 빈 화면을 막는다.
  // recycleAfterMs === 0 은 즉시 재활용(테스트·강제 리셋).
  if (recycleAfterMs == null || recycleAfterMs < 0) return null;
  const now = Date.now();
  let recycleBest: HeroBreakingItem | null = null;
  let recycleScore = -Infinity;
  for (const h of candidates) {
    if (!shouldOpenBreakingFlash(h, preferEconomy, openOpts)) continue;
    const at = claimedFlashAt.get(h.id);
    if (at == null || now - at < recycleAfterMs) continue;
    const score = scoreHero(h) - Math.min(500_000, (now - at) / 100);
    if (!recycleBest || score > recycleScore) {
      recycleBest = h;
      recycleScore = score;
    }
  }
  return recycleBest;
}

export function buildBreakingFlashBriefing(
  hero: HeroBreakingItem,
  lang: LabelLanguage,
  preferEconomy: boolean,
  opts?: {
    title?: string;
    summary?: string;
    /** 지정학/지경학만. null이면 peacesciencer 문단 생략 */
    peaceScienceDomain?: "conflict" | "economy" | null;
  },
): BreakingFlashBriefing {
  const ko = lang !== "en";
  const economy = preferEconomy || hero.feedTopic === "economy";
  // KO: titleKo || title · bodyKo || summary — EN: 원문만
  const titleText = (
    opts?.title ??
    (ko ? hero.titleKo?.trim() || hero.title : hero.title)
  )
    .replace(/\s+/g, " ")
    .trim();
  const summaryRaw =
    opts?.summary ?? (ko ? hero.bodyKo?.trim() || hero.summary : hero.summary);
  const blob = `${titleText} ${summaryRaw ?? ""}`;
  const verbatim = Boolean(hero.verbatim || hero.flashSource === "liveuamap");

  const summitLike = isSummitDiplomacyText(blob);
  const politicalClass = economy ? "unknown" : detectConflictEventClass(blob);
  const kicker = economy
    ? ko
      ? "지경학 신속 속보"
      : "Geoeconomic flash"
    : summitLike
      ? ko
        ? "회담 신속 속보"
        : "Summit flash"
      : politicalClass === "election_integrity"
        ? ko
          ? "선거 공정성 신속 속보"
          : "Election integrity flash"
        : politicalClass === "political_emergence"
          ? ko
            ? "차기 주자 신속 속보"
            : "Rising contender flash"
          : politicalClass === "civil_unrest"
            ? ko
              ? "국가 소요 신속 속보"
              : "Civil unrest flash"
            : politicalClass === "weapons"
              ? ko
                ? "신무기 신속 속보"
                : "New weapons flash"
              : politicalClass === "posture"
                ? ko
                  ? "군사훈련 신속 속보"
                  : "Military exercise flash"
                : ko
                  ? "정세 신속 속보"
                  : "Situation flash";

  let paragraphs: string[];
  if (verbatim) {
    const body = (summaryRaw || titleText).replace(/\s+/g, " ").trim();
    const actors = extractFlashActors(blob, lang);
    const summitParas = buildSummitDiplomacyParagraphs(
      extractSummitDiplomacyMeta(blob, actors),
      lang,
    );
    const core = body ? [body] : [titleText];
    paragraphs = summitParas.length > 0 ? [...summitParas, ...core] : core;
  } else {
    const actors = extractFlashActors(blob, lang);
    const body = deepenSummaryForFlash(summaryRaw, titleText, lang);
    const peaceScienceDomain =
      opts?.peaceScienceDomain === undefined
        ? economy
          ? ("economy" as const)
          : ("conflict" as const)
        : opts.peaceScienceDomain;

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
      peaceScienceDomain,
    }).filter((p) => p.trim().length > 0);

    // 회담: 히어로 사진(leadImageUrl) 아래 — 양자/다자 + 합의 문구(원문 있을 때만)
    const summitParas = buildSummitDiplomacyParagraphs(
      extractSummitDiplomacyMeta(`${titleText} ${body}`, actors),
      lang,
    );
    paragraphs = summitParas.length > 0 ? [...summitParas, ...essay] : essay;
  }

  const signalNote = politicalSignalNote(politicalClass, ko, blob);
  if (signalNote) paragraphs = [signalNote, ...paragraphs];

  const liveua = hero.flashSource === "liveuamap";
  const namedPlace = liveua
    ? null
    : resolveRssFlashPlace(
        [titleText, hero.title].filter(Boolean).join("\n"),
        [summaryRaw, hero.summary].filter(Boolean).join("\n"),
        hero.theater,
      );
  const coords = liveua
    ? typeof hero.lat === "number" &&
      typeof hero.lng === "number" &&
      Number.isFinite(hero.lat) &&
      Number.isFinite(hero.lng)
      ? { lat: hero.lat, lng: hero.lng }
      : undefined
    : namedPlace
      ? { lat: namedPlace.lat, lng: namedPlace.lng }
      : undefined;

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
    imageUrl: hero.imageUrl,
    imageUrls: hero.imageUrls,
    videoUrl: hero.videoUrl,
    coords,
    flashSource: liveua ? "liveuamap" : "rss",
    verbatim,
  };
}

/**
 * RSS 속보에 위치가 없으면(전장 사전에 없는 나라의 시위·정변 등) 제목·사진 설명·요약에서
 * 세계 도시/국가를 찾아 「위치로 가기」 좌표를 채운다. 사전은 커서 이때만 동적 import 한다.
 */
async function withWorldPlace(
  briefing: BreakingFlashBriefing,
  hero: HeroBreakingItem,
  lang: LabelLanguage,
): Promise<BreakingFlashBriefing> {
  if (briefing.coords || briefing.flashSource === "liveuamap") return briefing;
  try {
    const { resolveWorldPlace } = await import("@/lib/geo/worldPlaceMatch");
    // 제목 → 사진 설명 → 요약 → 한글 번역 제목·요약 순으로 기사 안의 위치 단서를 모두 본다
    const hit = resolveWorldPlace([
      hero.title,
      hero.imageCaption,
      hero.summary,
      hero.titleKo,
      hero.bodyKo,
    ]);
    if (!hit) return briefing;
    const from =
      hit.partIndex === 0 || hit.partIndex === 3
        ? "title"
        : hit.partIndex === 1
          ? "caption"
          : "summary";
    const ko = lang !== "en";
    const fromLabel = ko
      ? { title: "제목", caption: "사진 설명", summary: "요약" }[from]
      : { title: "headline", caption: "photo caption", summary: "summary" }[from];
    const note =
      hit.precision === "city"
        ? ko
          ? `위치: ${hit.label} — 기사 ${fromLabel}에 나온 지명 기준.`
          : `Location: ${hit.label} — named in the article ${fromLabel}.`
        : hit.precision === "landmark"
          ? ko
            ? `위치: ${hit.label} — 기사 ${fromLabel}에 나온 시험장·기지·해역 기준(대략적 중심점, 정확한 발사·훈련 지점은 아님).`
            : `Location: ${hit.label} — a test range, base or sea area named in the ${fromLabel} (approximate centre, not the exact launch or drill spot).`
        : ko
          ? `위치: ${hit.country} 대표 도시 ${hit.label} 기준(추정) — 기사 ${fromLabel}에 도시가 없어 나라만으로 잡았으며, 실제 사건 지점은 다를 수 있습니다.`
          : `Location: ${hit.label}, representative city of ${hit.country} (estimate) — only the country was named in the ${fromLabel}; the actual spot may differ.`;
    return {
      ...briefing,
      coords: { lat: hit.lat, lng: hit.lng },
      place: {
        label: hit.label,
        precision: hit.precision,
        country: hit.country,
        from,
      },
      paragraphs: [...briefing.paragraphs, note],
    };
  } catch {
    return briefing;
  }
}

/** 한글 UI — 번역 후 타전 브리핑 생성 + 위치 보강 (LIVEUA 원문은 번역·재작성 생략) */
export async function buildBreakingFlashBriefingForLang(
  hero: HeroBreakingItem,
  lang: LabelLanguage,
  preferEconomy: boolean,
  opts?: { peaceScienceDomain?: "conflict" | "economy" | null },
): Promise<BreakingFlashBriefing> {
  const briefing = await buildBreakingFlashBriefingTranslated(
    hero,
    lang,
    preferEconomy,
    opts,
  );
  return withWorldPlace(briefing, hero, lang);
}

async function buildBreakingFlashBriefingTranslated(
  hero: HeroBreakingItem,
  lang: LabelLanguage,
  preferEconomy: boolean,
  opts?: { peaceScienceDomain?: "conflict" | "economy" | null },
): Promise<BreakingFlashBriefing> {
  // 명시적 원문 인용(verbatim)만 번역하지 않는다. liveuamap은 서버가 titleKo를 채우지만
  // 번역 엔드포인트가 실패하면 titleKo가 비거나 영어 그대로라, 그때는 아래에서 번역한다.
  if (lang === "en" || hero.verbatim) {
    return buildBreakingFlashBriefing(hero, lang, preferEconomy, opts);
  }
  // 이미 (진짜) 한글 titleKo가 있으면 재번역하지 않고 KO 필드 우선
  if (hero.titleKo?.trim() && !isMostlyEnglish(hero.titleKo)) {
    return buildBreakingFlashBriefing(hero, "ko", preferEconomy, {
      title: hero.titleKo.trim(),
      summary: hero.bodyKo?.trim() || hero.summary,
      peaceScienceDomain: opts?.peaceScienceDomain,
    });
  }
  const { title, summary } = await ensureFlashCopyKorean({
    title: hero.title,
    summary: hero.summary,
  });
  return buildBreakingFlashBriefing(hero, "ko", preferEconomy, {
    title,
    summary,
    peaceScienceDomain: opts?.peaceScienceDomain,
  });
}
