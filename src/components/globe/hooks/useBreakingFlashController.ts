"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AirRaidBriefingContent } from "@/components/AirRaidBriefingParchment";
import type { ExerciseBriefingContent } from "@/components/ExerciseBriefingParchment";
import {
  buildBreakingFlashBriefingForLang,
  claimBreakingFlash,
  pickNextBreakingFlashHero,
  type BreakingFlashBriefing,
} from "@/lib/news/breakingFlash";
import {
  canPublish,
  gateBreakingHero,
  type GateResult,
} from "@/lib/intelContract";
import { deepDiveBlocksFlash, type DeepDiveSession } from "@/lib/deepDive/session";
import type { NewsStreamPayload } from "@/lib/news/types";
import { looksLikeMerchantAttack } from "@/lib/incidentStack/shipText";
import type { PeriodicBriefing } from "@/lib/news/periodicBriefing";
import type { TheaterSitrepRegionId } from "@/lib/theaterReport/types";
import type { LabelLanguage } from "@/lib/layerPrefs";

const BREAKING_FLASH_AUTO_ADVANCE_MS = 20_000;
const OBSERVE_BREAKING_FLASH_AUTO_ADVANCE_MS = 10_000;
/** 접속 시점에 이미 있던 속보라도 이 안쪽이면 "방금 난 속보"로 본다 */
const BREAKING_FLASH_FRESH_MINUTES = 10;

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

  /** 이 접속에서 첫 스트림에 이미 들어 있던 id — 접속 직후 옛 속보가 튀지 않게 한다 */
  const baselineIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (baselineIdsRef.current || !newsStreamPayload) return;
    baselineIdsRef.current = new Set(
      [newsStreamPayload.hero, ...(newsStreamPayload.flashHeroes ?? [])]
        .map((h) => h?.id)
        .filter((id): id is string => Boolean(id)),
    );
  }, [newsStreamPayload]);

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

    // 신규 속보만 — 접속 전부터 있던 건 제외 (단, 10분 이내면 방금 난 속보로 취급)
    const baseline = baselineIdsRef.current;
    if (!baseline) return;
    const isNewHero = (h: { id: string; ageMinutes?: number | null }) =>
      !baseline.has(h.id) ||
      (typeof h.ageMinutes === "number" &&
        h.ageMinutes <= BREAKING_FLASH_FRESH_MINUTES);
    const baseHero = newsStreamPayload?.hero ?? null;
    // 자동 팝업은 상선 피격 속보만 — 일반 속보(liveuamap 포함)는 우측 전선 속보 서랍에서 직접 연다
    const isShipAttackHero = (h: { title: string; titleKo?: string; summary?: string }) =>
      looksLikeMerchantAttack(`${h.title} ${h.titleKo ?? ""} ${h.summary ?? ""}`);
    const mergedPayload = {
      hero: baseHero && isNewHero(baseHero) && isShipAttackHero(baseHero) ? baseHero : null,
      flashHeroes: (newsStreamPayload?.flashHeroes ?? []).filter(
        (h) => isNewHero(h) && isShipAttackHero(h),
      ),
    };
    // 주제 제한 없음 — 등급·신선도 기준(shouldOpenBreakingFlash)만 적용
    const hero = pickNextBreakingFlashHero(
      mergedPayload,
      isEconomyViewer && !isSatelliteViewer,
    );
    if (!hero) return;

    const flashGate = gateBreakingHero(hero, {
      disconfirmCorpus: intelDisconfirmCorpus,
      windowHours: 72,
    });
    const publishOk =
      canPublish("breaking_flash", flashGate.grade) ||
      (isSatelliteViewer &&
        flashGate.grade === "low" &&
        (hero.breakingRank === "S" || hero.breakingRank === "A"));
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
