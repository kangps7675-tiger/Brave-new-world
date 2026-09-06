"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { InterestRecommendChips } from "@/components/InterestRecommendChips";
import { useInterestProfile } from "@/hooks/useInterestProfile";
import {
  interestTheaterScores,
  sortNewsByInterest,
} from "@/lib/interest/applyFromInterest";
import { emitBreakingDispatchSound } from "@/components/SoundEffectsBridge";
import {
  resolveConflictFlashBed,
  resolveEconomyFlashBed,
  shouldOpenBreakingFlash,
  wasBreakingFlashClaimed,
} from "@/lib/news/breakingFlash";
import { HoverHint } from "@/components/HoverHint";
import { PanelSkeletonLines, IntelChipSkeletonRow } from "@/components/PanelSkeletons";
import { EventMarketReactionCard } from "@/components/EventMarketReactionCard";
import { CounterfactualInvestCard } from "@/components/CounterfactualInvestCard";
import { StockTickerStrip } from "@/components/StockTickerStrip";
import { IntelRelatedMarketsPanel } from "@/components/IntelRelatedMarketsPanel";
import { ThemeCompanyBoard } from "@/components/ThemeCompanyBoard";
import { IntelSheetSearchBar, type IntelSearchResult } from "@/components/IntelSheetSearchBar";
import { TelegramIntelFeed, alertMatchesMediaFilter } from "@/components/TelegramIntelFeed";
import { ViinaFrontEventsPanel } from "@/components/ViinaFrontEventsPanel";
import { VideoNewsPanel } from "@/components/VideoNewsPanel";
import { GdeltAlertPanel } from "@/components/GdeltAlertPanel";
import type { MenuCoreAlert } from "@/lib/regionFilter";
import type { ViinaFrontEvent } from "@/lib/viinaFrontEvents";
import type { TelegramAlert } from "@/lib/telegramAlerts";
import type { HeroBreakingItem, NewsStreamItem, NewsStreamPayload, NewsTheater } from "@/lib/news/types";
import { displayNewsItemTitle, newsTitleBase, withUnverifiedTitleMark } from "@/lib/newfeedsI18n";
import {
  localizedDisplayText,
  useLocalizedTextMap,
} from "@/hooks/useLocalizedTextMap";
import { chokepointFocusTag } from "@/lib/news/chokepointNews";
import {
  ECONOMY_GENRE_ORDER,
  economyGenreHint,
  economyGenreLabel,
  matchesEconomyGenreFilter,
  type EconomyGenreFilter,
} from "@/lib/news/economyGenres";
import { isEconomyNewsMode } from "@/lib/news/feedCatalog";
import { isGeopoliticsOnlyTheater } from "@/lib/news/regionalConflictNews";
import type { ViewPackageId, ViewerMode } from "@/lib/viewPackages";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { useLocale } from "@/contexts/LocaleContext";
import { theaterLabel } from "@/lib/uiStrings";
import { bindableImperativeRef } from "@/lib/imperativeRef";
import { ECONOMY_TIER_LABELS } from "@/lib/news/mediaTiers";
import {
  FRED_ONLY_TICKER_SYMBOLS,
  STOCK_TICKER_SYMBOLS,
  tickerDisplayName,
} from "@/lib/stockTickers";
import {
  heroHighlightSymbols,
  INTEL_STACK_CLEARANCE_COLLAPSED,
  readIntelDockCollapsed,
  resolveBreakingSos,
  resolveIntelStackClearance,
  resolveIntelStackMode,
  TICKER_SPIKE_THRESHOLD_PERCENT,
  writeIntelDockCollapsed,
} from "@/lib/news/intelStackMode";
import {
  buildTodayBriefing,
  dismissTodayBriefing,
  isTodayBriefingDismissed,
  type TodayBriefing,
} from "@/lib/news/todayBriefing";
import { theaterAssetSymbols } from "@/lib/theaterAssets";
import {
  companyThemeSymbols,
  type CompanyThemeId,
} from "@/lib/themeCompanyAssets";
import { liveNewsPollMs } from "@/lib/liveRenderGuard";
import {
  flyTargetForTheater,
  matchesTheaterFilter,
  THEATER_CHIP_ORDER,
  type IntelTheaterFilter,
  type MapFlyTarget,
} from "@/lib/news/theaterMap";
import { resolveEconomyArticleFlyTarget } from "@/lib/news/economyMapFly";
import { canShowNudge, markNudgeShown } from "@/lib/onboardingBudget";
import { visibleInterval } from "@/lib/visibleInterval";

const INTEL_DRAG_HINT_KEY = "geowatch-intel-drag-hint-v1";

function readIntelDragHintDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(INTEL_DRAG_HINT_KEY) === "1";
  } catch {
    return true;
  }
}

/** 미열람 + 이번 세션 온보딩 예산이 남아 있을 때만 (가장 낮은 우선순위) */
function shouldOfferIntelDragHint(): boolean {
  return canShowNudge("intelDragHint", !readIntelDragHintDismissed());
}

function dismissIntelDragHint(): void {
  if (typeof window === "undefined") return;
  markNudgeShown("intelDragHint");
}

function IntelNewsCloseButton({
  onClick,
  ariaLabel,
  className = "",
}: {
  onClick: () => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`tap-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-400/50 bg-red-950/80 text-base font-bold leading-none text-red-50 shadow-[0_4px_14px_rgba(127,29,29,0.35)] transition hover:border-red-300/75 hover:bg-red-900/90 hover:text-white active:scale-95 ${className}`}
    >
      ✕
    </button>
  );
}

function IntelDragDismissHint({ economy = false }: { economy?: boolean }) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 미열람 + 세션 예산 잔여일 때만 (가장 낮은 우선순위 넛지)
    setVisible(shouldOfferIntelDragHint());
  }, []);

  const hide = useCallback(() => {
    dismissIntelDragHint();
    setVisible(false);
  }, []);

  if (!visible) return null;

  const tone = economy
    ? "border-emerald-300/28 bg-emerald-950/55 text-emerald-50"
    : "border-sky-300/30 bg-sky-950/60 text-sky-50";
  const subTone = economy ? "text-emerald-100/78" : "text-sky-100/78";
  const btnTone = economy
    ? "border-emerald-300/35 text-emerald-100/90 hover:bg-emerald-400/12"
    : "border-sky-300/35 text-sky-100/90 hover:bg-sky-400/12";

  return (
    <div
      className={`mx-3 flex shrink-0 items-start gap-2.5 rounded-xl border px-3 py-2.5 shadow-lg backdrop-blur-sm ${tone}`}
      role="note"
    >
      <span className="mt-0.5 shrink-0 text-sm leading-none opacity-85" aria-hidden>
        ↓
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">{t("intelDragDismissTitle")}</p>
        <p className={`mt-0.5 text-meta leading-snug ${subTone}`}>{t("intelDragDismissBody")}</p>
      </div>
      <button
        type="button"
        onClick={hide}
        className={`shrink-0 rounded-lg border px-2.5 py-1 text-micro font-medium transition ${btnTone}`}
      >
        {t("intelDragDismissGotIt")}
      </button>
    </div>
  );
}

export type IntelSheetTab =
  | "news"
  | "video"
  | "telegram"
  | "telegram-video"
  | "viina"
  | "gdelt"
  | "defense";

/** 경제 Intel 전체화면 — RSS · 증시 · 주요기업 · 테마 · 동영상 */
export type EconomyIntelTab =
  | "news"
  | "video"
  | "markets"
  | "majors"
  | "shipping-choke"
  | "aviation";

export type BottomIntelStackHandle = {
  openNewsPanel: (
    theater?: IntelTheaterFilter,
    tab?: IntelSheetTab,
    economyTab?: EconomyIntelTab,
  ) => void;
  closeNewsPanel: () => void;
};
const POLL_MS_FALLBACK = 90_000;

const THEATER_LABELS: Record<
  NewsStreamItem["theater"],
  { ko: string; en: string }
> = {
  "middle-east": { ko: "중동", en: "Middle East" },
  "russia-ukraine": { ko: "러·우", en: "RU–UA" },
  "china-taiwan": { ko: "중·대", en: "CN–TW" },
  korea: { ko: "한반도", en: "Korea" },
  japan: { ko: "일본", en: "Japan" },
  "south-asia": { ko: "남아시아", en: "South Asia" },
  "southeast-asia": { ko: "동남아", en: "SE Asia" },
  "south-america": { ko: "남미", en: "LatAm" },
  africa: { ko: "아프리카", en: "Africa" },
  arctic: { ko: "북극", en: "Arctic" },
  atlantic: { ko: "대서양", en: "Atlantic" },
  global: { ko: "글로벌", en: "Global" },
};

function newsStreamTheaterLabel(
  theater: NewsStreamItem["theater"],
  lang: LabelLanguage,
): string {
  const entry = THEATER_LABELS[theater];
  return lang === "en" ? entry.en : entry.ko;
}

const HERO_STATUS_LABELS: Record<
  HeroBreakingItem["heroStatus"],
  { ko: string; en: string }
> = {
  confirmed: { ko: "확인됨", en: "Confirmed" },
  breaking: { ko: "속보", en: "Breaking" },
  unverified: { ko: "미확인", en: "Unverified" },
};

const ECONOMY_HERO_STATUS_LABELS: Record<
  HeroBreakingItem["heroStatus"],
  { ko: string; en: string }
> = {
  confirmed: { ko: "시장 반영", en: "Priced in" },
  breaking: { ko: "속보", en: "Breaking" },
  unverified: { ko: "미확인", en: "Unverified" },
};

function heroStatusLabel(
  status: HeroBreakingItem["heroStatus"],
  lang: LabelLanguage,
  economy = false,
): string {
  const map = economy ? ECONOMY_HERO_STATUS_LABELS : HERO_STATUS_LABELS;
  return lang === "en" ? map[status].en : map[status].ko;
}

type NewsStreamContextValue = {
  payload: NewsStreamPayload | null;
  refresh: () => void;
  showTier3: boolean;
  setShowTier3: (v: boolean) => void;
  theaterFilter: IntelTheaterFilter;
  setTheaterFilter: (v: IntelTheaterFilter) => void;
  preferEconomyNews: boolean;
  viewPackages: ViewPackageId[];
  labelLanguage: LabelLanguage;
  /** 한글 모드: 서버 번역 누락 시 클라이언트에서 제목 보정 */
  localizedTitle: (item: {
    id: string;
    title: string;
    category?: string | null;
    source?: string | null;
    trustTier?: number | null;
    heroStatus?: string | null;
  }) => string;
  localizedSummary: (item: { id: string; summary?: string | null }) => string | undefined;
};

