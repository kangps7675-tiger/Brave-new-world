"use client";

import { useCallback, useEffect, useRef, type MutableRefObject, type Dispatch, type SetStateAction } from "react";
import type { AirRaidBriefingContent } from "@/components/AirRaidBriefingParchment";
import type { ExerciseBriefingContent } from "@/components/ExerciseBriefingParchment";
import { useTensionSpikeCut, type TensionCutDestination } from "@/components/globe/hooks/useTensionSpikeCut";
import { polygonFeatureKey } from "@/components/globe/overlayPolygons";
import type { EntryGate, NewsStreamNeonMarker, PolygonLayerFeature, GlobeLabel, ViewState } from "@/components/globe/types";
import { econNavSelectionFromId } from "@/data/econNavRegions";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import type { TransportPath } from "@/data/geoTypes";
import type { NavSelection } from "@/data/navRegions";
import type { CameraViewState } from "@/hooks/useCameraViewport";
import type { BattlefieldZone } from "@/lib/battlefieldPresets";
import type { DailyRanksPayload } from "@/lib/dailyRanks";
import type { GlobeLodTier } from "@/lib/globeLod";
import { HISTORICAL_MODE_LIVE_PREF_KEYS } from "@/lib/historicalFrames";
import { hotTheaterSessionConsumed, resolveHotTheaterFocus, markHotTheaterSessionApplied, type HotTheaterFocus } from "@/lib/hotTheaterLayers";
import { resolveInterestSoftApply, markInterestSoftApplyToday } from "@/lib/interest/applyFromInterest";
import type { LayerPrefs, LabelLanguage } from "@/lib/layerPrefs";
import type { PeriodicBriefing } from "@/lib/news/periodicBriefing";
import { type SentinelFlyTarget, SENTINEL_CYCLE_MS, fetchSentinelTour } from "@/lib/sentinelMode";
import type { TensionHeatmapLayer } from "@/lib/tensionHeatmap";
import { resolveTensionCutNav } from "@/lib/tensionSpikeCut";
import { navSelectionFromId } from "@/lib/theaterFocus";
import { shouldOfferTourInvite } from "@/lib/tourInvite";
import type { ViewTheaterChoice, ViewerMode } from "@/lib/viewPackages";
import { loadWatchPins, formatWatchPinsLine } from "@/lib/watchFocus";

export type UseSessionOfferEffectsOptions = {
  intelSheetOpen: boolean;
  viewTheater: ViewTheaterChoice;
  viewEconomyHub: string;
  viewerMode: ViewerMode;
  isEconomyViewer: boolean;
  isConflictViewer: boolean;
  layerPrefsLiveRef: MutableRefObject<LayerPrefs>;
  showModePicker: boolean;
  entryGate: EntryGate;
  langChoiceDone: boolean;
  langChoiceChecked: boolean;
  purposeJobDone: boolean;
  purposeJobChecked: boolean;
  purposeJobForced: boolean;
  showFirstVisitTour: boolean;
  setShowAirRaidCoach: Dispatch<SetStateAction<boolean>>;
  setNewsPerspectives: Dispatch<SetStateAction<NewsStreamNeonMarker | null>>;
  setWatchFocusLine: Dispatch<SetStateAction<string | null>>;
  livePrefsBeforeHistoryRef: MutableRefObject<Partial<Record<string, boolean>> | null>;
  showTourInvite: boolean;
  setShowTourInvite: Dispatch<SetStateAction<boolean>>;
  hotTheaterOffer: HotTheaterFocus | null;
  setHotTheaterOffer: Dispatch<SetStateAction<HotTheaterFocus | null>>;
  airRaidBriefing: AirRaidBriefingContent | null;
  hubBriefOpen: boolean;
  econInsightOpen: boolean;
  frictionEpisodeBrief: FrictionEpisode | null;
  calendarDayKey: string;
  battlefieldSoftZoneRef: MutableRefObject<BattlefieldZone | null>;
  battlefieldManualUntilRef: MutableRefObject<number>;
  sentinelActive: boolean;
  setSentinelActive: Dispatch<SetStateAction<boolean>>;
  setSentinelTour: Dispatch<SetStateAction<SentinelFlyTarget[]>>;
  setSentinelIndex: Dispatch<SetStateAction<number>>;
  isLoading: boolean;
  globeReady: boolean;
  loadError: string | null;
  exerciseBriefing: ExerciseBriefingContent | null;
  patchLayerPrefsSoft: (patch: Partial<LayerPrefs>) => void;
  dailyLampSettled: boolean;
  weeklyRecap: PeriodicBriefing | null;
  weeklyRecapSettled: boolean;
  periodicBriefing: PeriodicBriefing | null;
  weeklyExpanded: boolean;
  issueUiPausedForLamp: boolean;
  isHistoricalView: boolean;
  labelLanguage: LabelLanguage;
  regionNavSelection: NavSelection | null;
  econNavSelection: NavSelection | null;
  layerLodTierRef: MutableRefObject<GlobeLodTier>;
  viewState: ViewState;
  flyTo: (lat: number, lng: number, altitude?: number | undefined, durationMs?: number | undefined, camera?: { pitch?: number | undefined; bearing?: number | undefined; } | undefined) => void;
  flyToBounds: (selection: NavSelection, durationMs?: number | undefined, mode?: "overview" | "detail" | undefined, camera?: { pitch?: number | undefined; bearing?: number | undefined; } | undefined) => void;
  layerViewState: CameraViewState;
  polygonData: PolygonLayerFeature[];
  rawTensionHeatmaps: TensionHeatmapLayer[];
  rawGlobePaths: TransportPath[];
  globeLabels: GlobeLabel[];
  clearAirRaidOffer: () => void;
};

