"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AirRaidFocusTarget } from "@/components/TzevaAdomPanel";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NeptunAlertRegion, NeptunAlerts } from "@/lib/neptun";
import { geocodeUkraineAlertRegion } from "@/lib/ukraineAlertZones";

type UkraineAirRaidPanelProps = {
  alerts: NeptunAlerts | null | undefined;
  live: boolean;
  liveStatus: "idle" | "loading" | "ok" | "error" | "stub";
  error?: string | null;
  lang?: LabelLanguage;
  /** 칩·목록 클릭 시 해당 지역으로 이동 */
  onFocusRegion?: (target: AirRaidFocusTarget) => void;
  /** 모바일 — 아이콘만 (히어로 가로 점유 최소화) */
  compact?: boolean;
};

const UI = {
  brand: { ko: "우크라이나 공습 경보", en: "Ukraine Air Raid Alert" },
  subtitle: { ko: "NEPTUN · 지역·주 단위 경보", en: "NEPTUN · raion & oblast alerts" },
  openList: { ko: "경보 목록 열기", en: "Open alert list" },
  alert: { ko: "경보 발령 중", en: "Alert active" },
  connecting: { ko: "연결 중…", en: "Connecting…" },
  live: { ko: "감시 중", en: "Monitoring" },
  demo: { ko: "데모", en: "Demo" },
  idle: { ko: "대기", en: "Standby" },
  awaiting: { ko: "활성 경보 없음", en: "No active alerts" },
  activeBadge: { ko: "활성", en: "LIVE" },
  source: { ko: "출처 · neptun.in.ua", en: "Source · neptun.in.ua" },
  oblast: { ko: "주", en: "oblast" },
  raion: { ko: "지역", en: "raion" },
} as const;

function t(key: keyof typeof UI, lang: LabelLanguage) {
  return lang === "en" ? UI[key].en : UI[key].ko;
}

