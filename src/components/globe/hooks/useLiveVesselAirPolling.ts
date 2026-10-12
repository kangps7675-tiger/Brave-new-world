"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { AisVessel, MilitaryAircraft, UsCarrier } from "@/data/geoTypes";
import { isClientApiStubMode } from "@/lib/apiStubMode";
import { dataPath } from "@/lib/dataProfile";
import { getGlobeLod } from "@/lib/globeLod";
import {
  airTrafficDistNm,
  liveAirTrafficFetchMax,
  liveAirTrafficPollMs,
  liveAisFetchMax,
  liveAisPollMs,
  liveMilFetchMax,
  liveMilPollMs,
  liveUsCarriersPollMs,
  shouldDeferLiveNetworkRefresh,
} from "@/lib/liveRenderGuard";

/** 카메라가 움직여 건너뛴 새로고침을 다시 시도하는 간격(ms) */
const DEFER_RETRY_MS = 1_500;

type LivePollKey = "ais" | "disguised" | "mil" | "civ";

type UseLiveVesselAirPollingOptions = {
  isCameraMovingRef: MutableRefObject<boolean>;
  layerAltitudeRef: MutableRefObject<number>;
  layerCenterRef: MutableRefObject<{ lat: number; lng: number }>;
  isEconomyViewer: boolean;
  isConflictViewer: boolean;
  isLiveViewer: boolean;
  isSatelliteViewer: boolean;
  showAis: boolean;
  showDisguisedVessels: boolean;
  showMilitaryActivity: boolean;
  showAirTraffic: boolean;
  showUsCarriers: boolean;
  setAisVessels: Dispatch<SetStateAction<AisVessel[]>>;
  setAisLoading: Dispatch<SetStateAction<boolean>>;
  setAisError: Dispatch<SetStateAction<string | null>>;
  setDisguisedVessels: Dispatch<SetStateAction<AisVessel[]>>;
  setDisguisedLoading: Dispatch<SetStateAction<boolean>>;
  setDisguisedError: Dispatch<SetStateAction<string | null>>;
  setMilAircraft: Dispatch<SetStateAction<MilitaryAircraft[]>>;
  setMilLoading: Dispatch<SetStateAction<boolean>>;
  setMilError: Dispatch<SetStateAction<string | null>>;
  setCivAircraft: Dispatch<SetStateAction<MilitaryAircraft[]>>;
  setCivLoading: Dispatch<SetStateAction<boolean>>;
  setCivError: Dispatch<SetStateAction<string | null>>;
  setUsCarriers: Dispatch<SetStateAction<UsCarrier[]>>;
  setUsCarriersLoading: Dispatch<SetStateAction<boolean>>;
};

/**
 * AIS 선박(정상/위장) · ADS-B(군용/민간 항적) · 미 항모 라이브 폴링 — GlobeDashboard에서 추출 (분리 2단계).
 * 관측(Cesium) class=all·max=1000, 근접 densify(lat/lng/dist) 포함 — Dashboard 인라인과 동일.
 */
