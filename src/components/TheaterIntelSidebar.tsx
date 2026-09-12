"use client";

import { useMemo, useState } from "react";
import type { ScoredEvent } from "@/data/eventTiers";
import { TIER_LABELS } from "@/data/eventTiers";
import { LocationPinIcon } from "@/components/LocationPinIcon";
import { TelegramIntelFeed } from "@/components/TelegramIntelFeed";
import { useNewsStreamContext } from "@/components/BottomIntelStack";
import { useLocale } from "@/contexts/LocaleContext";
import { useDailyRanksBrief } from "@/hooks/useDailyRanksBrief";
import { localizedDisplayText, useLocalizedTextMap } from "@/hooks/useLocalizedTextMap";
import type { NavSelection } from "@/data/navRegions";
import { matchesTheaterFilter } from "@/lib/news/theaterMap";
import type { NewsStreamItem, NewsTheater } from "@/lib/news/types";
import type { TheaterSidebarTab } from "@/lib/theaterFocus";
import {
  buildTheaterRegionalInsight,
  type TheaterRegionalInsight,
} from "@/lib/theaterRegionalInsight";
import { formatRankDelta } from "@/lib/dailyRanks";
import { formatGtiDeltaLabel, gtiBand, gtiBandLabel } from "@/lib/gti";
import type { TelegramAlert } from "@/lib/telegramAlerts";
import type { TelegramAlertRegion } from "@/lib/telegramAlerts";

type TheaterIntelSidebarProps = {
  selection: NavSelection;
  newsTheater: NewsTheater;
  telegramRegion: TelegramAlertRegion | "all";
  gdeltEvents: ScoredEvent[];
  telegramAlerts: TelegramAlert[];
  telegramLive: boolean;
  telegramStatus: "idle" | "loading" | "ok" | "error" | "stub" | "waiting";
  telegramNeedsAuth?: boolean;
  telegramSessionExists?: boolean;
  telegramEmbedMode?: boolean;
  telegramChannelCount?: number;
  initialTab?: TheaterSidebarTab;
  onClose: () => void;
  onFlyToCoords: (lat: number, lng: number, altitude?: number) => void;
  onSelectGdeltEvent: (event: ScoredEvent) => void;
};

