/**
 * 정세 속보 타전 — 능동/피동 주체 · 인과 · 왜 중요한지 (휴리스틱).
 * LLM 발명 금지 · 제목·요약·전장 테이블만 사용.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsTheater } from "@/lib/news/types";
import { theaterLabel } from "@/lib/uiStrings";
import { josa } from "@/lib/koreanJosa";

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
      ? `${josa(actors.active, "이/가")} 군사력이나 강제력을 써서 ${actors.passive}의 사람·시설·영토에 직접 영향을 줬다는 보도입니다. 「${clean}」`
      : `What happened: reporting frames ${actors.active}'s military or coercive action as directly affecting ${actors.passive}. 「${clean}」`;
  }
  return ko
    ? `확인된 통신사가 「${clean}」라고 전했습니다. 다른 매체가 교차 확인하면 내용을 고칩니다.`
    : `What happened: verified wires report 「${clean}」. Updates follow as corroboration arrives.`;
}

const WHY_BY_THEATER: Record<
  NewsTheater,
  { ko: string; en: string }
> = {
  "middle-east": {
    ko: "석유와 가스가 오가는 해협과 홍해 항로가 걸려 있고, 이웃 나라로 싸움이 번질 위험도 커질 수 있습니다.",
    en: "Why it matters: oil/gas sea lanes (Hormuz/Red Sea) and the risk of wider fighting move together.",
  },
  "russia-ukraine": {
    ko: "유럽 전선뿐 아니라 흑해 곡물과 에너지 가격에도 바로 영향을 줍니다.",
    en: "Why it matters: it touches Europe’s front and Black Sea grain/energy prices.",
  },
  "china-taiwan": {
    ko: "대만해협을 지나는 반도체 공급이 흔들릴 수 있고, 동맹이 ‘막을 수 있다’고 보내는 메시지도 함께 흔들립니다.",
    en: "Why it matters: Taiwan Strait chip supply and alliance deterrence signals move together.",
  },
  korea: {
    ko: "한반도 안보와 미·일 동맹, 동북아 시장이 한꺼번에 반응하는 경우가 많습니다.",
    en: "Why it matters: peninsula security, the US–Japan alliance, and NE Asia markets co-move.",
  },
  japan: {
    ko: "인도·태평양 안보와 해상 물류, 동맹 훈련 일정이 서로 맞물려 있습니다.",
    en: "Why it matters: Indo-Pacific security, sea lanes, and alliance drills co-move.",
  },
  "south-asia": {
    ko: "핵을 가진 이웃 나라들 사이의 긴장이 커지면 인도양 항로 위험도 함께 커질 수 있습니다.",
    en: "Why it matters: tension between nuclear neighbors meets Indian Ocean sea-lane risk.",
  },
  "southeast-asia": {
    ko: "남중국해와 말라카 해협의 물류, 그리고 그 일대 군사 마찰이 함께 커질 수 있습니다.",
    en: "Why it matters: South China Sea / Malacca logistics and regional military friction overlap.",
  },
  "south-america": {
    ko: "에너지·광물 공급과 그 지역 안보 위험이 함께 움직일 수 있습니다.",
    en: "Why it matters: energy/minerals supply and regional security risk co-move.",
  },
  africa: {
    ko: "사헬에서 홍해로 이어지는 길목과 자원·이주 압력이 함께 흔들릴 수 있습니다.",
    en: "Why it matters: Sahel–Red Sea arcs and resource/migration pressure paths move.",
  },
  arctic: {
    ko: "북극 항로와 자원, 강대국의 군사 접근이 한곳에 모이는 구간입니다.",
    en: "Why it matters: Arctic routes, resources, and great-power access overlap.",
  },
  atlantic: {
    ko: "대서양과 NATO 안보 축에서 긴장이 높아졌다는 신호입니다.",
    en: "Why it matters: a tension signal on the Atlantic/NATO security axis.",
  },
  global: {
    ko: "세계 긴장과 시장, 동맹 일정이 한꺼번에 움직일 수 있는 급보입니다.",
    en: "Why it matters: a flash that can move global tension, markets, and alliance calendars together.",
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
    ko: "좁은 해협과 운하를 지나는 배편, 전쟁위험 보험료, 운임에 바로 영향을 줍니다.",
    en: "Hits narrow-strait transit, war-risk insurance, and freight costs directly.",
  },
  chips: {
    ko: "반도체 공장 가동과 장비 수출 통제에도 영향을 줄 수 있습니다.",
    en: "Couples to chip factories and export-control chains.",
  },
  energy: {
    ko: "원유·LNG·가스관 가격과 위험 할증에 영향을 줍니다.",
    en: "Links to oil/LNG/pipeline prices and risk markups.",
  },
  shipping: {
    ko: "컨테이너·유조선이 항로를 우회하고 물류가 늦어질 위험이 커집니다.",
    en: "Raises container/tanker reroute and logistics delay risk.",
  },
  sanctions: {
    ko: "제재와 수출 통제가 부품 조달과 금융 결제를 막을 수 있습니다.",
    en: "Sanctions/export controls can squeeze parts and payment routes.",
  },
  minerals: {
    ko: "핵심 광물과 희토류를 구하는 길이 흔들릴 수 있습니다.",
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
    return `공급망과의 연결입니다. ${bits.join(" ")}`;
  }
  return `Supply-chain link: ${bits.join(" ")}`;
}

/**
 * 지경학 긴급타전 — 「왜 중요」를 경제 축으로.
 * 본문 신호에 맞춰 한 줄 (발명 금지 · 키워드만).
 */
