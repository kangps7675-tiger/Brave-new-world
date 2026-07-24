/**
 * 일본 지정학 뉴스 — 내정·사회·일반 경제 제외.
 * 국방·동맹·영토·북한·인도태평양 안보 축만.
 */

/** Google News / RSS 쿼리용 핵심 앵커 */
export const JAPAN_GEOPOLITICS_QUERY_ANCHOR =
  '(Japan OR Tokyo OR Okinawa OR Senkaku OR Diaoyu OR Kuril OR Kurils OR "Northern Territories" OR Habomai OR Shikotan OR Kunashiri OR Etorofu OR Iturup OR "Self-Defense Force" OR SDF OR JMSDF OR USFJ OR "Indo-Pacific" OR Quad OR AUKUS)';

/** Google News / RSS 쿼리용 지정학 동사·주제 */
export const JAPAN_GEOPOLITICS_QUERY_TOPIC =
  '(defense OR security OR military OR missile OR maritime OR alliance OR exercise OR drill OR deployment OR submarine OR counterstrike OR "extended deterrence" OR "defense budget" OR PLA OR PLAN OR China OR Russia OR "North Korea" OR Pyongyang OR abductee OR Taiwan OR "gray zone" OR ADIZ OR "coast guard" OR trilateral OR "US-Japan" OR "Japan-Australia" OR "Japan South Korea" OR "peace treaty")';

/** 포함 — 지정학 하드 신호 */
export const JAPAN_GEOPOLITICS_RE =
  /okinawa|senkaku|diaoyu|nansei|southwest\s?islands|yonaguni|ishigaki|miyako|kuril|kurils|northern\s?territor|habomai|shikotan|kunashiri|kunashir|etorofu|iturup|self[\s-]?defense\s?force|\bsdf\b|jmsdf|jasdf|jgsdf|usfj|us\s?forces\s?japan|yokosuka|sasebo|kadena|misawa|futenma|aukus|quad\b|indo[\s-]?pacific|foip|extended\s?deterrence|counterstrike|collective\s?security|defense\s?budget|remote\s?islands|gray\s?zone|adiz|coast\s?guard|pla\b|plan\b|plaaf|ballistic|icbm|abductee|abduction|trilateral|camp\s?david|us[\s-]?japan|japan[\s-]?australia|japan[\s-]?korea|korea[\s-]?japan|미일|한일|자위대|오키나와|센카쿠|쿠릴|북방영토|하보마이|시코탄|구나시리|에토로후|남서제도|인도태평양|확장억제|반격능력|방위비|방위|회색지대/i;

/** 일본 맥락 앵커 (단독 Tokyo/Japan만으로는 부족 — 지정학 토픽과 AND) */
export const JAPAN_ANCHOR_RE =
  /\bjapan\b|\bjapanese\b|\btokyo\b|\b일본\b|\b도쿄\b|okinawa|senkaku|kuril|northern\s?territor|sdf\b|자위대|오키나와|센카쿠|쿠릴|북방영토/i;

/** 지정학 토픽 (일본 앵커와 함께) */
export const JAPAN_GEOPOLITICS_TOPIC_RE =
  /defense|security|military|missile|maritime|alliance|exercise|drill|deployment|submarine|navy|aegis|pac-?3|tomahawk|intercept|counterstrike|deterrence|sanction|pla\b|china|beijing|russia|moscow|kremlin|north\s?korea|pyongyang|taiwan|strait|kuril|northern\s?territor|aukus|quad\b|indo[\s-]?pacific|trilateral|foreign\s?minister|summit|treaty|peace\s?treaty|국방|안보|미사일|동맹|훈련|배치|중국|러시아|북한|대만|쿠릴|북방영토|외교|제재|평화조약/i;

/** 내정·사회·일반 경제 — 지정학 창에서 배제 */
export const JAPAN_DOMESTIC_SOFT_RE =
  /\belection\b|\bldp\b|\bdiet\b|\bcabinet\s?reshuffle\b|\bprime\s?minister\b(?!.*(?:defense|security|alliance|china|korea|missile))|\byasukuni\b|\byen\b|\bboj\b|\bbank\s?of\s?japan\b|\bnikkei\b|\bstock\b|\bearnings\b|\binflation\b|\binterest\s?rate\b|\btourism\b|\bolympic\b|\bearthquake\b|\btyphoon\b|\bcrime\b|\bimmigration\b|\bculture\b|\bentertainment\b|\bsoftbank\b|\bsony\b|\btoyota\b|\bfast\s?retailing\b|\bkeyence\b|총선|중의원|참의원|자민당|내각|엔화|일본은행|니케이|관광|지진|태풍|연예|문화/i;

/**
 * 지정학 일본 뉴스인지.
 * - 강한 지오 키워드 단독 통과, 또는 Japan/Tokyo + 안보 토픽
 * - 내정·사회·일반 경제만이면 탈락 (안보 토픽이 함께 있으면 통과)
 */
export function isJapanGeopoliticsNews(text: string): boolean {
  const blob = text.trim();
  if (!blob) return false;

  const softOnly =
    JAPAN_DOMESTIC_SOFT_RE.test(blob) &&
    !JAPAN_GEOPOLITICS_RE.test(blob) &&
    !JAPAN_GEOPOLITICS_TOPIC_RE.test(blob);
  if (softOnly) return false;

  if (JAPAN_GEOPOLITICS_RE.test(blob)) return true;

  return JAPAN_ANCHOR_RE.test(blob) && JAPAN_GEOPOLITICS_TOPIC_RE.test(blob);
}
