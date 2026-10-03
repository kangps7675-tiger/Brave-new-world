/**
 * 경제 뉴스 장르 (geo-trader Intel 시트 카테고리).
 * @see feedCatalog SHARED_ECONOMY · BottomIntelStack EconomyGenreChipBar
 */

import type { LabelLanguage } from "@/lib/layerPrefs";

export type EconomyNewsGenre =
  | "macro"
  | "infra"
  | "energy"
  | "shipping"
  | "chips"
  | "tech"
  | "auto"
  | "markets";

export type EconomyGenreFilter = EconomyNewsGenre | "all";

/** 칩 UI 순서 — 선물·매크로 투자자 페르소나 (energy/shipping/macro 앞) */
export const ECONOMY_GENRE_ORDER: EconomyNewsGenre[] = [
  "energy",
  "macro",
  "shipping",
  "markets",
  "infra",
  "chips",
  "auto",
  "tech",
];

const GENRE_LABELS: Record<LabelLanguage, Record<EconomyNewsGenre, string>> = {
  ko: {
    tech: "AI·빅테크",
    chips: "반도체",
    auto: "전기차·모빌리티",
    energy: "에너지·메이저",
    shipping: "물류·해운",
    infra: "인프라·광물",
    macro: "거시·정책",
    markets: "시장·와이어",
  },
  en: {
    tech: "AI · Big Tech",
    chips: "Semiconductors",
    auto: "EV · Mobility",
    energy: "Energy majors",
    shipping: "Shipping · Logistics",
    infra: "Infra · Minerals",
    macro: "Macro · Policy",
    markets: "Markets · Wires",
  },
};

const GENRE_HINTS: Record<LabelLanguage, Record<EconomyNewsGenre, string>> = {
  ko: {
    tech: "Apple · Microsoft · Google · Amazon · Meta · OpenAI",
    chips: "Nvidia · TSMC · ASML · Samsung · SK hynix · Intel",
    auto: "Tesla · BYD · Toyota · Hyundai · CATL · 배터리",
    energy: "Exxon · Shell · Aramco · OPEC · Brent · WTI · LNG · 가스",
    shipping: "Maersk · COSCO · 운임 · 호르무즈 · 수에즈 · 말라카 · 홍해",
    infra: "희토류 · 해저케이블 · 데이터센터 · FDI",
    macro: "연준 · ECB · 관세 · 제재 · IMF · 미중 · 지경학",
    markets: "Reuters · WSJ · CNBC · FT · 원자재·에너지 자산",
  },
  en: {
    tech: "Apple · Microsoft · Google · Amazon · Meta · OpenAI",
    chips: "Nvidia · TSMC · ASML · Samsung · SK hynix · Intel",
    auto: "Tesla · BYD · Toyota · Hyundai · CATL · batteries",
    energy: "Exxon · Shell · Aramco · OPEC · Brent · WTI · LNG · gas",
    shipping: "Maersk · COSCO · freight · Hormuz · Suez · Malacca · Red Sea",
    infra: "Rare earths · subsea cables · data centers · FDI · China industry",
    macro: "Fed · ECB · tariffs · sanctions · IMF · US–China · geoeconomics",
    markets: "Reuters · WSJ · CNBC · FT · commodity · energy assets",
  },
};

/**
 * 연예·스포츠 등 소프트 노이즈 — 경제 카테고리 목록에서 배제.
 * (속보 FLASH_SOFT_EXCLUDE_RE와 별도: 카테고리 피드용, 휴먼스토리까지는 넓히지 않음)
 */
export const ECONOMY_SOFT_NOISE_RE =
  /\b(?:sport(?:s)?|football|soccer|basketball|baseball|tennis|cricket|golf|rugby|hockey|athletics?|olympi(?:c|cs|ad)|fifa|uefa|premier\s?league|champions\s?league|super\s?bowl|\bnba\b|\bnfl\b|\bnhl\b|\bmlb\b|formula\s?1|\bf1\b|grand\s?prix|world\s?cup|match\s?(?:day|report)|stadium|athlete|coach|tournament|playoffs?|box\s?office|celebrity|grammy|oscar|\bemmy|eurovision|fashion\s?week|reality\s?tv)\b|스포츠|축구|야구|농구|테니스|올림픽|월드컵|프리미어리그|연예|아이돌|예능|영화제|박스오피스/i;

