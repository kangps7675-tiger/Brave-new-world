"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { ConflictEvent, FirmsFire } from "@/data/geoTypes";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";
import { parseNavareaApiPayload, type NavareaFeaturePoint } from "@/lib/navareaHatch";
import type { MilitaryExercise } from "@/lib/militaryExercises";
import type { CrossStraitSignalPayload } from "@/lib/crossStraitSignal";
import type { ReefWatchPayload } from "@/lib/reefWatch";
import type { PublicShipObservation } from "@/lib/shipMovements/types";
import { isClientApiStubMode } from "@/lib/apiStubMode";
import { dataPath } from "@/lib/dataProfile";
import { runWhenIdle } from "@/lib/deferIdle";
import { ENTRY_GATE } from "@/lib/entryOverview";
import { getGlobeLod, type GlobeLod } from "@/lib/globeLod";
import {
  firmsLiveFetchMax,
  liveFirmsPollMs,
  liveGdeltPollMs,
  liveNavareaPollMs,
  shouldDeferLiveNetworkRefresh,
} from "@/lib/liveRenderGuard";
import { filterFirmsToTheaters } from "@/lib/firmsTheaters";
import { VIEWPORT_RADIUS_BY_TIER, viewToBbox } from "@/lib/viewportCull";
import type { ViewerChromePreset } from "@/lib/viewerChrome";
import type { ViewState } from "@/components/globe/types";
import { visibleInterval } from "@/lib/visibleInterval";

type BasicStatus = "idle" | "loading" | "ok" | "error";

type UseLiveGeoFeedPollingOptions = {
  isCameraMovingRef: MutableRefObject<boolean>;
  isEconomyViewer: boolean;
  globeReady: boolean;
  isCameraMoving: boolean;
  layerAltitude: number;
  layerViewState: ViewState;
  globeLod: GlobeLod;
  applyGeneration: number;
  immediateUntilRef: MutableRefObject<number>;
  labelLanguage: string;
  viewerChromePreset: ViewerChromePreset;
  shouldFetchGdeltFeed: boolean;
  showCyberIncidents: boolean;
  showElectionEvents: boolean;
  showFirmsFires: boolean;
  showUkmtoIncidents: boolean;
  showNavareaWarnings: boolean;
  showShipMovesLayer: boolean;
  showMilitaryExercises: boolean;
  showEastAsiaAdiz: boolean;
  showChinaTaiwanIncidents: boolean;
  showReefWatch: boolean;
  firmsBboxRef: MutableRefObject<string>;
  firmsFetchBusyRef: MutableRefObject<boolean>;
  setCyberEvents: Dispatch<SetStateAction<ConflictEvent[]>>;
  setElectionEvents: Dispatch<SetStateAction<ConflictEvent[]>>;
  setGdeltEvents: Dispatch<SetStateAction<ConflictEvent[]>>;
  setGdeltLoading: Dispatch<SetStateAction<boolean>>;
  setGdeltError: Dispatch<SetStateAction<string | null>>;
  setGdeltFetchedAt: Dispatch<SetStateAction<string | null>>;
  setFirmsFires: Dispatch<SetStateAction<FirmsFire[]>>;
  setFirmsLoading: Dispatch<SetStateAction<boolean>>;
  setFirmsError: Dispatch<SetStateAction<string | null>>;
  setUkmtoIncidents: Dispatch<SetStateAction<UkmtoIncidentPoint[]>>;
  setUkmtoStatus: Dispatch<SetStateAction<BasicStatus>>;
  setNavareaFeatures: Dispatch<SetStateAction<NavareaFeaturePoint[]>>;
  setNavareaStatus: Dispatch<SetStateAction<BasicStatus>>;
  setMilitaryExercises: Dispatch<SetStateAction<MilitaryExercise[]>>;
  setMilitaryExercisesStatus: Dispatch<SetStateAction<BasicStatus>>;
  setShipMovesMap: Dispatch<SetStateAction<PublicShipObservation[]>>;
  setShipMovesTimeline: Dispatch<SetStateAction<PublicShipObservation[]>>;
  setShipMovesLoading: Dispatch<SetStateAction<boolean>>;
  setShipMovesDisclaimer: Dispatch<SetStateAction<string | null>>;
  setCrossStraitSignal: Dispatch<SetStateAction<CrossStraitSignalPayload | null>>;
  setCrossStraitSignalStatus: Dispatch<SetStateAction<BasicStatus>>;
  setReefWatch: Dispatch<SetStateAction<ReefWatchPayload | null>>;
  setReefWatchStatus: Dispatch<SetStateAction<BasicStatus>>;
};

