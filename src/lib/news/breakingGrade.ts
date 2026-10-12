/**
 * 속보 등급 엔진
 * - 내부: 1~10 (Impact · Fresh · Trust · Cluster)
 * - UI: S / A / B
 * - Tier3(미검증) 단독: 최대 7
 * - S(9~10): Impact·Fresh 겹침 + Tier1 교차확인(≥2)
 */

import type { MediaTrustTier, NewsFeedTopic, NewsStreamItem, NewsTheater } from "@/lib/news/types";

export type BreakingGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type BreakingUiRank = "S" | "A" | "B";

export type BreakingAxes = {
  impact: number;
  fresh: number;
  trust: number;
  cluster: number;
};

export type BreakingGradeResult = {
  /** 1~10 내부 눈금 */
  grade: BreakingGrade;
  /** 유저 노출 등급 */
  rank: BreakingUiRank;
  axes: BreakingAxes;
  /** 하위 호환·정렬용 (grade × 10) */
  urgencyScore: number;
};

/** 충격 — 교전·핵·초크포인트·시장 쇼크 등 */
const IMPACT_CRITICAL =
  /\b(nuclear|invasion|hormuz|suez|malacca|bab[\s-]?el[\s-]?mandeb|taiwan\s?strait|panama\s?canal|red\s?sea|genocide|massacre|assassinate|default|bankrupt|record\s?crash|black\s?swan)\b/i;
const IMPACT_HIGH =
  /\b(missile|airstrike|drone\s?strike|explosion|war|offensive|ceasefire\s?collapse|sanction|embargo|blockade|crash|plunge|selloff|surge|soar|tumble|bosporus|gibraltar)\b/i;
const IMPACT_MED =
  /\b(attack|strike|shelling|clash|troops|carrier|escalat|retaliat|killed|dead|bomb|hike|cut|rally|shutdown|breaking|urgent|just\s?in|drill|military\s?exercise|deploy(?:s|ed|ment)?|mobiliz\w*|summit|ceasefire|peace\s?talks|negotiat\w*|diplomatic|cyber\s?attack|cyberattack|hack(?:ed|ing)?|sabotage|coup|martial\s?law|unrest|nato|defense\s?pact)\b/i;
// 2026-09-22: 하이브리드전·안보위협·군사훈련·외교·안보재편까지 신속 속보 대상으로 확장 — 필성 요청

/**
 * 국가적 소요·정치 혼란 — 정권·치안 체제가 흔들리는 수준 (충격 3).
 * 단순 집회(MED)와 구분: 계엄·비상사태·통금·무력진압·사망·총파업·탄핵·정부 붕괴.
 */
const IMPACT_UNREST_HIGH =
  /\b(martial\s?law|state\s?of\s?emergency|curfew|crackdown|tear\s?gas|live\s?(?:fire|rounds)|protesters?\s?(?:killed|dead|shot)|(?:nation|country)[\s-]?wide\s?(?:protests?|strike|unrest)|mass\s?protests?|general\s?strike|impeach\w*|no[\s-]?confidence|government\s?(?:collapse[sd]?|falls?|toppled)|coalition\s?collapse\w*|cabinet\s?(?:resign\w*|dissolved)|parliament\s?(?:dissolved|stormed)|storm(?:ed|ing)\s?(?:the\s?)?(?:parliament|capitol|palace)|regime\s?change|junta|election\s?(?:fraud|rigg\w*|annul\w*|dispute[sd]?)|rigged\s?election|stolen\s?election|vote\s?(?:rigging|tampering)|ballot\s?stuffing|results?\s?(?:rejected|annulled|disputed)|refuses?\s?to\s?concede)\b|부정\s?선거|선거\s?(?:조작|불복|무효)|개표\s?조작|계엄|비상사태|통행금지|무력\s?진압|최루탄|총파업|탄핵|불신임|정부\s?붕괴|내각\s?총사퇴|의회\s?해산|대규모\s?시위|전국\s?시위/i;
