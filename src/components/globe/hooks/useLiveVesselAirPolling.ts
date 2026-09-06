"use client";

import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { AisVessel, MilitaryAircraft, UsCarrier } from "@/data/geoTypes";
import { isClientApiStubMode } from "@/lib/apiStubMode";
import { dataPath } from "@/lib/dataProfile";
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
import type { ViewState } from "@/components/globe/types";
import { visibleInterval } from "@/lib/visibleInterval";

type UseLiveVesselAirPollingOptions = {
  isCameraMovingRef: MutableRefObject<boolean>;
  isEconomyViewer: boolean;
  layerAltitude: number;
  layerViewState: ViewState;
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
 * 동작 변경 없음: 원본 콜백/이펙트를 그대로 옮김.
 */
export function useLiveVesselAirPolling({
  isCameraMovingRef,
  isEconomyViewer,
  layerAltitude,
  layerViewState,
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
  const refreshAis = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setAisLoading(true);
    setAisError(null);

    try {
      const max = liveAisFetchMax();
      // 지정학: military 우선 요청하되, D1에 군함이 거의 없으면 서버가 all로 완화·데모 폴백
      const aisClass = isEconomyViewer ? "commercial" : "military";
      const response = await fetch(
        `/api/ais?seconds=8&max=${max}&class=${aisClass}&provider=auto`,
        { cache: "no-store" },
      );
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
      if (!isEconomyViewer && vessels.length === 0) {
        const retry = await fetch(
          `/api/ais?seconds=8&max=${max}&class=all&provider=auto`,
          { cache: "no-store" },
        );
        const retryPayload = (await retry.json()) as { vessels?: AisVessel[] };
        vessels = (retryPayload.vessels || []).slice(0, max);
      }
      setAisVessels(vessels);
    } catch (error) {
      setAisError(error instanceof Error ? error.message : "AIS 로드 실패");
    } finally {
      setAisLoading(false);
    }
  }, [isCameraMovingRef, isEconomyViewer, setAisError, setAisLoading, setAisVessels]);

  const refreshDisguisedVessels = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
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
  }, [isCameraMovingRef, setDisguisedError, setDisguisedLoading, setDisguisedVessels]);

  const refreshMilAircraft = useCallback(async () => {
    if (isEconomyViewer) {
      setMilAircraft([]);
      return;
    }
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
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
  }, [isCameraMovingRef, isEconomyViewer, setMilAircraft, setMilError, setMilLoading]);

  const refreshCivAircraft = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setCivLoading(true);
    setCivError(null);

    try {
      const max = liveAirTrafficFetchMax();
      const dist = airTrafficDistNm(layerAltitude);
      const lat = Math.round(layerViewState.lat * 100) / 100;
      const lng = Math.round(layerViewState.lng * 100) / 100;
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        dist: String(dist),
        max: String(max),
      });
      const response = await fetch(`/api/adsb-traffic?${params}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        aircraft?: MilitaryAircraft[];
        error?: string;
      };

      if (!response.ok && !(payload.aircraft && payload.aircraft.length > 0)) {
        throw new Error(payload.error || `ADS-B traffic 요청 실패: ${response.status}`);
      }

      setCivAircraft((payload.aircraft || []).slice(0, max));
    } catch (error) {
      setCivError(error instanceof Error ? error.message : "민간 항적 로드 실패");
    } finally {
      setCivLoading(false);
    }
  }, [
    isCameraMovingRef,
    layerAltitude,
    layerViewState.lat,
    layerViewState.lng,
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

  useEffect(() => {
    if (!showAis) return;
    void refreshAis();
    return visibleInterval(() => {
      void refreshAis();
    }, liveAisPollMs());
  }, [refreshAis, showAis]);

  useEffect(() => {
    if (isEconomyViewer || !showDisguisedVessels) {
      setDisguisedVessels([]);
      return;
    }
    void refreshDisguisedVessels();
  }, [isEconomyViewer, refreshDisguisedVessels, setDisguisedVessels, showDisguisedVessels]);

  useEffect(() => {
    if (isEconomyViewer || !showMilitaryActivity) {
      if (isEconomyViewer) setMilAircraft([]);
      return;
    }
    void refreshMilAircraft();
    return visibleInterval(() => {
      void refreshMilAircraft();
    }, liveMilPollMs());
  }, [isEconomyViewer, refreshMilAircraft, setMilAircraft, showMilitaryActivity]);

  useEffect(() => {
    if (!showAirTraffic) {
      setCivAircraft([]);
      return;
    }
    void refreshCivAircraft();
    return visibleInterval(() => {
      void refreshCivAircraft();
    }, liveAirTrafficPollMs());
  }, [refreshCivAircraft, setCivAircraft, showAirTraffic]);

  useEffect(() => {
    // 지경학에서는 항모·항구 위치 레이어/폴링 비활성
    if (isEconomyViewer || !showUsCarriers) return;
    void refreshUsCarriers();
    return visibleInterval(() => {
      void refreshUsCarriers();
    }, liveUsCarriersPollMs());
  }, [isEconomyViewer, refreshUsCarriers, showUsCarriers]);

  return {
    refreshAis,
    refreshDisguisedVessels,
    refreshMilAircraft,
    refreshCivAircraft,
    refreshUsCarriers,
  };
}
