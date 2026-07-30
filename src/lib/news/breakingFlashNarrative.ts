/**
 * 정세 속보 타전 — 능동/피동 주체 · 인과 · 왜 중요한지 (휴리스틱).
 * LLM 발명 금지 · 제목·요약·전장 테이블만 사용.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsTheater } from "@/lib/news/types";
import { theaterLabel } from "@/lib/uiStrings";

type Actor = { id: string; labelKo: string; labelEn: string; re: RegExp };

const ACTORS: Actor[] = [
  { id: "russia", labelKo: "러시아", labelEn: "Russia", re: /\brussia\b|\brussian\b|\bkremlin\b|러시아|크렘린|모스크바/i },
  { id: "ukraine", labelKo: "우크라이나", labelEn: "Ukraine", re: /\bukraine\b|\bukrainian\b|\bkyiv\b|\bkiev\b|우크라이나|키이우/i },
  { id: "israel", labelKo: "이스라엘", labelEn: "Israel", re: /\bisrael\b|\bisraeli\b|\bidf\b|이스라엘/i },
  { id: "iran", labelKo: "이란", labelEn: "Iran", re: /\biran\b|\biranian\b|\btehran\b|이란|테헤란/i },
  { id: "hamas", labelKo: "하마스", labelEn: "Hamas", re: /\bhamas\b|하마스/i },
  { id: "hezbollah", labelKo: "헤즈볼라", labelEn: "Hezbollah", re: /\bhezbollah\b|헤즈볼라/i },
  { id: "houthis", labelKo: "후티", labelEn: "Houthis", re: /\bhouthi\b|후티/i },
  { id: "china", labelKo: "중국", labelEn: "China", re: /\bchina\b|\bchinese\b|\bbeijing\b|\bpla\b|중국|베이징|인민해방군/i },
  { id: "taiwan", labelKo: "대만", labelEn: "Taiwan", re: /\btaiwan\b|\btaipei\b|대만|타이완/i },
  { id: "nk", labelKo: "북한", labelEn: "North Korea", re: /\bnorth korea\b|\bdprk\b|\bpyongyang\b|\bkim jong\b|북한|평양/i },
  { id: "sk", labelKo: "한국", labelEn: "South Korea", re: /\bsouth korea\b|\bseoul\b|\brok\b|한국|서울|대한민국/i },
  { id: "us", labelKo: "미국", labelEn: "United States", re: /\bunited states\b|\bu\.?s\.?\b|\bwashington\b|\bpentagon\b|\bwhite house\b|\bcentcom\b|미국|워싱턴|국방부|백악관/i },
  { id: "nato", labelKo: "NATO", labelEn: "NATO", re: /\bnato\b|나토/i },
  { id: "japan", labelKo: "일본", labelEn: "Japan", re: /\bjapan\b|\bjapanese\b|\btokyo\b|일본|도쿄/i },
  { id: "syria", labelKo: "시리아", labelEn: "Syria", re: /\bsyria\b|\bassad\b|시리아/i },
  { id: "india", labelKo: "인도", labelEn: "India", re: /\bindia\b|\bindian\b|인도/i },
  { id: "pakistan", labelKo: "파키스탄", labelEn: "Pakistan", re: /\bpakistan\b|\bpakistani\b|파키스탄/i },
];

/** 능동 행위 동사 (타격·침공·발사 등) */
const ACTIVE_VERB_RE =
  /\b(strik(?:e|es|ing|uck)|attack(?:s|ed|ing)?|shell(?:s|ed|ing)?|bomb(?:s|ed|ing)?|invad(?:e|es|ed|ing)|launch(?:es|ed|ing)?|fire(?:s|d|ing)?|hit(?:s|ting)?|assassinate[ds]?|intercept(?:s|ed|ing)?|bombard(?:s|ed|ing)?|offensive|raid(?:s|ed|ing)?)\b|공습|타격|포격|폭격|침공|발사|피격|요격|기습|암살|공세|공격|도발/i;

/** 피동·피격 표현 */
const PASSIVE_VERB_RE =
  /\b(hit by|struck by|attacked by|targeted by|under (?:fire|attack)|comes under|was hit|were hit)\b|피격|피폭|공격받|타격받|포격받|공습받/i;

export type FlashActors = {
  active: string | null;
  passive: string | null;
  /** 주체를 못 가리면 등장 행위자 나열 */
  mentioned: string[];
};

function actorLabel(a: Actor, ko: boolean): string {
  return ko ? a.labelKo : a.labelEn;
}

