"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReconTleSatellite } from "@/lib/reconSatelliteTypes";
import {
  applyReconOrbitLift,
  cullReconSatellites,
  propagateReconSatellites,
  reconOrbitViewFactor,
  type ReconSatelliteMarker,
} from "@/lib/reconSatellitePropagate";

const TICK_MS_MAP = 45_000;
/** 전역 궤도 연출 — 지상 궤적보다 움직임이 눈에 띄게 */
const TICK_MS_ORBIT = 8_000;
const MAX_VISIBLE = 140;

type Status = "idle" | "loading" | "ok" | "error";

export function useReconSatelliteLayer(opts: {
  enabled: boolean;
  filterCenter: { lat: number; lng: number };
  /** 카메라 고도 — 전역이면 궤도 헤일로, 줌인이면 지상 궤적 */
  cameraAltitude: number;
  keepMarkerId?: string | null;
}) {
  const { enabled, filterCenter, cameraAltitude, keepMarkerId } = opts;
  const [tle, setTle] = useState<ReconTleSatellite[]>([]);
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const orbitFactor = reconOrbitViewFactor(cameraAltitude);
  const tickMs = orbitFactor > 0.35 ? TICK_MS_ORBIT : TICK_MS_MAP;

  const refreshTle = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus((prev) => (prev === "ok" ? prev : "loading"));
    setError(null);
    try {
      const res = await fetch("/api/satellites", {
        signal: ctrl.signal,
        // 브라우저 HTTP 캐시 + 서버 CDN — 초단위 재요청 금지
        cache: "default",
      });
      const payload = (await res.json().catch(() => null)) as {
        satellites?: ReconTleSatellite[];
        fetchedAt?: string;
        error?: string;
      } | null;
      if (ctrl.signal.aborted) return;
      if (!res.ok) {
        throw new Error(payload?.error ?? `satellites HTTP ${res.status}`);
      }
      if (!payload) throw new Error("satellites 응답 파싱 실패");
      setTle(payload.satellites ?? []);
      setFetchedAt(payload.fetchedAt ?? new Date().toISOString());
      setStatus("ok");
      if (payload.error) setError(payload.error);
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "TLE fetch failed");
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    void refreshTle();
    return () => {
      abortRef.current?.abort();
    };
  }, [enabled, refreshTle]);

  useEffect(() => {
    if (!enabled || tle.length === 0) return;
    const id = window.setInterval(() => setTick((n) => n + 1), tickMs);
    return () => window.clearInterval(id);
  }, [enabled, tickMs, tle.length]);

  const satellites = useMemo(() => {
    if (!enabled || tle.length === 0) return [] as ReconSatelliteMarker[];
    void tick;
    const now = new Date();
    const all = propagateReconSatellites(tle, now);
    // 전역: 경도 밴드로 고르게 — 궤도 링이 한쪽에만 몰리지 않게
    const culled =
      orbitFactor > 0.45
        ? cullReconSatellitesForOrbit(all, MAX_VISIBLE, keepMarkerId)
        : cullReconSatellites(all, filterCenter, MAX_VISIBLE, keepMarkerId);
    return applyReconOrbitLift(culled, {
      lat: filterCenter.lat,
      lng: filterCenter.lng,
      altitude: cameraAltitude,
    });
  }, [cameraAltitude, enabled, filterCenter, keepMarkerId, orbitFactor, tick, tle]);

  return {
    satellites,
    tleCount: tle.length,
    status,
    error,
    fetchedAt,
    refreshTle,
    orbitView: orbitFactor > 0.35,
  };
}

/** 전역 궤도 뷰 — 경도 슬롯당 고르게 뽑아 지구 둘레에 배치 */
function cullReconSatellitesForOrbit(
  markers: ReconSatelliteMarker[],
  maxVisible: number,
  keepId?: string | null,
): ReconSatelliteMarker[] {
  if (markers.length <= maxVisible) return markers;
  const buckets = 24;
  const perBucket = Math.max(1, Math.floor(maxVisible / buckets));
  const slots: ReconSatelliteMarker[][] = Array.from({ length: buckets }, () => []);
  for (const m of markers) {
    const idx = Math.min(buckets - 1, Math.floor(((m.lng + 180) / 360) * buckets));
    slots[idx].push(m);
  }
  // 각 슬롯: 고도 다양성 위해 altKm 섞어 앞에서부터
  for (const slot of slots) {
    slot.sort((a, b) => a.altKm - b.altKm);
  }
  const picked: ReconSatelliteMarker[] = [];
  for (const slot of slots) {
    for (let i = 0; i < perBucket && i < slot.length && picked.length < maxVisible; i += 1) {
      picked.push(slot[i]);
    }
  }
  // 남은 자리 채우기
  if (picked.length < maxVisible) {
    const have = new Set(picked.map((p) => p.markerId));
    for (const m of markers) {
      if (have.has(m.markerId)) continue;
      picked.push(m);
      have.add(m.markerId);
      if (picked.length >= maxVisible) break;
    }
  }
  if (keepId && !picked.some((p) => p.markerId === keepId)) {
    const keep = markers.find((m) => m.markerId === keepId);
    if (keep) picked[picked.length - 1] = keep;
  }
  return picked;
}
