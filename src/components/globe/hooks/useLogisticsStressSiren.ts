"use client";

import { useEffect, useRef } from "react";
import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import {
  AIR_RAID_FLY_MS,
  AIR_RAID_SIREN_MS,
  playAirRaidSirenAfterFly,
} from "@/lib/airRaidFocus";
import {
  stressForChokepoint,
  type ChokepointAisObservation,
} from "@/lib/chokepointStressForUi";
import { shouldSoundLogisticsSiren } from "@/lib/logisticsStress";
import { readSoundEnabled } from "@/lib/soundPrefs";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";

type FlyToFn = (
  lat: number,
  lng: number,
  altitude?: number,
  durationMs?: number,
  camera?: { pitch?: number; bearing?: number },
) => void;

type UseLogisticsStressSirenOptions = {
  paused: boolean;
  ukmtoIncidents: UkmtoIncidentPoint[];
  aisByChokeId?: Record<string, ChokepointAisObservation>;
  flyTo: FlyToFn;
};

/**
 * Siren + fly when a chokepoint newly reaches elevated (A-grade only).
 */
export function useLogisticsStressSiren({
  paused,
  ukmtoIncidents,
  aisByChokeId = {},
  flyTo,
}: UseLogisticsStressSirenOptions) {
  const seenElevatedRef = useRef<Set<string> | null>(null);
  const busyRef = useRef(false);
  const busyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flyToRef = useRef(flyTo);
  flyToRef.current = flyTo;

  useEffect(() => {
    return () => {
      if (busyTimerRef.current != null) {
        clearTimeout(busyTimerRef.current);
        busyTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (paused) return;

    const elevatedPoints = LOGISTICS_RISK_POINTS.filter((p) =>
      shouldSoundLogisticsSiren(
        stressForChokepoint(p, ukmtoIncidents, aisByChokeId[p.id] ?? null),
      ),
    );

    if (seenElevatedRef.current === null) {
      seenElevatedRef.current = new Set(elevatedPoints.map((p) => p.id));
      return;
    }

    if (busyRef.current) return;

    const next = elevatedPoints.find((p) => !seenElevatedRef.current!.has(p.id));
    if (!next) return;

    seenElevatedRef.current.add(next.id);
    busyRef.current = true;

    flyToRef.current(next.lat, next.lng, 0.72, AIR_RAID_FLY_MS, {
      pitch: 38,
      bearing: -12,
    });

    playAirRaidSirenAfterFly("tzeva", AIR_RAID_FLY_MS, () => readSoundEnabled());

    if (busyTimerRef.current != null) clearTimeout(busyTimerRef.current);
    busyTimerRef.current = setTimeout(() => {
      busyRef.current = false;
      busyTimerRef.current = null;
    }, AIR_RAID_FLY_MS + AIR_RAID_SIREN_MS + 400);
  }, [paused, ukmtoIncidents, aisByChokeId]);
}