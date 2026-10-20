"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  buildLampMacroTable,
  ensureLampFeaturedNews,
  hasFoldedLamp,
  hasFoldedWeeklyRecap,
  hasLampAutoOpenedThisSession,
  lampSeenKey,
  localizePeriodicBriefing,
  markLampAutoOpenedThisSession,
  resolveLampPeriod,
  resolveMondayWeeklyRecap,
  weeklyRecapStorageKey,
  weeklyRecapTitle,
  type PeriodicBriefing,
} from "@/lib/news/periodicBriefing";
import { utcRankDate, type WorldTensionSnapshot } from "@/lib/dailyRanks";
import {
  getWorldTensionEntry,
  refreshWorldTension,
  subscribeWorldTension,
} from "@/lib/worldTensionStore";
import type { ChromeCoachStep } from "@/components/ChromeOnboardingCoach";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import type { EntryGate } from "@/components/globe/types";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

type UseDailyLampPipelineOptions = {
  /** 로컬 자정에 바뀜 — 매일 등불·WTI·랭크 날짜 재조회 트리거 */
  calendarDayKey: string;
  /** 6시간 슬롯 — 등불 사진·뉴스 재점화 */
  lampContentSlot: string;
  viewerMode: ViewerMode;
  isHistoryViewer: boolean;
  isSatelliteViewer: boolean;
  labelLanguage: LabelLanguage;
  // 부팅 게이트 플래그
  globeReady: boolean;
  isLoading: boolean;
  loadError: string | null;
  entryGate: EntryGate;
  showModePicker: boolean;
  langChoiceChecked: boolean;
  langChoiceDone: boolean;
  purposeJobChecked: boolean;
  purposeJobDone: boolean;
  purposeJobForced: boolean;
  chromeCoachStep: ChromeCoachStep | null;
  showAirRaidCoach: boolean;
  hubBriefOpen: boolean;
  frictionEpisodeBrief: FrictionEpisode | null;
  econInsightOpen: boolean;
  watchFocusLine: string | null;
};

type UseDailyLampPipelineResult = {
  // 등불 / 주간 회고
  dailyLampSettled: boolean;
  setDailyLampSettled: Dispatch<SetStateAction<boolean>>;
  weeklyRecap: PeriodicBriefing | null;
  setWeeklyRecap: Dispatch<SetStateAction<PeriodicBriefing | null>>;
  weeklyRecapCollapsed: boolean;
  setWeeklyRecapCollapsed: Dispatch<SetStateAction<boolean>>;
  weeklyRecapSettled: boolean;
  setWeeklyRecapSettled: Dispatch<SetStateAction<boolean>>;
  periodicBriefing: PeriodicBriefing | null;
  setPeriodicBriefing: Dispatch<SetStateAction<PeriodicBriefing | null>>;
  foldedPeriodicBriefing: PeriodicBriefing | null;
  setFoldedPeriodicBriefing: Dispatch<SetStateAction<PeriodicBriefing | null>>;
  // WTI
  wtiSnapshot: WorldTensionSnapshot | null;
  setWtiSnapshot: Dispatch<SetStateAction<WorldTensionSnapshot | null>>;
  wtiFetchedAt: string | null;
  setWtiFetchedAt: Dispatch<SetStateAction<string | null>>;
  // 일별 랭크 스크럽
  viewAsOf: string | null;
  setViewAsOf: Dispatch<SetStateAction<string | null>>;
  rankAvailableDates: string[];
  setRankAvailableDates: Dispatch<SetStateAction<string[]>>;
  // refs
  lampModeSwitchPendingRef: MutableRefObject<boolean>;
  prevViewerModeRef: MutableRefObject<ViewerMode | null>;
  // derived
  weeklyExpanded: boolean;
  issueUiPausedForLamp: boolean;
  showLampPreparing: boolean;
  todayUtc: string;
  effectiveAsOf: string;
  isHistoricalView: boolean;
  // callbacks
  prepareLampForModeSwitch: () => void;
  /** calendarDayKey effect에서 호출 — 등불·주간 회고 상태만 초기화 (비-등불 리셋은 Dashboard 몫) */
  resetForCalendarDay: () => void;
};

