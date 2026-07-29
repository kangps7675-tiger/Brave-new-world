"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AirRaidFocusTarget } from "@/components/TzevaAdomPanel";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NeptunAlertRegion, NeptunAlerts } from "@/lib/neptun";
import type { TzevaAdomAlert } from "@/lib/tzevaAdom";
import {
  translateOrefRegion,
  translateOrefTitle,
  tzevaUi,
} from "@/lib/tzevaAdomI18n";
import { geocodeUkraineAlertRegion } from "@/lib/ukraineAlertZones";

type LiveStatus = "idle" | "loading" | "ok" | "error" | "stub" | "geo-blocked";

type UnifiedAirRaidDropdownProps = {
  /** 우크라이나(NEPTUN) 섹션 표시 */
  showUkraine?: boolean;
  /** 이스라엘(Tzeva) 섹션 표시 */
  showIsrael?: boolean;
  neptunAlerts?: NeptunAlerts | null;
  neptunLive?: boolean;
  neptunStatus?: LiveStatus;
  neptunError?: string | null;
  tzevaActive?: TzevaAdomAlert[];
  tzevaHistory?: TzevaAdomAlert[];
  tzevaLive?: boolean;
  tzevaStatus?: LiveStatus;
  tzevaGeoRestricted?: boolean;
  tzevaError?: string | null;
  lang?: LabelLanguage;
  onFocusUkraine?: (target: AirRaidFocusTarget) => void;
  onFocusIsrael?: (target: AirRaidFocusTarget) => void;
  compact?: boolean;
};

const UI = {
  brand: { ko: "공습경보", en: "Air Raid Alerts" },
  ukraine: { ko: "우크라이나", en: "Ukraine" },
  israel: { ko: "이스라엘", en: "Israel" },
  ukraineSub: { ko: "NEPTUN · 지역·주 단위", en: "NEPTUN · raion & oblast" },
  israelSub: { ko: "Tzeva Adom · Home Front", en: "Tzeva Adom · Home Front" },
  alert: { ko: "경보 발령 중", en: "Alert active" },
  connecting: { ko: "연결 중…", en: "Connecting…" },
  live: { ko: "감시 중", en: "Monitoring" },
  demo: { ko: "데모", en: "Demo" },
  idle: { ko: "대기", en: "Standby" },
  awaiting: { ko: "활성 경보 없음", en: "No active alerts" },
  activeBadge: { ko: "활성", en: "LIVE" },
  oblast: { ko: "주", en: "oblast" },
  raion: { ko: "지역", en: "raion" },
  sourceUa: { ko: "출처 · neptun.in.ua", en: "Source · neptun.in.ua" },
  sourceIl: { ko: "출처 · oref.org.il", en: "Source · oref.org.il" },
} as const;

function t(key: keyof typeof UI, lang: LabelLanguage) {
  return lang === "en" ? UI[key].en : UI[key].ko;
}