/** 장르별 본문 관련성 — 피드 태그만으로 통과시키지 않음 */
export const ECON_GENRE_CONTENT_RE: Record<EconomyNewsGenre, RegExp> = {
  infra:
    /critical\s?mineral|rare\s?earth|lithium|cobalt|nickel|graphite|manganese|mining|mine\b|minerals?|subsea|undersea\s?cable|submarine\s?cable|data\s?cent(?:er|re)|datacenter|belt\s?and\s?road|\bbri\b|\baiib\b|foreign\s?direct|fdi\b|infrastructure|industrial\s?policy|made\s?in\s?china|new\s?productive|advanced\s?manufactur|shipbuilding|power\s?grid|high[\s-]?speed\s?rail|photovoltaic|solar\s?(?:panel|power|export)|wind\s?power|green\s?hydrogen|factory|gigafactory|capacity\s?expansion|port\s?investment|rail\s?corridor|희토류|광물|리튬|코발트|니켈|해저\s?케이블|데이터\s?센터|일대일로|인프라|산업정책|조선|전력망/i,
  energy:
    /\boil\b|crude|brent|wti\b|lng\b|natural\s?gas|nat\s?gas|\bgas\b|opec|petroleum|pipeline|refinery|exxon|chevron|shell|bp\b|totalenergies|equinor|conocophillips|aramco|adnoc|qatarenergy|gazprom|rosneft|petronas|henry\s?hub|\bttf\b|\bjkm\b|strategic\s?petroleum|\bspr\b|원유|유가|천연가스|석유|파이프라인|정유/i,
  shipping:
    /maersk|\bcosco\b|hapag|evergreen|hmm\b|freight|container|shipping|tanker|vlcc|dry\s?bulk|baltic|bdi\b|logistics|warehouse|fedex|\bups\b|\bdhl\b|hormuz|suez|malacca|red\s?sea|panama\s?canal|bab[\s-]?el|bosporus|taiwan\s?strait|reroute|운임|해운|물류|컨테이너|유조선|호르무즈|수에즈|말라카|홍해/i,
  chips:
    /semiconductor|chip(?:s|maker|making)?|\bgpu\b|nvidia|tsmc|asml|samsung|hynix|intel|\bamd\b|broadcom|qualcomm|smic|foundry|\beuv\b|wafer|chips?\s?act|fab\b|foundries|반도체|엔비디아|대만적체|하이닉스|웨이퍼|파운드리/i,
  tech:
    /apple|microsoft|google|alphabet|amazon|\bmeta\b|openai|anthropic|deepmind|chatgpt|generative\s?ai|\bai\b|cloud|aws|azure|oracle|netflix|huawei|alibaba|tencent|bytedance|xiaomi|antitrust|빅테크|인공지능|클라우드/i,
  auto:
    /tesla|\bbyd\b|toyota|hyundai|catl|\bnio\b|xpeng|li\s?auto|electric\s?vehicle|\bev\b|battery|gigafactory|mobility|autonomous|전기차|배터리|모빌리티|자동차/i,
  macro:
    /\bfed\b|fomc|\becb\b|bank\s?of\s?japan|federal\s?reserve|\bpboc\b|people'?s\s?bank|rate\s?(?:hike|cut|hold|decision)|inflation|gdp\b|stimulus|tariff|sanction|trade\s?war|export\s?control|entity\s?list|section\s?301|wto\b|imf\b|oecd|yuan|renminbi|de[\s-]?risk|decoupl|friendshoring|geoeconom|sovereign\s?debt|fiscal|local\s?government\s?debt|property\s?crisis|연준|금리|물가|관세|제재|무역전쟁|위안|지경학|수출규제/i,
  markets:
    /market|stock|equity|bond|yield|dollar|commodit|etf\b|futures?|earnings|ipo\b|rally|plunge|traders?|investors?|index|nasdaq|s&p|dow\b|vix\b|gold|copper|silver|wheat|soybean|시황|증시|주식|채권|선물|원자재|투자/i,
};

export function economyGenreLabel(genre: EconomyNewsGenre, lang: LabelLanguage): string {
  return GENRE_LABELS[lang][genre];
}

export function economyGenreHint(genre: EconomyNewsGenre, lang: LabelLanguage): string {
  return GENRE_HINTS[lang][genre];
}

export function isEconomySoftNoise(text: string): boolean {
  return ECONOMY_SOFT_NOISE_RE.test(text);
}

/** 제목·카테고리·요약이 해당 장르 키워드와 맞는지 */
export function economyGenreContentMatches(
  text: string,
  genre: EconomyNewsGenre,
): boolean {
  return ECON_GENRE_CONTENT_RE[genre].test(text);
}

export function matchesEconomyGenreFilter(
  genre: EconomyNewsGenre | undefined,
  filter: EconomyGenreFilter,
): boolean {
  if (filter === "all") return true;
  return (genre ?? "markets") === filter;
}

/**
 * 개별 카테고리 뷰: 피드 태그 + 본문 관련성 + 소프트 노이즈 배제.
 * `all`에서는 태그 필터만 건너뛰고, 스포츠·연예는 여전히 숨긴다.
 */
export function matchesEconomyGenreItem(
  item: {
    econGenre?: EconomyNewsGenre;
    title: string;
    category?: string | null;
    summary?: string | null;
  },
  filter: EconomyGenreFilter,
): boolean {
  const blob = `${item.title} ${item.category ?? ""} ${item.summary ?? ""}`;
  if (isEconomySoftNoise(blob)) return false;
  if (filter === "all") return true;
  const genre = item.econGenre ?? "markets";
  if (genre !== filter) return false;
  // 시장·와이어는 폭넓은 비즈니스 헤드라인을 허용 — 소프트 노이즈만 걸러냄
  if (filter === "markets") return true;
  return economyGenreContentMatches(blob, filter);
}
