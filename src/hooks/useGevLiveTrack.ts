"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { AisVessel, MilitaryAircraft, TransportPath } from "@/data/geoTypes";
import type { Selection } from "@/components/globe/types";
import {
  GEV_AIR_TRAIL_COLOR,
  GEV_AIS_TRAIL_COLOR,
  GEV_MIL_ACCENT,
  appendTrailPoint,
  deadReckonLatLng,
  findNearbyContacts,
  formatAircraftHud,
  formatAisHud,
  syncAircraftSelection,
  syncAisSelection,
  trailToTransportPath,
  type GevContactRow,
  type GevHudLines,
  type GevTrailPoint,
} from "@/lib/gevLiveTrack";

type FlyToFn = (
  lat: number,
  lng: number,
  altitude?: number,
  durationMs?: number,
  camera?: { pitch?: number; bearing?: number },
) => void;

type Options = {
  selected: Selection | null;
  setSelected: (next: Selection | null) => void;
  aisVessels: AisVessel[];
  milAircraft: MilitaryAircraft[];
  civAircraft: MilitaryAircraft[];
  flyTo: FlyToFn;
  /** 사용자 드래그 중이면 추적 카메라 일시 정지 */
  isCameraMovingRef: MutableRefObject<boolean>;
  labelLanguage: "ko" | "en";
};

/**
 * GEV식 클릭-투-트랙: 선택 동기화 · 웨이크 트레일 · DR 카메라 추적 · 250km 컨택트.
 */
