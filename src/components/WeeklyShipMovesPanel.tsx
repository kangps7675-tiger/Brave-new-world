"use client";

import { useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { PublicShipObservation } from "@/lib/shipMovements/types";
import { t } from "@/lib/uiStrings";

type WeeklyShipMovesPanelProps = {
  open: boolean;
  lang: LabelLanguage;
  loading: boolean;
  observations: PublicShipObservation[];
  disclaimer: string | null;
  selectedId: string | null;
  onSelect: (obs: PublicShipObservation) => void;
  onClose: () => void;
};

function confidenceLabel(c: PublicShipObservation["confidence"], lang: LabelLanguage) {
  if (c === "observed") return t("westpacConfidenceObserved", lang);
  if (c === "reported") return t("westpacConfidenceReported", lang);
  return t("westpacConfidenceEstimated", lang);
}

/** Nav 이벤트 메뉴 immersion — 주간 타임라인(위치 미상 포함) */
export function WeeklyShipMovesPanel({
  open,
  lang,
  loading,
  observations,
  disclaimer,
  selectedId,
  onSelect,
  onClose,
}: WeeklyShipMovesPanelProps) {
  const [weekFilter, setWeekFilter] = useState<string>("all");
  const weeks = useMemo(() => {
    const set = new Set<string>();
    for (const o of observations) {
      if (o.weekStart) set.add(o.weekStart);
    }
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [observations]);

  const filtered = useMemo(() => {
    if (weekFilter === "all") return observations;
    return observations.filter((o) => o.weekStart === weekFilter);
  }, [observations, weekFilter]);

  if (!open) return null;

  return (
    <aside
      id="weekly-ship-moves-panel"
      className="pointer-events-auto absolute right-3 top-20 z-40 flex max-h-[min(78vh,560px)] w-[min(94vw,360px)] flex-col overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#0a1620]/92 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-2 border-b border-cyan-200/10 px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/55">
            USNI · JSO
          </p>
          <h2 className="mt-0.5 text-sm font-medium text-cyan-50">
            {t("westpacShipMovesTitle", lang)}
          </h2>
          <p className="mt-1 text-[10px] leading-4 text-cyan-100/50">
            {disclaimer || t("westpacShipMovesDisclaimer", lang)}
          </p>
          <p className="mt-1 text-[9px] text-cyan-200/40">
            {t("westpacMapEligibleOnly", lang)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-cyan-300/25 px-2 py-1 text-[10px] text-cyan-100/70 transition hover:border-cyan-200/40 hover:text-cyan-50"
        >
          {t("westpacExit", lang)}
        </button>
      </div>

      {weeks.length > 0 ? (
        <div className="flex flex-wrap gap-1 border-b border-cyan-200/10 px-3 py-1.5">
          <button
            type="button"
            onClick={() => setWeekFilter("all")}
            className={`rounded-md px-2 py-0.5 text-[10px] ${
              weekFilter === "all"
                ? "bg-cyan-500/25 text-cyan-50"
                : "text-cyan-100/55 hover:bg-cyan-500/10"
            }`}
          >
            {lang === "en" ? "All weeks" : "전체 주"}
          </button>
          {weeks.slice(0, 6).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeekFilter(w)}
              className={`rounded-md px-2 py-0.5 text-[10px] ${
                weekFilter === w
                  ? "bg-cyan-500/25 text-cyan-50"
                  : "text-cyan-100/55 hover:bg-cyan-500/10"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 py-2">
        {loading ? (
          <p className="px-2 py-4 text-xs text-cyan-100/45">{t("westpacLoading", lang)}</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-4 text-xs text-cyan-100/45">
            {t("westpacEmptyTimeline", lang)}
          </p>
        ) : (
          filtered.map((obs) => {
            const active = selectedId === obs.id;
            const hasFix = obs.lat != null && obs.lng != null && obs.mapEligible;
            const loc =
              obs.locationLabel ||
              obs.missingLocationNote ||
              t("westpacLocationUnknown", lang);
            return (
              <button
                key={obs.id}
                type="button"
                onClick={() => onSelect(obs)}
                className={`block w-full rounded-lg border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-cyan-300/45 bg-cyan-500/20"
                    : "border-cyan-200/10 bg-cyan-500/5 hover:bg-cyan-500/10"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-medium text-cyan-50">{obs.title}</p>
                  <span className="shrink-0 text-[9px] text-cyan-200/45">
                    {obs.observedAt?.slice(0, 10) || obs.weekStart || "—"}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-cyan-100/60">
                  {[obs.vesselName, obs.hullNumber, obs.navyLabel]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                <p className="mt-0.5 text-[10px] text-cyan-100/50">{loc}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded border border-cyan-200/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-cyan-100/55">
                    {confidenceLabel(obs.confidence, lang)}
                  </span>
                  {!hasFix ? (
                    <span className="rounded border border-amber-200/25 px-1.5 py-0.5 text-[8px] text-amber-100/70">
                      {t("westpacLocationUnknown", lang)}
                    </span>
                  ) : null}
                  {obs.vesselConfidence === "low" ? (
                    <span className="rounded border border-fuchsia-200/25 px-1.5 py-0.5 text-[8px] text-fuchsia-100/70">
                      {t("westpacVesselUncertain", lang)}
                    </span>
                  ) : null}
                  {obs.sourceUrl ? (
                    <a
                      href={obs.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[8px] text-cyan-200/55 underline-offset-2 hover:underline"
                    >
                      {t("westpacOpenSource", lang)} ↗
                    </a>
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
      <p className="border-t border-cyan-200/10 px-3 py-1.5 text-[9px] text-cyan-100/40">
        {t("westpacTrailLegend", lang)}
      </p>
    </aside>
  );
}