const NewsStreamContext = createContext<NewsStreamContextValue | null>(null);

export function useNewsStreamContext() {
  const ctx = useContext(NewsStreamContext);
  if (!ctx) throw new Error("NewsStreamProvider required");
  return ctx;
}

function emptyPayload(): NewsStreamPayload {
  return {
    fetchedAt: new Date().toISOString(),
    hero: null,
    flashHeroes: [],
    verified: [],
    stateMedia: [],
    stats: {
      total: 0,
      tier1: 0,
      tier2: 0,
      tier3: 0,
      economy: 0,
      theaters: {} as Record<NewsStreamItem["theater"], number>,
      genres: {},
    },
  };
}

function sortNewsItems(
  items: NewsStreamItem[],
  preferEconomy: boolean,
  theaterScores: Record<string, number> = {},
): NewsStreamItem[] {
  return sortNewsByInterest(items, theaterScores, preferEconomy);
}

function filterNewsByQuery(items: NewsStreamItem[], query: string): NewsStreamItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      (item.summary?.toLowerCase().includes(q) ?? false),
  );
}

function newsItemsToSearchResults(
  items: NewsStreamItem[],
  lang: LabelLanguage,
  titleOf?: (item: NewsStreamItem) => string,
): IntelSearchResult[] {
  return items.map((item) => ({
    id: item.id,
    title: titleOf ? titleOf(item) : displayNewsItemTitle(item, lang),
    subtitle: item.source,
    badge:
      item.trustTier === 1
        ? lang === "en"
          ? "Verified"
          : "확인"
        : item.trustTier === 2
          ? lang === "en"
            ? "Secondary"
            : "보완"
          : lang === "en"
            ? "Breaking"
            : "속보",
  }));
}

function formatAge(minutes: number, lang: LabelLanguage = "ko"): string {
  const en = lang === "en";
  if (minutes < 1) return en ? "Just now" : "방금";
  if (minutes < 60) return en ? `${minutes}m ago` : `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return en ? `${hours}h ago` : `${hours}시간 전`;
  return en ? `${Math.floor(hours / 24)}d ago` : `${Math.floor(hours / 24)}일 전`;
}

function formatPubAge(pubDate: string, lang: LabelLanguage = "ko"): string {
  const ts = Date.parse(pubDate);
  if (!Number.isFinite(ts)) return "";
  return formatAge(Math.max(0, Math.round((Date.now() - ts) / 60_000)), lang);
}

function heroShellClass(status: HeroBreakingItem["heroStatus"], economy = false): string {
  if (economy) {
    if (status === "confirmed") return "border-emerald-400/45 bg-emerald-950/30";
    if (status === "unverified") return "border-amber-400/55 bg-amber-950/25";
    return "border-emerald-300/40 bg-emerald-950/20";
  }
  if (status === "confirmed") return "border-red-400/45 bg-[#140a0a]/90 hero-breaking-confirmed";
  if (status === "unverified") return "border-amber-400/55 bg-amber-950/25 hero-breaking-unverified";
  return "border-rose-400/45 bg-[#140f0a]/88 hero-breaking-breaking";
}

function heroBadgeClass(status: HeroBreakingItem["heroStatus"], economy = false): string {
  if (economy) {
    if (status === "confirmed") return "border-emerald-400/40 bg-emerald-500/20 text-emerald-100";
    if (status === "unverified") return "border-amber-400/45 bg-amber-500/15 text-amber-100";
    return "border-emerald-300/40 bg-emerald-500/15 text-emerald-100";
  }
  if (status === "confirmed") return "border-red-400/40 bg-red-500/20 text-red-100";
  if (status === "unverified") return "border-amber-400/45 bg-amber-500/15 text-amber-100";
  return "border-rose-400/40 bg-rose-500/15 text-rose-100";
}

type NewsStreamProviderProps = {
  visible: boolean;
  children: ReactNode;
  theaterFilter: IntelTheaterFilter;
  onTheaterFilterChange: (v: IntelTheaterFilter) => void;
  viewPackages?: ViewPackageId[];
  labelLanguage?: LabelLanguage;
  /** 지도 네온 태그용 — 폴링 페이로드 동기화 */
  onPayloadChange?: (payload: NewsStreamPayload | null) => void;
};

export function NewsStreamProvider({
  visible,
  children,
  theaterFilter,
  onTheaterFilterChange,
  viewPackages = [],
  labelLanguage = "ko",
  onPayloadChange,
}: NewsStreamProviderProps) {
  const [payload, setPayload] = useState<NewsStreamPayload | null>(null);
  const [showTier3, setShowTier3] = useState(true);
  const preferEconomyNews = isEconomyNewsMode(viewPackages);
  const packagesKey = viewPackages.join(",");
  const langKey = labelLanguage;
  const onPayloadChangeRef = useRef(onPayloadChange);
  onPayloadChangeRef.current = onPayloadChange;

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (viewPackages.length > 0) {
        params.set("packages", viewPackages.join(","));
      }
      // 지정학·지경학 모두 — 한글 모드면 서버가 제목/요약을 KO로 번역
      params.set("lang", labelLanguage === "en" ? "en" : "ko");
      const qs = params.toString() ? `?${params.toString()}` : "";
      const newsRes = await fetch(`/api/news-stream${qs}`, { cache: "no-store" });
      const data = (await newsRes.json()) as NewsStreamPayload;
      const next = newsRes.ok ? data : { ...emptyPayload(), error: data.error };
      setPayload(next);
      onPayloadChangeRef.current?.(next);
    } catch {
      setPayload((prev) => {
        const next = prev ?? emptyPayload();
        onPayloadChangeRef.current?.(next);
        return next;
      });
    }
  }, [labelLanguage, viewPackages]);

  useEffect(() => {
    if (!visible) return;
    void refresh();
    return visibleInterval(() => void refresh(), liveNewsPollMs() || POLL_MS_FALLBACK);
  }, [refresh, visible, packagesKey, langKey]);

  /** 영문 모드: 원문 유지. 한글 모드: 서버 누락분 클라이언트 재번역 */
  const localizeEntries = useMemo(() => {
    if (!payload || labelLanguage === "en") return [];
    const entries: Array<{ key: string; text: string }> = [];
    const pushItem = (item: {
      id: string;
      title: string;
      summary?: string | null;
      category?: string | null;
      source?: string | null;
    }) => {
      // (미확인) 표기는 번역 후에 붙임 — 번역기에 태그를 넣지 않음
      entries.push({
        key: `t:${item.id}`,
        text: newsTitleBase(item, "ko"),
      });
      if (item.summary?.trim()) {
        entries.push({ key: `s:${item.id}`, text: item.summary });
      }
    };
    if (payload.hero) pushItem(payload.hero);
    for (const h of payload.flashHeroes ?? []) pushItem(h);
    for (const item of payload.verified) pushItem(item);
    for (const item of payload.stateMedia) pushItem(item);
    return entries;
  }, [payload, labelLanguage]);

  const localizedMap = useLocalizedTextMap(localizeEntries, "ko");

  const localizedTitle = useCallback(
    (item: {
      id: string;
      title: string;
      category?: string | null;
      source?: string | null;
      trustTier?: number | null;
      heroStatus?: string | null;
    }) => {
      const markOpts = {
        trustTier: item.trustTier,
        heroStatus: item.heroStatus,
      };
      if (labelLanguage === "en") {
        return displayNewsItemTitle(item, "en");
      }
      const translated = localizedDisplayText(
        localizedMap,
        `t:${item.id}`,
        newsTitleBase(item, "ko"),
      );
      return withUnverifiedTitleMark(translated, "ko", markOpts);
    },
    [labelLanguage, localizedMap],
  );

  const localizedSummary = useCallback(
    (item: { id: string; summary?: string | null }) => {
      if (!item.summary) return undefined;
      if (labelLanguage === "en") return item.summary;
      return localizedDisplayText(localizedMap, `s:${item.id}`, item.summary);
    },
    [labelLanguage, localizedMap],
  );

  return (
    <NewsStreamContext.Provider
      value={{
        payload,
        refresh,
        showTier3,
        setShowTier3,
        theaterFilter,
        setTheaterFilter: onTheaterFilterChange,
        preferEconomyNews,
        viewPackages,
        labelLanguage,
        localizedTitle,
        localizedSummary,
      }}
    >
      {children}
    </NewsStreamContext.Provider>
  );
}

type IntelCompactBarProps = {
  showTicker?: boolean;
  viewerMode?: ViewerMode;
  /** 카메라 tween/드래그 중 티커 폴링·스크롤 일시정지 */
  pauseUpdates?: boolean;
  /**
   * 모바일 우크라 전선 등 — 티커·투데이칩을 숨기고 📰/📈 FAB만 유지.
   * 전선 지도 가독성을 지키면서 Intel 시트 진입 경로를 남긴다.
   */
  fabOnly?: boolean;
  onOpenSheet: (theater?: IntelTheaterFilter) => void;
  /** 오늘 핫한 곳 → 맵 fly-to */
  onFlyToTheater?: (theater: NewsTheater) => void;
  /** 맞춤 칩 → 레이어 ON */
  onEnableLayer?: (layerKey: string) => void;
};

function TodayHotspotChip({
  briefing,
  economy,
  onOpen,
  onDismiss,
}: {
  briefing: TodayBriefing;
  economy?: boolean;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const { t } = useLocale();
  return (
    <div
      className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md ${
        economy
          ? "border-emerald-400/25 bg-[#071018]/92"
          : "border-amber-400/30 bg-[#120e08]/92"
      }`}
      role="status"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
        <span
          className={`text-micro font-bold uppercase tracking-[0.18em] ${
            economy ? "text-emerald-200/90" : "text-amber-200/90"
          }`}
        >
          {t("todayHotLabel")}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-micro text-slate-500 transition hover:text-slate-300"
        >
          {t("todayHotDismiss")}
        </button>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-1 px-3 py-2.5 text-left transition hover:brightness-110"
      >
        <p className="font-news-headline text-xs font-semibold leading-snug text-slate-50">{briefing.headline}</p>
        <ol className="space-y-0.5 text-meta leading-5 text-slate-400">
          {briefing.lines.map((line, i) => (
            <li key={i} className="line-clamp-2">
              <span className="mr-1 text-slate-600">{i + 1}.</span>
              {line}
            </li>
          ))}
        </ol>
        <span
          className={`mt-1 text-micro font-semibold uppercase tracking-wider ${
            economy ? "text-emerald-300/90" : "text-amber-300/90"
          }`}
        >
          {t("todayHotOpen")} →
        </span>
      </button>
    </div>
  );
}