function findActors(text: string): Actor[] {
  const found: Actor[] = [];
  for (const a of ACTORS) {
    if (a.re.test(text) && !found.some((x) => x.id === a.id)) found.push(a);
    if (found.length >= 4) break;
  }
  return found;
}

function actorSrc(a: Actor): string {
  return `(?:${a.re.source})`;
}

/**
 * 제목·요약에서 능동(가해·발사) / 피동(피격·표적) 휴리스틱.
 * 불확실하면 mentioned만 채움 — 날조하지 않음.
 */
export function extractFlashActors(text: string, lang: LabelLanguage): FlashActors {
  const ko = lang !== "en";
  const actors = findActors(text);
  const mentioned = actors.map((a) => actorLabel(a, ko));
  if (actors.length === 0) {
    return { active: null, passive: null, mentioned: [] };
  }

  const lower = text;
  const verbSrc = `(?:${ACTIVE_VERB_RE.source})`;
  const passiveSrc = `(?:${PASSIVE_VERB_RE.source})`;

  // "X hit by Y" / "X under attack from Y" → X 피동, Y 능동
  for (const victim of actors) {
    for (const ag of actors) {
      if (victim.id === ag.id) continue;
      const re = new RegExp(
        `${actorSrc(victim)}.{0,48}${passiveSrc}.{0,48}${actorSrc(ag)}`,
        "i",
      );
      if (re.test(lower)) {
        return {
          active: actorLabel(ag, ko),
          passive: actorLabel(victim, ko),
          mentioned,
        };
      }
    }
  }

  // "X strikes/attacks Y" · 한국어 SOV: X가 Y를 공습
  for (const ag of actors) {
    for (const victim of actors) {
      if (ag.id === victim.id) continue;
      const svo = new RegExp(
        `${actorSrc(ag)}.{0,56}${verbSrc}.{0,56}${actorSrc(victim)}`,
        "i",
      );
      if (svo.test(lower)) {
        return {
          active: actorLabel(ag, ko),
          passive: actorLabel(victim, ko),
          mentioned,
        };
      }
      const sov = new RegExp(
        `${actorSrc(ag)}.{0,40}${actorSrc(victim)}(?:을|를|에)?\\s*${verbSrc}`,
        "i",
      );
      if (sov.test(lower)) {
        return {
          active: actorLabel(ag, ko),
          passive: actorLabel(victim, ko),
          mentioned,
        };
      }
    }
  }

  return { active: null, passive: null, mentioned };
}

export function formatActorsLine(actors: FlashActors, lang: LabelLanguage): string | null {
  const ko = lang !== "en";
  if (actors.active && actors.passive) {
    return ko
      ? `능동 ${actors.active} → 피동 ${actors.passive}`
      : `Active ${actors.active} → Passive ${actors.passive}`;
  }
  if (actors.mentioned.length >= 2) {
    return ko
      ? `관련 주체: ${actors.mentioned.slice(0, 3).join(" · ")} (역할 확정 전)`
      : `Actors: ${actors.mentioned.slice(0, 3).join(" · ")} (roles unconfirmed)`;
  }
  if (actors.mentioned.length === 1) {
    return ko ? `관련 주체: ${actors.mentioned[0]}` : `Actor: ${actors.mentioned[0]}`;
  }
  return null;
}

/** 제목에서 사건 동사·대상 한 줄 (인과 뼈대) */
export function formatCausalLine(
  title: string,
  actors: FlashActors,
  lang: LabelLanguage,
): string {
  const ko = lang !== "en";
  const clean = title.replace(/\s+/g, " ").trim();
  if (actors.active && actors.passive) {
    return ko
      ? `인과: ${actors.active}의 군사·강제 행동이 ${actors.passive} 측 인명·시설·영토에 직접 영향을 준다는 보도입니다. 「${clean}」`
      : `Cause: reporting frames ${actors.active}'s kinetic/coercive action as directly affecting ${actors.passive}. 「${clean}」`;
  }
  return ko
    ? `인과: 확인된 와이어가 「${clean}」로 전함. 교차확인이 이어지는 대로 갱신됩니다.`
    : `Cause: verified wires report 「${clean}」. Updates follow as corroboration arrives.`;
}

const WHY_BY_THEATER: Record<
  NewsTheater,
  { ko: string; en: string }
