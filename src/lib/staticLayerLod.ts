import type { GlobeLodTier } from "@/lib/globeLod";

/**
 * 항로 — 줌아웃에서도 켜면 바로 보이게 최소치 유지.
 * (예전 global/continent=0 → ON인데 빈 화면)
 */
export const SHIPPING_LANE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 28,
  continent: 56,
  regional: 120,
  near: 200,
  village: 400,
};

/**
 * 항구·공항·LNG·GEM 등 일반 정적점.
 * global=0이면 기본 카메라(부트 alt~2.85)에서 토글이 죽은 것처럼 보임.
 */
export const STATIC_POINT_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 56,
  continent: 120,
  regional: 300,
  near: 800,
  village: 2000,
};

/** 미군기지 부지 폴리곤 — 줌에 따라 면적 큰 기지부터 */
export const MILITARY_BASE_AREA_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 160,
  continent: 280,
  regional: 420,
  near: 650,
  village: 900,
};

/** 전략 매장지 footprint — 전역에서도 주요 벨트 표시 */
export const RESOURCE_DEPOSIT_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 140,
  continent: 160,
  regional: 180,
  near: 220,
  village: 280,
};

export const SUBMARINE_CABLE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 36,
  continent: 64,
  regional: 140,
  near: 280,
  village: 520,
};

export const OIL_PIPELINE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 220,
  continent: 280,
  regional: 360,
  near: 480,
  village: 640,
};

export const GAS_PIPELINE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 300,
  continent: 380,
  regional: 480,
  near: 600,
  village: 800,
};

/** GEM offshore(전 세계) + EMODnet(유럽) 해저관 */
export const SUBSEA_PIPELINE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 160,
  continent: 240,
  regional: 320,
  near: 420,
  village: 560,
};

/** 광물·자원·GEM — 전역에서도 전략 거점 표시 */
export const RESOURCE_POINT_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 48,
  continent: 72,
  regional: 110,
  near: 160,
  village: 240,
};