export function useLiveVesselAirPolling({
  isCameraMovingRef,
  layerAltitudeRef,
  layerCenterRef,
  isEconomyViewer,
  isConflictViewer,
  isLiveViewer,
  isSatelliteViewer,
  showAis,
  showDisguisedVessels,
  showMilitaryActivity,
  showAirTraffic,
  showUsCarriers,
  setAisVessels,
  setAisLoading,
  setAisError,
  setDisguisedVessels,
  setDisguisedLoading,
  setDisguisedError,
  setMilAircraft,
  setMilLoading,
  setMilError,
  setCivAircraft,
  setCivLoading,
  setCivError,
  setUsCarriers,
  setUsCarriersLoading,
}: UseLiveVesselAirPollingOptions) {
  const retryTimersRef = useRef(new Map<LivePollKey, number>());
  const runnersRef = useRef<Partial<Record<LivePollKey, () => void | Promise<void>>>>({});

  /**
   * 카메라 조작·백그라운드 탭이면 이번 새로고침을 미룬다.
   * 예전엔 그냥 버려서, 첫 로드·드래그 직후엔 다음 폴링(최대 ~1분)까지 항적이 비어 보였다.
   * 카메라 때문에 미룬 건 짧게 다시 시도하고, 숨겨진 탭은 복귀 시 되살린다(아래 effect).
   */
  const deferOrRetry = useCallback(
    (key: LivePollKey): boolean => {
      if (!shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return false;
      if (typeof document !== "undefined" && document.hidden) return true;
      if (!retryTimersRef.current.has(key)) {
        const timer = window.setTimeout(() => {
          retryTimersRef.current.delete(key);
          void runnersRef.current[key]?.();
        }, DEFER_RETRY_MS);
        retryTimersRef.current.set(key, timer);
      }
      return true;
    },
    [isCameraMovingRef],
  );

  const refreshAis = useCallback(async () => {
    if (deferOrRetry("ais")) return;
    setAisLoading(true);
    setAisError(null);

    try {
      const max = isSatelliteViewer ? 1000 : liveAisFetchMax();
      // 지정학: 군함 · 지경학: 상업 · 관측(Cesium): 전 세계 전부
      const aisClass =
        isLiveViewer || isSatelliteViewer
          ? "all"
          : isEconomyViewer
            ? "commercial"
            : "military";
      const alt = layerAltitudeRef.current;
      const lod = getGlobeLod(alt).tier;
      const nearDetail = !isSatelliteViewer && (lod === "near" || lod === "village");
      const center = layerCenterRef.current;
      const qs = new URLSearchParams({
        seconds: "8",
        max: String(max),
        class: aisClass,
        provider: "auto",
      });
      if (nearDetail && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
        qs.set("lat", String(center.lat));
        qs.set("lng", String(center.lng));
        qs.set("dist", String(airTrafficDistNm(alt)));
      }
      const response = await fetch(`/api/ais?${qs.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        vessels?: AisVessel[];
        error?: string;
        waiting?: boolean;
        demo?: boolean;
      };

      if (!response.ok && !(payload.vessels && payload.vessels.length > 0)) {
        throw new Error(payload.error || `AIS 요청 실패: ${response.status}`);
      }

      let vessels = (payload.vessels || []).slice(0, max);
      // military만 비면 all로 한 번 더 (체크 ON 보장)
      if (isConflictViewer && vessels.length === 0) {
        const retryQs = new URLSearchParams(qs);
        retryQs.set("class", "all");
        const retry = await fetch(`/api/ais?${retryQs.toString()}`, { cache: "no-store" });
        const retryPayload = (await retry.json()) as { vessels?: AisVessel[] };
        vessels = (retryPayload.vessels || []).slice(0, max);
      }
      setAisVessels(vessels);
    } catch (error) {
      setAisError(error instanceof Error ? error.message : "AIS 로드 실패");
    } finally {
      setAisLoading(false);
    }
  }, [
    deferOrRetry,
    isConflictViewer,
    isEconomyViewer,
    isLiveViewer,
    isSatelliteViewer,
    layerAltitudeRef,
    layerCenterRef,
    setAisError,
    setAisLoading,
    setAisVessels,
  ]);

  const refreshDisguisedVessels = useCallback(async () => {
    if (deferOrRetry("disguised")) return;
    setDisguisedLoading(true);
    setDisguisedError(null);
    try {
      const response = await fetch("/api/ais-disguised", { cache: "no-store" });
      const payload = (await response.json()) as {
        vessels?: AisVessel[];
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `위장선박 요청 실패: ${response.status}`);
      }
      setDisguisedVessels(payload.vessels || []);
    } catch (error) {
      setDisguisedError(error instanceof Error ? error.message : "위장선박 로드 실패");
    } finally {
      setDisguisedLoading(false);
    }
  }, [deferOrRetry, setDisguisedError, setDisguisedLoading, setDisguisedVessels]);

  const refreshMilAircraft = useCallback(async () => {
    if (isEconomyViewer) {
      setMilAircraft([]);
      return;
    }
    if (deferOrRetry("mil")) return;
    setMilLoading(true);
    setMilError(null);

    try {
      const max = liveMilFetchMax();
      const response = await fetch(`/api/adsb-mil?max=${max}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        aircraft?: MilitaryAircraft[];
        error?: string;
      };

      if (!response.ok && !(payload.aircraft && payload.aircraft.length > 0)) {
        throw new Error(payload.error || `ADS-B mil 요청 실패: ${response.status}`);
      }

      setMilAircraft((payload.aircraft || []).slice(0, max));
    } catch (error) {
      setMilError(error instanceof Error ? error.message : "ADS-B mil 로드 실패");
    } finally {
      setMilLoading(false);
    }
  }, [deferOrRetry, isEconomyViewer, setMilAircraft, setMilError, setMilLoading]);

  const refreshCivAircraft = useCallback(async () => {
    if (deferOrRetry("civ")) return;
    setCivLoading(true);
    setCivError(null);

    try {
      const max = liveAirTrafficFetchMax();
      const alt = layerAltitudeRef.current;
      const lod = getGlobeLod(alt).tier;
      // 관측(Cesium): 전 지구 외에는 카메라 주변 OpenSky bbox densify.
      // MapLibre: 기존처럼 near/village만.
      const densify =
        (isSatelliteViewer ? lod !== "global" : lod === "near" || lod === "village") &&
        Number.isFinite(layerCenterRef.current.lat) &&
        Number.isFinite(layerCenterRef.current.lng);
      const center = layerCenterRef.current;
      const qs = new URLSearchParams({ max: String(max) });
      if (densify) {
        qs.set("lat", String(center.lat));
        qs.set("lng", String(center.lng));
        qs.set("dist", String(airTrafficDistNm(alt)));
      }
      const response = await fetch(`/api/adsb-traffic?${qs.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        aircraft?: MilitaryAircraft[];
        error?: string;
      };

      if (!response.ok && !(payload.aircraft && payload.aircraft.length > 0)) {
        throw new Error(payload.error || `ADS-B traffic 요청 실패: ${response.status}`);
      }

      const next = (payload.aircraft || []).slice(0, max);
      if (!densify) {
        setCivAircraft(next);
      } else {
        // 근접 densify: 로컬 응답을 앞에 두어 slice가 새 기체를 자르지 않게 한다.
        setCivAircraft((prev) => {
          const localHex = new Set(next.map((ac) => ac.hex.toLowerCase()));
          const fillers = prev.filter((ac) => !localHex.has(ac.hex.toLowerCase()));
          return [...next, ...fillers].slice(0, Math.max(max, next.length));
        });
      }
    } catch (error) {
      setCivError(error instanceof Error ? error.message : "민간 항적 로드 실패");
    } finally {
      setCivLoading(false);
    }
  }, [
    deferOrRetry,
    isSatelliteViewer,
    layerAltitudeRef,
    layerCenterRef,
    setCivAircraft,
    setCivError,
    setCivLoading,
  ]);

  const refreshUsCarriers = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setUsCarriersLoading(true);
    try {
      let response: Response;
      if (isClientApiStubMode()) {
        response = await fetch(dataPath("us-carriers.json"), { cache: "no-store" });
      } else {
        response = await fetch("/api/us-carriers", { cache: "no-store" });
        if (!response.ok) {
          response = await fetch(dataPath("us-carriers.json"), { cache: "no-store" });
        }
      }
      const payload = (await response.json()) as {
        carriers?: UsCarrier[];
        updatedAt?: string;
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "항모 데이터 로드 실패");
      }
      setUsCarriers(payload.carriers || []);
    } catch {
      // 마지막 성공 스냅샷 유지
    } finally {
      setUsCarriersLoading(false);
    }
  }, [isCameraMovingRef, setUsCarriers, setUsCarriersLoading]);

  runnersRef.current = {
    ais: refreshAis,
    disguised: refreshDisguisedVessels,
    mil: refreshMilAircraft,
    civ: refreshCivAircraft,
  };

  useEffect(() => {
    const timers = retryTimersRef.current;
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  /** 숨겨졌던 탭이 돌아오면 다음 폴링을 기다리지 말고 바로 갱신 */
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      if (showAis || isSatelliteViewer) void refreshAis();
      if (!isEconomyViewer && (showMilitaryActivity || isSatelliteViewer)) {
        void refreshMilAircraft();
      }
      if (showAirTraffic || isSatelliteViewer) void refreshCivAircraft();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [
    isEconomyViewer,
    isSatelliteViewer,
    refreshAis,
    refreshCivAircraft,
    refreshMilAircraft,
    showAirTraffic,
    showAis,
    showMilitaryActivity,
  ]);

  useEffect(() => {
    if (!showAis && !isSatelliteViewer) return;
    void refreshAis();
    const timer = window.setInterval(() => {
      void refreshAis();
    }, liveAisPollMs());
    return () => window.clearInterval(timer);
  }, [isSatelliteViewer, refreshAis, showAis]);

  useEffect(() => {
    if (isEconomyViewer || (!showDisguisedVessels && !isSatelliteViewer)) {
      setDisguisedVessels([]);
      return;
    }
    void refreshDisguisedVessels();
  }, [isEconomyViewer, isSatelliteViewer, refreshDisguisedVessels, setDisguisedVessels, showDisguisedVessels]);

  useEffect(() => {
    if (isEconomyViewer || (!showMilitaryActivity && !isSatelliteViewer)) {
      if (isEconomyViewer) setMilAircraft([]);
      return;
    }
    void refreshMilAircraft();
    const timer = window.setInterval(() => {
      void refreshMilAircraft();
    }, liveMilPollMs());
    return () => window.clearInterval(timer);
  }, [
    isEconomyViewer,
    isSatelliteViewer,
    refreshMilAircraft,
    setMilAircraft,
    showMilitaryActivity,
  ]);

  useEffect(() => {
    if (!showAirTraffic && !isSatelliteViewer) {
      setCivAircraft([]);
      return;
    }
    void refreshCivAircraft();
    const timer = window.setInterval(() => {
      void refreshCivAircraft();
    }, liveAirTrafficPollMs());
    return () => window.clearInterval(timer);
  }, [isSatelliteViewer, refreshCivAircraft, setCivAircraft, showAirTraffic]);

  useEffect(() => {
    // 지경학에서는 항모·항구 위치 레이어/폴링 비활성
    if (isEconomyViewer || (!showUsCarriers && !isSatelliteViewer)) return;
    void refreshUsCarriers();
    const timer = window.setInterval(() => {
      void refreshUsCarriers();
    }, liveUsCarriersPollMs());
    return () => window.clearInterval(timer);
  }, [isEconomyViewer, isSatelliteViewer, refreshUsCarriers, showUsCarriers]);

  return {
    refreshAis,
    refreshDisguisedVessels,
    refreshMilAircraft,
    refreshCivAircraft,
    refreshUsCarriers,
  };
}
