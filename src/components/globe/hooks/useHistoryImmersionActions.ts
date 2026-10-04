"use client";

import { useCallback, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from "react";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import type { LayerPrefs } from "@/lib/layerPrefs";
import {
  applyLayerPatch,
  liveBriefingLabel,
  type LiveBriefingSession,
} from "@/lib/eventBriefingSession";
import {
  applyConflictDeepDiveLayers,
  type DeepDiveSession,
} from "@/lib/deepDive/session";
import { DEEP_DIVE_LAYER_TARGET } from "@/lib/deepDive/layerBudget";
import { globeDistanceForAltitude } from "@/lib/globeCamera";
import { globeOrbitMaxAltitude } from "@/lib/globeFillScreen";
import {
  shouldOfferFrictionCoach,
  type FrictionCoachStep,
} from "@/components/FrictionOnboardingCoach";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import type { TerritorialDisputeEpisode } from "@/data/territorialDisputeEpisodes";

export type UseHistoryImmersionActionsOptions = {
  isEconomyViewer: boolean;
  viewState: { lat: number; lng: number; altitude: number };
  size: { width: number; height: number };
  flyTo: (
    lat: number,
    lng: number,
    altitude?: number,
    durationMs?: number,
    camera?: { pitch?: number; bearing?: number },
  ) => void;

  applyLayerPrefs: (prefs: LayerPrefs) => void;
  clearBreakingFlash: () => void;
  exitConflictDeepDive: (opts?: { restore?: boolean }) => void;
  clearFrictionEpisodeTimer: () => void;
  clearTerritorialSequence: () => void;
  clearHubBriefTimer: () => void;

  layerPrefsLiveRef: MutableRefObject<LayerPrefs>;
  deepDiveSessionRef: MutableRefObject<DeepDiveSession | null>;
  historyReturnRef: MutableRefObject<{ lat: number; lng: number; altitude: number } | null>;
  historyRoomTargetRef: MutableRefObject<number | null>;
  historyImmersionRef: MutableRefObject<boolean>;
  historyStoryLockedRef: MutableRefObject<boolean>;
  focusAltitudeCeilingRef: MutableRefObject<number | null>;
  frictionCoachAwaitHistoryRef: MutableRefObject<boolean>;
  frictionCoachListAckRef: MutableRefObject<boolean>;
  globeRef: RefObject<MapGlobeMethods | null>;

  setDeepDiveSession: Dispatch<SetStateAction<DeepDiveSession | null>>;
  setLiveBriefingSession: Dispatch<SetStateAction<LiveBriefingSession | null>>;
  setHistoryEntryAlt: Dispatch<SetStateAction<number | null>>;
  setFrictionEpisodeBrief: Dispatch<SetStateAction<FrictionEpisode | null>>;
  setRegimeSelectedEpisodeId: Dispatch<SetStateAction<string | null>>;
  setFrictionActiveStageId: Dispatch<SetStateAction<string | null>>;
  setDisputeHotspotSelectedId: Dispatch<SetStateAction<string | null>>;
  setDisputeEpisodeSelectedId: Dispatch<SetStateAction<string | null>>;
  setTerritorialEpisodeBrief: Dispatch<SetStateAction<TerritorialDisputeEpisode | null>>;
  setTerritorialActiveStageId: Dispatch<SetStateAction<string | null>>;
  setTerritorialRevealedStageIds: Dispatch<SetStateAction<string[]>>;
  setHubBriefOpen: Dispatch<SetStateAction<boolean>>;
  setRegionNavSelection: Dispatch<SetStateAction<import("@/data/navRegions").NavSelection | null>>;
  setFrictionCoachStep: Dispatch<SetStateAction<FrictionCoachStep | null>>;
};

/**
 * 분쟁 딥다이브·라이브 브리핑·역사 몰입 종료·마찰 코치 스텝 — GlobeDashboard에서 추출.
 */
export function useHistoryImmersionActions(opts: UseHistoryImmersionActionsOptions) {
  const {
    isEconomyViewer,
    viewState,
    size,
    flyTo,
    applyLayerPrefs,
    clearBreakingFlash,
    exitConflictDeepDive,
    clearFrictionEpisodeTimer,
    clearTerritorialSequence,
    clearHubBriefTimer,
    layerPrefsLiveRef,
    deepDiveSessionRef,
    historyReturnRef,
    historyRoomTargetRef,
    historyImmersionRef,
    historyStoryLockedRef,
    focusAltitudeCeilingRef,
    frictionCoachAwaitHistoryRef,
    frictionCoachListAckRef,
    globeRef,
    setDeepDiveSession,
    setLiveBriefingSession,
    setHistoryEntryAlt,
    setFrictionEpisodeBrief,
    setRegimeSelectedEpisodeId,
    setFrictionActiveStageId,
    setDisputeHotspotSelectedId,
    setDisputeEpisodeSelectedId,
    setTerritorialEpisodeBrief,
    setTerritorialActiveStageId,
    setTerritorialRevealedStageIds,
    setHubBriefOpen,
    setRegionNavSelection,
    setFrictionCoachStep,
  } = opts;

  const enterConflictDeepDive = useCallback(
    (
      kind: DeepDiveSession["kind"],
      key: string,
      patch: Parameters<typeof applyConflictDeepDiveLayers>[1],
      label: string,
    ) => {
      if (isEconomyViewer) return;
      setDeepDiveSession((prev) => {
        if (prev?.key === key) return prev;
        const snapshot = prev?.snapshot ?? { ...layerPrefsLiveRef.current };
        const { prefs, sceneKeys } = applyConflictDeepDiveLayers(
          snapshot,
          patch,
          DEEP_DIVE_LAYER_TARGET,
        );
        applyLayerPrefs(prefs);
        clearBreakingFlash();
        const next: DeepDiveSession = {
          domain: "conflict",
          kind,
          key,
          snapshot,
          sceneKeys,
          label,
          activeRingId: null,
        };
        deepDiveSessionRef.current = next;
        return next;
      });
    },
    [
      applyLayerPrefs,
      clearBreakingFlash,
      deepDiveSessionRef,
      isEconomyViewer,
      layerPrefsLiveRef,
      setDeepDiveSession,
    ],
  );

  const beginLiveBriefing = useCallback(
    (
      kind: LiveBriefingSession["kind"],
      patch: Parameters<typeof applyLayerPatch>[1],
      placeLabel: string,
    ) => {
      setLiveBriefingSession((prev) => {
        const snapshot = prev?.snapshot ?? { ...layerPrefsLiveRef.current };
        const labels = liveBriefingLabel(kind, placeLabel);
        applyLayerPrefs(applyLayerPatch({ ...layerPrefsLiveRef.current }, patch));
        return {
          kind,
          snapshot,
          labelKo: labels.ko,
          labelEn: labels.en,
        };
      });
    },
    [applyLayerPrefs, layerPrefsLiveRef, setLiveBriefingSession],
  );

  const exitHistoryImmersion = useCallback(() => {
    const back =
      historyReturnRef.current ??
      (viewState.altitude >= 1.8
        ? {
            lat: viewState.lat,
            lng: viewState.lng,
            altitude: Math.min(7.2, viewState.altitude),
          }
        : { lat: viewState.lat, lng: viewState.lng, altitude: 2.6 });
    historyReturnRef.current = null;
    historyRoomTargetRef.current = null;
    setHistoryEntryAlt(null);
    focusAltitudeCeilingRef.current = null;
    clearFrictionEpisodeTimer();
    clearTerritorialSequence();
    clearHubBriefTimer();
    historyImmersionRef.current = false;
    historyStoryLockedRef.current = false;
    exitConflictDeepDive();
    setFrictionEpisodeBrief(null);
    setRegimeSelectedEpisodeId(null);
    setFrictionActiveStageId(null);
    setDisputeHotspotSelectedId(null);
    setDisputeEpisodeSelectedId(null);
    setTerritorialEpisodeBrief(null);
    setTerritorialActiveStageId(null);
    setTerritorialRevealedStageIds([]);
    setHubBriefOpen(false);
    setRegionNavSelection(null);
    setFrictionCoachStep(null);
    frictionCoachAwaitHistoryRef.current = false;
    frictionCoachListAckRef.current = false;
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.maxDistance = globeDistanceForAltitude(
        globeOrbitMaxAltitude(size.width, size.height),
      );
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.enableRotate = true;
    }
    flyTo(back.lat, back.lng, back.altitude, 2400, { pitch: 8, bearing: 0 });
  }, [
    clearFrictionEpisodeTimer,
    clearHubBriefTimer,
    clearTerritorialSequence,
    exitConflictDeepDive,
    flyTo,
    focusAltitudeCeilingRef,
    frictionCoachAwaitHistoryRef,
    frictionCoachListAckRef,
    globeRef,
    historyImmersionRef,
    historyReturnRef,
    historyRoomTargetRef,
    historyStoryLockedRef,
    setDisputeEpisodeSelectedId,
    setDisputeHotspotSelectedId,
    setFrictionActiveStageId,
    setFrictionCoachStep,
    setFrictionEpisodeBrief,
    setHistoryEntryAlt,
    setHubBriefOpen,
    setRegimeSelectedEpisodeId,
    setRegionNavSelection,
    setTerritorialActiveStageId,
    setTerritorialEpisodeBrief,
    setTerritorialRevealedStageIds,
    size.height,
    size.width,
    viewState.altitude,
    viewState.lat,
    viewState.lng,
  ]);

  const handleFrictionCoachStepChange = useCallback(
    (next: FrictionCoachStep | null) => {
      setFrictionCoachStep((prev) => {
        if (prev === "list" && next === null) {
          frictionCoachListAckRef.current = true;
          if (shouldOfferFrictionCoach()) {
            frictionCoachAwaitHistoryRef.current = true;
          } else {
            frictionCoachAwaitHistoryRef.current = false;
          }
        }
        if (next === null && !shouldOfferFrictionCoach()) {
          frictionCoachAwaitHistoryRef.current = false;
        }
        return next;
      });
    },
    [frictionCoachAwaitHistoryRef, frictionCoachListAckRef, setFrictionCoachStep],
  );

  return {
    enterConflictDeepDive,
    beginLiveBriefing,
    exitHistoryImmersion,
    handleFrictionCoachStepChange,
  };
}
