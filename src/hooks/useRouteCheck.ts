"use client";

import { useEffect, useState } from "react";
import { checkRoute, type NavWarning, type RouteBrief, type RouteIncident } from "@/lib/routeCheck";

type Coords = unknown;
type LL = readonly [number, number];

function flatten(c: Coords, out: LL[]): void {
  if (!Array.isArray(c)) return;
  if (c.length >= 2 && typeof c[0] === "number" && typeof c[1] === "number") {
    out.push([c[1] as number, c[0] as number]); // GeoJSON은 [lng, lat]
    return;
  }
  for (const x of c) flatten(x, out);
}

type NavFeature = {
  geometry?: { coordinates?: Coords };
  properties?: { id: string; areaHint?: string; description?: string; date?: string | null; radiusNm?: number | null; lat?: number | null; lng?: number | null };
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** 출발·도착 항구를 고르면 UKMTO(최근 200건)와 항행경보를 받아 항로를 확인한다. */
export function useRouteCheck(fromId: string, toId: string) {
  const [state, setState] = useState<{ loading: boolean; brief: RouteBrief | null }>({ loading: false, brief: null });
  useEffect(() => {
    if (!fromId || !toId || fromId === toId) {
      setState({ loading: false, brief: null });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    void (async () => {
      const [uk, nav] = await Promise.all([
        getJson<{ incidents: RouteIncident[] }>("/api/ukmto?limit=200"),
        getJson<{ features: NavFeature[] }>("/api/navarea"),
      ]);
      if (!alive) return;
      const warnings: NavWarning[] = (nav?.features ?? []).map((f) => {
        const pts: LL[] = [];
        flatten(f.geometry?.coordinates, pts);
        const p = f.properties;
        if (pts.length === 0 && p?.lat != null && p?.lng != null) pts.push([p.lat, p.lng]);
        return { id: p?.id ?? "", areaHint: p?.areaHint ?? "", description: p?.description ?? "", date: p?.date ?? null, points: pts, radiusNm: p?.radiusNm ?? null };
      });
      setState({ loading: false, brief: checkRoute(fromId, toId, { incidents: uk?.incidents ?? [], warnings }) });
    })();
    return () => {
      alive = false;
    };
  }, [fromId, toId]);
  return state;
}
