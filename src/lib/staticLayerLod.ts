import type { GlobeLodTier } from "@/lib/globeLod";

export const SHIPPING_LANE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 0,
  continent: 0,
  regional: 120,
  near: 200,
  village: 400,
};

export const STATIC_POINT_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 0,
  continent: 80,
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
  global: 16,
  continent: 32,
  regional: 80,
  near: 160,
  village: 320,
};

export const GAS_PIPELINE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 20,
  continent: 40,
  regional: 100,
  near: 200,
  village: 400,
};

/** 광물·자원 매장지 — 전역에서도 전략 거점 표시 */
export const RESOURCE_POINT_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 36,
  continent: 56,
  regional: 90,
  near: 140,
  village: 220,
};