> = {
  "middle-east": {
    ko: "왜 중요: 에너지 해로·호르무즈·홍해 리스크와 지역 확전 경로가 동시에 움직입니다.",
    en: "Why it matters: energy sea lanes (Hormuz/Red Sea) and escalation paths move together.",
  },
  "russia-ukraine": {
    ko: "왜 중요: 유럽 전선·흑해 곡물·에너지 프리미엄에 직결되는 전장 신호입니다.",
    en: "Why it matters: Europe front, Black Sea grain, and energy premium share this theater.",
  },
  "china-taiwan": {
    ko: "왜 중요: 대만해협 칩 서플라이·동맹 억지 시그널이 동시에 흔들립니다.",
    en: "Why it matters: Taiwan Strait chip supply and allied deterrence signals move together.",
  },
  korea: {
    ko: "왜 중요: 한반도 억지·미일 동맹·동북아 시장 리스크가 한 묶음으로 반응합니다.",
    en: "Why it matters: Peninsula deterrence, US–Japan alliance, and NE Asia risk co-move.",
  },
  japan: {
    ko: "왜 중요: 인도태평양 억지·해상로·동맹 훈련 일정과 맞물립니다.",
    en: "Why it matters: Indo-Pacific deterrence, sea lanes, and alliance drills co-move.",
  },
  "south-asia": {
    ko: "왜 중요: 핵 보유국 인접 긴장과 인도양 해로 리스크가 겹칩니다.",
    en: "Why it matters: nuclear-neighbor tension meets Indian Ocean sea-lane risk.",
  },
  "southeast-asia": {
    ko: "왜 중요: 남중국해·말라카 물류와 지역 군사 마찰이 겹칩니다.",
    en: "Why it matters: SCS/Malacca logistics and regional military friction overlap.",
  },
  "south-america": {
    ko: "왜 중요: 에너지·광물 공급과 지역 안보 프리미엄이 동시에 반응합니다.",
    en: "Why it matters: energy/minerals supply and regional security premium co-move.",
  },
  africa: {
    ko: "왜 중요: 사헬·홍해 연결 축과 자원·이주 압력 경로가 흔들립니다.",
    en: "Why it matters: Sahel–Red Sea arcs and resource/migration pressure paths move.",
  },
  arctic: {
    ko: "왜 중요: 북극 항로·자원·강대국 군사 접근이 겹치는 구간입니다.",
    en: "Why it matters: Arctic routes, resources, and great-power access overlap.",
  },
  atlantic: {
    ko: "왜 중요: 대서양·NATO 억지 축의 안보 프리미엄 신호입니다.",
    en: "Why it matters: Atlantic/NATO deterrence premium signal.",
  },
  global: {
    ko: "왜 중요: 전역 긴장 기축(GTI)과 시장·동맹 일정이 동시에 반응할 수 있는 급보입니다.",
    en: "Why it matters: global tension spine (GTI) and markets/alliance calendars may co-move.",
  },
};

/** 사건 본문에 실제로 드러난 공급망 축 — 전장 템플릿과 별개 */
export type SupplyBridgeKind =
  | "chokepoint"
  | "chips"
  | "energy"
  | "shipping"
  | "sanctions"
  | "minerals";

const SUPPLY_BRIDGE_DETECTORS: Array<{ kind: SupplyBridgeKind; re: RegExp }> = [
  {
    kind: "chokepoint",
    re: /\b(hormuz|suez|malacca|bab[\s-]?el[\s-]?mandeb|taiwan\s?strait|panama\s?canal|bosporus|gibraltar|good\s?hope|red\s?sea|chokepoint)\b|호르무즈|수에즈|말라카|바브엘만데브|대만\s?해협|파나마|보스포루스|지브롤터|희망봉|홍해|초크/i,
  },
  {
    kind: "chips",
    re: /\b(semiconductor|chip(?:s)?|foundry|tsmc|asml|hynix|smic|euv|fab\b|advanced\s?node|export\s?control.{0,24}chip)\b|반도체|파운드리|칩\b|웨이퍼|첨단\s?공정|장비\s?수출/i,
  },
  {
    kind: "energy",
    re: /\b(oil|crude|brent|wti|lng|natural\s?gas|pipeline|opec|refinery|tanker)\b|원유|유가|브렌트|LNG|천연가스|송유관|가스관|정유|유조선|OPEC/i,
  },
  {
    kind: "shipping",
    re: /\b(freight|shipping|container|bunker|war[\s-]?risk|reroute|diversion|port\b|maersk|cosco|bulk\s?carrier)\b|운임|해운|컨테이너|벙커|전쟁위험|우회|통항|항만|물류/i,
  },
  {
    kind: "sanctions",
    re: /\b(sanction(?:s)?|embargo|export\s?control|entity\s?list|tariff|secondary\s?sanction)\b|제재|금수|수출\s?통제|엔티티\s?리스트|관세|2차\s?제재/i,
  },
  {
    kind: "minerals",
    re: /\b(rare\s?earth|critical\s?mineral|lithium|cobalt|nickel|graphite|copper\s?mine)\b|희토|핵심\s?광물|리튬|코발트|니켈|흑연/i,
  },
];

