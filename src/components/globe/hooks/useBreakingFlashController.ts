"use client";

import { useCallback, useEffect, useState } from "react";
import type { AirRaidBriefingContent } from "@/components/AirRaidBriefingParchment";
import type { ExerciseBriefingContent } from "@/components/ExerciseBriefingParchment";
import {
  buildBreakingFlashBriefingForLang,
  claimBreakingFlash,
  pickNextBreakingFlashHero,
  type BreakingFlashBriefing,
} from "@/lib/news/breakingFlash";
import { isEnergySupplyChainFlash } from "@/lib/news/energySupplyFlash";
import {
  canPublish,
  gateBreakingHero,
  type GateResult,
} from "@/lib/intelContract";
import { deepDiveBlocksFlash, type DeepDiveSession } from "@/lib/deepDive/session";
import type { NewsStreamPayload } from "@/lib/news/types";
import type { PeriodicBriefing } from "@/lib/news/periodicBriefing";
import type { TheaterSitrepRegionId } from "@/lib/theaterReport/types";
import type { LabelLanguage } from "@/lib/layerPrefs";

const BREAKING_FLASH_AUTO_ADVANCE_MS = 20_000;
const OBSERVE_BREAKING_FLASH_AUTO_ADVANCE_MS = 10_000;

export type UseBreakingFlashControllerOptions = {
  entryGate: unknown;
  showModePicker: boolean;
  langChoiceDone: boolean;
  deepDiveSession: DeepDiveSession | null;
  isHistoryViewer: boolean;
  isSatelliteViewer: boolean;
  isEconomyViewer: boolean;
  theaterSitrepRegion: TheaterSitrepRegionId | null;
  liveuaParchmentIndex: number | null;
  dailyLampSettled: boolean;
  weeklyRecapSettled: boolean;
  periodicBriefing: PeriodicBriefing | null;
  airRaidBriefing: AirRaidBriefingContent | null;
  exerciseBriefing: ExerciseBriefingContent | null;
  weeklyExpanded: boolean;
  newsStreamPayload: NewsStreamPayload | null;
  intelDisconfirmCorpus: NonNullable<Parameters<typeof gateBreakingHero>[1]>["disconfirmCorpus"];
  peaceScienceFlashDomain: "economy" | "conflict" | null;
  labelLanguage: LabelLanguage;
};

export type UseBreakingFlashControllerResult = {
  breakingFlash: BreakingFlashBriefing | null;
  breakingFlashGate: GateResult | null;
  dismissBreakingFlash: () => void;
  clearBreakingFlash: () => void;
};

/**
 * RSS/LIVEUA 신속속보 양피지 pick·publish·강제 순환 — GlobeDashboard에서 추출.
 */
