import type { TransportPath } from "@/data/geoTypes";
import { shippingLaneNearChokepoint } from "@/lib/shippingLaneStyle";

/** PortWatch graph routes — amber/cyan blend, width scales with capacityNorm */
export const MARITIME_ROUTE_CYAN = "rgba(56, 232, 255, 0.72)";
export const MARITIME_ROUTE_CHOKE = "rgba(255, 160, 90, 0.82)";
export const MARITIME_ROUTE_CYAN_LIGHT = "rgba(14, 116, 144, 0.78)";
export const MARITIME_ROUTE_CHOKE_LIGHT = "rgba(190, 80, 40, 0.82)";

function capacityNorm(path: TransportPath): number {
  const raw = path.meta?.capacityNorm;
  return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0.15, Math.min(1, raw)) : 0.5;
}

export function maritimeRouteColor(
  path: TransportPath,
  tone: "light" | "dark" = "dark",
): string {
  const nearChoke = shippingLaneNearChokepoint(
    { ...path, kind: "shipping-lane" },
    3.2,
  );
  if (nearChoke) {
    return tone === "light" ? MARITIME_ROUTE_CHOKE_LIGHT : MARITIME_ROUTE_CHOKE;
  }
  return tone === "light" ? MARITIME_ROUTE_CYAN_LIGHT : MARITIME_ROUTE_CYAN;
}

export function maritimeRouteStroke(path: TransportPath): number {
  const cap = capacityNorm(path);
  return 1.2 + cap * 2.4;
}

export function maritimeRouteDashLength(): number {
  return 4;
}