export function TheaterIntelSidebar({
  selection,
  newsTheater,
  telegramRegion,
  gdeltEvents,
  telegramAlerts,
  telegramLive,
  telegramStatus,
  telegramNeedsAuth,
  telegramSessionExists,
  telegramEmbedMode = true,
  telegramChannelCount = 0,
  initialTab = "insight",
  onClose,
  onFlyToCoords,
  onSelectGdeltEvent,
}: TheaterIntelSidebarProps) {
  const { payload, showTier3, setShowTier3, localizedTitle, localizedSummary } =
    useNewsStreamContext();
  const { lang, t } = useLocale();
  const { payload: ranksPayload, loading: ranksLoading } = useDailyRanksBrief(12);
  const [tab, setTab] = useState<TheaterSidebarTab>(initialTab);

  const title = selection.parentLabel
    ? `${selection.parentLabel} · ${selection.label}`
    : selection.label;

  const regionLabelKo = title;
  const regionLabelEn = title;

  const rssItems = useMemo(() => {
    const verified =
      payload?.verified.filter((i) => matchesTheaterFilter(i.theater, newsTheater)) ?? [];
    const state =
      showTier3
        ? (payload?.stateMedia.filter((i) => matchesTheaterFilter(i.theater, newsTheater)) ?? [])
        : [];
    return [...verified, ...state].slice(0, 48);
  }, [newsTheater, payload?.stateMedia, payload?.verified, showTier3]);

  const koreanEntries = useMemo(() => {
    if (lang === "en") return [];
    const entries: Array<{ key: string; text: string }> = [];
    for (const event of gdeltEvents) {
      entries.push({ key: `gdelt-cat:${event.id}`, text: event.category });
      if (event.country) entries.push({ key: `gdelt-co:${event.id}`, text: event.country });
    }
    return entries;
  }, [gdeltEvents, lang]);
  const localizedMap = useLocalizedTextMap(koreanEntries, "ko");

  const telegramFiltered = useMemo(
    () =>
      telegramRegion === "all"
        ? telegramAlerts
        : telegramAlerts.filter((a) => a.region === telegramRegion),
    [telegramAlerts, telegramRegion],
  );

  const regionalInsight = useMemo((): TheaterRegionalInsight => {
    return buildTheaterRegionalInsight({
      regionLabelKo,
      regionLabelEn,
      selectionId: selection.id,
      newsTheater,
      rssTitles: rssItems.map((i) => localizedTitle(i)),
      gdeltCount: gdeltEvents.length,
      telegramAlerts,
      telegramRegion,
      theaterRanks: ranksPayload?.theater ?? [],
      chokeRanks: ranksPayload?.chokepoint ?? [],
    });
  }, [
    regionLabelKo,
    regionLabelEn,
    selection.id,
    newsTheater,
    rssItems,
    localizedTitle,
    gdeltEvents.length,
    telegramAlerts,
    telegramRegion,
    ranksPayload?.theater,
    ranksPayload?.chokepoint,
  ]);

  const showTelegramTab = telegramRegion !== "all";
  const ko = lang !== "en";
  const insightHeadline = ko ? regionalInsight.headlineKo : regionalInsight.headlineEn;
  const insightParagraphs = ko ? regionalInsight.paragraphsKo : regionalInsight.paragraphsEn;

  return (
    <div className="theater-sidebar-enter flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-200/70">
            {selection.groupId === "conflict-zones" ? t("conflictZone") : t("intercontinental")}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-50">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">{selection.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-slate-100"
        >
          {t("close")}
        </button>
      </div>

      <div className="flex shrink-0 gap-1 border-b border-slate-800/80 pb-2">
        <TabButton active={tab === "insight"} onClick={() => setTab("insight")}>
          {t("theaterInsight")}
        </TabButton>
        <TabButton active={tab === "news"} onClick={() => setTab("news")}>
          {t("liveNews")}
          {rssItems.length + gdeltEvents.length > 0 ? (
            <span className="ml-1.5 opacity-70">{rssItems.length + gdeltEvents.length}</span>
          ) : null}
        </TabButton>
        {showTelegramTab ? (
          <TabButton active={tab === "telegram"} onClick={() => setTab("telegram")}>
            {t("telegramOsint")}
            {telegramFiltered.length > 0 ? (
              <span className="ml-1.5 opacity-70">{telegramFiltered.length}</span>
            ) : null}
          </TabButton>
        ) : null}
      </div>

      {tab === "insight" ? (
        <TheaterInsightPanel
          ko={ko}
          loading={ranksLoading && !ranksPayload}
          headline={insightHeadline}
          paragraphs={insightParagraphs}
          insight={regionalInsight}
          onOpenNews={() => setTab("news")}
          onOpenTelegram={showTelegramTab ? () => setTab("telegram") : undefined}
        />
      ) : tab === "news" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-slate-800 bg-black/25 px-3 py-2 text-xs text-slate-400">
            <span>
              RSS·GDELT{" "}
              <span className="text-slate-200">{rssItems.length + gdeltEvents.length}건</span>
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 text-micro text-amber-200/80">
              <input
                type="checkbox"
                checked={showTier3}
                onChange={(e) => setShowTier3(e.target.checked)}
                className="h-3 w-3 accent-amber-400"
              />
              속보·관영
            </label>
          </div>

          <div className="intel-scroll-y min-h-0 flex-1 rounded-xl border border-slate-800 bg-black/20">
            {gdeltEvents.length === 0 && rssItems.length === 0 ? (
              <p className="p-4 text-sm leading-6 text-slate-500">
                이 전장의 실시간 뉴스를 불러오는 중이거나 아직 항목이 없습니다.
              </p>
            ) : (
              <ul className="divide-y divide-slate-800/80">
                {gdeltEvents.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => onSelectGdeltEvent(event)}
                      className="flex w-full gap-3 px-3 py-3 text-left transition hover:bg-emerald-300/5"
                    >
                      <LocationPinIcon tier={event.eventTier} size={16} className="mt-0.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-emerald-200/90">GDELT · 좌표</span>
                          <span className="font-medium text-slate-100">
                            {TIER_LABELS[event.eventTier]}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-300">
                          {localizedDisplayText(localizedMap, `gdelt-cat:${event.id}`, event.category)}
                          {event.country
                            ? ` · ${localizedDisplayText(localizedMap, `gdelt-co:${event.id}`, event.country)}`
                            : ""}
                        </span>
                        <span className="mt-0.5 block text-micro text-slate-500">
                          탭하면 해당 지역으로 이동
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                {rssItems.map((item) => (
                  <TheaterNewsRow
                    key={item.id}
                    item={item}
                    title={localizedTitle(item)}
                    summary={localizedSummary(item)}
                    gdeltEvents={gdeltEvents}
                    onFlyToCoords={onFlyToCoords}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <TelegramIntelFeed
            alerts={telegramAlerts}
            live={telegramLive}
            liveStatus={telegramStatus}
            needsAuth={telegramNeedsAuth}
            sessionExists={telegramSessionExists}
            embedMode={telegramEmbedMode}
            channelCount={telegramChannelCount}
            fullPage
            regionFilter={telegramRegion}
            onFlyToPlace={(place) => onFlyToCoords(place.lat, place.lng, 0.88)}
          />
        </div>
      )}
    </div>
  );
}

function TheaterInsightPanel({
  ko,
  loading,
  headline,
  paragraphs,
  insight,
  onOpenNews,
  onOpenTelegram,
}: {
  ko: boolean;
  loading: boolean;
  headline: string;
  paragraphs: string[];
  insight: TheaterRegionalInsight;
  onOpenNews: () => void;
  onOpenTelegram?: () => void;
}) {
  const entry = insight.rankEntry;
  const score =
    insight.rankScore != null ? Math.round(insight.rankScore) : null;
  const band =
    score != null ? gtiBandLabel(gtiBand(score), ko) : null;
  const deltaLabel =
    entry?.deltaScore != null
      ? formatGtiDeltaLabel(entry.deltaScore, ko ? "ko" : "en")
      : null;
  const rankDelta = entry
    ? formatRankDelta(entry.deltaRank, ko ? "ko" : "en")
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {entry && score != null ? (
        <div className="shrink-0 rounded-xl border border-rose-500/25 bg-gradient-to-br from-rose-950/35 via-slate-950/50 to-slate-950/80 px-3 py-3">
          <p className="text-micro font-semibold uppercase tracking-[0.18em] text-rose-300/75">
            GTI · {ko ? "전장 긴장" : "Theater tension"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="text-2xl font-semibold tabular-nums text-rose-50">
              {score}
            </span>
            {band ? (
              <span className="text-sm text-rose-200/80">{band}</span>
            ) : null}
            {deltaLabel ? (
              <span className="text-meta text-slate-400">{deltaLabel}</span>
            ) : null}
            {rankDelta && rankDelta !== "—" && rankDelta !== "변동없음" ? (
              <span className="text-meta text-sky-300/80">
                {ko ? "순위" : "Rank"} {rankDelta}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="intel-scroll-y min-h-0 flex-1 rounded-xl border border-slate-800 bg-black/20 px-3 py-3">
        {loading ? (
          <div className="space-y-2" aria-busy>
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-700/50" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-700/40" />
            <div className="h-3 w-[92%] animate-pulse rounded bg-slate-700/35" />
          </div>
        ) : (
          <>
            <h3 className="text-sm font-semibold leading-snug text-amber-100/95">
              {headline}
            </h3>
            <div className="mt-3 space-y-3">
              {paragraphs.map((p, i) => (
                <p
                  key={`p-${i}`}
                  className="text-sm leading-6 text-slate-200/90 whitespace-pre-wrap"
                >
                  {p}
                </p>
              ))}
            </div>
            {paragraphs.length === 0 ? (
              <p className="text-sm leading-6 text-slate-500">
                {ko
                  ? "아직 합성할 피드가 충분하지 않습니다. 잠시 후 다시 확인하거나 뉴스 탭을 열어 보세요."
                  : "Not enough feed data to synthesize yet — try the news tab or check back shortly."}
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="shrink-0 space-y-2">
        <p className="text-micro uppercase tracking-wider text-slate-500">
          {ko ? "근거 신호" : "Source signals"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {insight.signals.map((s) => (
            <span
              key={s.id}
              className="rounded-full border border-slate-600/40 bg-slate-900/60 px-2 py-0.5 text-micro text-slate-300"
            >
              {ko ? s.labelKo : s.labelEn} · {ko ? s.detailKo : s.detailEn}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={onOpenNews}
            className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 text-micro text-sky-100 transition hover:bg-sky-500/20"
          >
            {ko ? "뉴스 피드 보기 →" : "Open news feed →"}
          </button>
          {onOpenTelegram ? (
            <button
              type="button"
              onClick={onOpenTelegram}
              className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-micro text-violet-100 transition hover:bg-violet-500/20"
            >
              {ko ? "텔레그램 보기 →" : "Open Telegram →"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
        active
          ? "bg-sky-400/20 text-sky-50 ring-1 ring-sky-300/40"
          : "text-sky-100/65 hover:bg-white/5 hover:text-sky-50"
      }`}
    >
      {children}
    </button>
  );
}

function TheaterNewsRow({
  item,
  title,
  summary,
  gdeltEvents,
  onFlyToCoords,
}: {
  item: NewsStreamItem;
  title: string;
  summary?: string;
  gdeltEvents: ScoredEvent[];
  onFlyToCoords: (lat: number, lng: number, altitude?: number) => void;
}) {
  const matched = useMemo(
    () => findMatchingGdelt(item.title, gdeltEvents),
    [gdeltEvents, item.title],
  );

  const handleClick = () => {
    if (matched) {
      onFlyToCoords(matched.lat, matched.lng, 0.72);
      return;
    }
    window.open(item.link, "_blank", "noopener,noreferrer");
  };

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full gap-3 px-3 py-3 text-left transition hover:bg-sky-300/5"
      >
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-micro text-sky-300/80">
          {matched ? "📍" : "📰"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-medium leading-snug text-slate-100">
            {title}
          </span>
          {summary ? (
            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-400">
              {summary}
            </span>
          ) : null}
          <span className="mt-1 block text-meta text-slate-500">
            {item.source}
            {matched ? " · 지도 좌표 연결됨" : " · 외부 기사"}
          </span>
        </span>
      </button>
    </li>
  );
}

function findMatchingGdelt(title: string, events: ScoredEvent[]): ScoredEvent | null {
  const normalized = title.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
  const tokens = normalized.split(/\s+/).filter((t) => t.length >= 4);
  if (tokens.length === 0) return null;

  for (const event of events) {
    const hay = `${event.category} ${event.country ?? ""} ${event.actor1Country ?? ""}`.toLowerCase();
    const hits = tokens.filter((t) => hay.includes(t)).length;
    if (hits >= 2 || (tokens.length === 1 && hay.includes(tokens[0]!))) return event;
  }
  return null;
}