export function useBreakingFlashController({
  entryGate,
  showModePicker,
  langChoiceDone,
  deepDiveSession,
  isHistoryViewer,
  isSatelliteViewer,
  isEconomyViewer,
  theaterSitrepRegion,
  liveuaParchmentIndex,
  dailyLampSettled,
  weeklyRecapSettled,
  periodicBriefing,
  airRaidBriefing,
  exerciseBriefing,
  weeklyExpanded,
  newsStreamPayload,
  intelDisconfirmCorpus,
  peaceScienceFlashDomain,
  labelLanguage,
}: UseBreakingFlashControllerOptions): UseBreakingFlashControllerResult {
  const [breakingFlash, setBreakingFlash] = useState<BreakingFlashBriefing | null>(null);
  const [breakingFlashGate, setBreakingFlashGate] = useState<GateResult | null>(null);

  const clearBreakingFlash = useCallback(() => {
    setBreakingFlash(null);
    setBreakingFlashGate(null);
  }, []);

  const dismissBreakingFlash = clearBreakingFlash;

  useEffect(() => {
    if (entryGate !== null || showModePicker) return;
    if (!langChoiceDone) return;
    if (deepDiveBlocksFlash(deepDiveSession)) {
      if (breakingFlash) setBreakingFlash(null);
      return;
    }
    if (isHistoryViewer) {
      if (breakingFlash) setBreakingFlash(null);
      return;
    }
    if (theaterSitrepRegion) {
      if (breakingFlash) setBreakingFlash(null);
      return;
    }
    if (isSatelliteViewer && liveuaParchmentIndex != null) {
      if (breakingFlash) setBreakingFlash(null);
      return;
    }
    if (!isSatelliteViewer && (!dailyLampSettled || !weeklyRecapSettled)) return;
    if (periodicBriefing || airRaidBriefing || exerciseBriefing || weeklyExpanded) return;
    if (breakingFlash) return;

    const mergedPayload = {
      hero: newsStreamPayload?.hero ?? null,
      flashHeroes: [...(newsStreamPayload?.flashHeroes ?? [])],
    };
    const hero = pickNextBreakingFlashHero(
      mergedPayload,
      isEconomyViewer && !isSatelliteViewer,
      isSatelliteViewer
        ? {
            /** 관측대 RSS — 유가·가스·초크·공급망만. 한 번 본 건 재타전 안 함 */
            energySupplyOnly: true,
          }
        : undefined,
    );
    if (!hero) return;

    const flashGate = gateBreakingHero(hero, {
      disconfirmCorpus: intelDisconfirmCorpus,
      windowHours: 72,
    });
    const energyBlob = `${hero.title} ${hero.titleKo ?? ""} ${hero.summary ?? ""} ${hero.bodyKo ?? ""}`;
    const energyOk =
      isSatelliteViewer && isEnergySupplyChainFlash(energyBlob);
    const publishOk =
      canPublish("breaking_flash", flashGate.grade) ||
      (isSatelliteViewer &&
        flashGate.grade === "low" &&
        (hero.breakingRank === "S" ||
          hero.breakingRank === "A" ||
          energyOk));
    if (!publishOk) return;

    let cancelled = false;
    void (async () => {
      const briefing = await buildBreakingFlashBriefingForLang(
        hero,
        labelLanguage,
        isEconomyViewer && !isSatelliteViewer,
        { peaceScienceDomain: peaceScienceFlashDomain },
      );
      if (cancelled) return;
      // 세션 중 한 번 본 신속속보는 다시 안 띄움 (관측대 포함)
      if (!claimBreakingFlash(hero.id)) return;
      setBreakingFlashGate(flashGate);
      setBreakingFlash(briefing);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    newsStreamPayload?.hero,
    newsStreamPayload?.flashHeroes,
    newsStreamPayload?.hero?.id,
    newsStreamPayload?.hero?.breakingRank,
    newsStreamPayload?.hero?.breakingGrade,
    newsStreamPayload?.hero?.title,
    newsStreamPayload?.hero?.summary,
    intelDisconfirmCorpus,
    isEconomyViewer,
    isSatelliteViewer,
    peaceScienceFlashDomain,
    labelLanguage,
    entryGate,
    showModePicker,
    langChoiceDone,
    dailyLampSettled,
    weeklyRecapSettled,
    periodicBriefing,
    airRaidBriefing,
    exerciseBriefing,
    weeklyExpanded,
    breakingFlash,
    isHistoryViewer,
    deepDiveSession,
    theaterSitrepRegion,
    liveuaParchmentIndex,
  ]);

  useEffect(() => {
    if (!breakingFlash) return;
    const ms = isSatelliteViewer
      ? OBSERVE_BREAKING_FLASH_AUTO_ADVANCE_MS
      : BREAKING_FLASH_AUTO_ADVANCE_MS;
    const timer = window.setTimeout(() => {
      setBreakingFlash(null);
      setBreakingFlashGate(null);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [breakingFlash, isSatelliteViewer]);

  return {
    breakingFlash,
    breakingFlashGate,
    dismissBreakingFlash,
    clearBreakingFlash,
  };
}
