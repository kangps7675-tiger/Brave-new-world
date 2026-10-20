"use client";

import { useEffect, type MutableRefObject, type Dispatch, type SetStateAction } from "react";
import type { AirRaidBriefingContent } from "@/components/AirRaidBriefingParchment";
import type { AirRaidOffer } from "@/components/AirRaidOfferBanner";
import type { ExerciseBriefingContent } from "@/components/ExerciseBriefingParchment";
import { useExerciseAlertAuto } from "@/components/globe/hooks/useExerciseAlertAuto";
import type { EntryGate } from "@/components/globe/types";
import type { NeptunStreamStatus } from "@/hooks/useNeptunStream";
import { shouldOfferControlsGuide } from "@/lib/controlsGuide";
import { deepDiveBlocksFlash, type DeepDiveSession } from "@/lib/deepDive/session";
import type { LayerPrefs, LabelLanguage } from "@/lib/layerPrefs";
import type { MilitaryExercise } from "@/lib/militaryExercises";
import { shouldOfferNeptunLiveBrief, markNeptunLiveBriefDone, buildNeptunLiveBriefContent } from "@/lib/neptunLiveBrief";
import type { BreakingFlashBriefing } from "@/lib/news/breakingFlash";
import type { PeriodicBriefing } from "@/lib/news/periodicBriefing";
import type { TheaterSitrepRegionId } from "@/lib/theaterReport/types";
import { shouldOfferUxGuideBrief, markUxGuideBriefDone, buildUxGuideBriefContent, type UxGuideBriefContent } from "@/lib/uxGuideBrief";
import type { ViewerMode } from "@/lib/viewPackages";

export type UseAlertAndAutoOfferEffectsOptions = {
  showLeftPanel: boolean;
  viewerMode: ViewerMode;
  isEconomyViewer: boolean;
  isSatelliteViewer: boolean;
  isHistoryViewer: boolean;
  layerPrefsLiveRef: MutableRefObject<LayerPrefs>;
  showModePicker: boolean;
  entryGate: EntryGate;
  langChoiceDone: boolean;
  langChoiceChecked: boolean;
  chromeCoachStep: "nav" | null;
  showFirstVisitTour: boolean;
  showAirRaidCoach: boolean;
  airRaidBriefing: AirRaidBriefingContent | null;
  setAirRaidBriefing: Dispatch<SetStateAction<AirRaidBriefingContent | null>>;
  uxGuideBrief: UxGuideBriefContent | null;
  setUxGuideBrief: Dispatch<SetStateAction<UxGuideBriefContent | null>>;
  deepDiveSession: DeepDiveSession | null;
  showFeatureGuide: boolean;
  showControlsGuide: boolean;
  setShowControlsGuide: Dispatch<SetStateAction<boolean>>;
  isLoading: boolean;
  globeReady: boolean;
  loadError: string | null;
  theaterSitrepRegion: TheaterSitrepRegionId | null;
  exerciseBriefing: ExerciseBriefingContent | null;
  setExerciseBriefing: Dispatch<SetStateAction<ExerciseBriefingContent | null>>;
  patchLayerPrefsSoft: (patch: Partial<LayerPrefs>) => void;
  dailyLampSettled: boolean;
  weeklyRecapSettled: boolean;
  periodicBriefing: PeriodicBriefing | null;
  weeklyExpanded: boolean;
  issueUiPausedForLamp: boolean;
  showNeptun: boolean;
  labelLanguage: LabelLanguage;
  breakingFlash: BreakingFlashBriefing | null;
  neptunStatus: NeptunStreamStatus;
  isUkraineTheaterFocus: boolean;
  displayMilitaryExercises: MilitaryExercise[];
  airRaidOffer: AirRaidOffer | null;
};

/**
 * 공습·훈련·시스템 경보 자동 제안 이펙트 묶음.
 * GlobeDashboard에서 추출 (분리 Phase D).
 */
