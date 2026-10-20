"use client";

import { useEffect, useState } from "react";
import type { TransportPath } from "@/data/geoTypes";
import type { MaritimeGraph } from "@/lib/maritime/types";
import { sampleRoutesToTransportPaths } from "@/lib/maritime/routePaths";

type SamplePayload = {
  routes?: Array<{
    id: string;
    fromId: string;
    toId: string;
    fromName: string;
    toName: string;
    nodePath: string[];
    lengthKm: number;
    capacityNorm: number;
    points: { lat: number; lng: number }[];
  }>;
};

/**
 * Precomputed PortWatch maritime graph sample routes (Rotterdam↔China etc.).
 * Loaded once from public/data/crink/maritime-routes-sample.json.
 */
export function useMaritimeRoutePaths(enabled: boolean): TransportPath[] {
  const [paths, setPaths] = useState<TransportPath[]>([]);

  useEffect(() => {
    if (!enabled) {
      setPaths([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [graphRes, routesRes] = await Promise.all([
          fetch("/data/crink/maritime-graph.json"),
          fetch("/data/crink/maritime-routes-sample.json"),
        ]);
        if (!graphRes.ok || !routesRes.ok) return;
        const graph = (await graphRes.json()) as MaritimeGraph;
        const samples = (await routesRes.json()) as SamplePayload;
        if (cancelled || !graph.nodes || !samples.routes?.length) return;
        setPaths(sampleRoutesToTransportPaths(graph, samples.routes));
      } catch {
        /* optional layer */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return paths;
}
