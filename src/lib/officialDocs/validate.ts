import { isValidIssuerId, type OfficialDocMeta } from "@/data/officialDocs";

const KINDS = ["factsheet", "joint-statement", "readout", "statement", "press-release", "remarks", "treaty"];
const WEIGHTS = ["agreed", "unilateral", "remarks"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** 승인 직전 검사. 빈 문자열이면 통과, 아니면 고칠 이유를 돌려준다. */
export function validateDocMeta(doc: Partial<OfficialDocMeta>): string[] {
  const problems: string[] = [];
  if (!doc.id || !/^[a-z0-9][a-z0-9-]{2,80}$/.test(doc.id)) problems.push("id는 영소문자·숫자·하이픈 3~81자");
  if (!doc.issuerIds || doc.issuerIds.length === 0 || doc.issuerIds.some((id) => !isValidIssuerId(id))) problems.push("issuerIds가 비었거나 목록에 없는 곳이 있다");
  if (!doc.kind || !KINDS.includes(doc.kind)) problems.push("kind가 올바르지 않다");
  if (!doc.weight || !WEIGHTS.includes(doc.weight)) problems.push("weight가 올바르지 않다");
  if (!doc.title?.trim()) problems.push("title이 없다");
  if (!doc.publishedAt || !DAY.test(doc.publishedAt)) problems.push("publishedAt(YYYY-MM-DD)을 확인해 적어야 한다");
  if (!doc.fetchedAt || !DAY.test(doc.fetchedAt)) problems.push("fetchedAt이 없다");
  if (!doc.sourceUrl || !/^https:\/\//.test(doc.sourceUrl)) problems.push("sourceUrl은 https 주소여야 한다");
  if (!doc.sha256 || !/^[0-9a-f]{64}$/.test(doc.sha256)) problems.push("sha256이 없다");
  if (!doc.language) problems.push("language가 없다");
  if (!doc.terms || doc.terms.trim() === "" || doc.terms === "확인 전") problems.push("이용 조건(terms)을 확인해 적어야 한다");
  if (doc.weight === "agreed" && doc.issuerIds && doc.issuerIds.length < 2 && doc.kind !== "treaty") {
    // 나토 정상선언처럼 한 기구 이름으로 나온 합의문은 허용한다.
    if (!doc.issuerIds.some((id) => id === "nato" || id === "eu")) problems.push("합의 문서인데 낸 곳이 하나뿐이다(기구 합의문이 아니라면 weight를 고쳐라)");
  }
  return problems;
}