function HeroHeadlineBanner({
  hero,
  onOpenSheet,
  economy = false,
  viewerMode = "conflict",
}: {
  hero: HeroBreakingItem;
  onOpenSheet: (theater?: IntelTheaterFilter) => void;
  economy?: boolean;
  viewerMode?: ViewerMode;
}) {
  const { lang, t } = useLocale();
  const { localizedTitle } = useNewsStreamContext();
  const statusText = heroStatusLabel(hero.heroStatus, lang, economy);
  const title = localizedTitle(hero);
  return (
    <div
      className={`intel-hero-enter pointer-events-auto overflow-hidden rounded-t-2xl border border-b-0 shadow-2xl backdrop-blur-md ${heroShellClass(hero.heroStatus, economy)}`}
      role="status"
      aria-live="polite"
      aria-label={`${lang === "en" ? "Breaking" : "속보"}: ${title}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/12 bg-black/20 px-3 py-1.5">
        <span className="text-micro font-bold uppercase tracking-[0.22em] text-red-200/90">
          {lang === "en" ? "Headline" : "헤드라인"}
        </span>
        <span className="text-micro text-slate-500">{theaterLabel(hero.theater, lang)}</span>
      </div>
      <button
        type="button"
        onClick={() => onOpenSheet(hero.theater)}
        className="hero-open-cta flex w-full flex-col text-left transition hover:brightness-110 active:scale-[0.995]"
      >
        <div className="flex min-h-[44px] items-center gap-2.5 px-3 py-2.5">
          {hero.heroStatus === "unverified" ? (
            <span className="shrink-0 text-sm text-amber-300" aria-hidden>
              ⚠
            </span>
          ) : (
            <span className="shrink-0 text-micro text-red-400" aria-hidden>
              ●
            </span>
          )}
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-micro font-semibold uppercase tracking-wide ${heroBadgeClass(hero.heroStatus, economy)}`}
          >
            {statusText}
          </span>
          <span className="font-news-headline min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-slate-50">
            {hero.heroStatus === "unverified"
              ? lang === "ko"
                ? `${hero.source}에 따르면 `
                : `${hero.source}${t("heroAccordingTo")}`
              : ""}
            {title}
          </span>
          <span className="shrink-0 text-micro text-slate-500">
            {formatAge(hero.ageMinutes, lang)}
          </span>
          <span className="hero-open-cta-arrow shrink-0 text-micro font-bold uppercase tracking-wider text-sky-300">
            {t("openPanel")}
          </span>
        </div>
      </button>
      <EventMarketReactionCard
          theater={hero.theater}
          ageMinutes={hero.ageMinutes}
          prominent
          viewerMode={viewerMode}
        />
      <CounterfactualInvestCard
        theater={hero.theater}
        ageMinutes={hero.ageMinutes}
        viewerMode={viewerMode}
        prominent
      />
      {hero.link ? (
        <div className="flex justify-end border-t border-white/8 px-2 py-1.5">
          <HoverHint placement="top" title={t("hoverOpenArticle")} detail={t("hoverOpenArticleHint")}>
            <a
              href={hero.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-slate-600/60 px-2 py-1 text-micro text-slate-300 hover:border-slate-400 hover:text-slate-100"
            >
              {t("openOriginal")}
            </a>
          </HoverHint>
        </div>
      ) : null}
    </div>
  );
}

export function DynamicIntelStack({
  showTicker = true,
  viewerMode = "conflict",
  pauseUpdates = false,
  fabOnly = false,
  onOpenSheet,
  onFlyToTheater,
  onEnableLayer,
}: IntelCompactBarProps) {
  const { lang, t } = useLocale();
  const { payload, preferEconomyNews, theaterFilter } = useNewsStreamContext();
  const isEconomy = viewerMode === "economy" || preferEconomyNews;
  const timelineMode: ViewerMode = isEconomy ? "economy" : "conflict";
  const hero = payload?.hero ?? null;
  const mode = resolveIntelStackMode(hero);
  const isAlert = mode === "alert";
  const highlightSymbols = useMemo(() => {
    const mode = isEconomy ? "economy" : "conflict";
    if (isAlert && hero) return heroHighlightSymbols(hero, undefined, mode);
    if (hero) return theaterAssetSymbols(hero.theater, mode);
    if (theaterFilter && theaterFilter !== "all") {
      return theaterAssetSymbols(theaterFilter, mode);
    }
    return [];
  }, [hero, isAlert, isEconomy, theaterFilter]);
  const [todayHidden, setTodayHidden] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const lastBreakingHeroIdRef = useRef<string | null>(null);
  /** pending: 방향 판별 전 · active: 하향 dismiss 드래그 확정(위로 스크롤은 가로채지 않음) */
  const dockDragRef = useRef<{
    pointerId: number;
    startY: number;
    pending: boolean;
    active: boolean;
  } | null>(null);
  const [dockDragY, setDockDragY] = useState(0);

  /** S급만 SOS 모스 (A는 배너만 · 사이렌 없음). 귀중 속보 양피지가 타전하면 그쪽으로 음향 위임 */
  useEffect(() => {
    if (!isAlert || !hero?.id || !resolveBreakingSos(hero)) {
      if (!isAlert) lastBreakingHeroIdRef.current = null;
      return;
    }
    if (lastBreakingHeroIdRef.current === hero.id) return;
    if (
      wasBreakingFlashClaimed(hero.id) ||
      shouldOpenBreakingFlash(hero, isEconomy)
    ) {
      lastBreakingHeroIdRef.current = hero.id;
      return;
    }
    lastBreakingHeroIdRef.current = hero.id;
    const bed = isEconomy
      ? resolveEconomyFlashBed(`${hero.title} ${hero.summary ?? ""}`)
      : resolveConflictFlashBed(`${hero.title} ${hero.summary ?? ""}`);
    emitBreakingDispatchSound({ bed });
  }, [isAlert, hero, hero?.id, hero?.breakingRank, isEconomy]);

  useEffect(() => {
    setTodayHidden(isTodayBriefingDismissed());
    setDockCollapsed(readIntelDockCollapsed());
  }, []);

  const collapseDock = useCallback(() => {
    setDockCollapsed(true);
    writeIntelDockCollapsed(true);
    setDockDragY(0);
    dismissIntelDragHint();
  }, []);

  const expandDock = useCallback(() => {
    setDockCollapsed(false);
    writeIntelDockCollapsed(false);
    setDockDragY(0);
  }, []);

  const todayBriefing = useMemo(() => {
    if (fabOnly || isAlert || todayHidden || dockCollapsed) return null;
    return buildTodayBriefing(payload, lang);
  }, [fabOnly, isAlert, todayHidden, dockCollapsed, payload, lang]);

  useEffect(() => {
    if (fabOnly) {
      document.documentElement.style.setProperty("--bottom-intel-stack-clearance", "4.5rem");
      return () => {
        document.documentElement.style.setProperty(
          "--bottom-intel-stack-clearance",
          resolveIntelStackClearance("calm", viewerMode),
        );
      };
    }
    if (dockCollapsed) {
      document.documentElement.style.setProperty(
        "--bottom-intel-stack-clearance",
        INTEL_STACK_CLEARANCE_COLLAPSED,
      );
      return () => {
        document.documentElement.style.setProperty(
          "--bottom-intel-stack-clearance",
          resolveIntelStackClearance("calm", viewerMode),
        );
      };
    }
    const base = resolveIntelStackClearance(mode, viewerMode);
    const withToday =
      todayBriefing && !isAlert
        ? `calc(${base} + 7.5rem)`
        : base;
    document.documentElement.style.setProperty("--bottom-intel-stack-clearance", withToday);
    return () => {
      document.documentElement.style.setProperty(
        "--bottom-intel-stack-clearance",
        resolveIntelStackClearance("calm", viewerMode),
      );
    };
  }, [fabOnly, mode, viewerMode, todayBriefing, isAlert, dockCollapsed]);

  const showCompactTicker = !fabOnly && !dockCollapsed && (viewerMode === "economy" || showTicker);
  const showFab = fabOnly || !isAlert || dockCollapsed;

  const handleTodayOpen = useCallback(() => {
    if (!todayBriefing) return;
    onFlyToTheater?.(todayBriefing.theater);
    onOpenSheet(todayBriefing.theater);
  }, [todayBriefing, onFlyToTheater, onOpenSheet]);

  const handleTodayDismiss = useCallback(() => {
    dismissTodayBriefing();
    setTodayHidden(true);
  }, []);

  const onDockHandlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dockDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      pending: true,
      active: false,
    };
  }, []);

  const onDockHandlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dockDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = event.clientY - drag.startY;
    if (drag.pending) {
      if (delta <= -8) {
        // 위로 스와이프 → 스크롤/제스처에 양보 (capture 하지 않음)
        dockDragRef.current = null;
        setDockDragY(0);
        return;
      }
      if (delta < 10) return;
      drag.pending = false;
      drag.active = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (!drag.active) return;
    setDockDragY(Math.max(0, delta));
  }, []);

  const onDockHandlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dockDragRef.current;
      dockDragRef.current = null;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.active) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
        const delta = Math.max(0, event.clientY - drag.startY);
        if (delta > 56) collapseDock();
        else setDockDragY(0);
        return;
      }
      setDockDragY(0);
    },
    [collapseDock],
  );

  if (fabOnly) {
    return (
      <div
        id="bottom-intel-compact"
        className="intel-stack intel-stack--fab-only pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 flex-col items-center"
      >
        <HoverHint
          placement="top"
          title={isEconomy ? t("hoverEconomyFab") : t("hoverIntelFab")}
          detail={isEconomy ? t("hoverEconomyFabHint") : t("hoverIntelFabHint")}
        >
          <button
            type="button"
            onClick={() => onOpenSheet("all")}
            aria-label={isEconomy ? t("hoverEconomyFabOpenAria") : t("hoverIntelFabOpenAria")}
            className={`intel-mini-fab tap-target pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm shadow-lg backdrop-blur-md transition ${
              isEconomy
                ? "border-emerald-300/25 bg-emerald-950/85 text-emerald-100 hover:border-emerald-200/40 hover:bg-emerald-900/90"
                : "border-sky-300/20 bg-[#0a1830]/85 text-sky-100 hover:border-sky-200/40 hover:bg-[#0c2040]/90"
            }`}
          >
            {isEconomy ? "📈" : "📰"}
          </button>
        </HoverHint>
      </div>
    );
  }

  if (dockCollapsed) {
    return (
        <div
          id="bottom-intel-compact"
          className="intel-stack intel-stack--collapsed pointer-events-none absolute left-1/2 z-20 flex w-[min(94vw,420px)] -translate-x-1/2 flex-col items-stretch"
        >
        <div
          className={`intel-stack-panel pointer-events-auto flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-2xl backdrop-blur-md ${
            isEconomy
              ? "border-emerald-300/20 bg-[#071018]/88"
              : "border-sky-300/20 bg-[#0a1428]/88"
          }`}
        >
          <button
            type="button"
            onClick={expandDock}
            className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left"
            aria-label={t("intelDockExpandAria")}
          >
            <span className="intel-news-sheet__handle shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block text-meta font-medium text-sky-50/90">
                {t("intelDockGlobeFullscreen")}
              </span>
              <span className="block truncate text-micro text-sky-200/55">
                {t("intelDockExpandHint")}
              </span>
            </span>
          </button>
          <HoverHint
            placement="top"
            title={isEconomy ? t("hoverEconomyFab") : t("hoverIntelFab")}
            detail={isEconomy ? t("hoverEconomyFabHint") : t("hoverIntelFabHint")}
          >
            <button
              type="button"
              onClick={() => {
                expandDock();
                onOpenSheet("all");
              }}
              aria-label={isEconomy ? t("hoverEconomyFabOpenAria") : t("hoverIntelFabOpenAria")}
              className={`intel-mini-fab tap-target flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm transition ${
                isEconomy
                  ? "border-emerald-300/25 bg-emerald-950/85 text-emerald-100"
                  : "border-sky-300/20 bg-[#0a1830]/85 text-sky-100"
              }`}
            >
              {isEconomy ? "📈" : "📰"}
            </button>
          </HoverHint>
        </div>
      </div>
    );
  }

  return (
    <div
      id="bottom-intel-compact"
      className={`intel-stack pointer-events-none absolute left-1/2 z-20 flex w-[min(96vw,720px)] -translate-x-1/2 flex-col items-stretch gap-2 ${
        isAlert ? "intel-stack--alert w-[min(96vw,860px)]" : "intel-stack--calm"
      }`}
      style={dockDragY > 0 ? { transform: `translateY(${dockDragY}px)` } : undefined}
    >
      {todayBriefing ? (
        <TodayHotspotChip
          briefing={todayBriefing}
          economy={isEconomy}
          onOpen={handleTodayOpen}
          onDismiss={handleTodayDismiss}
        />
      ) : null}

      {!fabOnly && !dockCollapsed ? (
        <InterestRecommendChips
          economy={isEconomy}
          onFlyToTheater={onFlyToTheater}
          onOpenSheet={onOpenSheet}
          onEnableLayer={onEnableLayer}
        />
      ) : null}

      <div
        className={`intel-stack-panel pointer-events-auto flex flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md ${
          isAlert
            ? isEconomy
              ? "intel-stack-panel--alert border-emerald-400/30 bg-[#071018]/92"
              : "intel-stack-panel--alert border-rose-400/30 bg-[#0a0c14]/92"
            : isEconomy
              ? "border-emerald-300/15 bg-[#071018]/88"
              : "border-sky-300/15 bg-[#0a1428]/88"
        }`}
      >
        <div
          className="intel-drag-handle flex cursor-grab touch-pan-y flex-col items-center gap-1 px-3 pb-1 pt-2 active:cursor-grabbing"
          onPointerDown={onDockHandlePointerDown}
          onPointerMove={onDockHandlePointerMove}
          onPointerUp={onDockHandlePointerUp}
          onPointerCancel={onDockHandlePointerUp}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={0}
          aria-label={t("intelDockCollapseAria")}
          title={t("intelDockCollapseHint")}
        >
          <span className="intel-news-sheet__handle" aria-hidden />
          <span className="text-micro tracking-wide text-sky-200/45">
            {t("intelDockCollapseHint")}
          </span>
        </div>
        <IntelDragDismissHint economy={isEconomy} />

        {isAlert && hero ? (
          <HeroHeadlineBanner
            hero={hero}
            onOpenSheet={onOpenSheet}
            economy={isEconomy}
            viewerMode={timelineMode}
          />
        ) : null}

        {!isAlert && hero ? (
          <>
            <EventMarketReactionCard
              theater={hero.theater}
              ageMinutes={hero.ageMinutes}
              prominent
              viewerMode={timelineMode}
            />
            <CounterfactualInvestCard
              theater={hero.theater}
              ageMinutes={hero.ageMinutes}
              viewerMode={timelineMode}
              prominent
            />
          </>
        ) : null}

        {showCompactTicker ? (
          <HoverHint
            placement="top"
            title={t("hoverStockTickerTheater")}
            detail={
              isAlert
                ? isEconomy
                  ? lang === "en"
                    ? `Futures · macro · SPIKE at ${TICKER_SPIKE_THRESHOLD_PERCENT}%+ (10m refresh) · not advice`
                    : `선물·매크로 · ${TICKER_SPIKE_THRESHOLD_PERCENT}%↑ 변동 시 SPIKE (10분 갱신) · 투자 권유 아님`
                  : lang === "en"
                    ? `Theater equities · SPIKE at ${TICKER_SPIKE_THRESHOLD_PERCENT}%+ (10m refresh) · not advice`
                    : `전장 민감 equity · ${TICKER_SPIKE_THRESHOLD_PERCENT}%↑ 변동 시 SPIKE (10분 갱신) · 투자 권유 아님`
                : isEconomy
                  ? lang === "en"
                    ? "Futures & macro beside supply routes (10m refresh) · not advice"
                    : "공급망과 나란히 보는 선물·매크로 (10분 갱신) · 투자 권유 아님"
                  : lang === "en"
                    ? "Defense & theater equities incl. semis (10m refresh) · not advice"
                    : "방산·전장 equity(반도체 포함) (10분 갱신) · 투자 권유 아님"
            }
            className="w-full"
          >
            <StockTickerStrip
              mode={mode}
              viewerMode={isEconomy ? "economy" : "conflict"}
              highlightSymbols={highlightSymbols}
              alertTone={isAlert && hero ? hero.heroStatus : undefined}
              showHeader
              paused={pauseUpdates}
            />
          </HoverHint>
        ) : null}
      </div>

      {showFab ? (
        <div className="flex items-end justify-center">
          <HoverHint
            placement="top"
            title={isEconomy ? t("hoverEconomyFab") : t("hoverIntelFab")}
            detail={isEconomy ? t("hoverEconomyFabHint") : t("hoverIntelFabHint")}
          >
            <button
              type="button"
              onClick={() => onOpenSheet("all")}
              aria-label={isEconomy ? t("hoverEconomyFabOpenAria") : t("hoverIntelFabOpenAria")}
              className={`intel-mini-fab tap-target pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm shadow-lg backdrop-blur-md transition ${
                isEconomy
                  ? "border-emerald-300/25 bg-emerald-950/85 text-emerald-100 hover:border-emerald-200/40 hover:bg-emerald-900/90"
                  : "border-sky-300/20 bg-[#0a1830]/85 text-sky-100 hover:border-sky-200/40 hover:bg-[#0c2040]/90"
              }`}
            >
              {isEconomy ? "📈" : "📰"}
            </button>
          </HoverHint>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated alias — use DynamicIntelStack */
export const IntelCompactBar = DynamicIntelStack;

function countVisibleByTheater(
  payload: NewsStreamPayload | null,
  includeTier3: boolean,
): { all: number; byTheater: Partial<Record<NewsTheater, number>> } {
  if (!payload) return { all: 0, byTheater: {} };
  const items = includeTier3
    ? [...payload.verified, ...payload.stateMedia]
    : payload.verified;
  const byTheater: Partial<Record<NewsTheater, number>> = {};
  for (const item of items) {
    byTheater[item.theater] = (byTheater[item.theater] ?? 0) + 1;
  }
  return { all: items.length, byTheater };
}

function TheaterChipBar({
  filter,
  onChange,
  payload,
  includeTier3,
}: {
  filter: IntelTheaterFilter;
  onChange: (v: IntelTheaterFilter) => void;
  payload: NewsStreamPayload | null;
  /** Tier 3 토글 ON일 때만 stateMedia도 칩 숫자에 포함 (목록과 동일) */
  includeTier3: boolean;
}) {
  const { lang, t } = useLocale();
  const visibleCounts = useMemo(
    () => countVisibleByTheater(payload, includeTier3),
    [payload, includeTier3],
  );
  const chips: Array<{ id: IntelTheaterFilter; label: string; count?: number }> = [
    { id: "all", label: t("hoverTheaterAll"), count: visibleCounts.all || undefined },
    ...THEATER_CHIP_ORDER.map((id) => ({
      id,
      label: theaterLabel(id, lang),
      count: visibleCounts.byTheater[id],
    })),
  ];

  const chipHints: Record<IntelTheaterFilter, string> = {
    all: t("hoverTheaterAllHint"),
    "middle-east": t("hoverTheaterMeHint"),
    "russia-ukraine": t("hoverTheaterRuUaHint"),
    "china-taiwan": t("hoverTheaterCnTwHint"),
    korea: t("hoverTheaterKoreaHint"),
    japan: t("hoverTheaterJapanHint"),
    "south-asia": t("hoverTheaterSouthAsiaHint"),
    "southeast-asia": t("hoverTheaterSeAsiaHint"),
    "south-america": t("hoverTheaterSouthAmericaHint"),
    africa: t("hoverTheaterAfricaHint"),
    arctic: t("hoverTheaterArcticHint"),
    atlantic: t("hoverTheaterAtlanticHint"),
    global: t("hoverTheaterGlobalHint"),
  };

  return (
    <div className="shrink-0 border-b border-sky-300/10 px-4 py-2">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {chips.map((chip) => {
          const active = filter === chip.id;
          const hasItems = chip.id === "all" || (chip.count ?? 0) > 0;
          return (
            <HoverHint
              key={chip.id}
              placement="bottom"
              title={chip.label}
              detail={chipHints[chip.id]}
            >
              <button
                type="button"
                onClick={() => onChange(chip.id)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-sky-300/50 bg-sky-400/20 text-sky-50"
                    : hasItems
                      ? "border-sky-300/15 bg-white/5 text-sky-100/75 hover:border-sky-300/30"
                      : "border-slate-700/50 bg-transparent text-slate-500"
                }`}
              >
                {chip.label}
                {chip.count != null && chip.count > 0 ? (
                  <span className="ml-1 text-micro opacity-70">{chip.count}</span>
                ) : null}
              </button>
            </HoverHint>
          );
        })}
      </div>
    </div>
  );
}

function EconomyGenreChipBar({
  filter,
  onChange,
  payload,
}: {
  filter: EconomyGenreFilter;
  onChange: (v: EconomyGenreFilter) => void;
  payload: NewsStreamPayload | null;
}) {
  const { lang, t } = useLocale();
  const economyCount = payload?.stats.economy ?? 0;
  const chips: Array<{ id: EconomyGenreFilter; label: string; count?: number; hint: string }> = [
    {
      id: "all",
      label: t("econGenreAll"),
      count: economyCount,
      hint: t("econGenreAllHint"),
    },
    ...ECONOMY_GENRE_ORDER.map((id) => ({
      id,
      label: economyGenreLabel(id, lang),
      count: payload?.stats.genres?.[id],
      hint: economyGenreHint(id, lang),
    })),
  ];

  return (
    <div className="shrink-0 border-b border-emerald-400/15 px-4 py-2">
      <p className="mb-1.5 text-micro font-semibold uppercase tracking-wider text-emerald-300/70">
        {t("econGenreBar")}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {chips.map((chip) => {
          const active = filter === chip.id;
          const hasItems = chip.id === "all" || (chip.count ?? 0) > 0;
          return (
            <HoverHint key={chip.id} placement="bottom" title={chip.label} detail={chip.hint}>
              <button
                type="button"
                onClick={() => onChange(chip.id)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-emerald-300/50 bg-emerald-400/20 text-emerald-50"
                    : hasItems
                      ? "border-emerald-300/20 bg-white/5 text-emerald-100/80 hover:border-emerald-300/35"
                      : "border-slate-700/50 bg-transparent text-slate-500"
                }`}
              >
                {chip.label}
                {chip.count != null && chip.count > 0 ? (
                  <span className="ml-1 text-micro opacity-70">{chip.count}</span>
                ) : null}
              </button>
            </HoverHint>
          );
        })}
      </div>
    </div>
  );
}

function FlyToMapButton({
  onClick,
  label = "지도보러가기",
}: {
  onClick: () => void;
  label?: string;
}) {
  const { t } = useLocale();
  return (
    <HoverHint
      placement="top"
      title={t("hoverViewOnMap")}
      detail={t("hoverViewOnMapHint")}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        className="shrink-0 rounded-lg border border-sky-400/25 bg-sky-950/40 px-2 py-1 text-micro font-medium text-sky-100 transition hover:border-sky-300/50 hover:bg-sky-900/50"
      >
        {label}
      </button>
    </HoverHint>
  );
}

type IntelSheetTabBarProps = {
  active: IntelSheetTab;
  onChange: (tab: IntelSheetTab) => void;
  newsCount: number;
  telegramCount: number;
  telegramVideoCount: number;
  viinaCount: number;
  gdeltCount: number;
  showTelegram: boolean;
  showViina: boolean;
  showGdelt: boolean;
  economyMode?: boolean;
};

function IntelSheetTabBar({
  active,
  onChange,
  newsCount,
  telegramCount,
  telegramVideoCount,
  viinaCount,
  gdeltCount,
  showTelegram,
  showViina,
  showGdelt,
  economyMode = false,
  economyTab = "news",
  onEconomyTabChange,
}: IntelSheetTabBarProps & {
  economyTab?: EconomyIntelTab;
  onEconomyTabChange?: (tab: EconomyIntelTab) => void;
}) {
  const { t } = useLocale();
  if (economyMode) {
    const economyBtn = (tab: EconomyIntelTab, label: string) => (
      <button
        key={tab}
        type="button"
        onClick={() => onEconomyTabChange?.(tab)}
        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
          economyTab === tab
            ? "bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-300/40"
            : "text-emerald-100/65 hover:bg-white/5 hover:text-emerald-100"
        }`}
      >
        {label}
        {tab === "news" && newsCount > 0 ? (
          <span className="ml-1.5 text-micro font-medium opacity-70">{newsCount}</span>
        ) : null}
      </button>
    );
    return (
      <div
        id="intel-sheet-tabs"
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-emerald-400/15 px-4 py-2"
      >
        {economyBtn("markets", t("intelSheetMarketsTab"))}
        {economyBtn("majors", t("intelSheetMajorsTab"))}
        {economyBtn("shipping-choke", t("intelSheetShippingChokeTab"))}
        {economyBtn("aviation", t("intelSheetAviationTab"))}
        {economyBtn("news", "RSS · 속보")}
        {economyBtn("video", t("intelSheetVideoTab"))}
      </div>
    );
  }

  return (
    <div
      id="intel-sheet-tabs"
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-sky-300/10 px-4 py-2"
    >
      <HoverHint placement="bottom" title={t("hoverSheetNews")} detail={t("hoverSheetNewsHint")}>
        <button
          type="button"
          onClick={() => onChange("news")}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            active === "news"
              ? "bg-sky-400/20 text-sky-50 ring-1 ring-sky-300/40"
              : "text-sky-100/65 hover:bg-white/5 hover:text-sky-50"
          }`}
        >
          뉴스
          {newsCount > 0 ? (
            <span className="ml-1.5 text-micro font-medium opacity-70">{newsCount}</span>
          ) : null}
        </button>
      </HoverHint>
      <HoverHint placement="bottom" title={t("hoverSheetVideo")} detail={t("hoverSheetVideoHint")}>
        <button
          type="button"
          onClick={() => onChange("video")}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            active === "video"
              ? "bg-violet-400/20 text-violet-50 ring-1 ring-violet-300/40"
              : "text-sky-100/65 hover:bg-white/5 hover:text-violet-100"
          }`}
        >
          {t("intelSheetVideoTab")}
        </button>
      </HoverHint>
      {showViina ? (
        <HoverHint placement="bottom" title={t("hoverSheetViina")} detail={t("hoverSheetViinaHint")}>
          <button
            type="button"
            onClick={() => onChange("viina")}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              active === "viina"
                ? "bg-red-400/20 text-red-50 ring-1 ring-red-300/40"
                : "text-sky-100/65 hover:bg-white/5 hover:text-red-100"
            }`}
          >
            VIINA
            {viinaCount > 0 ? (
              <span className="ml-1.5 text-micro font-medium opacity-70">{viinaCount}</span>
            ) : null}
          </button>
        </HoverHint>
      ) : null}
      {showTelegram ? (
        <HoverHint
          placement="bottom"
          title={t("hoverSheetTelegram")}
          detail={t("hoverSheetTelegramHint")}
        >
          <button
            type="button"
            onClick={() => onChange("telegram")}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              active === "telegram"
                ? "bg-cyan-400/20 text-cyan-50 ring-1 ring-cyan-300/40"
                : "text-sky-100/65 hover:bg-white/5 hover:text-cyan-100"
            }`}
          >
            {t("intelSheetTelegramTab")}
            {telegramCount > 0 ? (
              <span className="ml-1.5 text-micro font-medium opacity-70">{telegramCount}</span>
            ) : null}
          </button>
        </HoverHint>
      ) : null}
      {showTelegram ? (
        <HoverHint
          placement="bottom"
          title={t("hoverSheetTelegramVideo")}
          detail={t("hoverSheetTelegramVideoHint")}
        >
          <button
            type="button"
            onClick={() => onChange("telegram-video")}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              active === "telegram-video"
                ? "bg-fuchsia-400/20 text-fuchsia-50 ring-1 ring-fuchsia-300/40"
                : "text-sky-100/65 hover:bg-white/5 hover:text-fuchsia-100"
            }`}
          >
            {t("intelSheetTelegramVideoTab")}
            {telegramVideoCount > 0 ? (
              <span className="ml-1.5 text-micro font-medium opacity-70">
                {telegramVideoCount}
              </span>
            ) : null}
          </button>
        </HoverHint>
      ) : null}
      {showGdelt ? (
        <HoverHint placement="bottom" title="GDELT" detail="메뉴 연관 핵심 뉴스 속보">
          <button
            type="button"
            onClick={() => onChange("gdelt")}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              active === "gdelt"
                ? "bg-orange-400/20 text-orange-50 ring-1 ring-orange-300/40"
                : "text-sky-100/65 hover:bg-white/5 hover:text-orange-100"
            }`}
          >
            GDELT
            {gdeltCount > 0 ? (
              <span className="ml-1.5 text-micro font-medium opacity-70">{gdeltCount}</span>
            ) : null}
          </button>
        </HoverHint>
      ) : null}
      <HoverHint
        placement="bottom"
        title={t("intelSheetDefenseTab")}
        detail={t("hoverSheetDefenseHint")}
      >
        <button
          type="button"
          onClick={() => onChange("defense")}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            active === "defense"
              ? "bg-amber-400/20 text-amber-50 ring-1 ring-amber-300/40"
              : "text-sky-100/65 hover:bg-white/5 hover:text-amber-100"
          }`}
        >
          {t("intelSheetDefenseTab")}
        </button>
      </HoverHint>
    </div>
  );
}

