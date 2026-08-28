"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AxisHubId } from "@/data/axisNetwork";
import { crinkOutboundChips } from "@/data/crinkSourceRegistry";
import type { ReferenceMonitorItem, ReferenceMonitorPayload } from "@/lib/referenceMonitor";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { hubThumbFallbacks } from "@/lib/news/hubThumbResolver";
import {
  localizedDisplayText,
  useLocalizedTextMap,
} from "@/hooks/useLocalizedTextMap";

const POLL_MS = 3 * 60 * 1000;

type HubMonitorRailProps = {
  hubId: AxisHubId;
  labelLanguage: LabelLanguage;
  open: boolean;
};

function formatAge(iso: string | null | undefined, lang: LabelLanguage): string {
  if (!iso) return "";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (lang === "en") {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  }
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / 1440)}일 전`;
}

function HubCard({
  item,
  lang,
  title,
  summary,
}: {
  item: ReferenceMonitorItem;
  lang: LabelLanguage;
  title: string;
  summary?: string | null;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const fallbacks = hubThumbFallbacks({
    placeId: item.placeId,
    lat: item.lat,
    lng: item.lng,
    title: item.title,
    summary: item.summary,
  });
  const primary = item.imageUrl || fallbacks[0];
  const src = imgIdx === 0 ? primary : fallbacks[Math.min(imgIdx, fallbacks.length - 1)];

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-rose-400/20 bg-[#0a1020]/92 shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:border-rose-300/40"
    >
      <div className="relative h-[132px] w-full overflow-hidden bg-slate-900/80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          onError={() => setImgIdx((n) => n + 1)}
        />
        <div className="absolute bottom-1.5 left-2 right-2 flex items-end justify-between gap-2">
          <span className="rounded bg-black/55 px-1.5 py-0.5 text-micro text-slate-200 backdrop-blur-sm">
            {item.sourceLabel}
          </span>
          {item.thumbCredit ? (
            <span className="max-w-[55%] truncate rounded bg-black/45 px-1.5 py-0.5 text-micro text-slate-400">
              {item.thumbCredit}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-caption font-semibold leading-4 text-slate-50">
          {title}
        </h3>
        {summary ? (
          <p className="line-clamp-2 text-micro leading-4 text-slate-400">{summary}</p>
        ) : null}
        <p className="text-micro text-slate-500">
          {formatAge(item.updatedAt ?? item.publishedAt, lang)}
        </p>
      </div>
    </a>
  );
}

export function HubMonitorRail({ hubId, labelLanguage, open }: HubMonitorRailProps) {
  const [items, setItems] = useState<ReferenceMonitorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const outbound = crinkOutboundChips(hubId);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reference-monitor?hub=${hubId}&limit=12&minRelevance=2`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const payload = (await res.json()) as ReferenceMonitorPayload;
      setItems(payload.items ?? []);
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, [hubId, open]);

  useEffect(() => {
    void load();
    if (!open) return;
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load, open]);

  const localizeEntries = useMemo(() => {
    if (labelLanguage === "en" || items.length === 0) return [];
    const entries: Array<{ key: string; text: string }> = [];
    for (const item of items) {
      entries.push({ key: `t:${item.id}`, text: item.title });
      if (item.summary?.trim()) {
        entries.push({ key: `s:${item.id}`, text: item.summary });
      }
    }
    return entries;
  }, [items, labelLanguage]);

  const localizedMap = useLocalizedTextMap(localizeEntries, "ko");

  if (!open) return null;

  const title =
    labelLanguage === "en" ? "Specialist desk" : "전문 소스 데스크";
  const empty =
    labelLanguage === "en"
      ? "No hub analyses cached yet — cron will fill this rail."
      : "아직 캐시된 허브 분석이 없습니다. cron이 채웁니다.";

  return (
    <aside
      className="pointer-events-auto absolute right-3 top-[5.5rem] z-[680] flex max-h-[min(72vh,640px)] w-[min(92vw,300px)] flex-col gap-2 sm:right-4"
      aria-label={title}
    >
      <div className="rounded-xl border border-rose-400/25 bg-[#0b1020]/92 px-3 py-2 shadow-xl backdrop-blur-md">
        <p className="text-micro font-semibold uppercase tracking-[0.18em] text-rose-200/80">
          {title}
        </p>
        <p className="mt-0.5 text-meta text-slate-400">
          {hubId}
          {loading ? (labelLanguage === "en" ? " · refreshing" : " · 갱신 중") : null}
        </p>
        {outbound.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {outbound.map((chip) => (
              <a
                key={chip.id}
                href={chip.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-slate-500/35 bg-black/30 px-2 py-0.5 text-micro text-slate-300 hover:border-rose-300/40 hover:text-rose-100"
                title={chip.note}
              >
                {labelLanguage === "en" ? chip.label : chip.labelKo}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2 pr-0.5">
        {items.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-black/40 px-3 py-4 text-meta text-slate-400">
            {empty}
          </p>
        ) : (
          items.map((item) => (
            <HubCard
              key={item.id}
              item={item}
              lang={labelLanguage}
              title={
                labelLanguage === "en"
                  ? item.title
                  : localizedDisplayText(localizedMap, `t:${item.id}`, item.title)
              }
              summary={
                !item.summary
                  ? undefined
                  : labelLanguage === "en"
                    ? item.summary
                    : localizedDisplayText(localizedMap, `s:${item.id}`, item.summary)
              }
            />
          ))
        )}
      </div>
    </aside>
  );
}