function formatTime(iso: string, lang: LabelLanguage) {
  try {
    return new Date(iso.replace(" ", "T")).toLocaleString(lang === "en" ? "en-US" : "ko-KR", {
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

const ISRAEL_FALLBACK = { lat: 31.5, lng: 34.85 };

type UaListItem = NeptunAlertRegion & { scope: "raion" | "oblast" };

/**
 * 우크라이나(상단) + 이스라엘(하단)을 하나의 빨간 「공습경보」 드롭다운으로 통합.
 */
export function UnifiedAirRaidDropdown({
  showUkraine = true,
  showIsrael = true,
  neptunAlerts,
  neptunLive = false,
  neptunStatus = "idle",
  neptunError,
  tzevaActive = [],
  tzevaHistory = [],
  tzevaLive = false,
  tzevaStatus = "idle",
  tzevaGeoRestricted,
  tzevaError,
  lang = "ko",
  onFocusUkraine,
  onFocusIsrael,
  compact = false,
}: UnifiedAirRaidDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const uaList = useMemo(() => {
    if (!showUkraine) return [] as UaListItem[];
    const items: UaListItem[] = [];
    for (const region of neptunAlerts?.raions ?? []) {
      items.push({ ...region, scope: "raion" });
      if (items.length >= 16) break;
    }
    if (items.length < 16) {
      for (const region of neptunAlerts?.oblasts ?? []) {
        items.push({ ...region, scope: "oblast" });
        if (items.length >= 16) break;
      }
    }
    return items;
  }, [neptunAlerts, showUkraine]);

  const ilList = useMemo(() => {
    if (!showIsrael) return [] as TzevaAdomAlert[];
    const seen = new Set<string>();
    const merged: TzevaAdomAlert[] = [];
    for (const alert of [...tzevaActive, ...tzevaHistory]) {
      if (seen.has(alert.id)) continue;
      seen.add(alert.id);
      merged.push(alert);
      if (merged.length >= 16) break;
    }
    return merged;
  }, [showIsrael, tzevaActive, tzevaHistory]);

  const uaActive = uaList.length > 0;
  const ilActive = tzevaActive.length > 0;
  const hasActive = uaActive || ilActive;
  const totalActive = uaList.length + tzevaActive.length;
  const anyLive = (showUkraine && neptunLive) || (showIsrael && tzevaLive);

  const headline = useMemo(() => {
    if (uaActive && uaList[0]) {
      const row = uaList[0];
      return {
        region: row.name || row.oblast || row.key,
        title: row.oblast && row.name !== row.oblast ? row.oblast : t("ukraine", lang),
        theater: "ua" as const,
      };
    }
    if (ilActive && tzevaActive[0]) {
      const alert = tzevaActive[0];
      return {
        region: translateOrefRegion(alert.region, lang),
        title: translateOrefTitle(alert.title, lang, alert.category),
        theater: "il" as const,
      };
    }
    return null;
  }, [ilActive, lang, tzevaActive, uaActive, uaList]);

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
    : neptunStatus === "loading" || tzevaStatus === "loading"
      ? t("connecting", lang)
      : anyLive
        ? t("live", lang)
        : neptunStatus === "stub" || tzevaStatus === "stub"
          ? t("demo", lang)
          : t("idle", lang);

  function focusUkraine(alert?: NeptunAlertRegion) {
    if (alert) {
      const coords = geocodeUkraineAlertRegion(alert.name, alert.oblast, alert.key);
      onFocusUkraine?.({
        lat: coords.lat,
        lng: coords.lng,
        label: alert.name || alert.oblast || alert.key,
      });
      return;
    }
    onFocusUkraine?.(geocodeUkraineAlertRegion());
  }

  function focusIsrael(alert?: Pick<TzevaAdomAlert, "lat" | "lng" | "region">) {
    if (alert) {
      const lat = Number.isFinite(alert.lat) ? alert.lat : ISRAEL_FALLBACK.lat;
      const lng = Number.isFinite(alert.lng) ? alert.lng : ISRAEL_FALLBACK.lng;
      onFocusIsrael?.({
        lat,
        lng,
        label: translateOrefRegion(alert.region, lang),
      });
      return;
    }
    onFocusIsrael?.({ ...ISRAEL_FALLBACK });
  }

  if (!showUkraine && !showIsrael) return null;

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
          if (uaActive && uaList[0]) focusUkraine(uaList[0]);
          else if (ilActive && tzevaActive[0]) focusIsrael(tzevaActive[0]);
          else if (showUkraine) focusUkraine();
          else focusIsrael();
          setOpen((v) => !v);
        }}
        className={
          compact
            ? `relative flex h-11 w-11 items-center justify-center border shadow-lg backdrop-blur-md transition-all duration-200 ${
                hasActive
                  ? "rounded-full border-red-400/50 bg-[#2a0c12]/85 text-red-50"
                  : "rounded-full border-red-300/25 bg-[#1a0c10]/7 text-red-100/90"
              }`
            : `flex max-w-[min(56vw,300px)] items-center gap-2 border px-3 py-2 text-xs shadow-lg backdrop-blur-md transition-all duration-200 ${
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
                {totalActive > 0 ? (
                  <span className="shrink-0 rounded border border-red-400/45 bg-red-950/50 px-1 text-micro font-bold tabular-nums text-red-200">
                    {totalActive}
                  </span>
                ) : null}
                {!hasActive && anyLive ? (
                  <span className="shrink-0 animate-pulse rounded border border-emerald-400/45 px-1 text-micro font-bold uppercase tracking-wider text-emerald-300">
                    Live
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate font-medium tracking-tight">
                {headline
                  ? `${headline.theater === "ua" ? t("ukraine", lang) : t("israel", lang)} · ${headline.region}`
                  : statusLabel}
              </span>
            </span>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                hasActive ? "animate-pulse bg-red-400" : anyLive ? "bg-emerald-400" : "bg-slate-500"
              }`}
            />
          </>
        ) : (
          <>
            {totalActive > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-0.5 text-micro font-bold text-white">
                {totalActive > 9 ? "9+" : totalActive}
              </span>
            ) : (
              <span
                className={`absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full ${
                  hasActive
                    ? "animate-pulse bg-red-400"
                    : anyLive
                      ? "bg-emerald-400"
                      : "bg-slate-500"
                }`}
              />
            )}
          </>
        )}
      </button>

      <div
        className={`absolute right-0 z-[200] w-[min(92vw,340px)] origin-top transition-all duration-200 ease-out ${
          compact ? "bottom-full mb-1.5 origin-bottom" : "top-full"
        } ${
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-[0.98] opacity-0"
        }`}
      >
        <div
          className={`overflow-hidden border border-red-400/25 bg-[#1a0c10]/95 shadow-2xl backdrop-blur-md ${
            compact ? "rounded-2xl" : "rounded-b-2xl rounded-tl-2xl border-t-0"
          }`}
        >
          <div className="border-b border-red-400/15 px-3 py-2">
            <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red-200/75">
              {t("brand", lang)}
            </p>
            <p className="mt-0.5 text-meta text-red-100/55">
              {lang === "en" ? "Ukraine · Israel live desks" : "우크라이나 · 이스라엘 통합 경보"}
            </p>
          </div>

          <div className="max-h-[min(70vh,420px)] overflow-y-auto overscroll-contain">
            {/* —— 상단: 우크라이나 —— */}
            {showUkraine ? (
              <section className="border-b border-red-400/20">
                <div className="sticky top-0 z-[1] flex items-baseline justify-between gap-2 bg-[#220e14]/95 px-3 py-2 backdrop-blur-sm">
                  <div>
                    <p className="text-micro font-semibold uppercase tracking-[0.16em] text-red-100/90">
                      {t("ukraine", lang)}
                    </p>
                    <p className="text-micro text-red-100/45">{t("ukraineSub", lang)}</p>
                  </div>
                  {uaActive ? (
                    <span className="rounded border border-red-400/35 px-1.5 py-0.5 text-micro text-red-200">
                      {uaList.length}
                    </span>
                  ) : null}
                </div>
                <div className="p-1.5">
                  {neptunError ? (
                    <p className="px-2 py-2 text-meta text-red-200/85">{neptunError}</p>
                  ) : uaList.length === 0 ? (
                    <p className="px-2 py-2 font-mono text-meta text-slate-500">
                      {t("awaiting", lang)}
                    </p>
                  ) : (
                    <ul className="divide-y divide-red-400/10" role="listbox">
                      {uaList.map((alert) => (
                        <li key={`ua-${alert.scope}-${alert.key}`}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={false}
                            onClick={() => focusUkraine(alert)}
                            className="w-full px-2.5 py-2 text-left transition hover:bg-red-500/10"
                          >
                            <div className="flex flex-wrap items-center gap-x-1.5 text-micro text-slate-500">
                              <span className="text-slate-400">
                                {formatTime(alert.since, lang)}
                              </span>
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
                              <p className="mt-0.5 text-micro leading-snug text-slate-400">
                                {alert.oblast}
                              </p>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="border-t border-red-950/30 px-3 py-1 font-mono text-micro text-slate-600">
                  {t("sourceUa", lang)}
                </p>
              </section>
            ) : null}

            {/* —— 하단: 이스라엘 —— */}
            {showIsrael ? (
              <section>
                <div className="sticky top-0 z-[1] flex items-baseline justify-between gap-2 bg-[#220e14]/95 px-3 py-2 backdrop-blur-sm">
                  <div>
                    <p className="text-micro font-semibold uppercase tracking-[0.16em] text-red-100/90">
                      {t("israel", lang)}
                    </p>
                    <p className="text-micro text-red-100/45">{t("israelSub", lang)}</p>
                  </div>
                  {ilActive ? (
                    <span className="rounded border border-red-400/35 px-1.5 py-0.5 text-micro text-red-200">
                      {tzevaActive.length}
                    </span>
                  ) : null}
                </div>
                <div className="p-1.5">
                  {tzevaGeoRestricted || tzevaStatus === "geo-blocked" ? (
                    <p className="px-2 py-2 text-meta leading-relaxed text-amber-200/90">
                      {tzevaUi("geoHint", lang)}
                    </p>
                  ) : tzevaError ? (
                    <p className="px-2 py-2 text-meta text-red-200/85">{tzevaError}</p>
                  ) : ilList.length === 0 ? (
                    <p className="px-2 py-2 font-mono text-meta text-slate-500">
                      {t("awaiting", lang)}
                    </p>
                  ) : (
                    <ul className="divide-y divide-red-400/10" role="listbox">
                      {ilList.map((alert) => {
                        const region = translateOrefRegion(alert.region, lang);
                        const title = translateOrefTitle(alert.title, lang, alert.category);
                        const isLive =
                          alert.active || tzevaActive.some((a) => a.id === alert.id);
                        return (
                          <li key={`il-${alert.id}`}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isLive}
                              onClick={() => focusIsrael(alert)}
                              className="w-full px-2.5 py-2 text-left transition hover:bg-red-500/10"
                            >
                              <div className="flex flex-wrap items-center gap-x-1.5 text-micro text-slate-500">
                                <span className="text-slate-400">
                                  {formatTime(alert.alertDate, lang)}
                                </span>
                                {isLive ? (
                                  <span className="rounded border border-red-400/35 px-1 text-red-200">
                                    {t("activeBadge", lang)}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-0.5 text-caption font-semibold leading-snug text-slate-50">
                                {region}
                              </p>
                              <p className="mt-0.5 text-micro leading-snug text-slate-400">
                                {title}
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <p className="border-t border-red-950/30 px-3 py-1 font-mono text-micro text-slate-600">
                  {t("sourceIl", lang)}
                </p>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
