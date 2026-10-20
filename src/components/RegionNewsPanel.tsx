"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScoredEvent } from "@/data/eventTiers";
import { TIER_LABELS } from "@/data/eventTiers";
import { LocationPinIcon } from "@/components/LocationPinIcon";
import type { NavSelection } from "@/data/navRegions";
import { useLocale } from "@/contexts/LocaleContext";
import { localizedDisplayText, useLocalizedTextMap } from "@/hooks/useLocalizedTextMap";
import { formatGdeltNewsHeadline } from "@/lib/gdeltNewsAlert";
import { isMostlyKorean, translateTextToKorean } from "@/lib/koreanTranslate";

type RegionNewsPanelProps = {
  selection: NavSelection;
  events: ScoredEvent[];
  onSelectEvent: (event: ScoredEvent) => void;
  onClose: () => void;
};

export function RegionNewsPanel({
  selection,
  events,
  onSelectEvent,
  onClose,
}: RegionNewsPanelProps) {
  const { lang, t } = useLocale();
  const title = selection.parentLabel
    ? `${selection.parentLabel} · ${selection.label}`
    : selection.label;

  const textEntries = useMemo(() => {
    const entries: Array<{ key: string; text: string }> = [];
    for (const event of events) {
      entries.push({ key: `cat:${event.id}`, text: event.category });
      if (event.country) entries.push({ key: `co:${event.id}`, text: event.country });
      if (event.actor1Country) entries.push({ key: `a1:${event.id}`, text: event.actor1Country });
      if (event.actor2Country) entries.push({ key: `a2:${event.id}`, text: event.actor2Country });
    }
    return entries;
  }, [events]);
  const localizedMap = useLocalizedTextMap(textEntries, lang);
  const [koHeadlineById, setKoHeadlineById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (lang === "en") {
      setKoHeadlineById({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        events.map(async (event) => {
          const raw = formatGdeltNewsHeadline(event);
          if (isMostlyKorean(raw)) {
            next[event.id] = raw;
            return;
          }
          next[event.id] = await translateTextToKorean(raw);
        }),
      );
      if (!cancelled) setKoHeadlineById(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [events, lang]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-amber-200/70">
            {selection.groupId === "conflict-zones" ? t("conflictZone") : t("intercontinental")}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-50">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">{selection.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-slate-100"
        >
          {t("close")}
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-black/25 px-3 py-2 text-xs text-slate-400">
        {t("relatedNews")}{" "}
        <span className="text-slate-200">{events.length.toLocaleString()}</span>
        {selection.actorCountries?.length ? (
          <span className="ml-2 text-slate-500">
            · {selection.actorCountries.slice(0, 4).join(", ")}
            {selection.actorCountries.length > 4 ? "…" : ""}
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-black/20">
        {events.length === 0 ? (
          <p className="p-4 text-sm leading-6 text-slate-500">{t("noGdeltEvents")}</p>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {events.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvent(event)}
                  className="flex w-full gap-3 px-3 py-3 text-left transition hover:bg-emerald-300/5"
                >
                  <LocationPinIcon tier={event.eventTier} size={16} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-xs">
                      <span className="shrink-0 text-slate-500">
                        {TIER_LABELS[event.eventTier]}
                      </span>
                      {event.eventDate && (
                        <span className="text-slate-500">{event.eventDate}</span>
                      )}
                    </span>
                    <span className="mt-1 block text-body font-medium leading-snug text-slate-100 line-clamp-2">
                      {lang === "en"
                        ? formatGdeltNewsHeadline(event)
                        : (koHeadlineById[event.id] ?? formatGdeltNewsHeadline(event))}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-400">
                      {localizedDisplayText(localizedMap, `cat:${event.id}`, event.category)}
                      {event.actor1Country || event.actor2Country
                        ? ` · ${localizedDisplayText(localizedMap, `a1:${event.id}`, event.actor1Country || "?")} ↔ ${localizedDisplayText(localizedMap, `a2:${event.id}`, event.actor2Country || "?")}`
                        : ""}
                      {event.country
                        ? ` · ${localizedDisplayText(localizedMap, `co:${event.id}`, event.country)}`
                        : ""}
                    </span>
                    {event.sourceUrl && (
                      <span className="mt-1 block truncate text-micro text-slate-600">
                        {hostFromUrl(event.sourceUrl)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function hostFromUrl(url: string | null | undefined) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
