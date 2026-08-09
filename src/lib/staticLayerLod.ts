import type { GlobeLodTier } from "@/lib/globeLod";
import type { ViewerMode } from "@/lib/viewPackages";

/**
 * 항로 — 줌아웃에서도 켜면 바로 보이게 최소치 유지.
 * (예전 global/continent=0 → ON인데 빈 화면)
 */
export const SHIPPING_LANE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 48,
  continent: 96,
  regional: 180,
  near: 320,
  village: 600,
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

/**
 * 지경학 — 줌아웃에서 파이프/케이블 다이어트.
 * global/continent = 0 (초크·크리티컬 노드만 지도 골격).
 * regional = GEM 간선. near/village = 상세 + OSM.
 */
export const ECONOMY_SUBMARINE_CABLE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 0,
  continent: 0,
  regional: 48,
  near: 160,
  village: 320,
};

export const ECONOMY_OIL_PIPELINE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 0,
  continent: 0,
  regional: 80,
  near: 240,
  village: 400,
};

export const ECONOMY_GAS_PIPELINE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 0,
  continent: 0,
  regional: 100,
  near: 280,
  village: 480,
};

export const ECONOMY_SUBSEA_PIPELINE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 0,
  continent: 0,
  regional: 60,
  near: 200,
  village: 360,
};

export type InfraPathLodKind =
  | "submarine-cables"
  | "oil-pipelines"
  | "gas-pipelines"
  | "subsea-pipelines";

const CONFLICT_PATH_CAPS: Record<InfraPathLodKind, Record<GlobeLodTier, number>> = {
  "submarine-cables": SUBMARINE_CABLE_MAX_BY_TIER,
  "oil-pipelines": OIL_PIPELINE_MAX_BY_TIER,
  "gas-pipelines": GAS_PIPELINE_MAX_BY_TIER,
  "subsea-pipelines": SUBSEA_PIPELINE_MAX_BY_TIER,
};

const ECONOMY_PATH_CAPS: Record<InfraPathLodKind, Record<GlobeLodTier, number>> = {
  "submarine-cables": ECONOMY_SUBMARINE_CABLE_MAX_BY_TIER,
  "oil-pipelines": ECONOMY_OIL_PIPELINE_MAX_BY_TIER,
  "gas-pipelines": ECONOMY_GAS_PIPELINE_MAX_BY_TIER,
  "subsea-pipelines": ECONOMY_SUBSEA_PIPELINE_MAX_BY_TIER,
};

export function pathMaxForMode(
  kind: InfraPathLodKind,
  tier: GlobeLodTier,
  mode: ViewerMode = "conflict",
): number {
  const table = mode === "economy" ? ECONOMY_PATH_CAPS : CONFLICT_PATH_CAPS;
  return table[kind][tier] ?? 0;
}

/** 지경학: GEM 파이프·케이블은 regional+ 에서만 fetch */
export function economyAllowsGemInfra(tier: GlobeLodTier): boolean {
  return tier === "regional" || tier === "near" || tier === "village";
}

/** 지경학: OSM·LNG·AI DC는 near+ 상세 뷰 */
export function economyAllowsDetailInfra(tier: GlobeLodTier): boolean {
  return tier === "near" || tier === "village";
}

/** 지정학 OSM은 기존처럼 regional+ */
export function conflictAllowsOsmPipelines(tier: GlobeLodTier): boolean {
  return tier === "regional" || tier === "near" || tier === "village";
}