/** 시위·집회·정치적 압박 — 규모 미확인 단계 (충격 2) */
const IMPACT_UNREST_MED =
  /\b(protest(?:s|ers?|ing)?|demonstrat(?:ion|ions|ors?)|rall(?:y|ies)|riots?|unrest|uprising|strikes?|walkout|sit[\s-]?in|blockad(?:e|es)\s?(?:roads?|highway)|approval\s?(?:rating|ratings)|poll\s?(?:rating|slump)|snap\s?election|resign(?:s|ed|ation)?|political\s?crisis|power\s?struggle|opposition\s?(?:leader|rally)|coup\s?attempt|elections?|runoff|recount|front[ -]?runner|poll\s?(?:leader|lead)|candidacy|presidential\s?(?:bid|hopeful|candidate)|successor|dark\s?horse)\b|선거|출마|차기|후계|시위|집회|항의|폭동|소요|지지율|조기\s?총선|사퇴|정치\s?위기|정국\s?혼란/i;

/**
 * 나토 동부 전선(발트 3국·폴란드·루마니아·몰도바·핀란드 등) + 하이브리드 수단.
 * 위험도 순서(우크라이나 → 이란 → 중동 → 동유럽·발트)상 네 번째 권역이라, 이 조합은 전장 테마가 "global"이어도
 * 충격을 한 단계 올린다 (최소 3). 군사 충돌 보도가 아니라 침범·교란·사보타주 보도를 겨냥한다.
 */
const EASTERN_FLANK_RE =
  /\b(poland|polish|lithuania\w*|latvia\w*|estonia\w*|baltic|romania\w*|moldova\w*|slovakia|finland|finnish|suwalki|kaliningrad|narva)\b|폴란드|발트|리투아니아|라트비아|에스토니아|루마니아|몰도바|핀란드|칼리닌그라드|수바우키/i;
const FLANK_HYBRID_RE =
  /\b(airspace|border\s?(?:violation|incursion|crossing)|drone\s?incursion|drones?\b[^.]{0,40}\b(?:entered|crossed|violat\w*|fell|crash\w*)|sabotage|arson|gps\s?(?:jamming|spoofing)|jamming|cable\s?(?:cut|damaged)|balloons?|hybrid)\b|영공|국경\s?침범|사보타주|방화|GPS\s?(?:교란|재밍)|해저\s?케이블|풍선|하이브리드/i;

/**
 * 신무기·군사훈련 — 전략 무기 시험·전장 첫 사용(충격 3), 일반 시험·배치·훈련·공개(충격 2).
 * 타격 결과 보도는 기존 HIGH/MED가 처리하므로 여기선 무기 이벤트 자체만 본다.
 */
const IMPACT_WEAPONS_HIGH =
  /\b(?:(?:icbm|slbm|irbm|hypersonic|ballistic|cruise|intercontinental)\s?(?:missile)?[^.]{0,40}\b(?:test[\s-]?fire[sd]?|test\s?launch\w*|launch(?:ed|es)?|flight\s?test)|(?:test[\s-]?fire[sd]?|test\s?launch\w*|flight\s?test)[^.]{0,40}\b(?:icbm|slbm|irbm|hypersonic|ballistic|nuclear[\s-]?capable)|first\s?(?:combat\s?)?use|combat\s?debut|battlefield\s?debut|first\s?used\s?in\s?(?:combat|battle)|nuclear[\s-]?capable)\b|대륙간|극초음속|전장\s?(?:투입|첫\s?사용)|실전\s?투입|핵\s?탑재/i;
const IMPACT_WEAPONS_MED =
  /\b(?:test[\s-]?fire[sd]?|test\s?launch\w*|flight\s?test|enter(?:s|ed)?\s?service|commission(?:s|ed|ing)?|operational(?:ly)?\s?deploy\w*|unveil(?:s|ed)|prototype|next[\s-]?generation|new\s?(?:missile|weapon|drone|fighter|warship|submarine)|live[\s-]?fire|war\s?games?|military\s?(?:drills?|exercises?)|joint\s?exercises?|amphibious\s?(?:landing|assault))\b|시험\s?발사|실전\s?배치|취역|신형|신무기|차세대|합동\s?(?:훈련|연습)|군사\s?훈련|실사격/i;

const THEATER_IMPACT_BONUS: Partial<Record<NewsTheater, number>> = {
  "middle-east": 1,
  "russia-ukraine": 1,
};

/** 찌라시(Tier3) 단독 상한 — UI로는 A 이하 */
export const TIER3_GRADE_CAP = 7;

/** S급 최소 등급 */
export const S_GRADE_MIN = 9;

/** A급 최소 등급 (히어로 배너) */
export const A_GRADE_MIN = 6;

export function breakingRankFromGrade(grade: number): BreakingUiRank {
  if (grade >= S_GRADE_MIN) return "S";
  if (grade >= A_GRADE_MIN) return "A";
  return "B";
}