/**
 * 오늘의 등불 / 월요일 주간 회고 / WTI 파이프라인 — GlobeDashboard에서 추출.
 * 동작 변경 없음: Dashboard 인라인 상태·이펙트와 동일.
 * (히스토리 라이브 레이어 prefs 복원 이펙트는 포함하지 않는다.)
 */
export function useDailyLampPipeline({
  calendarDayKey,
  lampContentSlot,
  viewerMode,
  isHistoryViewer,
  isSatelliteViewer,
  labelLanguage,
  globeReady,
  isLoading,
  loadError,
  entryGate,
  showModePicker,
  langChoiceChecked,
  langChoiceDone,
  purposeJobChecked,
  purposeJobDone,
  purposeJobForced,
  chromeCoachStep,
  showAirRaidCoach,
  hubBriefOpen,
  frictionEpisodeBrief,
  econInsightOpen,
  watchFocusLine,
}: UseDailyLampPipelineOptions): UseDailyLampPipelineResult {
  const lampModeSwitchPendingRef = useRef(false);
  const prevViewerModeRef = useRef<ViewerMode | null>(null);

  const [periodicBriefing, setPeriodicBriefing] = useState<PeriodicBriefing | null>(null);
  /** 접어 둔 오늘의 등불 — 지도는 사용하면서 같은 날 다시 펼칠 수 있음 */
  const [foldedPeriodicBriefing, setFoldedPeriodicBriefing] =
    useState<PeriodicBriefing | null>(null);
  /** 오늘 등불 파이프라인 종료 여부(표시·스킵·이미 봄). false면 공습/이슈 UI 보류 */
  const [dailyLampSettled, setDailyLampSettled] = useState(false);
  const [weeklyRecap, setWeeklyRecap] = useState<PeriodicBriefing | null>(null);
  const [weeklyRecapCollapsed, setWeeklyRecapCollapsed] = useState(false);
  const [weeklyRecapSettled, setWeeklyRecapSettled] = useState(false);
  /** 오늘의 WTI — 사운드·등불·예측 기축 */
  const [wtiSnapshot, setWtiSnapshot] = useState<WorldTensionSnapshot | null>(null);
  /** WTI 기준 시각 캐시 — 상황판 as-of는 스냅샷 쪽을 쓰고 setter만 유지 */
  const [wtiFetchedAt, setWtiFetchedAt] = useState<string | null>(null);
  /** 일별 랭크 스크럽 기준일 (UTC YYYY-MM-DD). null = 오늘 */
  const [viewAsOf, setViewAsOf] = useState<string | null>(null);
  const [rankAvailableDates, setRankAvailableDates] = useState<string[]>([]);

  const todayUtc = utcRankDate();
  const effectiveAsOf = viewAsOf && viewAsOf !== todayUtc ? viewAsOf : todayUtc;
  const isHistoricalView = effectiveAsOf !== todayUtc;

  const weeklyExpanded = Boolean(weeklyRecap) && !weeklyRecapCollapsed;
  /** 등불 양피지가 떠 있거나 아직 오늘 등불이 끝나지 않으면 공습·이슈 UI 정지 */
  const issueUiPausedForLamp =
    weeklyExpanded || Boolean(periodicBriefing) || !weeklyRecapSettled || !dailyLampSettled;

  /** 양피지 나오기 전 — 반투명 로딩으로 “곧 뜬다” 암시 */
  const showLampPreparing =
    !isLoading &&
    !loadError &&
    globeReady &&
    entryGate === null &&
    !showModePicker &&
    langChoiceChecked &&
    langChoiceDone &&
    purposeJobChecked &&
    purposeJobDone &&
    !purposeJobForced &&
    issueUiPausedForLamp &&
    !periodicBriefing &&
    !weeklyExpanded;

  /**
   * 모드 전환 — 이전 등불 내리고 대상 모드 상태를 재평가할 준비만 한다.
   * 예전엔 여기서 clearLampFolded + 강제 재점화(lampModeSwitchPendingRef)를 했는데,
   * 그러면 이미 "접기"로 닫아 localStorage에 저장해둔 폴드 기록을 모드 전환마다 지워버려서
   * 지정학↔지경학을 오갈 때마다 등불이 매번 새로 튀어나왔다 — 유저가 이미 본 슬롯이면
   * 자동 점화 이펙트가 hasFoldedLamp로 알아서 접힌 탭으로만 복원하도록 그대로 둔다.
   */
  const prepareLampForModeSwitch = useCallback(() => {
    setPeriodicBriefing(null);
    setFoldedPeriodicBriefing(null);
    setDailyLampSettled(false);
  }, []);

  /** 일자 전환 — 등불·주간 게이트 재시작 (비-등불 리셋은 Dashboard에서 함께 처리) */
  const resetForCalendarDay = useCallback(() => {
    setPeriodicBriefing(null);
    setFoldedPeriodicBriefing(null);
    setDailyLampSettled(false);
    setWeeklyRecap(null);
    setWeeklyRecapCollapsed(false);
    setWeeklyRecapSettled(false);
  }, []);

  // 모드 전환 — 등불 상태만 재평가 (이미 본 슬롯이면 접힌 탭으로, 주간·인가는 유지)
  useEffect(() => {
    if (prevViewerModeRef.current === null) {
      prevViewerModeRef.current = viewerMode;
      return;
    }
    if (prevViewerModeRef.current === viewerMode) return;
    prevViewerModeRef.current = viewerMode;
    prepareLampForModeSwitch();
  }, [viewerMode, prepareLampForModeSwitch]);

  // 6시간 슬롯만 바뀌면 등불만 재점화 (주간·인가는 유지)
  useEffect(() => {
    setPeriodicBriefing(null);
    setFoldedPeriodicBriefing(null);
    setDailyLampSettled(false);
  }, [lampContentSlot]);

  /** 월요일 주간 회고 — 등불보다 먼저 settle */
  useEffect(() => {
    if (isLoading || loadError || !globeReady) return;
    if (entryGate !== null || showModePicker) return;
    if (!langChoiceChecked || !langChoiceDone) return;
    if (chromeCoachStep || showAirRaidCoach) return;
    if (hubBriefOpen || frictionEpisodeBrief || econInsightOpen) return;
    // 역사·관측(세슘 위성) 모드 — 주간 등불/회고 점화 안 함
    if (isHistoryViewer || isSatelliteViewer) {
      if (weeklyRecap) setWeeklyRecap(null);
      if (!weeklyRecapSettled) setWeeklyRecapSettled(true);
      return;
    }
    // 인가 칩과 병렬 — 칩 dismiss 대기로 주간·등불이 영구 정지되지 않게

    const offer = resolveMondayWeeklyRecap();
    if (!offer) {
      if (!weeklyRecapSettled) setWeeklyRecapSettled(true);
      if (weeklyRecap) setWeeklyRecap(null);
      return;
    }

    const storageKey = weeklyRecapStorageKey(offer.weekKey, viewerMode);
    if (weeklyRecap?.key === storageKey) {
      if (!weeklyRecapSettled) setWeeklyRecapSettled(true);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const langQs = labelLanguage === "en" ? "en" : "ko";
        const lampMode = viewerMode === "economy" ? "economy" : "conflict";
        let featuredNews: PeriodicBriefing["featuredNews"] = [];
        try {
          const res = await fetch(
            `/api/lamp-news?mode=${lampMode}&lang=${langQs}&window=prev-week`,
            { cache: "no-store" },
          );
          if (res.ok) {
            const payload = (await res.json()) as {
              featuredNews?: PeriodicBriefing["featuredNews"];
            };
            featuredNews = ensureLampFeaturedNews(payload.featuredNews ?? []);
          }
        } catch {
          /* empty shell */
        }
        const focusHint =
          watchFocusLine ??
          (labelLanguage === "en"
            ? "Monday photo desk — last week's hottest stories"
            : "월요일 사진 데스크 — 전주 뜨거웠던 소식");
        let content: PeriodicBriefing = {
          tier: "weekly",
          key: storageKey,
          title: weeklyRecapTitle(viewerMode, labelLanguage, focusHint),
          paragraphs: [],
          featuredNews,
        };
        content = await localizePeriodicBriefing(content, labelLanguage);
        if (!cancelled) {
          const startCollapsed = hasFoldedWeeklyRecap(storageKey);
          setWeeklyRecapCollapsed(startCollapsed);
          if (featuredNews.length > 0) {
            setWeeklyRecap(content);
          } else {
            setWeeklyRecap(null);
          }
          setWeeklyRecapSettled(true);
        }
      })();
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    calendarDayKey,
    chromeCoachStep,
    econInsightOpen,
    entryGate,
    frictionEpisodeBrief,
    globeReady,
    hubBriefOpen,
    isLoading,
    labelLanguage,
    langChoiceChecked,
    langChoiceDone,
    loadError,
    showAirRaidCoach,
    showModePicker,
    viewerMode,
    watchFocusLine,
    weeklyRecap,
    weeklyRecapSettled,
    isHistoryViewer,
    isSatelliteViewer,
  ]);

  /**
   * 등불뉴스 — **뉴비 전용 아님**. 일반·재방문 유저 포함, 세션당 모드별 첫 진입에서
   * 자동 펼침 1회(대표 뉴스·큰 사진). 닫으면 「등불」탭으로 접힘.
   * 설명창/투어와 달리 first-visit 게이트를 쓰지 않는다.
   * SLA: 게이트 해제 후 /api/lamp-news 응답까지 대기 — 카드 없으면 등불 생략.
   */
  useEffect(() => {
    if (isLoading || loadError || !globeReady) return;
    if (entryGate !== null || showModePicker) return;
    if (!langChoiceChecked || !langChoiceDone) return;
    if (chromeCoachStep || showAirRaidCoach) return;
    // 역사·관측(세슘 위성) 모드 — 등불(지정학/지경학 lamp-news)은 이 두 모드에서 점화 안 함
    if (isHistoryViewer || isSatelliteViewer) {
      lampModeSwitchPendingRef.current = false;
      if (periodicBriefing) setPeriodicBriefing(null);
      if (foldedPeriodicBriefing) setFoldedPeriodicBriefing(null);
      if (!dailyLampSettled) setDailyLampSettled(true);
      return;
    }
    const forceModeSwitchLamp = lampModeSwitchPendingRef.current;
    // 모드 전환 직후 — 주간 회고 대기 없이 바로 등불 (지정학↔지경학 뙇!)
    if (!forceModeSwitchLamp && (!weeklyRecapSettled || weeklyExpanded)) return;
    // 인가 칩이 안 닫혀도 등불·지도는 막지 않음 — 칩은 병렬 표시
    // (예전엔 clearanceChipSettled 대기로 dailyLampSettled가 영구 false → 오버레이 고착)

    // 다른 양피지 점유 중 — 모드 전환 등불만 예외, 나머지는 지도 잠금만 풀고 닫히면 재점화
    if (
      !forceModeSwitchLamp &&
      (hubBriefOpen || frictionEpisodeBrief || econInsightOpen)
    ) {
      setDailyLampSettled(true);
      return;
    }

    const { tier, contentSlot } = resolveLampPeriod();
    const slot = lampContentSlot.startsWith("daily-") ? lampContentSlot : contentSlot;
    const lampKey = lampSeenKey(slot, viewerMode);

    if (periodicBriefing?.key === lampKey) return;
    if (!forceModeSwitchLamp && foldedPeriodicBriefing?.key === lampKey) {
      setDailyLampSettled(true);
      return;
    }
    /**
     * 세션 첫 자동 펼침은 접힘 기록을 무시(일반 유저도 방문 처음에 켠다).
     * 같은 세션에서 이미 펼쳤거나 접은 뒤에는 hasFoldedLamp를 따른다.
     * 모드 전환 강제 점화는 항상 펼침.
     */
    const sessionAlreadyOpened = hasLampAutoOpenedThisSession(viewerMode);
    const lampWasFolded = forceModeSwitchLamp
      ? false
      : sessionAlreadyOpened
        ? hasFoldedLamp(lampKey)
        : false;

    /** 등불 og 보강 + 선정 — 서버에서 최대 ~24s */
    const LAMP_NEWS_BUDGET_MS = 24_000;
    const MACRO_ENRICH_MS = 2_500;

    const fetchWithTimeout = async (url: string, ms: number): Promise<Response | null> => {
      const ctrl = new AbortController();
      const abortTimer = window.setTimeout(() => ctrl.abort(), ms);
      try {
        return await fetch(url, { cache: "no-store", signal: ctrl.signal });
      } catch {
        return null;
      } finally {
        window.clearTimeout(abortTimer);
      }
    };

    let cancelled = false;

    const settleWithoutLamp = () => {
      if (cancelled) return;
      if (forceModeSwitchLamp) {
        lampModeSwitchPendingRef.current = false;
      }
      setDailyLampSettled(true);
    };

    const ignite = (content: PeriodicBriefing) => {
      if (cancelled) return;
      if (forceModeSwitchLamp) {
        lampModeSwitchPendingRef.current = false;
      }
      markLampAutoOpenedThisSession(viewerMode);
      if (lampWasFolded) {
        setFoldedPeriodicBriefing(content);
      } else {
        setPeriodicBriefing(content);
      }
      setDailyLampSettled(true);
    };

    void (async () => {
      const langQs = labelLanguage === "en" ? "en" : "ko";
      const isEconomy = viewerMode === "economy";

      const kicker = isEconomy
        ? labelLanguage === "en"
          ? tier === "monthly"
            ? "This month's market lamp"
            : tier === "weekly"
              ? "This week's market lamp"
              : "Today's market lamp"
          : tier === "monthly"
            ? "이번 달 시장 등불"
            : tier === "weekly"
              ? "이번 주 시장 등불"
              : "오늘의 시장 등불"
        : labelLanguage === "en"
          ? tier === "monthly"
            ? "This month's geopolitics lamp"
            : tier === "weekly"
              ? "This week's geopolitics lamp"
              : "Today's geopolitics lamp"
          : tier === "monthly"
            ? "이번 달 지정학 등불"
            : tier === "weekly"
              ? "이번 주 지정학 등불"
              : "오늘의 지정학 등불";

      let focusTitle = isEconomy
        ? labelLanguage === "en"
          ? "Markets in focus"
          : "시장이 주목하는 뉴스"
        : labelLanguage === "en"
          ? "Global regional deep desk"
          : "전 세계 지역별 심층 데스크";

      let macroTable = buildLampMacroTable([], labelLanguage);
      let featuredNews: PeriodicBriefing["featuredNews"] = [];

      // 등불 — og:image 추가 보강 후 기사에 붙은 사진이 있는 핫뉴스만 (전쟁·자연재해·시장 충격)
      try {
        const lampMode = isEconomy ? "economy" : "conflict";
        const lampRes = await fetchWithTimeout(
          `/api/lamp-news?mode=${lampMode}&lang=${langQs}`,
          LAMP_NEWS_BUDGET_MS,
        );
        if (lampRes?.ok) {
          const lampPayload = (await lampRes.json()) as {
            featuredNews?: PeriodicBriefing["featuredNews"];
          };
          featuredNews = ensureLampFeaturedNews(lampPayload.featuredNews ?? []);
        }
      } catch {
        /* ignore */
      }

      if (cancelled) return;

      if (isEconomy) {
        try {
          const dayKeyForApi = calendarDayKey.startsWith("daily-")
            ? calendarDayKey
            : slot.replace(/-s[0-3]$/, "");
          const lampRes = await fetchWithTimeout(
            `/api/world-stats/market-lamp?dayKey=${encodeURIComponent(dayKeyForApi)}&lang=${langQs}`,
            MACRO_ENRICH_MS,
          );
          if (lampRes?.ok && !cancelled) {
            const lamp = (await lampRes.json()) as {
              disabled?: boolean;
              focusTitle?: string;
              macros?: Array<{
                name?: string | null;
                id?: string | null;
                inflationPct?: number | null;
                gdpGrowthPct?: number | null;
                unemploymentPct?: number | null;
                gdpPerCapitaUsd?: number | null;
                gdpUsd?: number | null;
              }>;
            };
            if (!lamp.disabled) {
              if (lamp.focusTitle) focusTitle = lamp.focusTitle;
              if (lamp.macros && lamp.macros.length > 0) {
                macroTable = buildLampMacroTable(lamp.macros, labelLanguage);
              }
            }
          }
        } catch {
          /* ignore macro fetch */
        }
      }

      if (cancelled) return;

      // 지정학·지경학 모두 큰사진·프리뷰 카드형이 있을 때만 점화 (거시표만으로는 빈 데스크 금지)
      const hasLampContent = featuredNews.length > 0;
      if (hasLampContent) {
        let content: PeriodicBriefing = {
          tier,
          key: lampKey,
          contentSlot: slot,
          title: `${kicker}\n${focusTitle}`,
          paragraphs: [],
          macroTable,
          featuredNews,
        };
        // UI 언어 — 제목·프리뷰를 ko/en으로 강제 (서버 누락·캐시 잔여분 보정)
        content = await localizePeriodicBriefing(content, labelLanguage);
        if (cancelled) return;
        ignite(content);
      } else {
        settleWithoutLamp();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    calendarDayKey,
    chromeCoachStep,
    econInsightOpen,
    entryGate,
    frictionEpisodeBrief,
    foldedPeriodicBriefing,
    globeReady,
    hubBriefOpen,
    isLoading,
    labelLanguage,
    lampContentSlot,
    langChoiceChecked,
    langChoiceDone,
    loadError,
    periodicBriefing,
    showAirRaidCoach,
    showModePicker,
    viewerMode,
    weeklyExpanded,
    weeklyRecapSettled,
    isHistoryViewer,
    isSatelliteViewer,
  ]);

  // 오늘의 WTI — 사운드 강도·등불 기축 (등불보다 먼저 확보) · asOf 스크럽 시 해당일
  // 단일 소스 캐시(worldTensionStore)를 거친다 — 화면마다 따로 fetch하면
  // cron 갱신 타이밍에 따라 같은 순간에도 서로 다른 GTI 숫자가 보일 수 있다
  // (2026-08-30 리포트: 상단 칩 59 vs 좌측 패널 56). DailyRankSharePanel도
  // 같은 스토어를 구독한다.
  useEffect(() => {
    const dateParam = isHistoricalView ? effectiveAsOf : null;
    const current = getWorldTensionEntry(dateParam);
    setWtiSnapshot(current.snapshot);
    setWtiFetchedAt(current.fetchedAt);
    const unsubscribe = subscribeWorldTension(dateParam, (entry) => {
      setWtiSnapshot(entry.snapshot);
      setWtiFetchedAt(entry.fetchedAt);
    });
    void refreshWorldTension(dateParam);
    return unsubscribe;
  }, [calendarDayKey, effectiveAsOf, isHistoricalView]);

  // 스크러버용 가용 날짜
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/daily-ranks/dates?limit=120", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { dates?: string[] };
        if (!cancelled && Array.isArray(data.dates)) {
          setRankAvailableDates(data.dates);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarDayKey]);

  return {
    dailyLampSettled,
    setDailyLampSettled,
    weeklyRecap,
    setWeeklyRecap,
    weeklyRecapCollapsed,
    setWeeklyRecapCollapsed,
    weeklyRecapSettled,
    setWeeklyRecapSettled,
    periodicBriefing,
    setPeriodicBriefing,
    foldedPeriodicBriefing,
    setFoldedPeriodicBriefing,
    wtiSnapshot,
    setWtiSnapshot,
    wtiFetchedAt,
    setWtiFetchedAt,
    viewAsOf,
    setViewAsOf,
    rankAvailableDates,
    setRankAvailableDates,
    lampModeSwitchPendingRef,
    prevViewerModeRef,
    weeklyExpanded,
    issueUiPausedForLamp,
    showLampPreparing,
    todayUtc,
    effectiveAsOf,
    isHistoricalView,
    prepareLampForModeSwitch,
    resetForCalendarDay,
  };
}
