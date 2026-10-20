"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cellToBoundary, cellToLatLng } from "h3-js";
import type { GeoJsonGeometry } from "@/data/geoTypes";
import {
  gpsJamColor,
  type GpsJamCell,
  type GpsJamLevel,
} from "@/lib/gpsJam";
import { isCenterInView, type ViewPoint } from "@/lib/viewportCull";

export type GpsJamPolygonFeature = {
  polygonLayer: "gps-jam";
  id: string;
  hex: string;
  ratio: number;
  level: GpsJamLevel;
  total: number;
  center: { lat: number; lng: number };
  geometry: GeoJsonGeometry;
  fill: string;
  name: string;
};

type ApiPayload = {
  date: string | null;
  daysAgo: number | null;
  cells: GpsJamCell[];
  attribution?: string;
  error?: string;
};

const FETCH_MS = 6 * 60 * 60 * 1000; // 클라이언트도 일 단위 — 초·분 폴링 금지
/** 뷰포트 내 렌더 상한 (high 우선) */
const CELL_CAP = 480;

function hexToPolygon(hex: string): { geometry: GeoJsonGeometry; center: { lat: number; lng: number } } | null {
  try {
    const boundary = cellToBoundary(hex); // [lat, lng][]
    if (!boundary?.length) return null;
    const ring = boundary.map(([lat, lng]) => [lng, lat] as [number, number]);
    // 폐합
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
      ring.push([first[0], first[1]]);
    }
    const [lat, lng] = cellToLatLng(hex);
    return {
      geometry: { type: "Polygon", coordinates: [ring] },
      center: { lat, lng },
    };
  } catch {
    return null;
  }
}

function levelRank(level: GpsJamLevel): number {
  if (level === "high") return 2;
  if (level === "medium") return 1;
  return 0;
}

export function useGpsJamLayer(opts: {
  enabled: boolean;
  view: ViewPoint;
  radiusDeg: number;
}) {
  const { enabled, view, radiusDeg } = opts;
  const [cells, setCells] = useState<GpsJamCell[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setStatus((s) => (s === "ok" ? s : "loading"));
    try {
      const res = await fetch("/api/gps-jam", { cache: "default" });
      const json = (await res.json()) as ApiPayload;
      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setCells(Array.isArray(json.cells) ? json.cells : []);
      setDate(json.date);
      setError(null);
      setStatus("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "GPSJam load failed");
      setStatus("error");
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), FETCH_MS);
    return () => window.clearInterval(id);
  }, [enabled, load]);

  const polygons = useMemo<GpsJamPolygonFeature[]>(() => {
    if (!enabled || cells.length === 0) return [];
    const scored: GpsJamPolygonFeature[] = [];
    for (const cell of cells) {
      // high/medium만 (parseGpsJamCsv가 low를 이미 제외하지만 방어)
      if (cell.level === "low") continue;
      const built = hexToPolygon(cell.hex);
      if (!built) continue;
      if (!isCenterInView(built.center, view, radiusDeg)) continue;
      scored.push({
        polygonLayer: "gps-jam",
        id: `gpsjam-${cell.hex}`,
        hex: cell.hex,
        ratio: cell.ratio,
        level: cell.level,
        total: cell.total,
        center: built.center,
        geometry: built.geometry,
        fill: gpsJamColor(cell.level),
        name: `GPS ${Math.round(cell.ratio * 100)}%`,
      });
    }
    scored.sort((a, b) => levelRank(b.level) - levelRank(a.level) || b.ratio - a.ratio);
    return scored.slice(0, CELL_CAP);
  }, [enabled, cells, view, radiusDeg]);

  return { polygons, cells, date, status, error, refresh: load };
}