type IntelNewsSheetProps = {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
  onFlyToMap?: (target: MapFlyTarget) => void;
  /** 뉴스 인사이트 우측 패널 */
  onOpenNewsInsight?: (item: NewsStreamItem) => void;
  showTelegram?: boolean;
  telegramAlerts?: TelegramAlert[];
  telegramLive?: boolean;
  telegramStatus?: "idle" | "loading" | "ok" | "error" | "stub" | "waiting";
  telegramNeedsAuth?: boolean;
  telegramSessionExists?: boolean;
  telegramEmbedMode?: boolean;
  telegramChannelCount?: number;
  showViina?: boolean;
  viinaEvents?: ViinaFrontEvent[];
  viinaControlDate?: string | null;
  viinaRuCellCount?: number;
  viinaLoading?: boolean;
  onViinaFlyTo?: (event: ViinaFrontEvent) => void;
  showGdelt?: boolean;
  gdeltAlerts?: MenuCoreAlert[];
  gdeltLiveStatus?: "idle" | "loading" | "ok" | "error";
  gdeltErrorMessage?: string | null;
  onGdeltSelect?: (alert: MenuCoreAlert) => void;
  onCloseGdeltLayer?: () => void;
  initialIntelTab?: IntelSheetTab;
  autoOpenOnMount?: boolean;
  onCloseTelegramLayer?: () => void;
  /** 텔레그램 본문 지명 → 지도 fly (지정학) */
  onTelegramFlyToPlace?: (place: { lat: number; lng: number; label: string }) => void;
  /** 뉴스 신뢰도 등급 패널 */
  onOpenTrust?: () => void;
};