function scoreImpact(title: string, theater: NewsTheater, topic?: NewsFeedTopic): number {
  let impact = 0;
  if (IMPACT_CRITICAL.test(title)) impact = 4;
  else if (IMPACT_HIGH.test(title) || IMPACT_UNREST_HIGH.test(title)) impact = 3;
  else if (IMPACT_WEAPONS_HIGH.test(title)) impact = 3;
  else if (
    IMPACT_MED.test(title) ||
    IMPACT_UNREST_MED.test(title) ||
    IMPACT_WEAPONS_MED.test(title)
  ) {
    impact = 2;
  }
  else if (topic === "economy") impact = 1;
  else impact = 0;

  impact += THEATER_IMPACT_BONUS[theater] ?? 0;
  if (EASTERN_FLANK_RE.test(title) && FLANK_HYBRID_RE.test(title)) {
    impact = Math.max(impact, 3);
  }
  return Math.min(4, impact);
}

function scoreFresh(ageMinutes: number): number {
  // "지금 당장" 가중 — 30분 이내를 최상으로
  if (ageMinutes <= 30) return 3;
  if (ageMinutes <= 90) return 2;
  if (ageMinutes <= 240) return 1;
  return 0;
}

function uniqueSources(cluster: NewsStreamItem[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of cluster) {
    const key = (item.source || item.publisher || item.link).toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function tier1Count(cluster: NewsStreamItem[]): number {
  const sources = new Set<string>();
  for (const item of cluster) {
    if (item.trustTier !== 1) continue;
    sources.add((item.source || item.link).toLowerCase().trim());
  }
  return sources.size;
}

function scoreTrust(candidate: NewsStreamItem, cluster: NewsStreamItem[]): number {
  const t1 = tier1Count(cluster);
  if (t1 >= 2) return 3;
  if (candidate.trustTier === 1 || t1 >= 1) return 2;
  if (candidate.trustTier === 2 || cluster.some((c) => c.trustTier === 2)) return 1;
  return 0;
}

function scoreCluster(cluster: NewsStreamItem[]): number {
  const n = uniqueSources(cluster).length;
  if (n >= 3) return 2;
  if (n >= 2) return 1;
  return 0;
}

function isTier3Solo(candidate: NewsStreamItem, cluster: NewsStreamItem[]): boolean {
  if (candidate.trustTier !== 3) return false;
  return !cluster.some((c) => c.trustTier === 1 || c.trustTier === 2);
}

/**
 * 큰일(Impact) × 급함(Fresh)이 겹치면 최상위 후보.
 * Trust·Cluster로 승급, Tier3 단독·교차확인 부족 시 캡.
 */
export function computeBreakingGrade(
  item: NewsStreamItem,
  cluster: NewsStreamItem[],
  ageMinutes: number,
): BreakingGradeResult {
  const impact = scoreImpact(item.title, item.theater, item.feedTopic);
  const fresh = scoreFresh(ageMinutes);
  const trust = scoreTrust(item, cluster);
  const clusterPts = scoreCluster(cluster);

  // 큰일×급함 코어
  let raw = impact + fresh;
  if (impact >= 3 && fresh >= 2) raw += 2; // 겹침 보너스 → S 후보
  raw += trust + clusterPts;

  let grade = Math.min(10, Math.max(1, Math.round(raw))) as BreakingGrade;

  // 찌라시 단독 천장
  if (isTier3Solo(item, cluster)) {
    grade = Math.min(grade, TIER3_GRADE_CAP) as BreakingGrade;
  }

  // S는 Tier1 교차확인(서로 다른 Tier1 매체 ≥2) 필수
  if (grade >= S_GRADE_MIN && tier1Count(cluster) < 2) {
    grade = Math.min(grade, A_GRADE_MIN + 2) as BreakingGrade; // max 8 → A
  }

  const rank = breakingRankFromGrade(grade);
  return {
    grade,
    rank,
    axes: { impact, fresh, trust, cluster: clusterPts },
    urgencyScore: grade * 10,
  };
}

export function shouldEmitBreakingSos(rank: BreakingUiRank | undefined | null): boolean {
  return rank === "S";
}

/** 테스트·디버그용 */
export function describeBreakingGrade(result: BreakingGradeResult): string {
  const { grade, rank, axes } = result;
  return `G${grade}/${rank} I${axes.impact} F${axes.fresh} T${axes.trust} C${axes.cluster}`;
}

export type { MediaTrustTier };