const SUPPLY_BRIDGE_COPY: Record<
  SupplyBridgeKind,
  { ko: string; en: string }
> = {
  chokepoint: {
    ko: "해협·운하 통항, 전쟁위험보험, 운임 경로에 바로 닿습니다.",
    en: "Hits chokepoint transit, war-risk insurance, and freight paths directly.",
  },
  chips: {
    ko: "반도체·파운드리·장비 수출통제 축과 맞물립니다.",
    en: "Couples to semiconductor foundry and export-control chains.",
  },
  energy: {
    ko: "원유·LNG·파이프라인 가격·할증과 연결됩니다.",
    en: "Links to oil/LNG/pipeline prices and risk premia.",
  },
  shipping: {
    ko: "컨테이너·유조선 항로 우회와 물류 지연 리스크입니다.",
    en: "Raises container/tanker reroute and logistics delay risk.",
  },
  sanctions: {
    ko: "제재·수출통제가 부품·금융 결제 경로를 조일 수 있습니다.",
    en: "Sanctions/export controls can squeeze parts and payment rails.",
  },
  minerals: {
    ko: "핵심광물·희토 조달 경로가 흔들릴 수 있습니다.",
    en: "Critical-mineral and rare-earth sourcing paths may wobble.",
  },
};

/** 우선순위 — 한 타전에 최대 2축만 */
const SUPPLY_BRIDGE_PRIORITY: SupplyBridgeKind[] = [
  "chokepoint",
  "chips",
  "energy",
  "shipping",
  "sanctions",
  "minerals",
];

export function detectSupplyChainLinks(text: string): SupplyBridgeKind[] {
  const hit = new Set<SupplyBridgeKind>();
  for (const { kind, re } of SUPPLY_BRIDGE_DETECTORS) {
    if (re.test(text)) hit.add(kind);
  }
  return SUPPLY_BRIDGE_PRIORITY.filter((k) => hit.has(k));
}

/**
 * 사건 본문에 공급망 신호가 있을 때만 붙는 다리 문장.
 * 전장 템플릿(WHY_BY_THEATER)과 중복되지 않게 별도 단락으로 쓴다.
 */
export function formatSupplyChainBridge(
  text: string,
  lang: LabelLanguage,
): string | null {
  const kinds = detectSupplyChainLinks(text).slice(0, 2);
  if (kinds.length === 0) return null;
  const ko = lang !== "en";
  const bits = kinds.map((k) => (ko ? SUPPLY_BRIDGE_COPY[k].ko : SUPPLY_BRIDGE_COPY[k].en));
  if (ko) {
    return `공급망 연결: ${bits.join(" ")}`;
  }
  return `Supply-chain link: ${bits.join(" ")}`;
}

export function formatWhyImportant(
  theater: NewsTheater,
  text: string,
  lang: LabelLanguage,
): string {
  const ko = lang !== "en";
  const base = WHY_BY_THEATER[theater] ?? WHY_BY_THEATER.global;
  let line = ko ? base.ko : base.en;
  // 초크 점검은 formatSupplyChainBridge로 이전 — 여기서는 핵·미사일만 보강
  if (/\bnuclear|missile|warhead|핵|미사일|핵탄두\b/i.test(text)) {
    line = ko
      ? `${line} 핵·미사일 언급은 억지 계산을 바꾸는 최고 수위 신호입니다.`
      : `${line} Nuclear/missile language is top-tier deterrence math.`;
  }
  return line;
}

export function formatSceneLine(theater: NewsTheater, lang: LabelLanguage): string {
  const ko = lang !== "en";
  const name = theaterLabel(theater, lang);
  return ko
    ? `현장: ${name} — 지도가 해당 전장으로 이동합니다.`
    : `Scene: ${name} — map flies to this theater.`;
}

/** 위중 키워드 — 타전 양피지 허용용 */
export const FLASH_KINETIC_RE =
  /\b(nuclear|warhead|hypersonic|invasion|massacre|genocide|airstrike|missile|carrier\s?strike|assassinate|blockade|artillery|bombard|offensive|drone\s?strike|escalat)\b|핵|미사일|공습|침공|학살|봉쇄|암살|포격|확전|항모|전술핵|폭격/i;

export const FLASH_SOFT_EXCLUDE_RE =
  /\b(celebrity|sport|football|soccer|nba|oscar|grammy|fashion|recipe|op[\s-]?ed|opinion|editorial)\b|연예|스포츠|축구|야구|영화제|칼럼|사설|오피니언/i;