export function formatEconomyWhyImportant(
  text: string,
  lang: LabelLanguage,
): string {
  const ko = lang !== "en";
  const links = detectSupplyChainLinks(text);
  const axes: string[] = [];
  if (
    /\b(federal\s?reserve|fomc|fed\b|ecb|boj|pboc|rate\s?(?:hike|cut)|interest\s?rate)\b|연준|FOMC|금리|기준금리|유럽중앙은행|인민은행/i.test(
      text,
    )
  ) {
    axes.push(ko ? "중앙은행과 금리" : "central banks & rates");
  }
  if (
    /\b(oil|crude|brent|wti|lng|opec|gold|copper|wheat|commodity)\b|원유|유가|원자재|금\s?값|구리|밀\b/i.test(
      text,
    )
  ) {
    axes.push(ko ? "원자재 가격" : "commodity prices");
  }
  if (
    /\b(earnings|guidance|m&a|merger|acquisition|tsmc|nvidia|samsung|bankrupt)\b|실적|인수합병|파산|엔비디아|삼성/i.test(
      text,
    )
  ) {
    axes.push(ko ? "대형 기업과 자본 배치" : "mega-cap / capital allocation");
  }
  if (
    /\b(tariff|sanction|export\s?control|wto|inflation|gdp|recession|fx\b|devaluat)\b|관세|제재|수출\s?통제|물가|GDP|환율/i.test(
      text,
    )
  ) {
    axes.push(ko ? "무역과 거시 경제 충격" : "trade / macro shock");
  }
  if (links.includes("chokepoint") || links.includes("shipping")) {
    axes.push(ko ? "초크포인트와 물류" : "sea chokepoints & logistics");
  }
  if (links.includes("chips")) {
    axes.push(ko ? "반도체 공급망" : "chip supply chain");
  }

  const uniq = [...new Set(axes)].slice(0, 3);
  if (uniq.length === 0) {
    return ko
      ? "국제 자본과 공급망, 허브 도시의 가격이 한꺼번에 움직일 수 있는 경제·지정학 급보입니다."
      : "Why it matters: a geoeconomic flash that can hit capital, supply chains, and hub prices together.";
  }
  return ko
    ? `${uniq.join(", ")}에 직접 영향을 줄 수 있는 국제 경제·지정학 급보입니다.`
    : `Why it matters: international geoeconomic flash tied to ${uniq.join(", ")}.`;
}

