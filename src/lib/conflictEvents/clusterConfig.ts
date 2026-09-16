import type { ClusterThresholds } from "@/lib/conflictEvents/types";

/**
 * 클러스터 판정 — 시간창은 보수적으로 2h 에서 시작.
 * 오탐(같은 지역·다른 시각 별개 사건)이 보이면 창을 더 줄이고,
 * 중복 핀이 남으면 점진 완화.
 */
export const CLUSTER_DEFAULTS: ClusterThresholds = {
  geohashPrecision: 5,
  maxDistanceKm: 10,
  maxTimeDiffMs: 2 * 60 * 60 * 1000,
  minJaccard: 0.34,
};

export const LLM_DISAMBIGUATE_MAX_PER_BATCH = 8;
