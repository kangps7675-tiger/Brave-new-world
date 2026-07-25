import type { GlobeLodTier } from "@/lib/globeLod";

export type ViewportPathLayer =
  | "railroads"
  | "shipping-lanes"
  | "submarine-cables"
  | "oil-pipelines"
  | "gas-pipelines"
  | "subsea-pipelines"
  | "dispute-boundaries";

export const VIEWPORT_PATH_LAYERS: ViewportPathLayer[] = [
  "railroads",
  "shipping-lanes",
  "submarine-cables",
  "oil-pipelines",
  "gas-pipelines",
  "subsea-pipelines",
  "dispute-boundaries",
];

export function isViewportPathLayer(value: string): value is ViewportPathLayer {
  return (VIEWPORT_PATH_LAYERS as string[]).includes(value);
}

export type ViewportPathQuery = {
  layer: ViewportPathLayer;
  lat: number;
  lng: number;
  radiusDeg: number;
  tier: GlobeLodTier;
  max?: number;
  maxScalerank?: number;
  arterialMaxRank?: number;
};