export function formatWhyImportant(
  theater: NewsTheater,
  text: string,
  lang: LabelLanguage,
): string {
  const ko = lang !== "en";
  const base = WHY_BY_THEATER[theater] ?? WHY_BY_THEATER.global;
  let line = ko ? base.ko : base.en;
  if (isIranRelatedBreakingText(text)) {
    line = ko
      ? "이란의 핵·미사일과 호르무즈 해협, 지역 대리전은 에너지·항로와 이웃으로 싸움이 번질 위험을 한꺼번에 흔듭니다."
      : "Why it matters: Iran’s nuclear/missile posture, Hormuz, and regional proxies shake energy, sea lanes, and wider-war risk together.";
  }
  if (/\bnuclear|missile|warhead|핵|미사일|핵탄두\b/i.test(text)) {
    line = ko
      ? `${line} 핵이나 미사일이 언급되면, 상대를 말릴 힘의 계산이 바뀌는 가장 높은 수위의 신호입니다.`
      : `${line} Nuclear/missile language is a top-tier signal that changes deterrence math.`;
  }
  return line;
}

export function formatSceneLine(theater: NewsTheater, lang: LabelLanguage): string {
  const ko = lang !== "en";
  const name = theaterLabel(theater, lang);
  return ko
    ? `현장: ${name} — 지도가 이 전장으로 이동합니다.`
    : `Scene: ${name} — map flies to this theater.`;
}

/** 이란 관련 긴급속보 — 우크라와 별도 양피지 후보 */
export const IRAN_RELATED_FLASH_RE =
  /\biran\b|\biranian\b|\btehran\b|\birgc\b|\bquds\s?force\b|\bpersian\s?gulf\b|\bstrait\s?of\s?hormuz\b|\bhormuz\b|\bnatanz\b|\bfordo\b|\bbushehr\b|이란|테헤란|혁명수비대|쿠드스|호르무즈|나탄즈|포르도|부셰르/i;

export function isIranRelatedBreakingText(text: string): boolean {
  return IRAN_RELATED_FLASH_RE.test(text);
}

/** 위중 키워드 — 타전 양피지 허용용 */
export const FLASH_KINETIC_RE =
  /\b(nuclear|warheads?|hypersonic|invasions?|massacre|genocide|airstrikes?|missiles?|carrier\s?strikes?|assassinate[ds]?|blockades?|artillery|bombard(?:ment|s|ed|ing)?|offensives?|drone\s?strikes?|escalat(?:e|es|ed|ing|ion)?)\b|핵|미사일|공습|침공|학살|봉쇄|암살|포격|확전|항모|전술핵|폭격/i;

/** 연예·스포츠·사설 + 휴먼스토리/미시 (구출·어린이 등) — 정세 타전 제외 */
export const FLASH_SOFT_EXCLUDE_RE =
  /\b(celebrity|sport|football|soccer|nba|oscar|grammy|fashion|recipe|op[\s-]?ed|opinion|editorial|rescue(?:d|s|rs)?|child(?:ren)?|toddler|kids?|heartwarming|reunited|puppy|adorable)\b|연예|스포츠|축구|야구|영화제|칼럼|사설|오피니언|구출|인명\s?구조|구조(?!조정)|구조대|꼬마|어린이|감동/i;

/** 보도·수집 시각 한 구절 (라벨 없이 문장에 녹임) */
function formatFlashWhenPhrase(
  ageMinutes: number | undefined,
  source: string | undefined,
  ko: boolean,
): string {
  const src = source?.trim();
  const srcBit = src
    ? ko
      ? ` 1차 출처는 「${src}」입니다.`
      : ` Primary source tag: 「${src}」.`
    : "";
  if (ageMinutes != null && Number.isFinite(ageMinutes)) {
    const m = Math.max(0, Math.round(ageMinutes));
    const age =
      m < 60
        ? ko
          ? `약 ${m}분 전`
          : `about ${m} minutes ago`
        : ko
          ? `약 ${Math.round(m / 60)}시간 전`
          : `about ${Math.round(m / 60)} hours ago`;
    return ko
      ? `보도·수집 시각 기준으로는 ${age}에 잡힌 타전입니다.${srcBit} 정확한 현지 시각은 원문 타임스탬프를 따릅니다.`
      : `Desk clock marks this flash ${age}.${srcBit} Exact local time follows the article timestamp.`;
  }
  return ko
    ? `정확한 분·초는 원문 타임스탬프에 둡니다.${srcBit || " 수집 직후 즉시 타전합니다."}`
    : `Exact minute and second stay with the article timestamp.${srcBit || " Flashed on intake."}`;
}

