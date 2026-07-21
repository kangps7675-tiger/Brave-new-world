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

export const SUBMARINE_CABLE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 36,
  continent: 64,
  regional: 140,
  near: 280,
  village: 520,
};

export const OIL_PIPELINE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 36,
  continent: 56,
  regional: 100,
  near: 180,
  village: 320,
};

export const GAS_PIPELINE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 44,
  continent: 72,
  regional: 120,
  near: 220,
  village: 400,
};

/** 광물·자원·GEM — 전역에서도 전략 거점 표시 */
export const RESOURCE_POINT_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 48,
  continent: 72,
  regional: 110,
  near: 160,
  village: 240,
};
