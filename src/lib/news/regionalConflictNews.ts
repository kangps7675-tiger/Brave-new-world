/**
 * 동남아·남미·아프리카 — 지정학(전선·긴장·군사) 뉴스만.
 * 지경학(시장·무역·FDI)·선거·시위·스포츠·재난 등은 배제.
 * 이 전장들은 geo-trader / 경제 시트에 넣지 않는다.
 */

import type { NewsTheater } from "@/lib/news/types";

/** 지정학 전용 지역 전장 — 경제 스트림·지경학 UI에서 제외 */
export const GEOPOLITICS_ONLY_THEATERS = [
  "southeast-asia",
  "south-america",
  "africa",
] as const satisfies readonly NewsTheater[];

export type GeopoliticsOnlyTheater = (typeof GEOPOLITICS_ONLY_THEATERS)[number];

export function isGeopoliticsOnlyTheater(
  theater: NewsTheater | "all" | string | undefined,
): theater is GeopoliticsOnlyTheater {
  return (
    theater === "southeast-asia" ||
    theater === "south-america" ||
    theater === "africa"
  );
}

/** Google 쿼리용 — 사회·경제이슈 네거티브 */
export const CONFLICT_NEWS_NEGATIVES =
  "-election -protest -demonstration -riot -crime -football -soccer -basketball -tourism -carnival -festival -earthquake -flood -drought -famine -cholera -celebrity -entertainment -olympics -GDP -stock -FDI -inflation -earnings -IPO -tourism";

/** 사회·내정·순수 경제 소프트 배제 (제목/카테고리) — 군사·제재 하드 신호 없으면 드롭 */
export const REGIONAL_SOCIAL_SOFT_RE =
  /\belection\b|\bvotes?\b|\bballot\b|\bparliament\b|\bcabinet\b|\bcorruption\b(?!.*(?:military|coup|junta))|\bprotest\b|\bdemonstration\b|\briots?\b|\bcivil\s?unrest\b|\bcrime\b|\bmurder\b|\bkidnapping\b(?!.*(?:military|militia|jihad|terror))|\bfootball\b|\bsoccer\b|\bbasketball\b|\bworld\s?cup\b|\btourism\b|\bcarnival\b|\bfestival\b|\bearthquake\b|\bflood\b|\bdrought\b|\bfamine\b|\bcholera\b|\bpandemic\b|\bcovid\b|\binflation\b|\bpoverty\b|\beducation\b|\bhealthcare\b|\bentertainment\b|\bcelebrity\b|\bolympic|\belection|\bgdp\b|\bstocks?\b|\bequity\b|\bearnings\b|\bipo\b|\bfdi\b|\bforeign\s?direct|\bbond\s?yield|\binterest\s?rate|\bcentral\s?bank|\bmarket\s?rally|\bcommodity\s?price|\brecession\b|총선|대선|시위|민주화|관광|축구|월드컵|지진|홍수|가뭄|연예|주가|금리|GDP|물가/i;

/** 전선·긴장·군사 하드 신호 */
export const REGIONAL_CONFLICT_HARD_RE =
  /\bwar\b|\bwarfare\b|\bconflict\b|\bmilitary\b|\barmy\b|\bnavy\b|\bair\s?force\b|\bmissile\b|\bdrone\b|\bstrike\b|\bbomb(ing)?\b|\bartillery\b|\boffensive\b|\binsurgency\b|\bmilitia\b|\bjihad\b|\bterror(ist|ism)?\b|\bcoup\b|\bjunta\b|\brebel\b|\barmed\b|\bcombat\b|\bbattle\b|\bceasefire\b|\bfront\s?line\b|\btension\b|\bescalat|\bdeployment\b|\bexercise\b|\bdrill\b|\bnaval\b|\bbase\b|\bsanction\b|\bblockade\b|\bmartial\s?law\b|\bwagner\b|\bafrica\s?corps\b|\bpla\b|\bplan\b|\bcoast\s?guard\b|\bmilitia|군사|전선|교전|미사일|드론|공습|쿠데타|반군|민병|긴장|제재|해군|훈련|배치/i;

export function isConflictTensionNews(text: string): boolean {
  const blob = text.trim();
  if (!blob) return false;

  const softOnly =
    REGIONAL_SOCIAL_SOFT_RE.test(blob) && !REGIONAL_CONFLICT_HARD_RE.test(blob);
  if (softOnly) return false;

  return REGIONAL_CONFLICT_HARD_RE.test(blob);
}

/** 동남아 — 남중국해·미얀마·필리핀 등 안보 */
export const SE_ASIA_ANCHOR_RE =
  /\bvietnam\b|\bphilippines?\b|\bindonesia\b|\bmalaysia\b|\bthailand\b|\bsingapore\b|\bmyanmar\b|\bburma\b|\bcambodia\b|\blaos?\b|\bbrunei\b|\basean\b|\bsouth\s?china\s?sea\b|\bwest\s?philippine\s?sea\b|\bscarborough\b|\bspratly\b|\bparacel\b|\bmalacca\b|\bnatanguna\b|\barakan\b|\brakhine\b|\btatmadaw\b|\bnug\b|\bpdf\b|\bmilitary\s?council\b|\bmarawi\b|\bmoro\b|\babus?\s?sayyaf\b|\b동남아|베트남|필리핀|인도네시아|미얀마|남중국해|말라카/i;

/** 남미 — 국경·무장·외세 군사 */
export const SOUTH_AMERICA_ANCHOR_RE =
  /\bvenezuela\b|\bguyana\b|\bessequibo\b|\bcolombia\b|\bfarc\b|\beln\b|\bbrazil\b|\bargentina\b|\bchile\b|\bperu\b|\bbolivia\b|\becuador\b|\bparaguay\b|\buruguay\b|\bsuriname\b|\bfrench\s?guiana\b|\blatin\s?america\b|\bsouth\s?america\b|\bmaduro\b|\bcaracas\b|\bamazon\s?military|\b남미|베네수엘라|가이아나|콜롬비아|브라질|아르헨티나/i;

/** 아프리카 — 사헬·수단·콩고·소말리아 등 무력 분쟁 */
export const AFRICA_ANCHOR_RE =
  /\bafrica\b|\bsahel\b|\bmali\b|\bniger\b|\bburkina\b|\bsudan\b|\bdarfur\b|\brsf\b|\bhemmeti\b|\bcongo\b|\bdrcongo\b|\bdrc\b|\bm23\b|\bethiopia\b|\btigray\b|\bsomalia\b|\bal[\s-]?shabaab\b|\blibya\b|\bhaftar\b|\bwagner\b|\bafrica\s?corps\b|\bmozambique\b|\bcabo\s?delgado\b|\bchad\b|\bcar\b|\bcentral\s?african|\bcameroon\b|\bnigeria\b|\bboko\s?haram\b|\biswap\b|\beritrea\b|\bsouth\s?sudan\b|\bruganda\b|\bruanda\b|\b아프리카|사헬|말리|니제르|수단|콩고|소말리아|와그너/i;

export function isSoutheastAsiaConflictNews(text: string): boolean {
  if (!isConflictTensionNews(text)) return false;
  return SE_ASIA_ANCHOR_RE.test(text);
}

export function isSouthAmericaConflictNews(text: string): boolean {
  if (!isConflictTensionNews(text)) return false;
  return SOUTH_AMERICA_ANCHOR_RE.test(text);
}

export function isAfricaConflictNews(text: string): boolean {
  if (!isConflictTensionNews(text)) return false;
  return AFRICA_ANCHOR_RE.test(text);
}