function formatTime(iso: string, lang: LabelLanguage) {
  try {
    return new Date(iso).toLocaleString(lang === "en" ? "en-US" : "ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function AlertBellIcon({ urgent }: { urgent: boolean }) {
  const stroke = urgent ? "#fecaca" : "#f87171";
  const fill = urgent ? "rgba(220, 38, 38, 0.55)" : "rgba(127, 29, 29, 0.55)";
  return (
    <svg
      viewBox="0 0 48 48"
      className={`h-4 w-4 shrink-0 ${urgent ? "animate-pulse" : ""}`}
      aria-hidden
    >
      <path
        d="M24 4c-7.2 0-13 5.6-13 12.6V24l-4.2 7.2c-.7 1.2.2 2.8 1.6 2.8h31.2c1.4 0 2.3-1.6 1.6-2.8L37 24v-7.4C37 9.6 31.2 4 24 4z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 36.5c1.4 2.6 3.4 4 5.5 4s4.1-1.4 5.5-4"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M24 2.5v3.5" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="24" cy="2.2" r="1.6" fill={stroke} />
    </svg>
  );
}

type ListItem = NeptunAlertRegion & { scope: "raion" | "oblast" };

export function UkraineAirRaidPanel({
  alerts,
  live,
  liveStatus,
  error,
  lang = "ko",
  onFocusRegion,
  compact = false,
}: UkraineAirRaidPanelProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => {
    const items: ListItem[] = [];
    for (const region of alerts?.raions ?? []) {
      items.push({ ...region, scope: "raion" });
      if (items.length >= 20) break;
    }
    if (items.length < 20) {
      for (const region of alerts?.oblasts ?? []) {
        items.push({ ...region, scope: "oblast" });
        if (items.length >= 20) break;
      }
    }
    return items;
  }, [alerts]);

  const hasActive = list.length > 0;
  const headline = list[0]
    ? {
        region: list[0].name || list[0].oblast || list[0].key,
        title: list[0].oblast && list[0].name !== list[0].oblast ? list[0].oblast : t("alert", lang),
      }
    : null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const statusLabel = hasActive
    ? t("alert", lang)
    : liveStatus === "loading"
      ? t("connecting", lang)
      : live
        ? t("live", lang)
        : liveStatus === "stub"
          ? t("demo", lang)
          : t("idle", lang);

  function focusRegion(alert: NeptunAlertRegion) {
    const coords = geocodeUkraineAlertRegion(alert.name, alert.oblast, alert.key);
    onFocusRegion?.({
      lat: coords.lat,
      lng: coords.lng,
      label: alert.name || alert.oblast || alert.key,
    });
  }

  return (
    <div ref={rootRef} className="pointer-events-auto relative z-[100]">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("brand", lang)}
        title={
          headline
            ? `${t("brand", lang)} · ${headline.region}`
            : `${t("brand", lang)} · ${statusLabel}`
        }
        onClick={() => {
          if (list[0]) focusRegion(list[0]);
          else if (onFocusRegion) {
            const fallback = geocodeUkraineAlertRegion();
            onFocusRegion(fallback);
          }
          setOpen((v) => !v);
        }}
        className={
          compact
            ? `relative flex h-11 w-11 items-center justify-center border shadow-lg backdrop-blur-md transition-all duration-200 ${
                hasActive
                  ? "rounded-full border-red-400/50 bg-[#2a0c12]/85 text-red-50"
                  : "rounded-full border-red-300/25 bg-[#1a0c10]/7 text-red-100/90"
              }`
            : `flex max-w-[min(52vw,280px)] items-center gap-2 border px-3 py-2 text-xs shadow-lg backdrop-blur-md transition-all duration-200 ${
                hasActive
                  ? "border-red-400/45 bg-[#2a0c12]/72 text-red-50"
                  : "border-red-300/20 bg-[#1a0c10]/55 text-red-100/90 hover:border-red-300/35"
              } ${open ? "rounded-t-full rounded-b-md" : "rounded-full"}`
        }
      >
        <AlertBellIcon urgent={hasActive} />
        {!compact ? (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="flex items-center gap-1.5">
                <span className="block truncate text-micro font-semibold uppercase tracking-[0.14em] text-red-200/80">
                  {t("brand", lang)}
                </span>
                {!hasActive && live ? (
                  <span className="shrink-0 animate-pulse rounded border border-emerald-400/45 px-1 text-micro font-bold uppercase tracking-wider text-emerald-300">
                    Live
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate font-medium tracking-tight">
                {headline ? `${headline.region} · ${headline.title}` : statusLabel}
              </span>
            </span>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                hasActive ? "animate-pulse bg-red-400" : live ? "bg-emerald-400" : "bg-slate-500"
              }`}
            />
          </>
        ) : (
          <span
            className={`absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full ${
              hasActive ? "animate-pulse bg-red-400" : live ? "bg-emerald-400" : "bg-slate-500"
            }`}
          />
        )}
      </button>

      <div
        className={`absolute right-0 z-[200] w-[min(92vw,320px)] origin-top transition-all duration-200 ease-out ${
          compact ? "bottom-full mb-1.5 origin-bottom" : "top-full"
        } ${
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-[0.98] opacity-0"
        }`}
      >
        <div
          className={`overflow-hidden border border-red-400/25 bg-[#1a0c10]/95 shadow-2xl backdrop-blur-md ${
            compact
              ? "rounded-2xl"
              : "rounded-b-2xl rounded-tl-2xl border-t-0"
          }`}
        >
          <div className="border-b border-red-400/15 px-3 py-2">
            <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red-200/75">
              {t("brand", lang)}
            </p>
            <p className="mt-0.5 text-meta text-red-100/55">{t("subtitle", lang)}</p>
          </div>

          <div className="max-h-64 overflow-y-auto overscroll-contain p-1.5">
            {error ? (
              <p className="px-2 py-3 text-meta text-red-200/85">{error}</p>
            ) : list.length === 0 ? (
              <p className="px-2 py-3 font-mono text-meta text-slate-500">{t("awaiting", lang)}</p>
            ) : (
              <ul className="divide-y divide-red-400/10" role="listbox">
                {list.map((alert) => (
                  <li key={`${alert.scope}-${alert.key}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => focusRegion(alert)}
                      className="w-full px-2.5 py-2 text-left transition hover:bg-red-500/10"
                    >
                      <div className="flex flex-wrap items-center gap-x-1.5 text-micro text-slate-500">
                        <span className="text-slate-400">{formatTime(alert.since, lang)}</span>
                        <span className="rounded border border-red-400/35 px-1 text-red-200">
                          {t("activeBadge", lang)}
                        </span>
                        <span className="text-slate-600">
                          {alert.scope === "oblast" ? t("oblast", lang) : t("raion", lang)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-caption font-semibold leading-snug text-slate-50">
                        {alert.name || alert.key}
                      </p>
                      {alert.oblast && alert.oblast !== alert.name ? (
                        <p className="mt-0.5 text-micro leading-snug text-slate-400">{alert.oblast}</p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="border-t border-red-950/40 px-3 py-1.5 font-mono text-micro text-slate-600">
            {t("source", lang)}
          </p>
        </div>
      </div>
    </div>
  );
}
