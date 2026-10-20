"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StaticPoint, TransportPath } from "@/data/geoTypes";
import type { ObserveStraitPreset } from "@/lib/cesiumStraitScene";
import type { ViewportPathLayer } from "@/lib/viewportPathTypes";
import {
  buildStraitStaticPathSegments,
  pickStraitPortMarkers,
  type StraitPortMarker,
} from "@/lib/cesiumStraitOverlays";
import type { MaritimeOverlaySegment } from "@/lib/cesiumMaritimeOverlays";

const PATH_LAYERS: ViewportPathLayer[] = [
  "shipping-lanes",
  "submarine-cables",
  "oil-pipelines",
  "gas-pipelines",
  "subsea-pipelines",
];

const POINT_LAYERS = ["ports", "lng-terminals"] as const;

function roundCoord(n: number) {
  return Math.round(n * 10) / 10;
}

/**
 * 활성 해협 주변만 서버 viewport API로 정적 밀도 fetch.
 * MapLibre 레이어판 ON이 아니라 Cesium 오버레이용이다.
 */
export function useObserveStraitStaticDensity(options: {
  enabled: boolean;
  preset: ObserveStraitPreset | null;
}): {
  pathSegments: MaritimeOverlaySegment[];
  ports: StraitPortMarker[];
} {
  const [paths, setPaths] = useState<TransportPath[]>([]);
  const [points, setPoints] = useState<StaticPoint[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  const preset = options.preset;
  const enabled = options.enabled && preset != null;

  useEffect(() => {
    if (!enabled || !preset) {
      setPaths([]);
      setPoints([]);
      return;
    }

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const lat = roundCoord(preset.lat);
      const lng = roundCoord(preset.lng);
      const radius = String(preset.staticRadiusDeg);

      const pathFetches = PATH_LAYERS.map(async (layer) => {
        const params = new URLSearchParams({
          layer,
          lat: String(lat),
          lng: String(lng),
          radius,
          tier: "near",
          max: "36",
        });
        const res = await fetch(`/api/layers/viewport-paths?${params}`, {
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) return [] as TransportPath[];
        const payload = (await res.json()) as { paths?: TransportPath[] };
        return Array.isArray(payload.paths) ? payload.paths : [];
      });

      const pointFetches = POINT_LAYERS.map(async (layer) => {
        const params = new URLSearchParams({
          layer,
          lat: String(lat),
          lng: String(lng),
          radius,
          tier: "near",
          max: "24",
        });
        const res = await fetch(`/api/layers/viewport-points?${params}`, {
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) return [] as StaticPoint[];
        const payload = (await res.json()) as { points?: StaticPoint[] };
        return Array.isArray(payload.points) ? payload.points : [];
      });

      void Promise.all([Promise.all(pathFetches), Promise.all(pointFetches)])
        .then(([pathGroups, pointGroups]) => {
          if (ac.signal.aborted) return;
          setPaths(pathGroups.flat());
          setPoints(pointGroups.flat());
        })
        .catch(() => {
          if (ac.signal.aborted) return;
          /* last-good 유지 */
        });
    }, 280);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [enabled, preset]);

  const pathSegments = useMemo(
    () => (enabled ? buildStraitStaticPathSegments(paths) : []),
    [enabled, paths],
  );
  const ports = useMemo(
    () => (enabled ? pickStraitPortMarkers(points) : []),
    [enabled, points],
  );

  return { pathSegments, ports };
}