/** 주체 한 구절 — 능동/피동을 단정하지 않고 문장으로 */
function formatFlashWhoPhrase(actors: FlashActors, ko: boolean): string {
  if (actors.active && actors.passive) {
    return ko
      ? `보도 문장이 가리키는 능동 쪽은 ${actors.active}, 충격이 닿는 쪽은 ${actors.passive}입니다. 역할은 후속 교차 보도에서 바뀔 수 있습니다.`
      : `The wording frames ${actors.active} as active and ${actors.passive} as the impact side. Roles can reverse as corroboration arrives.`;
  }
  if (actors.mentioned.length > 0) {
    const names = actors.mentioned.slice(0, 4).join(ko ? "·" : " · ");
    return ko
      ? `제목·요약에 등장하는 관련 주체는 ${names}입니다. 누가 능동인지 피동인지는 아직 확정하지 않습니다.`
      : `Names in frame are ${names}. Active versus passive roles are not locked yet.`;
  }
  return ko
    ? `주체가 제목·요약에 분명하지 않아, 확인된 문장만 붙잡습니다.`
    : `Actors are unclear in the headline and summary, so only confirmed wording stays.`;
}

/**
 * 신속속보 본문 — 역피라미드 3~4문단 줄글.
 * 육하원칙은 라벨이 아니라 문장 순서에 녹인다 (리드→구체→배경·영향→한계).
 * 사실 창작 금지 · 제목·요약·전장·출처·공급망 신호만 사용.
 */
