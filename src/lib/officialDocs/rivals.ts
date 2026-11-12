/**
 * 서로 맞서거나 적대적인 당사국 쌍. 한쪽이 무슨 조치를 내면 상대가 곧바로 외교적 수사(규탄·반박·맞대응)를 내놓는 사이라서,
 * 속보에 두 나라가 함께 나오면 양쪽의 공식 발언을 나란히 놓는다.
 *
 * 쌍은 "문서를 낸 곳(issuer id)"으로 적는다. 속보 글에서 당사자를 읽는 쪽(eventScenarios의 ACTORS)이 아직 읽는 나라만 넣었다 —
 * 일본·인도·파키스탄 등은 ACTORS에 없어서 지금은 쌍에 넣지 못한다(넣으면 속보에서 읽히지 않아 쓸모가 없다).
 */
export const RIVAL_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["us", "cn"],
  ["us", "ru"],
  ["us", "ir"],
  ["ru", "ua"],
  ["ru", "nato"],
  ["il", "ir"],
  ["cn", "tw"],
];

/** 문서를 낸 곳 → 속보 글에서 읽히는 당사자 id (match.ts의 ACTOR_OF_ISSUER와 같은 값) */
const ACTOR: Record<string, string> = { us: "us", ru: "russia", cn: "china", tw: "taiwan", ir: "iran", il: "israel", ua: "ukraine", nato: "nato" };

/** 속보에 두 당사자가 모두 나온 쌍들 */
export function activeRivalPairs(actors: ReadonlySet<string>): Array<readonly [string, string]> {
  return RIVAL_PAIRS.filter(([a, b]) => actors.has(ACTOR[a] ?? "?") && actors.has(ACTOR[b] ?? "?"));
}

/** 두 문서 발행처가 서로 맞서는 사이인가 */
export function rivalPairOf(a: string, b: string): readonly [string, string] | null {
  return RIVAL_PAIRS.find(([x, y]) => (x === a && y === b) || (x === b && y === a)) ?? null;
}
