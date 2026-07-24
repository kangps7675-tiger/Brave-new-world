/**
 * 텔레그램 속보 내용 심각도 등급.
 *
 * 중요: 이 등급은 그 자체로 점수에 반영되지 않는다. 검증(newsVerification.ts) 전엔
 * 무조건 tier 1(기본) 취급 — 그래야 "아무나 자극적인 문구를 텔레그램에 올리기만 해도
 * 점수가 튀는" 조작 구멍이 막힌다. dailyRanks.ts의 telegramSeverityByTheater에서
 * 검증 상태와 함께 최종 게이팅한다.
 */

export type SeverityTier = 1 | 3 | 5;

/** tier 5 — 대규모 피해·확전급 사건 */
const TIER5_KEYWORDS = [
  "대규모 사상자",
  "사망자 다수",
  "다수 사망",
  "민간인 학살",
  "핵",
  "침공",
  "점령",
  "선전포고",
  "전면전",
  "mass casualt",
  "nuclear",
  "invasion",
  "invaded",
  "occupied",
  "occupation",
  "declared war",
  "declaration of war",
];

/** tier 3 — 타격·교전급 사건 */
const TIER3_KEYWORDS = [
  "미사일",
  "공습",
  "드론 공격",
  "폭발",
  "타격",
  "격추",
  "포격",
  "부상",
  "사상자",
  "missile",
  "airstrike",
  "air strike",
  "drone attack",
  "explosion",
  "strike",
  "shelling",
  "wounded",
  "casualt",
];

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

/** 텍스트에서 가장 높은 등급 키워드를 찾아 반환 (매칭 없으면 1 = 평시 사이렌·순찰 등) */
export function severityTierFromText(text: string): SeverityTier {
  const lower = (text || "").toLowerCase();
  if (containsAny(lower, TIER5_KEYWORDS)) return 5;
  if (containsAny(lower, TIER3_KEYWORDS)) return 3;
  return 1;
}