export function buildFlashCausalEssay(input: {
  title: string;
  summary: string;
  theater: NewsTheater;
  lang: LabelLanguage;
  economy: boolean;
  actors: FlashActors;
  ageMinutes?: number;
  source?: string;
  trustTier?: 1 | 2 | 3;
}): string[] {
  const ko = input.lang !== "en";
  const title = input.title.replace(/\s+/g, " ").trim();
  const summary = input.summary.replace(/\s+/g, " ").trim();
  const theaterName = theaterLabel(input.theater, input.lang);
  const actors = input.actors;
  const supply = detectSupplyChainLinks(`${title} ${summary}`);
  const whyRaw = input.economy
    ? formatEconomyWhyImportant(`${title} ${summary}`, input.lang)
    : formatWhyImportant(input.theater, `${title} ${summary}`, input.lang);
  const why = whyRaw
    .replace(/^왜 중요한가\.\s*/i, "")
    .replace(/^Why it matters:\s*/i, "");
  const when = formatFlashWhenPhrase(input.ageMinutes, input.source, ko);
  const who = formatFlashWhoPhrase(actors, ko);
  const what = formatCausalLine(title, actors, input.lang)
    .replace(/^무슨 일인가\.\s*/i, "")
    .replace(/^What happened:\s*/i, "");

  const supplyBits =
    supply.length > 0
      ? supply
          .slice(0, 2)
          .map((k) => (ko ? SUPPLY_BRIDGE_COPY[k].ko : SUPPLY_BRIDGE_COPY[k].en))
          .join(" ")
      : null;

  const tierNote =
    input.trustTier === 1
      ? ko
        ? "이번 타전 후보는 Tier 1(독립 와이어·대형 독립매체) 축에서 올라왔습니다."
        : "This flash candidate sits on the Tier 1 (independent wire / major independent press) axis."
      : input.trustTier === 2
        ? ko
          ? "이번 타전 후보는 Tier 2(취재하되 편향 논란이 있을 수 있는 매체) 축입니다. Tier 1 교차가 쌓이면 신뢰가 올라갑니다."
          : "This flash candidate is Tier 2 (reporting with possible bias disputes). Tier 1 corroboration raises confidence."
        : input.trustTier === 3
          ? ko
            ? "이번 타전에 Tier 3(당사자·국영·공보) 신호가 있습니다. 당사자 발표로 읽고, 독립 매체 교차 전에는 단정하지 않습니다."
            : "Tier 3 (party / state / PA) signal is present—read as interested-party copy until independent corroboration."
          : null;

  const paragraphs: string[] = [];

  if (ko) {
    // 1) 리드 — 누가·무엇을·언제
    paragraphs.push(`${who} ${what} ${when}`);

    // 2) 본문 — 어디서·보도 요지
    const whereCore = input.economy
      ? `지도는 시장·항로·허브가 겹치는 구간으로 시선을 옮깁니다. 좌표는 보도 근사치일 수 있습니다.`
      : `현장 축은 ${theaterName}입니다. 지도가 이 전장으로 이동합니다. 지도 핀은 탄착점이 아니라 보도가 가리킨 대략의 위치일 수 있습니다.`;
    const gist = summary
      ? `보도 요지는 이렇습니다. ${summary}`
      : `요지가 제목에 압축되어 있습니다. 「${title}」`;
    paragraphs.push(
      `${whereCore} ${gist} 이번 타전의 사실 뼈대는 제목 「${title}」입니다. 뼈대 밖의 숫자·사상자·의도 단정은 붙이지 않습니다.`,
    );

    // 3) 왜·어떻게 (공급망 신호가 있으면 녹임)
    const howChain =
      "사건이 먼저 보도되고, 위험 인식이 바뀌며, 보험·운임·외교 일정·시장 가격이 따라 움직일 수 있습니다. 한 편의 속보가 전쟁을 끝냈다거나 시작한다고 단정하지 않습니다.";
    const supplyLine = supplyBits
      ? `공급망과도 이어집니다. ${supplyBits}`
      : "이번 제목만으로는 특정 해협·반도체·원유 축이 문장에 드러나지 않습니다. 다만 전장 자체가 물류·에너지와 겹치면 간접 충격은 남을 수 있습니다.";
    paragraphs.push(`${why} ${howChain} ${supplyLine}`);

    // 4) 꼬리 — 검증·한계
    const verify = tierNote
      ? `${tierNote} Tier는 진실 점수가 아니라 편집 독립·당사자성 라벨입니다.`
      : "Tier는 진실 점수가 아니라 편집 독립·당사자성 라벨입니다. Tier 1 교차가 늘수록 타전 골격의 무게가 커집니다.";
    paragraphs.push(
      `${verify} 초기 타전은 속도가 우선이므로 정정 기사가 나오면 함께 고쳐 읽습니다. 원문 링크가 최종 근거이며, 이 글은 투자·대피·군사 판단을 대신하지 않습니다.`,
    );
  } else {
    paragraphs.push(`${who} ${what} ${when}`);

    const whereCore = input.economy
      ? `The map shifts toward where markets, sea lanes, and hubs overlap. Pins may be approximate.`
      : `The theater axis is ${theaterName}. The map flies there. Pins may mark report locations, not proven impact points.`;
    const gist = summary
      ? `Wire gist: ${summary}`
      : `The gist is compressed in the title: 「${title}」`;
    paragraphs.push(
      `${whereCore} ${gist} Headline 「${title}」 is the factual spine—we do not pad casualties, intent, or numbers beyond it.`,
    );

    const howChain =
      "The event hits first, risk is repriced, and insurance, routes, diplomacy, and markets may co-move. One flash does not end or start a war.";
    const supplyLine = supplyBits
      ? `Supply-chain link: ${supplyBits}`
      : "This headline does not name a strait, chip, or oil axis explicitly, but the theater may still couple indirectly to logistics and energy.";
    paragraphs.push(`${why} ${howChain} ${supplyLine}`);

    const verify = tierNote
      ? `${tierNote} Tiers are editorial-independence labels, not a truth score.`
      : "Tiers are editorial-independence labels, not a truth score. More Tier 1 corroboration weights the spine.";
    paragraphs.push(
      `${verify} Early flashes prioritize speed—reread when wires revise. The source article remains ground truth. This is not investment, evacuation, or military guidance.`,
    );
  }

  return paragraphs.filter((p) => p.trim().length > 0);
}