export function useGevLiveTrack({
  selected,
  setSelected,
  aisVessels,
  milAircraft,
  civAircraft,
  flyTo,
  isCameraMovingRef,
  labelLanguage,
}: Options) {
  const [tracking, setTracking] = useState(false);
  const [trail, setTrail] = useState<GevTrailPoint[]>([]);
  const [stale, setStale] = useState(false);
  const [followCamera, setFollowCamera] = useState(true);
  const fixRef = useRef<{
    lat: number;
    lng: number;
    speedKn: number | null;
    courseDeg: number | null;
    at: number;
    kind: "ais" | "aircraft";
    id: string;
    altitude: number;
  } | null>(null);

  const trackId =
    selected?.kind === "ais"
      ? `ais:${selected.item.mmsi}`
      : selected?.kind === "mil"
        ? `mil:${selected.item.hex}:${selected.traffic ?? "military"}`
        : null;

  // 선택 시 추적 시작 · 해제 시 리셋
  useEffect(() => {
    if (!trackId || !selected || (selected.kind !== "ais" && selected.kind !== "mil")) {
      setTracking(false);
      setTrail([]);
      setStale(false);
      fixRef.current = null;
      return;
    }
    setTracking(true);
    setFollowCamera(true);
    setStale(false);
    if (selected.kind === "ais") {
      const v = selected.item;
      fixRef.current = {
        lat: v.lat,
        lng: v.lng,
        speedKn: v.speedOverGround,
        courseDeg: v.trueHeading ?? v.courseOverGround,
        at: Date.now(),
        kind: "ais",
        id: v.mmsi,
        altitude: 0.45,
      };
      setTrail([{ lat: v.lat, lng: v.lng, t: Date.now() }]);
    } else {
      const ac = selected.item;
      fixRef.current = {
        lat: ac.lat,
        lng: ac.lng,
        speedKn: ac.groundSpeed,
        courseDeg: ac.track ?? ac.trueHeading,
        at: Date.now(),
        kind: "aircraft",
        id: ac.hex,
        altitude: 0.55,
      };
      setTrail([{ lat: ac.lat, lng: ac.lng, t: Date.now() }]);
    }
  }, [trackId]); // eslint-disable-line react-hooks/exhaustive-deps -- identity-only reset

  // 폴링 배열 ↔ 선택 스냅샷 동기화 + 트레일 append
  useEffect(() => {
    if (!tracking || !selected) return;
    if (selected.kind === "ais") {
      const { item, stale: isStale } = syncAisSelection(selected.item, aisVessels);
      setStale(isStale);
      if (isStale) return;
      const prev = selected.item;
      const moved =
        prev.lat !== item.lat ||
        prev.lng !== item.lng ||
        prev.speedOverGround !== item.speedOverGround ||
        prev.trueHeading !== item.trueHeading ||
        prev.shipName !== item.shipName;
      if (moved) {
        setSelected({ kind: "ais", item });
        setTrail((t) => appendTrailPoint(t, item.lat, item.lng));
      }
      fixRef.current = {
        lat: item.lat,
        lng: item.lng,
        speedKn: item.speedOverGround,
        courseDeg: item.trueHeading ?? item.courseOverGround,
        at: Date.now(),
        kind: "ais",
        id: item.mmsi,
        altitude: 0.45,
      };
      return;
    }
    if (selected.kind === "mil") {
      const synced = syncAircraftSelection(selected.item, milAircraft, civAircraft);
      setStale(synced.stale);
      if (synced.stale) return;
      const prev = selected.item;
      const moved =
        prev.lat !== synced.item.lat ||
        prev.lng !== synced.item.lng ||
        prev.groundSpeed !== synced.item.groundSpeed ||
        prev.track !== synced.item.track ||
        prev.callsign !== synced.item.callsign ||
        prev.altitude !== synced.item.altitude;
      if (moved) {
        setSelected({ kind: "mil", item: synced.item, traffic: synced.traffic });
        setTrail((t) => appendTrailPoint(t, synced.item.lat, synced.item.lng));
      }
      fixRef.current = {
        lat: synced.item.lat,
        lng: synced.item.lng,
        speedKn: synced.item.groundSpeed,
        courseDeg: synced.item.track ?? synced.item.trueHeading,
        at: Date.now(),
        kind: "aircraft",
        id: synced.item.hex,
        altitude: 0.55,
      };
    }
  }, [aisVessels, milAircraft, civAircraft, tracking]); // eslint-disable-line react-hooks/exhaustive-deps -- poll sync only

  // DR 카메라 추적 (~2 Hz, 짧은 fly)
  useEffect(() => {
    if (!tracking || !followCamera) return;
    const tick = () => {
      const fix = fixRef.current;
      if (!fix || isCameraMovingRef.current) return;
      const dt = (Date.now() - fix.at) / 1000;
      const pos = deadReckonLatLng(fix.lat, fix.lng, fix.speedKn, fix.courseDeg, Math.min(dt, 90));
      const bearing = fix.courseDeg ?? undefined;
      flyTo(pos.lat, pos.lng, fix.altitude, 450, {
        pitch: fix.kind === "aircraft" ? 52 : 48,
        bearing: bearing != null ? bearing - 90 : undefined,
      });
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [tracking, followCamera, flyTo, isCameraMovingRef]);

  const hud: GevHudLines | null = useMemo(() => {
    if (!tracking || !selected) return null;
    if (selected.kind === "ais") {
      return formatAisHud(selected.item, { lang: labelLanguage, stale });
    }
    if (selected.kind === "mil") {
      return formatAircraftHud(selected.item, {
        traffic: selected.traffic,
        stale,
      });
    }
    return null;
  }, [tracking, selected, labelLanguage, stale]);

  const trackPath: TransportPath | null = useMemo(() => {
    if (!tracking || trail.length < 2 || !selected) return null;
    if (selected.kind === "ais") {
      return trailToTransportPath(trail, {
        id: `gev-trail-ais-${selected.item.mmsi}`,
        name: selected.item.shipName || selected.item.mmsi,
        accentColor: GEV_AIS_TRAIL_COLOR,
      });
    }
    if (selected.kind === "mil") {
      return trailToTransportPath(trail, {
        id: `gev-trail-ac-${selected.item.hex}`,
        name: selected.item.callsign || selected.item.hex,
        accentColor:
          selected.traffic === "civil" ? GEV_AIR_TRAIL_COLOR : GEV_MIL_ACCENT,
      });
    }
    return null;
  }, [tracking, trail, selected]);

  const contacts: GevContactRow[] = useMemo(() => {
    if (!tracking || !selected) return [];
    const center =
      selected.kind === "ais"
        ? selected.item
        : selected.kind === "mil"
          ? selected.item
          : null;
    if (!center) return [];
    const excludeId =
      selected.kind === "ais"
        ? selected.item.mmsi
        : selected.kind === "mil"
          ? selected.item.hex
          : "";
    return findNearbyContacts({
      centerLat: center.lat,
      centerLng: center.lng,
      excludeId,
      ais: aisVessels,
      military: milAircraft,
      civil: civAircraft,
    });
  }, [tracking, selected, aisVessels, milAircraft, civAircraft]);

  const stopTracking = useCallback(() => {
    setTracking(false);
    setTrail([]);
    setFollowCamera(false);
    fixRef.current = null;
  }, []);

  const toggleFollow = useCallback(() => {
    setFollowCamera((v) => !v);
  }, []);

  return {
    tracking,
    followCamera,
    hud,
    trackPath,
    contacts,
    stale,
    stopTracking,
    toggleFollow,
    setFollowCamera,
  };
}