export const IntelNewsSheet = forwardRef<BottomIntelStackHandle, IntelNewsSheetProps>(
  function IntelNewsSheet(
    {
      open,
      onClose,
      onOpen,
      onFlyToMap,
      onOpenNewsInsight,
      showTelegram = false,
      telegramAlerts = [],
      telegramLive = false,
      telegramStatus = "idle",
      telegramNeedsAuth,
      telegramSessionExists,
      telegramEmbedMode = true,
      telegramChannelCount = 0,
      showViina = false,
      viinaEvents = [],
      viinaControlDate = null,
      viinaRuCellCount = 0,
      viinaLoading = false,
      onViinaFlyTo,
      showGdelt = false,
      gdeltAlerts = [],
      gdeltLiveStatus = "idle",
      gdeltErrorMessage = null,
      onGdeltSelect,
      onCloseGdeltLayer,
      initialIntelTab = "news",
      autoOpenOnMount = false,
      onCloseTelegramLayer: _onCloseTelegramLayer,
      onTelegramFlyToPlace,
      onOpenTrust,
    },
    ref,
  ) {
    void _onCloseTelegramLayer;
    const {
      payload,
      refresh,
      showTier3,
      setShowTier3,
      theaterFilter,
      setTheaterFilter,
      preferEconomyNews,
      viewPackages,
      labelLanguage,
      localizedTitle,
    } = useNewsStreamContext();
    const { lang, t } = useLocale();
    const { profile: interestProfile } = useInterestProfile(
      preferEconomyNews ? "economy" : "conflict",
    );
    const interestTheaterBoost = useMemo(
      () => interestTheaterScores(interestProfile),
      [interestProfile],
    );
    const [sheetTab, setSheetTab] = useState<IntelSheetTab>(initialIntelTab);
    const [economyTab, setEconomyTab] = useState<EconomyIntelTab>("news");
    const [economyGenre, setEconomyGenre] = useState<EconomyGenreFilter>("all");
    const [newsSearchQuery, setNewsSearchQuery] = useState("");
    const [marketsSearchQuery, setMarketsSearchQuery] = useState("");
    const autoOpenedRef = useRef(false);
    const sheetDragRef = useRef<{
      pointerId: number;
      startY: number;
      pending: boolean;
      active: boolean;
    } | null>(null);
    const [sheetDragY, setSheetDragY] = useState(0);
    const [sheetDragging, setSheetDragging] = useState(false);

    const handleLeaveTelegramTab = useCallback(() => {
      setSheetTab("news");
    }, []);

    const handleCloseGdeltLayer = useCallback(() => {
      setSheetTab("news");
      onCloseGdeltLayer?.();
    }, [onCloseGdeltLayer]);

    useEffect(() => {
      if (
        (sheetTab === "telegram" || sheetTab === "telegram-video") &&
        !showTelegram
      ) {
        setSheetTab("news");
      }
    }, [sheetTab, showTelegram]);

    const telegramVideoCount = useMemo(
      () => telegramAlerts.filter((a) => alertMatchesMediaFilter(a, "video")).length,
      [telegramAlerts],
    );

    const telegramRegionFilter =
      theaterFilter === "russia-ukraine"
        ? ("ukraine" as const)
        : theaterFilter === "middle-east"
          ? ("middle-east" as const)
          : ("all" as const);

    useEffect(() => {
      if (sheetTab === "gdelt" && !showGdelt) setSheetTab("news");
    }, [sheetTab, showGdelt]);

    useEffect(() => {
      if (sheetTab === "viina" && !showViina) setSheetTab("news");
    }, [sheetTab, showViina]);

    const openNewsPanel = useCallback(
      (
        theater: IntelTheaterFilter = "all",
        tab: IntelSheetTab = "news",
        economyTabNext?: EconomyIntelTab,
      ) => {
        setTheaterFilter(theater);
        setSheetTab(tab);
        if (economyTabNext) setEconomyTab(economyTabNext);
        void refresh();
        onOpen?.();
      },
      [onOpen, refresh, setTheaterFilter],
    );

    useEffect(() => {
      if (!autoOpenOnMount || autoOpenedRef.current) return;
      autoOpenedRef.current = true;
      openNewsPanel("all", initialIntelTab);
    }, [autoOpenOnMount, initialIntelTab, openNewsPanel]);

    const closeNewsPanel = useCallback(() => {
      setSheetDragY(0);
      setSheetDragging(false);
      dismissIntelDragHint();
      writeIntelDockCollapsed(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cv-intel-dock-collapse"));
      }
      onClose();
    }, [onClose]);

    useEffect(() => {
      if (!open) {
        setSheetDragY(0);
        setSheetDragging(false);
      }
    }, [open]);

    const onSheetHandlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      sheetDragRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        pending: true,
        active: false,
      };
    }, []);

    const onSheetHandlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = sheetDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const delta = event.clientY - drag.startY;
      if (drag.pending) {
        if (delta <= -8) {
          // 위로 스와이프 → 본문 스크롤에 양보
          sheetDragRef.current = null;
          setSheetDragging(false);
          setSheetDragY(0);
          return;
        }
        if (delta < 10) return;
        drag.pending = false;
        drag.active = true;
        setSheetDragging(true);
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
      }
      if (!drag.active) return;
      setSheetDragY(Math.max(0, delta));
    }, []);

    const onSheetHandlePointerUp = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = sheetDragRef.current;
        sheetDragRef.current = null;
        setSheetDragging(false);
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (drag.active) {
          try {
            event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            /* ignore */
          }
          const delta = Math.max(0, event.clientY - drag.startY);
          if (delta > 72) closeNewsPanel();
          else setSheetDragY(0);
          return;
        }
        setSheetDragY(0);
      },
      [closeNewsPanel],
    );

    useImperativeHandle(
      bindableImperativeRef(ref),
      () => ({
        openNewsPanel,
        closeNewsPanel,
      }),
      [openNewsPanel, closeNewsPanel],
    );

    useEffect(() => {
      if (!preferEconomyNews) return;
      // 지경학 기본은 RSS·속보. 전장 칩이 숨겨지므로 지역 필터도 리셋.
      setEconomyTab("news");
      setEconomyGenre("all");
      setTheaterFilter("all");
      setNewsSearchQuery("");
      setMarketsSearchQuery("");
    }, [preferEconomyNews, setTheaterFilter]);

    const hero = payload?.hero ?? null;
    const matchesEconomyItem = useCallback(
      (item: NewsStreamItem) => {
        if (preferEconomyNews) {
          // TheaterChipBar가 지경학에선 숨김 — 전장 필터를 적용하면 목록이 비어 보임
          if (item.feedTopic !== "economy") return false;
          // 동남아·남미·아프리카는 지정학 전용 — 지경학 시트에 절대 노출하지 않음
          if (isGeopoliticsOnlyTheater(item.theater)) return false;
          return matchesEconomyGenreFilter(item.econGenre, economyGenre);
        }
        return matchesTheaterFilter(item.theater, theaterFilter);
      },
      [theaterFilter, preferEconomyNews, economyGenre],
    );
    const tier1Items = sortNewsItems(
      payload?.verified.filter((i) => i.trustTier === 1 && matchesEconomyItem(i)) ?? [],
      preferEconomyNews,
      interestTheaterBoost,
    );
    const tier2Items = sortNewsItems(
      payload?.verified.filter((i) => i.trustTier === 2 && matchesEconomyItem(i)) ?? [],
      preferEconomyNews,
      interestTheaterBoost,
    );
    const tier3Items = sortNewsItems(
      payload?.stateMedia.filter((i) => matchesEconomyItem(i)) ?? [],
      preferEconomyNews,
      interestTheaterBoost,
    );
    const displayTier1 = filterNewsByQuery(tier1Items, newsSearchQuery);
    const displayTier2 = filterNewsByQuery(tier2Items, newsSearchQuery);
    const displayTier3 = filterNewsByQuery(tier3Items, newsSearchQuery);
    const allEconomyNews = useMemo(
      () => [...tier1Items, ...tier2Items, ...(showTier3 ? tier3Items : [])],
      [showTier3, tier1Items, tier2Items, tier3Items],
    );
    const newsSearchResults = useMemo(
      () => newsItemsToSearchResults(filterNewsByQuery(allEconomyNews, newsSearchQuery), lang, localizedTitle),
      [allEconomyNews, newsSearchQuery, lang, localizedTitle],
    );
    const newsById = useMemo(() => new Map(allEconomyNews.map((i) => [i.id, i])), [allEconomyNews]);
    const economyThemeTab: CompanyThemeId | null =
      economyTab === "majors" ||
      economyTab === "shipping-choke" ||
      economyTab === "aviation"
        ? economyTab
        : null;

    const marketsSearchResults = useMemo(() => {
      const q = marketsSearchQuery.trim().toLowerCase();
      if (!q) return [];
      const themeSymbols =
        economyThemeTab != null
          ? new Set(companyThemeSymbols(economyThemeTab))
          : sheetTab === "defense" && !preferEconomyNews
            ? new Set(companyThemeSymbols("defense"))
            : null;
      const catalog = [...STOCK_TICKER_SYMBOLS, ...FRED_ONLY_TICKER_SYMBOLS].filter((t) =>
        themeSymbols ? themeSymbols.has(t.symbol) : true,
      );
      return catalog
        .filter((t) => {
          const name = tickerDisplayName(t.symbol, lang).toLowerCase();
          return (
            name.includes(q) ||
            t.label.toLowerCase().includes(q) ||
            t.symbol.toLowerCase().includes(q)
          );
        })
        .slice(0, 8)
        .map((t) => ({
          id: t.symbol,
          title: tickerDisplayName(t.symbol, lang),
          subtitle: t.symbol,
        }));
    }, [lang, marketsSearchQuery, economyThemeTab, sheetTab, preferEconomyNews]);
    const showHero =
      hero != null &&
      (preferEconomyNews
        ? hero.feedTopic === "economy"
        : theaterFilter === "all" || matchesTheaterFilter(hero.theater, theaterFilter));

    const flyToTheater = useCallback(
      (theater: NewsTheater) => {
        onClose();
        onFlyToMap?.(flyTargetForTheater(theater));
      },
      [onClose, onFlyToMap],
    );

    return (
      <div
        id="intel-news-sheet"
        className={`intel-news-sheet fixed inset-x-0 bottom-0 z-[600] flex flex-col ${
          open ? "intel-news-sheet--open" : ""
        } ${sheetDragging ? "intel-news-sheet--dragging" : ""}`}
        role="dialog"
        aria-modal="false"
        aria-label={preferEconomyNews ? t("intelSheetEconomyNews") : t("intelSheetNews")}
        aria-hidden={!open}
        style={
          open && sheetDragY > 0
            ? { transform: `translateY(${sheetDragY}px)` }
            : undefined
        }
      >
        <div
          className="intel-drag-handle flex shrink-0 cursor-grab touch-pan-y flex-col items-center gap-1 px-3 pb-1 pt-2 active:cursor-grabbing"
          onPointerDown={onSheetHandlePointerDown}
          onPointerMove={onSheetHandlePointerMove}
          onPointerUp={onSheetHandlePointerUp}
          onPointerCancel={onSheetHandlePointerUp}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={0}
          aria-label={t("intelDockCollapseAria")}
          title={t("intelDockCollapseHint")}
        >
          <span className="intel-news-sheet__handle" aria-hidden />
          <span className="text-micro tracking-wide text-sky-200/45">
            {t("intelDockCollapseHint")}
          </span>
        </div>
        {open ? <IntelDragDismissHint economy={preferEconomyNews} /> : null}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-sky-300/10 px-4 pb-3 pt-1.5">
          <div className="min-w-0">
            <p className="text-micro uppercase tracking-[0.28em] text-sky-200/70">Intel Stack</p>
            <p className="text-sm text-sky-50/95">
              {preferEconomyNews
                ? economyTab === "markets"
                  ? t("intelSheetMarkets")
                  : economyTab === "majors"
                    ? t("intelSheetMajors")
                    : economyTab === "shipping-choke"
                      ? t("intelSheetShippingChoke")
                      : economyTab === "aviation"
                        ? t("intelSheetAviation")
                        : economyTab === "video"
                          ? t("intelSheetVideo")
                          : t("intelSheetEconomyNews")
                : sheetTab === "news"
                  ? t("intelSheetNews")
                  : sheetTab === "video"
                    ? t("intelSheetVideo")
                    : sheetTab === "telegram"
                      ? t("intelSheetTelegram")
                      : sheetTab === "telegram-video"
                        ? t("intelSheetTelegramVideo")
                        : sheetTab === "gdelt"
                          ? "GDELT"
                          : sheetTab === "defense"
                            ? t("intelSheetDefense")
                            : t("intelSheetViina")}
              {sheetTab === "news" || (preferEconomyNews && economyTab === "news") ? (
                <>
                  <span className="ml-2 text-xs text-sky-200/50">
                    {payload?.verified.length ?? 0}
                    {t("itemsCount")}
                    {preferEconomyNews && (payload?.stats.economy ?? 0) > 0 ? (
                      <span className="ml-1 text-emerald-200/70">
                        · {t("economyCount")} {payload!.stats.economy}
                      </span>
                    ) : null}
                  </span>
                  <span className="ml-2 rounded border border-sky-400/25 px-1.5 py-0.5 text-micro text-sky-200/80">
                    {lang === "ko" ? t("translationKo") : t("translationEn")}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {sheetTab === "news" && (!preferEconomyNews || economyTab === "news") ? (
              <>
                {onOpenTrust ? (
                  <button
                    type="button"
                    onClick={onOpenTrust}
                    className="text-micro font-medium text-sky-200/80 underline-offset-2 transition hover:text-sky-100 hover:underline"
                  >
                    등급이란?
                  </button>
                ) : null}
                <HoverHint
                  placement="bottom"
                  title={t("hoverTier3Title")}
                  detail={t("hoverTier3Hint")}
                >
                  <label className="flex cursor-pointer items-center gap-1.5 text-micro text-amber-200/80">
                    <input
                      type="checkbox"
                      checked={showTier3}
                      onChange={(e) => setShowTier3(e.target.checked)}
                      className="h-3 w-3 accent-amber-400"
                    />
                    {t("tier3Toggle")}
                  </label>
                </HoverHint>
              </>
            ) : null}
            <HoverHint placement="bottom" title={t("closeNewsDock")} detail={t("hoverBackToMapHint")}>
              <IntelNewsCloseButton
                onClick={closeNewsPanel}
                ariaLabel={t("closeNewsGlobeOnlyAria")}
              />
            </HoverHint>
          </div>
        </div>

        <IntelSheetTabBar
          active={sheetTab}
          onChange={setSheetTab}
          newsCount={
            preferEconomyNews
              ? (payload?.stats.economy ?? payload?.verified.filter((i) => i.feedTopic === "economy").length ?? 0)
              : (payload?.verified.length ?? 0)
          }
          telegramCount={telegramAlerts.length}
          telegramVideoCount={telegramVideoCount}
          viinaCount={viinaEvents.length}
          gdeltCount={gdeltAlerts.length}
          showTelegram={showTelegram && !preferEconomyNews}
          showViina={showViina && !preferEconomyNews}
          showGdelt={showGdelt && !preferEconomyNews}
          economyMode={preferEconomyNews}
          economyTab={economyTab}
          onEconomyTabChange={setEconomyTab}
        />

        {preferEconomyNews &&
        (economyTab === "news" ||
          economyTab === "markets" ||
          economyThemeTab != null) ? (
          <div className="shrink-0 border-b border-emerald-400/15 px-4 py-2.5">
            {economyTab === "news" ? (
              <IntelSheetSearchBar
                placeholder="뉴스 키워드 검색…"
                query={newsSearchQuery}
                onQueryChange={setNewsSearchQuery}
                results={newsSearchResults}
                onSelect={(result) => {
                  const item = newsById.get(result.id);
                  if (item?.link) window.open(item.link, "_blank", "noopener,noreferrer");
                }}
                tone="emerald"
              />
            ) : (
              <IntelSheetSearchBar
                placeholder="종목·티커 검색…"
                query={marketsSearchQuery}
                onQueryChange={setMarketsSearchQuery}
                results={marketsSearchResults}
                onSelect={(result) => setMarketsSearchQuery(result.subtitle ?? result.title)}
                tone="emerald"
              />
            )}
          </div>
        ) : !preferEconomyNews && sheetTab === "defense" ? (
          <div className="shrink-0 border-b border-sky-300/10 px-4 py-2.5">
            <IntelSheetSearchBar
              placeholder="방산 종목·티커 검색…"
              query={marketsSearchQuery}
              onQueryChange={setMarketsSearchQuery}
              results={marketsSearchResults}
              onSelect={(result) => setMarketsSearchQuery(result.subtitle ?? result.title)}
              tone="sky"
            />
          </div>
        ) : null}

        {sheetTab === "news" && !preferEconomyNews ? (
          <TheaterChipBar
            filter={theaterFilter}
            onChange={setTheaterFilter}
            payload={payload}
            includeTier3={showTier3}
          />
        ) : null}

        {preferEconomyNews && economyTab === "news" ? (
          <EconomyGenreChipBar filter={economyGenre} onChange={setEconomyGenre} payload={payload} />
        ) : null}

        {preferEconomyNews && economyTab === "markets" ? (
          <IntelRelatedMarketsPanel
            theaterFilter="all"
            fullPage
            searchQuery={marketsSearchQuery}
            newsItems={
              payload
                ? [...payload.verified, ...payload.stateMedia]
                : []
            }
          />
        ) : preferEconomyNews && economyThemeTab != null ? (
          <ThemeCompanyBoard
            themeId={economyThemeTab}
            fullPage
            searchQuery={marketsSearchQuery}
          />
        ) : (preferEconomyNews && economyTab === "video") ||
          (!preferEconomyNews && sheetTab === "video") ? (
          <VideoNewsPanel
            active={open}
            viewPackages={viewPackages}
            labelLanguage={labelLanguage}
            economyMode={preferEconomyNews}
          />
        ) : sheetTab === "news" || (preferEconomyNews && economyTab === "news") ? (
          <>
            {showHero ? (
              <div
                className={`mx-4 mt-3 shrink-0 rounded-xl border px-3 py-2.5 ${heroShellClass(hero!.heroStatus, preferEconomyNews)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-micro font-semibold ${heroBadgeClass(hero!.heroStatus, preferEconomyNews)}`}
                      >
                        {heroStatusLabel(hero!.heroStatus, lang, preferEconomyNews)}
                      </span>
                      <span className="text-meta text-slate-400">
                        {newsStreamTheaterLabel(hero!.theater, lang)}
                      </span>
                      <span className="text-meta text-slate-500">{formatAge(hero!.ageMinutes, lang)}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-50">
                      {localizedTitle(hero!)}
                    </p>
                  </div>
                  {(() => {
                    if (!onFlyToMap) return null;
                    if (preferEconomyNews) {
                      const target = resolveEconomyArticleFlyTarget(
                        hero!.title,
                        hero!.summary,
                      );
                      if (!target) return null;
                      return (
                        <FlyToMapButton
                          label="지도보러가기"
                          onClick={() => onFlyToMap(target)}
                        />
                      );
                    }
                    return (
                      <FlyToMapButton
                        label="지도보러가기"
                        onClick={() => flyToTheater(hero!.theater)}
                      />
                    );
                  })()}
                </div>
              </div>
            ) : null}

            <div className="intel-scroll-y min-h-0 flex-1 px-1 py-2">
              {!payload ? (
                <div className="mx-3 space-y-3 py-2" aria-busy>
                  <IntelChipSkeletonRow count={4} />
                  <PanelSkeletonLines rows={6} />
                  <p className="text-center text-sm text-slate-500">{t("intelStreamSyncing")}</p>
                </div>
              ) : (
                <div className="mx-3 flex flex-col gap-3">
                  <TierSection
                    label={preferEconomyNews ? ECONOMY_TIER_LABELS[1].label : "확인 보도"}
                    detail={preferEconomyNews ? ECONOMY_TIER_LABELS[1].detail : "주요 언론·공식 보도 등 신뢰도 높은 출처"}
                    items={preferEconomyNews ? displayTier1 : tier1Items}
                    marker="✓"
                    tier={1}
                    delay={1}
                    economyMode={preferEconomyNews}
                    onFlyToTheater={preferEconomyNews ? undefined : onFlyToMap ? flyToTheater : undefined}
                    onFlyToMap={preferEconomyNews ? onFlyToMap : undefined}
                    onOpenNewsInsight={onOpenNewsInsight}
                  />
                  <TierSection
                    label={preferEconomyNews ? ECONOMY_TIER_LABELS[2].label : "보완 보도"}
                    detail={preferEconomyNews ? ECONOMY_TIER_LABELS[2].detail : "확인 보도를 보완 · 가중치 낮음"}
                    items={preferEconomyNews ? displayTier2 : tier2Items}
                    marker="○"
                    tier={2}
                    delay={2}
                    economyMode={preferEconomyNews}
                    onFlyToTheater={preferEconomyNews ? undefined : onFlyToMap ? flyToTheater : undefined}
                    onFlyToMap={preferEconomyNews ? onFlyToMap : undefined}
                    onOpenNewsInsight={onOpenNewsInsight}
                  />
                  {showTier3 && (preferEconomyNews ? displayTier3 : tier3Items).length > 0 ? (
                    <TierSection
                      label={preferEconomyNews ? ECONOMY_TIER_LABELS[3].label : "속보·관영매체"}
                      detail={preferEconomyNews ? ECONOMY_TIER_LABELS[3].detail : "⚠ 미검증 속보 · 참고용"}
                      items={preferEconomyNews ? displayTier3 : tier3Items}
                      marker="⚠"
                      tier={3}
                      delay={3}
                      tier3
                      economyMode={preferEconomyNews}
                      onFlyToTheater={preferEconomyNews ? undefined : onFlyToMap ? flyToTheater : undefined}
                      onFlyToMap={preferEconomyNews ? onFlyToMap : undefined}
                      onOpenNewsInsight={onOpenNewsInsight}
                    />
                  ) : null}
                  {(preferEconomyNews ? displayTier1 : tier1Items).length === 0 &&
                  (preferEconomyNews ? displayTier2 : tier2Items).length === 0 &&
                  (preferEconomyNews ? displayTier3 : tier3Items).length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      {newsSearchQuery.trim()
                        ? `"${newsSearchQuery.trim()}" 검색 결과가 없습니다.`
                        : preferEconomyNews && economyGenre !== "all"
                          ? lang === "en"
                            ? `No news in ${economyGenreLabel(economyGenre, lang)}.`
                            : `${economyGenreLabel(economyGenre, lang)} 카테고리 뉴스가 없습니다.`
                          : preferEconomyNews || theaterFilter === "all"
                            ? lang === "en"
                              ? "No news to display."
                              : "표시할 뉴스가 없습니다."
                            : lang === "en"
                              ? `No news for ${theaterLabel(theaterFilter, lang)}.`
                              : `${theaterLabel(theaterFilter, lang)} 전장 뉴스가 없습니다.`}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </>
        ) : sheetTab === "telegram" || sheetTab === "telegram-video" ? (
          <TelegramIntelFeed
            alerts={telegramAlerts}
            live={telegramLive}
            liveStatus={telegramStatus}
            needsAuth={telegramNeedsAuth}
            sessionExists={telegramSessionExists}
            embedMode={telegramEmbedMode}
            channelCount={telegramChannelCount}
            fullPage
            compactUi
            mediaFilter={sheetTab === "telegram-video" ? "video" : "all"}
            onClose={handleLeaveTelegramTab}
            onFlyToPlace={onTelegramFlyToPlace}
            regionFilter={telegramRegionFilter}
          />
        ) : sheetTab === "gdelt" ? (
          <GdeltAlertPanel
            alerts={gdeltAlerts}
            liveStatus={gdeltLiveStatus}
            errorMessage={gdeltErrorMessage}
            onSelect={onGdeltSelect ?? (() => {})}
            onClose={onCloseGdeltLayer ? handleCloseGdeltLayer : undefined}
            fullPage
            lang={labelLanguage}
          />
        ) : sheetTab === "viina" ? (
          <ViinaFrontEventsPanel
            events={viinaEvents}
            controlDate={viinaControlDate}
            ruCellCount={viinaRuCellCount}
            loading={viinaLoading}
            onFlyTo={onViinaFlyTo}
          />
        ) : sheetTab === "defense" ? (
          <ThemeCompanyBoard
            themeId="defense"
            fullPage
            searchQuery={marketsSearchQuery}
          />
        ) : null}

        <div className="flex shrink-0 items-center justify-center border-t border-sky-300/15 bg-[#050b14]/80 px-4 py-3 backdrop-blur-md">
          <HoverHint placement="top" title={t("closeNewsDock")} detail={t("hoverCloseNewsHint")}>
            <IntelNewsCloseButton
              onClick={closeNewsPanel}
              ariaLabel={t("closeNewsGlobeOnlyAria")}
              className="h-10 w-10 text-lg"
            />
          </HoverHint>
        </div>
      </div>
    );
  },
);

function TierSection({
  tier,
  label,
  detail,
  items,
  marker,
  delay,
  tier3,
  economyMode,
  onFlyToTheater,
  onFlyToMap,
  onOpenNewsInsight,
}: {
  tier: 1 | 2 | 3;
  label: string;
  detail: string;
  items: NewsStreamItem[];
  marker: string;
  delay: number;
  tier3?: boolean;
  economyMode?: boolean;
  onFlyToTheater?: (theater: NewsTheater) => void;
  onFlyToMap?: (target: MapFlyTarget) => void;
  onOpenNewsInsight?: (item: NewsStreamItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section
      className={`intel-tier-section overflow-hidden rounded-xl border ${
        tier3
          ? "border-amber-400/25 bg-amber-950/10"
          : economyMode
            ? "border-emerald-400/20 bg-emerald-950/10"
            : "border-sky-300/12 bg-[#0a1428]/60"
      }`}
      style={{ animationDelay: `${delay * 70}ms` }}
    >
      <div
        className={`border-b px-4 py-2.5 ${
          tier3
            ? "border-amber-400/20 bg-amber-950/30"
            : economyMode && tier === 1
              ? "border-emerald-400/20 bg-emerald-950/25"
              : tier === 1
              ? "border-emerald-400/15 bg-emerald-950/15"
              : "border-sky-300/10 bg-sky-950/20"
        }`}
      >
        <p className="text-xs font-semibold text-sky-50/95">{label}</p>
        <p className="mt-0.5 text-meta text-sky-100/50">{detail}</p>
      </div>
      <ul className="divide-y divide-sky-300/8">
        {items.map((item) => (
          <NewsRow
            key={item.id}
            item={item}
            marker={marker}
            tier3={tier3}
            economyMode={economyMode}
            onFlyToTheater={onFlyToTheater}
            onFlyToMap={onFlyToMap}
            onOpenNewsInsight={onOpenNewsInsight}
          />
        ))}
      </ul>
    </section>
  );
}

function NewsRow({
  item,
  marker,
  tier3,
  economyMode,
  onFlyToTheater,
  onFlyToMap,
  onOpenNewsInsight,
}: {
  item: NewsStreamItem;
  marker?: string;
  tier3?: boolean;
  economyMode?: boolean;
  onFlyToTheater?: (theater: NewsTheater) => void;
  onFlyToMap?: (target: MapFlyTarget) => void;
  onOpenNewsInsight?: (item: NewsStreamItem) => void;
}) {
  const { lang } = useLocale();
  const { localizedTitle, localizedSummary } = useNewsStreamContext();
  const tierLabel =
    item.trustTier === 1
      ? lang === "en"
        ? "Verified"
        : "확인"
      : item.trustTier === 2
        ? lang === "en"
          ? "Secondary"
          : "보완"
        : lang === "en"
          ? "Breaking"
          : "속보";
  const displayTitle = localizedTitle(item);
  const displaySummary = localizedSummary(item);
  const genre =
    economyMode && item.econGenre
      ? economyGenreLabel(item.econGenre, lang)
      : null;
  const chokeTag = chokepointFocusTag(
    `${item.title} ${item.summary ?? ""}`,
    lang === "en" ? "en" : "ko",
  );

  const economyFly = economyMode
    ? resolveEconomyArticleFlyTarget(item.title, item.summary)
    : null;
  const showEconomyFly = Boolean(economyFly && onFlyToMap);
  const showConflictFly = Boolean(!economyMode && onFlyToTheater);
  const showInsight = Boolean(onOpenNewsInsight);

  return (
    <li className="relative">
      {(showInsight || showEconomyFly || showConflictFly) ? (
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1">
          {showInsight ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenNewsInsight?.(item);
              }}
              className="rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-1 text-micro font-semibold text-amber-100 transition hover:bg-amber-500/25"
            >
              {lang === "en" ? "Insight" : "인사이트"}
            </button>
          ) : null}
          {showEconomyFly && economyFly ? (
            <FlyToMapButton
              label="지도보러가기"
              onClick={() => onFlyToMap?.(economyFly)}
            />
          ) : showConflictFly ? (
            <FlyToMapButton
              label="지도보러가기"
              onClick={() => onFlyToTheater?.(item.theater)}
            />
          ) : null}
        </div>
      ) : null}
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex gap-3 px-4 py-3 pr-24 transition hover:bg-white/5 ${tier3 ? "hover:bg-amber-400/5" : ""}`}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-16 w-24 shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex h-16 w-8 shrink-0 items-center justify-center text-sm text-slate-400">
            {marker}
          </span>
        )}
        <span className="min-h-0 min-w-0 flex-1">
          <span className="mb-1 inline-flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-micro font-bold ${
                item.trustTier === 1
                  ? "bg-emerald-500/20 text-emerald-100"
                  : tier3
                    ? "bg-amber-500/20 text-amber-100"
                    : "bg-sky-500/15 text-sky-100"
              }`}
            >
              {tierLabel}
            </span>
            {chokeTag ? (
              <span className="rounded px-1.5 py-0.5 text-micro font-semibold bg-rose-500/20 text-rose-100">
                {lang === "en" ? `Choke · ${chokeTag}` : `초크 · ${chokeTag}`}
              </span>
            ) : null}
            {genre ? (
              <span className="rounded px-1.5 py-0.5 text-micro font-semibold bg-teal-500/15 text-teal-100">
                {genre}
              </span>
            ) : null}
            {economyFly ? (
              <span className="rounded px-1.5 py-0.5 text-micro text-emerald-200/70">
                {economyFly.label}
              </span>
            ) : null}
            <span className="text-meta text-slate-500">{item.source}</span>
          </span>
          <span className="line-clamp-2 text-sm font-medium leading-5 text-slate-100">
            {displayTitle}
          </span>
          {displaySummary ? (
            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-400">
              {displaySummary}
            </span>
          ) : null}
          <span className="mt-1 block text-meta text-slate-500">
            {newsStreamTheaterLabel(item.theater, lang)} · {formatPubAge(item.pubDate, lang)}
          </span>
        </span>
      </a>
    </li>
  );
}