/**
 * 세션 시작 자동 제안·핫시어터·텐션 스파이크 이펙트 묶음.
 * GlobeDashboard에서 추출 (분리 Phase D).
 */
export function useSessionOfferEffects(opts: UseSessionOfferEffectsOptions) {
  const {
    intelSheetOpen,
    viewTheater,
    viewEconomyHub,
    viewerMode,
    isEconomyViewer,
    isConflictViewer,
    layerPrefsLiveRef,
    showModePicker,
    entryGate,
    langChoiceDone,
    langChoiceChecked,
    purposeJobDone,
    purposeJobChecked,
    purposeJobForced,
    showFirstVisitTour,
    setShowAirRaidCoach,
    setNewsPerspectives,
    setWatchFocusLine,
    livePrefsBeforeHistoryRef,
    showTourInvite,
    setShowTourInvite,
    hotTheaterOffer,
    setHotTheaterOffer,
    airRaidBriefing,
    hubBriefOpen,
    econInsightOpen,
    frictionEpisodeBrief,
    calendarDayKey,
    battlefieldSoftZoneRef,
    battlefieldManualUntilRef,
    sentinelActive,
    setSentinelActive,
    setSentinelTour,
    setSentinelIndex,
    isLoading,
    globeReady,
    loadError,
    exerciseBriefing,
    patchLayerPrefsSoft,
    dailyLampSettled,
    weeklyRecap,
    weeklyRecapSettled,
    periodicBriefing,
    weeklyExpanded,
    issueUiPausedForLamp,
    isHistoricalView,
    labelLanguage,
    regionNavSelection,
    econNavSelection,
    layerLodTierRef,
    viewState,
    flyTo,
    flyToBounds,
    layerViewState,
    polygonData,
    rawTensionHeatmaps,
    rawGlobePaths,
    globeLabels,
    clearAirRaidOffer,
  } = opts;

  /** 화면 투어 — 자동 풀투어 없음. 목적 카드·등불 settle 후 천천히 권유. */
  useEffect(() => {
    if (isLoading || loadError || !globeReady) return;
    if (!langChoiceChecked || !langChoiceDone) return;
    if (!purposeJobChecked || !purposeJobDone || purposeJobForced) return;
    if (entryGate !== null || showModePicker) return;
    if (showFirstVisitTour || showTourInvite) return;
    // 등불·주간 회고가 열려 있거나 아직 settle 전이면 미룸 (dismiss 경로가 이어서 점화)
    if (periodicBriefing || weeklyExpanded) return;
    if (!dailyLampSettled || !weeklyRecapSettled) return;
    if (!shouldOfferTourInvite()) return;

    const timer = window.setTimeout(() => {
      if (!shouldOfferTourInvite()) return;
      setShowTourInvite(true);
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [
    dailyLampSettled,
    entryGate,
    globeReady,
    isLoading,
    langChoiceChecked,
    langChoiceDone,
    loadError,
    periodicBriefing,
    purposeJobChecked,
    purposeJobDone,
    purposeJobForced,
    showFirstVisitTour,
    showModePicker,
    showTourInvite,
    weeklyExpanded,
    weeklyRecapSettled,
  ]);

  // 히스토리 모드 — 라이브 레이어 OFF (가짜 과거 점 금지). 오늘로 복귀 시 복원.
  useEffect(() => {
    if (isHistoricalView) {
      if (!livePrefsBeforeHistoryRef.current) {
        const snap: Partial<Record<string, boolean>> = {};
        const patch: Record<string, boolean> = {};
        const live = layerPrefsLiveRef.current as Record<string, unknown>;
        for (const key of HISTORICAL_MODE_LIVE_PREF_KEYS) {
          if (typeof live[key] === "boolean") {
            snap[key] = live[key] as boolean;
            if (live[key] === true) patch[key] = false;
          }
        }
        livePrefsBeforeHistoryRef.current = snap;
        if (Object.keys(patch).length > 0) {
          patchLayerPrefsSoft(patch as Parameters<typeof patchLayerPrefsSoft>[0]);
        }
      }
      return;
    }
    const snap = livePrefsBeforeHistoryRef.current;
    if (snap) {
      livePrefsBeforeHistoryRef.current = null;
      const restore: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(snap)) {
        if (typeof value === "boolean") restore[key] = value;
      }
      if (Object.keys(restore).length > 0) {
        patchLayerPrefsSoft(restore as Parameters<typeof patchLayerPrefsSoft>[0]);
      }
    }
  }, [isHistoricalView, patchLayerPrefsSoft, layerPrefsLiveRef]);

  // 세션 1회: daily-ranks 핫 전장·초크 → 선택창 (수락 시에만 레이어·카메라)
  useEffect(() => {
    if (!globeReady || isLoading || entryGate !== null || showModePicker) return;
    if (hotTheaterSessionConsumed()) return;
    if (hotTheaterOffer) return;
    let cancelled = false;
    const delay = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/daily-ranks?limit=3", {
            cache: "no-store",
            headers: { Accept: "application/json" },
          });
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as DailyRanksPayload;
          const focus = resolveHotTheaterFocus(data);
          if (!focus || cancelled) return;
          setHotTheaterOffer(focus);
        } catch {
          /* ranks 없으면 선택창 생략 */
        }
      })();
    }, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(delay);
    };
  }, [
    entryGate,
    globeReady,
    hotTheaterOffer,
    isLoading,
    showModePicker,
  ]);

  const acceptHotTheaterOffer = useCallback(() => {
    const focus = hotTheaterOffer;
    setHotTheaterOffer(null);
    if (!focus) return;
    markHotTheaterSessionApplied();
    if (isEconomyViewer) {
      patchLayerPrefsSoft({
        showShippingLanes: true,
        showLogisticsRisk: true,
        showPorts: true,
        showGasPipelines: true,
        showLngTerminals: true,
        showResources: true,
        showAis: true,
        showConflictEvents: focus.theaterId === "middle-east",
        showConflictTheaterIran: focus.theaterId === "middle-east",
      });
    } else {
      patchLayerPrefsSoft(focus.patch);
      const softZone =
        focus.theaterId === "middle-east" ||
        focus.chokeId === "choke-bab-el-mandeb" ||
        focus.chokeId === "choke-hormuz" ||
        focus.chokeId === "choke-suez"
          ? "middle-east"
          : focus.theaterId === "ukraine" || focus.theaterId === "russia-ukraine"
            ? "ukraine"
            : focus.theaterId === "taiwan" || focus.theaterId === "china-taiwan"
              ? "taiwan"
              : focus.theaterId === "korea"
                ? "korea"
                : null;
      if (softZone) {
        battlefieldSoftZoneRef.current = softZone;
        battlefieldManualUntilRef.current = Date.now() + 24_000;
      }
    }
    if (focus.fly) {
      flyTo(focus.fly.lat, focus.fly.lng, focus.fly.altitude);
    }
  }, [flyTo, hotTheaterOffer, isEconomyViewer, patchLayerPrefsSoft]);

  const dismissHotTheaterOffer = useCallback(() => {
    setHotTheaterOffer(null);
    markHotTheaterSessionApplied();
  }, []);

  // 핫 전장·초크 긴장 스파이크 → 렌즈 컷 오퍼
  const { tensionSpike, dismissTensionSpike } = useTensionSpikeCut({
    enabled: isConflictViewer,
    blocked: entryGate !== null || showModePicker || Boolean(airRaidBriefing) || issueUiPausedForLamp,
    calendarDayKey,
  });

  const onTensionSpikeJump = useCallback(
    (destination: TensionCutDestination) => {
      if (!tensionSpike) {
        dismissTensionSpike();
        return;
      }
      const target = resolveTensionCutNav(tensionSpike.entityId, destination);
      const selection =
        (target.economyNavId ? econNavSelectionFromId(target.economyNavId) : null) ??
        (target.conflictNavId ? navSelectionFromId(target.conflictNavId) : null);
      if (selection) {
        flyToBounds(selection, 1100, "overview");
      }
      dismissTensionSpike();
      markHotTheaterSessionApplied();
    },
    [dismissTensionSpike, flyToBounds, tensionSpike],
  );

  // 일 1회: 관심 프로필 soft 레이어 ON만 (끄기 없음 · 프리셋 픽커 없음)
  useEffect(() => {
    if (!globeReady || isLoading || entryGate !== null || showModePicker) return;
    const resolved = resolveInterestSoftApply(isEconomyViewer ? "economy" : "conflict");
    if (!resolved) return;
    markInterestSoftApplyToday();
    patchLayerPrefsSoft(resolved.patch);
  }, [
    entryGate,
    globeReady,
    isEconomyViewer,
    isLoading,
    patchLayerPrefsSoft,
    showModePicker,
    calendarDayKey,
  ]);

  // 양피지·인텔시트 등 대형 패널이 열리면 관점 패널 닫기 (겹침 방지)
  useEffect(() => {
    if (
      periodicBriefing ||
      weeklyExpanded ||
      intelSheetOpen ||
      hubBriefOpen ||
      frictionEpisodeBrief ||
      econInsightOpen ||
      airRaidBriefing ||
      exerciseBriefing
    ) {
      setNewsPerspectives(null);
    }
  }, [
    airRaidBriefing,
    econInsightOpen,
    exerciseBriefing,
    frictionEpisodeBrief,
    hubBriefOpen,
    intelSheetOpen,
    periodicBriefing,
    weeklyExpanded,
  ]);

  useEffect(() => {
    const pins = loadWatchPins();
    if (pins.length === 0) {
      setWatchFocusLine(null);
      return;
    }
    const langKey = labelLanguage === "en" ? "en" : "ko";
    let cancelled = false;
    void (async () => {
      const ranksByEntity: Record<string, { rank: number; prevRank: number | null }> = {};
      const needsRanks = pins.some((p) => p.rankEntityId);
      if (needsRanks) {
        try {
          const res = await fetch("/api/daily-ranks?limit=10", {
            cache: "no-store",
            headers: { Accept: "application/json" },
          });
          if (res.ok) {
            const data = (await res.json()) as DailyRanksPayload;
            for (const p of pins) {
              if (!p.rankEntityId) continue;
              const list =
                p.rankKind === "chokepoint" ? data.chokepoint ?? [] : data.theater ?? [];
              const hit = list.find((r) => r.entityId === p.rankEntityId);
              if (hit) ranksByEntity[p.rankEntityId] = { rank: hit.rank, prevRank: hit.prevRank };
            }
          }
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setWatchFocusLine(formatWatchPinsLine(pins, langKey, ranksByEntity));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    calendarDayKey,
    labelLanguage,
    regionNavSelection?.id,
    econNavSelection?.id,
    viewTheater,
    viewEconomyHub,
  ]);

  // 등불 양피지가 뜨면 진행 중이던 공습 배너·코치 즉시 중단
  useEffect(() => {
    if (!periodicBriefing && !weeklyRecap) return;
    clearAirRaidOffer();
    setShowAirRaidCoach(false);
  }, [periodicBriefing, weeklyRecap, clearAirRaidOffer]);

  // 모드·일자 전환 시 공습 오퍼도 리셋 (clearAirRaidOffer 선언 이후)
  useEffect(() => {
    clearAirRaidOffer();
  }, [viewerMode, calendarDayKey, clearAirRaidOffer]);

  // SENTINEL — 지정학=전장/초크, 지경학=초크·경제 중심지 (전장 제외)
  useEffect(() => {
    if (!sentinelActive) return;
    let cancelled = false;
    let timer: number | null = null;

    const runStop = (targets: SentinelFlyTarget[]) => {
      if (cancelled || targets.length === 0) return;
      setSentinelTour(targets);
      let i = 0;
      const tick = () => {
        if (cancelled) return;
        const t = targets[i % targets.length];
        if (t) {
          setSentinelIndex(i % targets.length);
          flyTo(t.lat, t.lng, t.altitude, 1600, { pitch: 38, bearing: (i * 37) % 360 });
        }
        i += 1;
        timer = window.setTimeout(tick, SENTINEL_CYCLE_MS);
      };
      tick();
    };

    void (async () => {
      const tour = await fetchSentinelTour(isEconomyViewer ? "economy" : "conflict");
      if (cancelled) return;
      if (tour.length === 0) {
        setSentinelActive(false);
        return;
      }
      runStop(tour);
    })();

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [sentinelActive, flyTo, isEconomyViewer]);

  const layerDebugPrevRef = useRef<{
    labels: number;
    heatmaps: number;
    polygons: number;
    paths: number;
    labelKey: string;
    heatmapKey: string;
    polygonKey: string;
    pathKey: string;
  } | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const labelKey = globeLabels
      .slice(0, 24)
      .map((item) => `p:${item.id}`)
      .join("|");
    const heatmapKey = rawTensionHeatmaps
      .map((layer) => `${layer.id}:${layer.points.length}:${layer.bandwidth.toFixed(2)}`)
      .join("|");
    const polygonKey = polygonData
      .slice(0, 24)
      .map((item) => `${item.polygonLayer}:${polygonFeatureKey(item)}`)
      .join("|");
    const pathKey = rawGlobePaths
      .slice(0, 24)
      .map((item) => `${item.kind}:${item.id}`)
      .join("|");

    const next = {
      labels: globeLabels.length,
      heatmaps: rawTensionHeatmaps.reduce((sum, layer) => sum + layer.points.length, 0),
      polygons: polygonData.length,
      paths: rawGlobePaths.length,
      labelKey,
      heatmapKey,
      polygonKey,
      pathKey,
    };

    const prev = layerDebugPrevRef.current;
    if (prev) {
      const churned =
        prev.labelKey !== next.labelKey ||
        prev.heatmapKey !== next.heatmapKey ||
        prev.polygonKey !== next.polygonKey ||
        prev.pathKey !== next.pathKey;
      if (churned) {
        console.debug("[globe-layer-churn]", {
          viewAltitude: Number(viewState.altitude.toFixed(3)),
          layerAltitude: Number(layerViewState.altitude.toFixed(3)),
          lodTier: layerLodTierRef.current,
          labels: `${prev.labels} -> ${next.labels}`,
          heatmapPoints: `${prev.heatmaps} -> ${next.heatmaps}`,
          polygons: `${prev.polygons} -> ${next.polygons}`,
          paths: `${prev.paths} -> ${next.paths}`,
        });
      }
    }
    layerDebugPrevRef.current = next;
  }, [
    globeLabels,
    rawGlobePaths,
    layerViewState.altitude,
    polygonData,
    rawTensionHeatmaps,
    viewState.altitude,
  ]);

  return {
    acceptHotTheaterOffer,
    dismissHotTheaterOffer,
    tensionSpike,
    dismissTensionSpike,
    onTensionSpikeJump,
  };
}
