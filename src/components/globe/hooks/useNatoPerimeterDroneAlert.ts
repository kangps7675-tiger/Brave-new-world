"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emitDashboardSound } from "@/components/SoundEffectsBridge";
import type { NeptunLiveThreat } from "@/lib/neptun";
import {
  detectNatoPerimeterCross,
  findProtectedCountryAt,
  NATO_PERIMETER_GEOJSON_URL,
  parsePerimeterCountriesGeoJson,
  type NatoPerimeterCrossEvent,
  type NatoPerimeterIso3,
  type PerimeterCountryPoly,
} from "@/lib/natoEasternPerimeter";
import {
  collectNewsStreamItems,
  pickBestPerimeterDroneStory,
} from "@/lib/natoPerimeterEventNews";
import type { NewsStreamItem, NewsStreamPayload } from "@/lib/news/types";

export type NatoPerimeterAlertPhase = "idle" | "tier1" | "tier2";

export type NatoPerimeterAlertState = {
  phase: NatoPerimeterAlertPhase;
  cross: NatoPerimeterCrossEvent | null;
  story: NewsStreamItem | null;
  followingThreatId: string | null;
};

type FlyToFn = (
  lat: number,
  lng: number,
  altitude?: number,
  durationMs?: number,
  camera?: { pitch?: number; bearing?: number },
) => void;

type Options = {
  /** false면 훅 전체 비활성 (지정학+Neptun ON일 때만 true) */
  enabled: boolean;
  threats: NeptunLiveThreat[];
  flyTo: FlyToFn;
  /**
   * 등불 pause 등과 무관 — 강제 경보.
   * 진입 게이트·모드 피커만 막을 때 사용.
   */
  hardPaused?: boolean;
};

const FOLLOW_MS = 75_000;
const FOLLOW_TICK_MS = 2_200;
const FLY_ALTITUDE = 0.48;
const FLY_MS = 1_050;
const KLAXON_MS = 4_200;
const NEWS_POLL_MS = 22_000;
const NEWS_POLL_TIMEOUT_MS = 12 * 60_000;
const GEOJSON_URL = NATO_PERIMETER_GEOJSON_URL;

const EMPTY: NatoPerimeterAlertState = {
  phase: "idle",
  cross: null,
  story: null,
  followingThreatId: null,
};

/**
 * NATO 동부 접경 UAV 월경 → 1차 클락슨+강제 줌·추적 → 해당 사건 뉴스 폴링 → 2차 반쪽 양피지.
 */