export function useAlertAndAutoOfferEffects(opts: UseAlertAndAutoOfferEffectsOptions) {
  const {
    showLeftPanel,
    viewerMode,
    isEconomyViewer,
    isSatelliteViewer,
    isHistoryViewer,
    layerPrefsLiveRef,
    showModePicker,
    entryGate,
    langChoiceDone,
    langChoiceChecked,
    chromeCoachStep,
    showFirstVisitTour,
    showAirRaidCoach,
    airRaidBriefing,
    setAirRaidBriefing,
    uxGuideBrief,
    setUxGuideBrief,
    deepDiveSession,
    showFeatureGuide,
    showControlsGuide,
    setShowControlsGuide,
    isLoading,
    globeReady,
    loadError,
    theaterSitrepRegion,
    exerciseBriefing,
    setExerciseBriefing,
    patchLayerPrefsSoft,
    dailyLampSettled,
    weeklyRecapSettled,
    periodicBriefing,
    weeklyExpanded,
    issueUiPausedForLamp,
    showNeptun,
    labelLanguage,
    breakingFlash,
    neptunStatus,
    isUkraineTheaterFocus,
    displayMilitaryExercises,
    airRaidOffer,
  } = opts;

  /**
   * NEPTUN 실피드 첫 인상 — 우크라 전장/레이어 최초 노출 시 양피지 1회.
   * 스텁·등불·속보·공습 브리프와 배제. 「실피드」와 「추정」을 한 장에.
   */
  useEffect(() => {
    if (isEconomyViewer || isHistoryViewer || isSatelliteViewer) return;
    if (isLoading || loadError || !globeReady) return;
    if (entryGate !== null || showModePicker) return;
    if (!langChoiceDone) return;
    if (chromeCoachStep || showAirRaidCoach) return;
    if (deepDiveBlocksFlash(deepDiveSession)) return;
    if (airRaidBriefing || periodicBriefing || breakingFlash || exerciseBriefing) return;
    if (weeklyExpanded) return;
    if (neptunStatus !== "ok") return;
    if (!isUkraineTheaterFocus && !showNeptun) return;
    if (!shouldOfferNeptunLiveBrief()) return;

    const timer = window.setTimeout(() => {
      if (!shouldOfferNeptunLiveBrief()) return;
      markNeptunLiveBriefDone();
      if (!layerPrefsLiveRef.current.showNeptun) {
        patchLayerPrefsSoft({ showNeptun: true });
      }
      setAirRaidBriefing(buildNeptunLiveBriefContent(labelLanguage));
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    airRaidBriefing,
    breakingFlash,
    chromeCoachStep,
    deepDiveSession,
    entryGate,
    exerciseBriefing,
    globeReady,
    isEconomyViewer,
    isHistoryViewer,
    isLoading,
    isSatelliteViewer,
    isUkraineTheaterFocus,
    labelLanguage,
    langChoiceDone,
    loadError,
    neptunStatus,
    patchLayerPrefsSoft,
    periodicBriefing,
    showAirRaidCoach,
    showModePicker,
    showNeptun,
    weeklyExpanded,
  ]);

  /**
   * 레이어 패널 첫 오픈 — 「뭐가 뭔지」 양피지 1회.
   * 아마추어 성인용 · 등불/속보/공습 브리프와 배제.
   */
  useEffect(() => {
    if (!showLeftPanel) return;
    if (isLoading || loadError || !globeReady) return;
    if (entryGate !== null || showModePicker) return;
    if (!langChoiceDone) return;
    if (
      uxGuideBrief ||
      airRaidBriefing ||
      periodicBriefing ||
      breakingFlash ||
      exerciseBriefing ||
      weeklyExpanded
    ) {
      return;
    }
    if (!shouldOfferUxGuideBrief()) return;

    const timer = window.setTimeout(() => {
      if (!shouldOfferUxGuideBrief()) return;
      markUxGuideBriefDone();
      setUxGuideBrief(buildUxGuideBriefContent(labelLanguage, viewerMode));
    }, 450);

    return () => window.clearTimeout(timer);
  }, [
    airRaidBriefing,
    breakingFlash,
    entryGate,
    exerciseBriefing,
    globeReady,
    isLoading,
    labelLanguage,
    langChoiceDone,
    loadError,
    periodicBriefing,
    showLeftPanel,
    showModePicker,
    uxGuideBrief,
    viewerMode,
    weeklyExpanded,
  ]);

  /**
   * 지구본 조작키 안내 — 브라우저당 1회.
   * 등불·주간 회고가 끝난 뒤, 일반 유저 포함 모두에게 처음에 띄운다.
   */
  useEffect(() => {
    if (isLoading || loadError || !globeReady) return;
    if (entryGate !== null || showModePicker) return;
    if (!langChoiceDone || !langChoiceChecked) return;
    if (!dailyLampSettled || !weeklyRecapSettled) return;
    if (
      showControlsGuide ||
      uxGuideBrief ||
      airRaidBriefing ||
      periodicBriefing ||
      breakingFlash ||
      exerciseBriefing ||
      weeklyExpanded ||
      showFeatureGuide ||
      showFirstVisitTour
    ) {
      return;
    }
    if (!shouldOfferControlsGuide()) return;

    const timer = window.setTimeout(() => {
      if (!shouldOfferControlsGuide()) return;
      setShowControlsGuide(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    airRaidBriefing,
    breakingFlash,
    dailyLampSettled,
    entryGate,
    exerciseBriefing,
    globeReady,
    isLoading,
    langChoiceChecked,
    langChoiceDone,
    loadError,
    periodicBriefing,
    showControlsGuide,
    showFeatureGuide,
    showFirstVisitTour,
    showModePicker,
    uxGuideBrief,
    weeklyExpanded,
    weeklyRecapSettled,
  ]);

  const { exerciseOffer, dismissExerciseOffer } = useExerciseAlertAuto({
    paused:
      isEconomyViewer ||
      entryGate !== null ||
      showModePicker ||
      issueUiPausedForLamp ||
      deepDiveBlocksFlash(deepDiveSession) ||
      Boolean(airRaidBriefing) ||
      Boolean(airRaidOffer) ||
      Boolean(periodicBriefing) ||
      Boolean(breakingFlash) ||
      Boolean(theaterSitrepRegion),
    labelLanguage,
    exercises: displayMilitaryExercises,
    briefingBlocked:
      Boolean(periodicBriefing) ||
      Boolean(airRaidBriefing) ||
      Boolean(breakingFlash) ||
      Boolean(theaterSitrepRegion),
    exerciseBriefing,
    setExerciseBriefing,
    patchLayerPrefsSoft,
    layerPrefsLiveRef,
  });

  return {
    exerciseOffer,
    dismissExerciseOffer,
  };
}
