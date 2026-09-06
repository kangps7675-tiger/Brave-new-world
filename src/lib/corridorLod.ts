/**
 * Strategic corridor LOD — scalerank from corridor-ranks.json (batch quantitative score).
 * Mirrors transportLod.ts pattern for Natural Earth railroads.
 */
import { getGlobeLod, type GlobeLodTier } from "@/lib/globeLod";

export type CorridorLod = {
  label: string;
  radiusDeg: number;
  tier: GlobeLodTier;
  /** Paths with scalerank > this are hidden */
  maxScalerank: number;
  /** Arterial (always considered even slightly off-view) */
  arterialMaxRank: number;
  maxCorridors: number;
};

const LIMITS: Record<GlobeLodTier, Omit<CorridorLod, "label" | "radiusDeg" | "tier">> = {
  global: {
    maxScalerank: 1,
    arterialMaxRank: 1,
    maxCorridors: 14,
  },
  continent: {
    maxScalerank: 2,
    arterialMaxRank: 1,
    maxCorridors: 28,
  },
  regional: {
    maxScalerank: 3,
    arterialMaxRank: 2,
    maxCorridors: 48,
  },
  near: {
    maxScalerank: 99,
    arterialMaxRank: 99,
    maxCorridors: 120,
  },
  village: {
    maxScalerank: 99,
    arterialMaxRank: 99,
    maxCorridors: 200,
  },
};

export function getCorridorLod(altitude: number): CorridorLod {
  const { label, radiusDeg, tier } = getGlobeLod(altitude);
  return { label, radiusDeg, tier, ...LIMITS[tier] };
}

export function getCorridorLodForTier(tier: GlobeLodTier, lang: "ko" | "en" = "ko"): CorridorLod {
  const lod = getGlobeLod(tier === "global" ? 2.0 : tier === "continent" ? 1.3 : tier === "regional" ? 0.9 : tier === "near" ? 0.4 : 0.15, lang);
  return { ...lod, ...LIMITS[tier], tier };
}
