"use client";

import { useMemo, useState } from "react";
import type { ScoredEvent } from "@/data/eventTiers";
import { TIER_LABELS } from "@/data/eventTiers";
import { LocationPinIcon } from "@/components/LocationPinIcon";
import { TelegramIntelFeed } from "@/components/TelegramIntelFeed";
import { useNewsStreamContext } from "@/components/BottomIntelStack";
import { useLocale } from "@/contexts/LocaleContext";
import { localizedDisplayText, useLocalizedTextMap } from "@/hooks/useLocalizedTextMap";
import type { NavSelection } from "@/data/navRegions";
import { matchesTheaterFilter } from "@/lib/news/theaterMap";
import type { NewsStreamItem, NewsTheater } from "@/lib/news/types";
import type { TheaterSidebarTab } from "@/lib/theaterFocus";
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
  initialTab = "news",
  onClose,
  onFlyToCoords,
  onSelectGdeltEvent,
}: TheaterIntelSidebarProps) {
  const { payload, showTier3, setShowTier3 } = useNewsStreamContext();
  const { lang, t } = useLocale();
  const [tab, setTab] = useState<TheaterSidebarTab>(initialTab);

  const title = selection.parentLabel
    ? `${selection.parentLabel} · ${selection.label}`
    : selection.label;

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
    const entries: Array<{ key: string; text: string }> = [];
    for (const item of rssItems) {
      entries.push({ key: `rss:${item.id}`, text: item.title });
    }
    for (const event of gdeltEvents) {
      entries.push({ key: `gdelt-cat:${event.id}`, text: event.category });
      if (event.country) entries.push({ key: `gdelt-co:${event.id}`, text: event.country });
    }
    return entries;
  }, [gdeltEvents, rssItems]);
  const localizedMap = useLocalizedTextMap(koreanEntries, lang);

  const showTelegramTab = telegramRegion !== "all";

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
        <TabButton active={tab === "news"} onClick={() => setTab("news")}>
          {t("liveNews")}
          {rssItems.length + gdeltEvents.length > 0 ? (
            <span className="ml-1.5 opacity-70">{rssItems.length + gdeltEvents.length}</span>
          ) : null}
        </TabButton>
        {showTelegramTab ? (
          <TabButton active={tab === "telegram"} onClick={() => setTab("telegram")}>
            {t("telegramOsint")}
            {telegramAlerts.filter((a) => a.region === telegramRegion).length > 0 ? (
              <span className="ml-1.5 opacity-70">
                {telegramAlerts.filter((a) => a.region === telegramRegion).length}
              </span>
            ) : null}
          </TabButton>
        ) : null}
      </div>

      {tab === "news" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-slate-800 bg-black/25 px-3 py-2 text-xs text-slate-400">
            <span>
              RSS·GDELT{" "}
              <span className="text-slate-200">{rssItems.length + gdeltEvents.length}건</span>
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-amber-200/80">
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
                        <span className="mt-0.5 block text-[10px] text-slate-500">
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
                    title={localizedDisplayText(localizedMap, `rss:${item.id}`, item.title)}
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
  gdeltEvents,
  onFlyToCoords,
}: {
  item: NewsStreamItem;
  title: string;
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
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[10px] text-sky-300/80">
          {matched ? "📍" : "📰"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-medium leading-snug text-slate-100">
            {title}
          </span>
          <span className="mt-1 block text-[11px] text-slate-500">
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
