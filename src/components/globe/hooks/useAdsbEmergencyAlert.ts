"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TrackedAircraft } from "@/lib/adsbClient";
import {
  AIR_RAID_FLY_MS,
  AIR_RAID_SIREN_MS,
} from "@/lib/airRaidFocus";
import { emergencySquawkLabel, normalizeSquawk } from "@/lib/adsbEmergency";
import { visibleInterval } from "@/lib/visibleInterval";

export type AdsbEmergencyOffer = {
  key: string;
  aircraft: TrackedAircraft;
  squawk: string;
  activeCount: number;
};

type FlyToFn = (
  lat: number,
  lng: number,
  altitude?: number,
  durationMs?: number,
  camera?: { pitch?: number; bearing?: number },
) => void;

type Options = {
  paused: boolean;
  flyTo: FlyToFn;
  /**
   * 관측(Cesium) 모드일 때만 true — ADS-B 엔티티가 실제로 그려지는 유일한 모드다.
   * 지정학/지경학/항적(MapLibre) 모드에서는 flyTo가 카메라를 움직여도 화면에
   * 아무것도 안 보이므로, 자동 fly·사이렌 없이 배너만 띄우고 "관측 모드로 이동"은
   * GlobeDashboard가 배너의 액션 버튼으로 처리한다.
   */
  /** Optional: open aircraft in analysis panel */
  onSelectAircraft?: (aircraft: TrackedAircraft) => void;
};

const POLL_MS = 45_000;

/**
 * Poll /api/adsb-emergency; on newly seen hex → flyTo + siren + banner.
 * First snapshot only seeds seen-set (no alert on page load).
 */
export function useAdsbEmergencyAlert({
  paused,
  flyTo,
  onSelectAircraft,
}: Options) {
  const [offer, setOffer] = useState<AdsbEmergencyOffer | null>(null);
  const seenRef = useRef<Set<string> | null>(null);
  const busyRef = useRef(false);
  const busyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flyToRef = useRef(flyTo);
  flyToRef.current = flyTo;
  const onSelectRef = useRef(onSelectAircraft);
  onSelectRef.current = onSelectAircraft;

  const dismissOffer = useCallback(() => setOffer(null), []);

  useEffect(() => {
    return () => {
      if (busyTimerRef.current != null) clearTimeout(busyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (paused) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch("/api/adsb-emergency", { headers: { Accept: "application/json" } });
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as { aircraft?: TrackedAircraft[] };
        const list = Array.isArray(payload.aircraft) ? payload.aircraft : [];
        const withPos = list.filter(
          (ac) => Number.isFinite(ac.lat) && Number.isFinite(ac.lng) && ac.hex,
        );

        if (seenRef.current === null) {
          seenRef.current = new Set(withPos.map((ac) => ac.hex));
          return;
        }

        if (busyRef.current) return;

        const fresh = withPos.find((ac) => !seenRef.current!.has(ac.hex));
        if (!fresh) {
          // Drop banner if cleared
          setOffer((prev) => {
            if (!prev) return prev;
            if (withPos.some((ac) => ac.hex === prev.aircraft.hex)) return prev;
            return null;
          });
          return;
        }

        seenRef.current.add(fresh.hex);
        busyRef.current = true;

        const squawk = normalizeSquawk(fresh.squawk) ?? "7700";

        setOffer({
          key: `${fresh.hex}-${Date.now()}`,
          aircraft: fresh,
          squawk,
          activeCount: withPos.length,
        });

        if (busyTimerRef.current != null) clearTimeout(busyTimerRef.current);
        busyTimerRef.current = setTimeout(() => {
          busyRef.current = false;
          busyTimerRef.current = null;
        }, AIR_RAID_FLY_MS + AIR_RAID_SIREN_MS + 400);
      } catch {
        /* ignore poll errors */
      }
    };

    void tick();
    const stop = visibleInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      stop();
    };
  }, [paused]);

  return { adsbEmergencyOffer: offer, dismissAdsbEmergencyOffer: dismissOffer };
}

export function adsbEmergencyHeadline(squawk: string, ko: boolean): string {
  return emergencySquawkLabel(squawk, ko);
}