/**
 * 사이버·선거·GDELT · FIRMS 화재 · UKMTO·NAVAREA·군사훈련 라이브 폴링
 * (+ 선박이동·양안 신호·리프워치 페치) — GlobeDashboard에서 추출 (분리 4단계).
 * 동작 변경 없음: 원본 콜백/이펙트를 그대로 옮김.
 */
export function useLiveGeoFeedPolling({
  isCameraMovingRef,
  isEconomyViewer,
  globeReady,
  isCameraMoving,
  layerAltitude,
  layerViewState,
  globeLod,
  applyGeneration,
  immediateUntilRef,
  labelLanguage,
  viewerChromePreset,
  shouldFetchGdeltFeed,
  showCyberIncidents,
  showElectionEvents,
  showFirmsFires,
  showUkmtoIncidents,
  showNavareaWarnings,
  showShipMovesLayer,
  showMilitaryExercises,
  showEastAsiaAdiz,
  showChinaTaiwanIncidents,
  showReefWatch,
  firmsBboxRef,
  firmsFetchBusyRef,
  setCyberEvents,
  setElectionEvents,
  setGdeltEvents,
  setGdeltLoading,
  setGdeltError,
  setGdeltFetchedAt,
  setFirmsFires,
  setFirmsLoading,
  setFirmsError,
  setUkmtoIncidents,
  setUkmtoStatus,
  setNavareaFeatures,
  setNavareaStatus,
  setMilitaryExercises,
  setMilitaryExercisesStatus,
  setShipMovesMap,
  setShipMovesTimeline,
  setShipMovesLoading,
  setShipMovesDisclaimer,
  setCrossStraitSignal,
  setCrossStraitSignalStatus,
  setReefWatch,
  setReefWatchStatus,
}: UseLiveGeoFeedPollingOptions) {
  const refreshCyberEvents = useCallback(async () => {
    if (isClientApiStubMode()) {
      setCyberEvents([]);
      return;
    }
    try {
      const response = await fetch("/api/gdelt?theme=cyber", { cache: "no-store" });
      const payload = (await response.json()) as {
        events?: ConflictEvent[];
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `사이버 이벤트 요청 실패: ${response.status}`);
      }
      setCyberEvents(payload.events || []);
    } catch {
      setCyberEvents([]);
    }
  }, [setCyberEvents]);

  const refreshElectionEvents = useCallback(async () => {
    if (isClientApiStubMode()) {
      setElectionEvents([]);
      return;
    }
    try {
      const response = await fetch("/api/gdelt?theme=election", { cache: "no-store" });
      const payload = (await response.json()) as {
        events?: ConflictEvent[];
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `선거 이벤트 요청 실패: ${response.status}`);
      }
      setElectionEvents(payload.events || []);
    } catch {
      setElectionEvents([]);
    }
  }, [setElectionEvents]);

  const refreshGdeltEvents = useCallback(async () => {
    if (!viewerChromePreset.fetchGdelt || !shouldFetchGdeltFeed) {
      setGdeltLoading(false);
      return;
    }
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setGdeltLoading(true);
    setGdeltError(null);
    try {
      let response: Response;
      if (isClientApiStubMode()) {
        response = await fetch(dataPath("gdelt-events.json"), { cache: "no-store" });
      } else {
        response = await fetch("/api/gdelt", { cache: "no-store" });
        if (!response.ok) {
          response = await fetch(dataPath("gdelt-events.json"), { cache: "no-store" });
        }
      }
      const payload = (await response.json()) as {
        events?: ConflictEvent[];
        fetchedAt?: string;
        error?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `GDELT 요청 실패: ${response.status}`);
      }
      const next = payload.events || [];
      // 빈 성공 응답으로 기존 핀을 지우지 않음 — 폴링 공백·캐시 미스를 견딤
      if (next.length > 0) {
        setGdeltEvents(next);
        setGdeltFetchedAt(payload.fetchedAt || new Date().toISOString());
      } else if (payload.fetchedAt) {
        setGdeltFetchedAt(payload.fetchedAt);
      }
    } catch (error) {
      setGdeltError(error instanceof Error ? error.message : "GDELT 로드 실패");
      // 마지막 성공 스냅샷 유지 — 빈 배열로 지우지 않음
    } finally {
      setGdeltLoading(false);
    }
  }, [
    isCameraMovingRef,
    setGdeltError,
    setGdeltEvents,
    setGdeltFetchedAt,
    setGdeltLoading,
    shouldFetchGdeltFeed,
    viewerChromePreset.fetchGdelt,
  ]);

  const refreshFirmsFires = useCallback(async () => {
    if (!showFirmsFires) return;
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    if (firmsFetchBusyRef.current) return;
    firmsFetchBusyRef.current = true;
    setFirmsLoading(true);
    setFirmsError(null);

    try {
      const lod = getGlobeLod(layerAltitude);
      const radiusDeg = VIEWPORT_RADIUS_BY_TIER[lod.tier];
      const bbox = viewToBbox(layerViewState, radiusDeg);
      const maxParam = firmsLiveFetchMax(lod.tier);
      const params = new URLSearchParams({
        west: String(bbox.west),
        south: String(bbox.south),
        east: String(bbox.east),
        north: String(bbox.north),
        days: lod.tier === "near" || lod.tier === "village" ? "2" : "1",
        max: String(maxParam),
      });
      const response = await fetch(`/api/firms-fires?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        fires?: FirmsFire[];
        error?: string;
      };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || `FIRMS 요청 실패: ${response.status}`);
      }

      const fires = filterFirmsToTheaters(payload.fires || []).slice(0, maxParam);
      startTransition(() => {
        setFirmsFires(fires);
      });
    } catch (error) {
      setFirmsError(error instanceof Error ? error.message : "FIRMS 로드 실패");
      // 실패 시 빈 배열로 지우지 않음 — 재시도 루프/깜빡임 방지
    } finally {
      firmsFetchBusyRef.current = false;
      setFirmsLoading(false);
    }
  }, [
    firmsFetchBusyRef,
    isCameraMovingRef,
    layerAltitude,
    layerViewState,
    setFirmsError,
    setFirmsFires,
    setFirmsLoading,
    showFirmsFires,
  ]);

  useEffect(() => {
    if (isEconomyViewer || !showShipMovesLayer) {
      if (!showShipMovesLayer) {
        setShipMovesMap([]);
        setShipMovesTimeline([]);
        setShipMovesDisclaimer(null);
      }
      return;
    }
    let cancelled = false;
    setShipMovesLoading(true);
    const lang = labelLanguage === "en" ? "en" : "ko";
    void (async () => {
      try {
        const [mapRes, timelineRes] = await Promise.all([
          fetch(`/api/ship-movements?view=map&lang=${lang}`, { cache: "no-store" }),
          fetch(`/api/ship-movements?view=timeline&lang=${lang}`, { cache: "no-store" }),
        ]);
        const mapPayload = (await mapRes.json()) as {
          observations?: PublicShipObservation[];
          disclaimer?: string;
        };
        const timelinePayload = (await timelineRes.json()) as {
          observations?: PublicShipObservation[];
          disclaimer?: string;
        };
        if (cancelled) return;
        setShipMovesMap(mapPayload.observations || []);
        setShipMovesTimeline(timelinePayload.observations || []);
        setShipMovesDisclaimer(
          timelinePayload.disclaimer || mapPayload.disclaimer || null,
        );
      } catch {
        if (!cancelled) {
          setShipMovesMap([]);
          setShipMovesTimeline([]);
        }
      } finally {
        if (!cancelled) setShipMovesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isEconomyViewer,
    labelLanguage,
    setShipMovesDisclaimer,
    setShipMovesLoading,
    setShipMovesMap,
    setShipMovesTimeline,
    showShipMovesLayer,
  ]);

  useEffect(() => {
    const needed =
      showMilitaryExercises ||
      showEastAsiaAdiz ||
      showChinaTaiwanIncidents ||
      showShipMovesLayer;
    if (isEconomyViewer || !needed) return;
    let cancelled = false;
    const refresh = async () => {
      setCrossStraitSignalStatus((prev) => (prev === "idle" ? "loading" : prev));
      try {
        const response = await fetch("/api/cross-strait-signal", { cache: "no-store" });
        if (!response.ok) throw new Error(`cross-strait-signal HTTP ${response.status}`);
        const payload = (await response.json()) as CrossStraitSignalPayload;
        if (cancelled) return;
        setCrossStraitSignal(payload);
        setCrossStraitSignalStatus("ok");
      } catch {
        if (!cancelled) setCrossStraitSignalStatus("error");
      }
    };
    void refresh();
    const stop = visibleInterval(() => void refresh(), 5 * 60_000);
    return () => {
      cancelled = true;
      stop();
    };
  }, [
    isEconomyViewer,
    setCrossStraitSignal,
    setCrossStraitSignalStatus,
    showChinaTaiwanIncidents,
    showEastAsiaAdiz,
    showMilitaryExercises,
    showShipMovesLayer,
  ]);

  useEffect(() => {
    if (isEconomyViewer || !showReefWatch) return;
    let cancelled = false;
    const refresh = async () => {
      setReefWatchStatus((prev) => (prev === "idle" ? "loading" : prev));
      try {
        const response = await fetch("/api/reefwatch", { cache: "no-store" });
        if (!response.ok) throw new Error(`reefwatch HTTP ${response.status}`);
        const payload = (await response.json()) as ReefWatchPayload;
        if (cancelled) return;
        setReefWatch(payload);
        setReefWatchStatus("ok");
      } catch {
        if (!cancelled) setReefWatchStatus("error");
      }
    };
    void refresh();
    // OpenSky: one combined-bbox request; server caches 90s — client every 3 min
    const stop = visibleInterval(() => void refresh(), 3 * 60_000);
    return () => {
      cancelled = true;
      stop();
    };
  }, [isEconomyViewer, setReefWatch, setReefWatchStatus, showReefWatch]);

  useEffect(() => {
    if (!showCyberIncidents) return;
    void refreshCyberEvents();
  }, [refreshCyberEvents, showCyberIncidents]);

  useEffect(() => {
    if (!showElectionEvents) return;
    void refreshElectionEvents();
  }, [refreshElectionEvents, showElectionEvents]);

  useEffect(() => {
    if (!shouldFetchGdeltFeed || !globeReady) {
      // 레이어가 캡·토글로 잠깐 꺼져도 스냅샷은 유지 (다시 켜면 바로 표시)
      return;
    }
    const cancel = runWhenIdle(() => {
      void refreshGdeltEvents();
    });
    return cancel;
  }, [globeReady, refreshGdeltEvents, shouldFetchGdeltFeed]);

  useEffect(() => {
    if (!shouldFetchGdeltFeed || !globeReady) return;
    return visibleInterval(() => {
      void refreshGdeltEvents();
    }, liveGdeltPollMs());
  }, [globeReady, refreshGdeltEvents, shouldFetchGdeltFeed]);

  const refreshUkmto = useCallback(async (opts?: { force?: boolean }) => {
    if (
      !opts?.force &&
      shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)
    ) {
      return;
    }
    setUkmtoStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      const res = await fetch("/api/ukmto", { cache: "no-store" });
      if (!res.ok) throw new Error(`ukmto HTTP ${res.status}`);
      const payload = (await res.json()) as { incidents?: UkmtoIncidentPoint[] };
      setUkmtoIncidents(payload.incidents ?? []);
      setUkmtoStatus("ok");
    } catch {
      setUkmtoStatus("error");
    }
  }, [isCameraMovingRef, setUkmtoIncidents, setUkmtoStatus]);

  /**
   * UKMTO — cron이 30분 최소 간격으로 상류를 찌르고 D1에 적재한 걸 클라이언트는 읽기만 함.
   * 원본이 며칠에 한 번꼴로 갱신되는 소스라 클라이언트 폴링도 넉넉하게(10분).
   * 지정학 입구 fly 중에는 defer로 첫 페치가 스킵되지 않도록 force + idle 재시도.
   */
  useEffect(() => {
    if (!showUkmtoIncidents) {
      setUkmtoIncidents([]);
      setUkmtoStatus("idle");
      return;
    }
    void refreshUkmto({ force: true });
    const retryMs = Math.max(ENTRY_GATE.zoomOutFlyMs, 1200) + 400;
    const retryTimer = window.setTimeout(() => {
      void refreshUkmto({ force: true });
    }, retryMs);
    const stopInterval = visibleInterval(() => {
      void refreshUkmto();
    }, 10 * 60 * 1000);
    return () => {
      window.clearTimeout(retryTimer);
      stopInterval();
    };
  }, [refreshUkmto, setUkmtoIncidents, setUkmtoStatus, showUkmtoIncidents]);

  const refreshNavarea = useCallback(async (opts?: { force?: boolean }) => {
    if (
      !opts?.force &&
      shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)
    ) {
      return;
    }
    setNavareaStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      const res = await fetch("/api/navarea", { cache: "no-store" });
      if (!res.ok) throw new Error(`navarea HTTP ${res.status}`);
      const payload = await res.json();
      setNavareaFeatures(parseNavareaApiPayload(payload));
      setNavareaStatus("ok");
    } catch {
      setNavareaStatus("error");
    }
  }, [isCameraMovingRef, setNavareaFeatures, setNavareaStatus]);

  /**
   * NAVAREA — cron 스냅샷을 뉴스 리듬으로 폴링 (liveNavareaPollMs).
   * 최신 in-force 경고 위주 · 상류 TXT는 Worker 30분 스로틀.
   */
  useEffect(() => {
    if (!showNavareaWarnings) {
      setNavareaFeatures([]);
      setNavareaStatus("idle");
      return;
    }
    void refreshNavarea({ force: true });
    const retryMs = Math.max(ENTRY_GATE.zoomOutFlyMs, 1200) + 400;
    const retryTimer = window.setTimeout(() => {
      void refreshNavarea({ force: true });
    }, retryMs);
    const stop = visibleInterval(() => {
      void refreshNavarea();
    }, liveNavareaPollMs());
    return () => {
      window.clearTimeout(retryTimer);
      stop();
    };
  }, [refreshNavarea, setNavareaFeatures, setNavareaStatus, showNavareaWarnings]);

  /** 군사 훈련 — 자동 경보용으로 레이어 OFF여도 폴링 */
  const refreshMilitaryExercises = useCallback(async (opts?: { force?: boolean }) => {
    if (
      !opts?.force &&
      shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)
    ) {
      return;
    }
    setMilitaryExercisesStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      const res = await fetch("/api/military-exercises", { cache: "no-store" });
      if (!res.ok) throw new Error(`military-exercises HTTP ${res.status}`);
      const payload = (await res.json()) as { exercises?: MilitaryExercise[] };
      setMilitaryExercises(Array.isArray(payload.exercises) ? payload.exercises : []);
      setMilitaryExercisesStatus("ok");
    } catch {
      setMilitaryExercisesStatus("error");
    }
  }, [isCameraMovingRef, setMilitaryExercises, setMilitaryExercisesStatus]);

  useEffect(() => {
    if (isEconomyViewer) return;
    void refreshMilitaryExercises({ force: true });
    /**
     * ⚠️ 여기에는 원래 cleanup이 아예 없었다 — isEconomyViewer/refresh가 바뀔 때마다
     * 인터벌이 하나씩 쌓이는 누수였다. visibleInterval의 반환값을 그대로 돌려주면
     * 정리와 탭 게이트가 동시에 해결된다. (P1-4)
     */
    return visibleInterval(() => {
      void refreshMilitaryExercises();
    }, 3 * 60 * 1000);
  }, [isEconomyViewer, refreshMilitaryExercises]);

  /**
   * 안보 직결 해상 경보 — useMaritimeAlertBriefs 훅으로 추출 (분리 3단계).
   * 상태·오퍼·양피지 핸들러는 src/components/globe/hooks/useMaritimeAlertBriefs.ts
   */
  useEffect(() => {
    if (!showFirmsFires) {
      setFirmsFires([]);
      firmsBboxRef.current = "";
      return;
    }
    void refreshFirmsFires();
  }, [firmsBboxRef, refreshFirmsFires, setFirmsFires, showFirmsFires]);

  useEffect(() => {
    if (!showFirmsFires || (isCameraMoving && Date.now() >= immediateUntilRef.current)) return;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeLod.tier];
    const bbox = viewToBbox(layerViewState, radiusDeg);
    const signature = `${bbox.west.toFixed(1)},${bbox.south.toFixed(1)},${bbox.east.toFixed(1)},${bbox.north.toFixed(1)}:${globeLod.tier}`;
    if (signature === firmsBboxRef.current) return;
    firmsBboxRef.current = signature;
    void refreshFirmsFires();
  }, [
    applyGeneration,
    firmsBboxRef,
    globeLod.tier,
    immediateUntilRef,
    isCameraMoving,
    layerViewState,
    refreshFirmsFires,
    showFirmsFires,
  ]);

  useEffect(() => {
    if (!showFirmsFires) return;
    return visibleInterval(() => {
      void refreshFirmsFires();
    }, liveFirmsPollMs());
  }, [refreshFirmsFires, showFirmsFires]);

  return {
    refreshCyberEvents,
    refreshElectionEvents,
    refreshGdeltEvents,
    refreshFirmsFires,
    refreshUkmto,
    refreshNavarea,
    refreshMilitaryExercises,
  };
}
