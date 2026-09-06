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
  /\b(attack|strike|shelling|clash|troops|carrier|escalat|retaliat|killed|dead|bomb|hike|cut|rally|shutdown|breaking|urgent|just\s?in)\b/i;

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
  else if (IMPACT_HIGH.test(title)) impact = 3;
  else if (IMPACT_MED.test(title)) impact = 2;
  else if (topic === "economy") impact = 1;
  else impact = 0;

  impact += THEATER_IMPACT_BONUS[theater] ?? 0;
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
