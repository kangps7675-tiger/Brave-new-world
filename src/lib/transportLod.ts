import { getGlobeLod, type GlobeLodTier } from "@/lib/globeLod";

export type TransportLod = {
  label: string;
  radiusDeg: number;
  railMaxScalerank: number;
  arterialMaxRank: number;
  maxRailroads: number;
};

/**
 * Natural Earth 10m railroads 의 SCALERANK는 최소 4부터 시작.
 * global에 2를 쓰면 철도가 전부 걸러져 “켜도 안 뜸”.
 */
const LIMITS: Record<GlobeLodTier, Omit<TransportLod, "label" | "radiusDeg">> = {
  global: {
    railMaxScalerank: 4,
    arterialMaxRank: 4,
    maxRailroads: 480,
  },
  continent: {
    railMaxScalerank: 6,
    arterialMaxRank: 4,
    maxRailroads: 900,
  },
  regional: {
    railMaxScalerank: 8,
    arterialMaxRank: 5,
    maxRailroads: 1000,
  },
  near: {
    railMaxScalerank: 99,
    arterialMaxRank: 99,
    maxRailroads: 2200,
  },
  village: {
    railMaxScalerank: 99,
    arterialMaxRank: 99,
    maxRailroads: 3500,
  },
};

export function getTransportLod(altitude: number): TransportLod {
  const { label, radiusDeg, tier } = getGlobeLod(altitude);
  return { label, radiusDeg, ...LIMITS[tier] };
}