export function useNatoPerimeterDroneAlert({
  enabled,
  threats,
  flyTo,
  hardPaused = false,
}: Options) {
  const [alert, setAlert] = useState<NatoPerimeterAlertState>(EMPTY);
  const countriesRef = useRef<PerimeterCountryPoly[] | null>(null);
  const insideByThreatRef = useRef<Map<string, NatoPerimeterIso3 | null>>(new Map());
  const seenSeededRef = useRef(false);
  const busyRef = useRef(false);
  const followTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const newsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const newsDeadlineRef = useRef(0);
  const alertCrossRef = useRef<NatoPerimeterCrossEvent | null>(null);
  const flyToRef = useRef(flyTo);
  flyToRef.current = flyTo;
  const threatsRef = useRef(threats);
  threatsRef.current = threats;

  const clearFollow = useCallback(() => {
    if (followTimerRef.current != null) {
      clearTimeout(followTimerRef.current);
      followTimerRef.current = null;
    }
    if (followTickRef.current != null) {
      clearInterval(followTickRef.current);
      followTickRef.current = null;
    }
  }, []);

  const clearNewsPoll = useCallback(() => {
    if (newsPollRef.current != null) {
      clearInterval(newsPollRef.current);
      newsPollRef.current = null;
    }
  }, []);

  const dismissAlert = useCallback(() => {
    clearFollow();
    clearNewsPoll();
    busyRef.current = false;
    alertCrossRef.current = null;
    setAlert(EMPTY);
  }, [clearFollow, clearNewsPoll]);

  useEffect(() => {
    return () => {
      clearFollow();
      clearNewsPoll();
    };
  }, [clearFollow, clearNewsPoll]);

  useEffect(() => {
    if (!enabled) {
      dismissAlert();
      seenSeededRef.current = false;
      insideByThreatRef.current.clear();
    }
  }, [enabled, dismissAlert]);

  useEffect(() => {
    if (!enabled || countriesRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(GEOJSON_URL, { headers: { Accept: "application/json" } });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (cancelled) return;
        countriesRef.current = parsePerimeterCountriesGeoJson(json);
      } catch {
        /* ignore — 경보만 스킵 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const startNewsPoll = useCallback(
    (cross: NatoPerimeterCrossEvent) => {
      clearNewsPoll();
      newsDeadlineRef.current = Date.now() + NEWS_POLL_TIMEOUT_MS;

      const tick = async () => {
        if (Date.now() > newsDeadlineRef.current) {
          clearNewsPoll();
          return;
        }
        try {
          const res = await fetch(
            "/api/news-stream?packages=conflict-watch",
            { headers: { Accept: "application/json" } },
          );
          if (!res.ok) return;
          const payload = (await res.json()) as NewsStreamPayload;
          const items = collectNewsStreamItems(payload);
          const story = pickBestPerimeterDroneStory(items, cross, {
            requirePhoto: true,
            maxAgeMinutes: 180,
          });
          if (!story) return;
          clearNewsPoll();
          emitDashboardSound("hero-breaking", { force: true, volumeScale: 0.85 });
          setAlert((prev) => ({
            ...prev,
            phase: "tier2",
            story,
            cross: prev.cross ?? cross,
          }));
        } catch {
          /* ignore */
        }
      };

      void tick();
      newsPollRef.current = setInterval(() => {
        void tick();
      }, NEWS_POLL_MS);
    },
    [clearNewsPoll],
  );

  const startFollow = useCallback(
    (threatId: string) => {
      clearFollow();
      const tick = () => {
        const t = threatsRef.current.find((x) => x.id === threatId);
        if (!t) return;
        const lat = Number.isFinite(t.predictedLat) ? t.predictedLat : t.lat;
        const lon = Number.isFinite(t.predictedLon) ? t.predictedLon : t.lon;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        flyToRef.current(lat, lon, FLY_ALTITUDE, 900, { pitch: 52, bearing: -12 });
      };
      followTickRef.current = setInterval(tick, FOLLOW_TICK_MS);
      followTimerRef.current = setTimeout(() => {
        clearFollow();
        busyRef.current = false;
        setAlert((prev) =>
          prev.phase === "idle"
            ? prev
            : { ...prev, followingThreatId: null },
        );
      }, FOLLOW_MS);
    },
    [clearFollow],
  );

  const fireTier1 = useCallback(
    (cross: NatoPerimeterCrossEvent) => {
      busyRef.current = true;
      alertCrossRef.current = cross;
      setAlert({
        phase: "tier1",
        cross,
        story: null,
        followingThreatId: cross.threatId,
      });
      emitDashboardSound("nato-perimeter-klaxon", {
        force: true,
        durationMs: KLAXON_MS,
        volumeScale: 1.15,
      });
      flyToRef.current(cross.lat, cross.lon, FLY_ALTITUDE, FLY_MS, {
        pitch: 52,
        bearing: -12,
      });
      startFollow(cross.threatId);
      startNewsPoll(cross);
    },
    [startFollow, startNewsPoll],
  );

  useEffect(() => {
    if (!enabled || hardPaused) return;
    const countries = countriesRef.current;
    if (!countries || countries.length === 0) return;

    if (!seenSeededRef.current) {
      for (const t of threats) {
        const lat = Number.isFinite(t.predictedLat) ? t.predictedLat : t.lat;
        const lon = Number.isFinite(t.predictedLon) ? t.predictedLon : t.lon;
        insideByThreatRef.current.set(
          t.id,
          findProtectedCountryAt(lon, lat, countries),
        );
      }
      seenSeededRef.current = true;
      return;
    }

    if (busyRef.current) {
      // 추적 중에도 inside 맵은 갱신
      for (const t of threats) {
        const lat = Number.isFinite(t.predictedLat) ? t.predictedLat : t.lat;
        const lon = Number.isFinite(t.predictedLon) ? t.predictedLon : t.lon;
        insideByThreatRef.current.set(
          t.id,
          findProtectedCountryAt(lon, lat, countries),
        );
      }
      return;
    }

    for (const t of threats) {
      const lat = Number.isFinite(t.predictedLat) ? t.predictedLat : t.lat;
      const lon = Number.isFinite(t.predictedLon) ? t.predictedLon : t.lon;
      const nowIso = findProtectedCountryAt(lon, lat, countries);

      if (!insideByThreatRef.current.has(t.id)) {
        insideByThreatRef.current.set(t.id, nowIso);
        continue;
      }

      const prev = insideByThreatRef.current.get(t.id) ?? null;
      const cross = detectNatoPerimeterCross(t, countries, prev);
      insideByThreatRef.current.set(t.id, nowIso);

      if (cross) {
        fireTier1(cross);
        break;
      }
    }
  }, [enabled, hardPaused, threats, fireTier1]);

  return {
    natoPerimeterAlert: alert,
    dismissNatoPerimeterAlert: dismissAlert,
  };
}
