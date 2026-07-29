"use client";

import { useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsStreamItem } from "@/lib/news/types";
import type { PublicShipObservation } from "@/lib/shipMovements/types";
import {
  filterWestpacRssItems,
  relatedReportsFromObservations,
} from "@/lib/shipMovements/relatedNews";
import {
  groupKeyForObservation,
  groupShipObservationsByVessel,
  type ShipTrailMode,
} from "@/lib/shipMovements/shipMovementBrief";
import { SHIP_NAVY_LEGEND, shipNavyFillColor } from "@/lib/shipMovements/navyColors";
import { warshipProfileIconSvg } from "@/lib/surfaceCombatantDeckIcon";
import { t } from "@/lib/uiStrings";

type WeeklyShipMovesPanelProps = {
  open: boolean;
  lang: LabelLanguage;
  loading: boolean;
  observations: PublicShipObservation[];
  disclaimer: string | null;
  selectedId: string | null;
  trailMode: ShipTrailMode;
  focusGroupKey: string | null;
  /** 뉴스 스트림 풀 — 해군 키워드 매칭용 (없으면 폴링 출처만) */
  newsPool?: NewsStreamItem[];
  onTrailModeChange: (mode: ShipTrailMode) => void;
  onSelect: (obs: PublicShipObservation) => void;
  onSelectVessel: (groupKey: string, observations: PublicShipObservation[]) => void;
  onOpenBrief: (observations: PublicShipObservation[], focusId?: string | null) => void;
  onClose: () => void;
};

type PanelTab = "timeline" | "reports";

function confidenceLabel(c: PublicShipObservation["confidence"], lang: LabelLanguage) {
  if (c === "observed") return t("westpacConfidenceObserved", lang);
  if (c === "reported") return t("westpacConfidenceReported", lang);
  return t("westpacConfidenceEstimated", lang);
}

/** Nav 이벤트 메뉴 immersion — 전체/함선별 경로 + 양피지 브리프 */
export function WeeklyShipMovesPanel({
  open,
  lang,
  loading,
  observations,
  disclaimer,
  selectedId,
  trailMode,
  focusGroupKey,
  newsPool = [],
  onTrailModeChange,
  onSelect,
  onSelectVessel,
  onOpenBrief,
  onClose,
}: WeeklyShipMovesPanelProps) {
  const [weekFilter, setWeekFilter] = useState<string>("all");
  const [tab, setTab] = useState<PanelTab>("timeline");

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

  const vesselGroups = useMemo(
    () => groupShipObservationsByVessel(filtered),
    [filtered],
  );

  const selectedObs = useMemo(
    () => observations.find((o) => o.id === selectedId) ?? null,
    [observations, selectedId],
  );

  const sourceReports = useMemo(
    () => relatedReportsFromObservations(observations),
    [observations],
  );

  const matchedRss = useMemo(
    () => filterWestpacRssItems(newsPool, 18),
    [newsPool],
  );

  if (!open) return null;

  const en = lang === "en";

  return (
    <aside
      id="weekly-ship-moves-panel"
      className="pointer-events-auto absolute right-3 top-20 z-[120] flex max-h-[min(78vh,560px)] w-[min(94vw,360px)] flex-col overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#0a1620]/92 shadow-2xl backdrop-blur-xl"
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

      <div className="flex gap-1 border-b border-cyan-200/10 px-3 py-1.5">
        <button
          type="button"
          onClick={() => setTab("timeline")}
          className={`rounded-md px-2.5 py-0.5 text-[10px] ${
            tab === "timeline"
              ? "bg-cyan-500/25 text-cyan-50"
              : "text-cyan-100/55 hover:bg-cyan-500/10"
          }`}
        >
          {en ? "Ships" : "함선"}
        </button>
        <button
          type="button"
          onClick={() => setTab("reports")}
          className={`rounded-md px-2.5 py-0.5 text-[10px] ${
            tab === "reports"
              ? "bg-cyan-500/25 text-cyan-50"
              : "text-cyan-100/55 hover:bg-cyan-500/10"
          }`}
        >
          {en
            ? `Related · ${sourceReports.length + matchedRss.length}`
            : `관련 기사 · ${sourceReports.length + matchedRss.length}`}
        </button>
      </div>

      {tab === "timeline" ? (
        <div className="space-y-1.5 border-b border-cyan-200/10 px-3 py-1.5">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onTrailModeChange("fleet")}
              className={`rounded-md px-2 py-0.5 text-[9px] ${
                trailMode === "fleet"
                  ? "bg-amber-500/20 text-amber-50"
                  : "text-cyan-100/50 hover:bg-cyan-500/10"
              }`}
            >
              {en ? "All tracks" : "전체 경로"}
            </button>
            <button
              type="button"
              onClick={() => onTrailModeChange("vessel")}
              className={`rounded-md px-2 py-0.5 text-[9px] ${
                trailMode === "vessel"
                  ? "bg-amber-500/20 text-amber-50"
                  : "text-cyan-100/50 hover:bg-cyan-500/10"
              }`}
            >
              {en ? "Per ship" : "함선별"}
            </button>
          </div>
          <p className="text-[9px] leading-4 text-cyan-100/40">
            {trailMode === "fleet"
              ? en
                ? "Every hull’s estimated track at once. Select a fix, then open the parchment brief."
                : "모든 함정의 추정 경로를 한눈에. 관측을 고른 뒤 양피지 브리프로 경위를 읽습니다."
              : en
                ? "Pick one hull to isolate its track on the map and open the movement brief."
                : "함정 하나를 고르면 지도에 그 경로만 남기고, 이동 경위 양피지가 열립니다."}
          </p>
          {weeks.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setWeekFilter("all")}
                className={`rounded-md px-2 py-0.5 text-[10px] ${
                  weekFilter === "all"
                    ? "bg-cyan-500/25 text-cyan-50"
                    : "text-cyan-100/55 hover:bg-cyan-500/10"
                }`}
              >
                {en ? "All weeks" : "전체 주"}
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
        </div>
      ) : null}

      {tab === "timeline" && selectedObs && trailMode === "fleet" ? (
        <div className="border-b border-cyan-200/10 px-3 py-1.5">
          <button
            type="button"
            onClick={() => {
              const key = groupKeyForObservation(selectedObs);
              const track = observations.filter((o) => groupKeyForObservation(o) === key);
              onOpenBrief(track.length > 0 ? track : [selectedObs], selectedObs.id);
            }}
            className="w-full rounded-lg border border-amber-300/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-medium text-amber-50 transition hover:border-amber-200/45"
          >
            {en ? "Open parchment brief" : "양피지 브리프 열기"}
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 py-2">
        {tab === "reports" ? (
          <>
            <p className="px-2 pb-1 text-[9px] leading-4 text-cyan-100/45">
              {en
                ? "Primary: USNI/JSO reports this desk polls. Secondary: naval RSS matched to Westpac keywords."
                : "1순위: 이 데스크가 폴링하는 USNI·JSO 보고서. 2순위: 서태평양 해군 키워드로 걸러진 RSS."}
            </p>
            {sourceReports.length === 0 && matchedRss.length === 0 ? (
              <p className="px-2 py-4 text-xs text-cyan-100/45">
                {en ? "No matched reports yet." : "매칭된 기사가 아직 없습니다."}
              </p>
            ) : null}
            {sourceReports.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-lg border border-cyan-200/15 bg-cyan-500/8 px-2.5 py-2 text-left transition hover:bg-cyan-500/14"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-medium text-cyan-50">{r.title}</p>
                  <span className="shrink-0 text-[9px] text-cyan-200/45">
                    {(r.publishedAt || r.weekStart || "—").slice(0, 10)}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-amber-100/75">{r.sourceLabel}</p>
                {r.vesselHints.length > 0 ? (
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-cyan-100/55">
                    {r.vesselHints.slice(0, 4).join(" · ")}
                  </p>
                ) : null}
                {r.summary ? (
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-cyan-100/45">
                    {r.summary}
                  </p>
                ) : null}
              </a>
            ))}
            {matchedRss.map((item) => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-lg border border-sky-200/12 bg-sky-500/5 px-2.5 py-2 text-left transition hover:bg-sky-500/10"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-medium text-sky-50">{item.title}</p>
                  <span className="shrink-0 text-[9px] text-sky-200/45">
                    {item.pubDate?.slice(0, 10) || "—"}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-sky-100/65">
                  {item.publisher || item.source} · RSS
                </p>
                {item.summary ? (
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-sky-100/45">
                    {item.summary}
                  </p>
                ) : null}
              </a>
            ))}
          </>
        ) : loading ? (
          <p className="px-2 py-4 text-xs text-cyan-100/45">{t("westpacLoading", lang)}</p>
        ) : trailMode === "vessel" ? (
          vesselGroups.length === 0 ? (
            <p className="px-2 py-4 text-xs text-cyan-100/45">
              {t("westpacEmptyTimeline", lang)}
            </p>
          ) : (
            vesselGroups.map((g) => {
              const active = focusGroupKey === g.groupKey;
              const routeStops = g.observations
                .map((o) => o.locationLabel)
                .filter((s): s is string => Boolean(s && s.length > 0));
              const uniqueStops: string[] = [];
              for (const s of routeStops) {
                if (uniqueStops[uniqueStops.length - 1] !== s) uniqueStops.push(s);
              }
              return (
                <button
                  key={g.groupKey}
                  type="button"
                  onClick={() => onSelectVessel(g.groupKey, g.observations)}
                  className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                    active
                      ? "border-cyan-300/45 bg-cyan-500/20"
                      : "border-cyan-200/10 bg-cyan-500/5 hover:bg-cyan-500/10"
                  }`}
                >
                  <span
                    className="mt-0.5 shrink-0 opacity-90"
                    style={{ width: 40, height: 28 }}
                    aria-hidden
                    dangerouslySetInnerHTML={{
                      __html: warshipProfileIconSvg(
                        shipNavyFillColor(g.navyCode),
                        { width: 40, height: 28 },
                        "e",
                      ),
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[11px] font-medium text-cyan-50">{g.label}</p>
                      <span className="shrink-0 text-[9px] text-cyan-200/45">
                        {(g.latestAt || "—").slice(0, 10)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-cyan-100/60">
                      {[g.navyLabel, en ? `${g.observations.length} fixes` : `관측 ${g.observations.length}건`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {uniqueStops.length > 0 ? (
                      <p className="mt-0.5 line-clamp-2 text-[10px] text-cyan-100/50">
                        {uniqueStops.slice(0, 5).join(" → ")}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[10px] text-amber-100/65">
                        {t("westpacLocationUnknown", lang)}
                      </p>
                    )}
                    <p className="mt-1 text-[8px] uppercase tracking-wide text-cyan-200/45">
                      {en
                        ? `${g.mapPointCount} map points · tap for track + brief`
                        : `지도 ${g.mapPointCount}점 · 탭하면 경로+양피지`}
                    </p>
                  </div>
                </button>
              );
            })
          )
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
                className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-cyan-300/45 bg-cyan-500/20"
                    : "border-cyan-200/10 bg-cyan-500/5 hover:bg-cyan-500/10"
                }`}
              >
                <span
                  className="mt-0.5 shrink-0 opacity-90"
                  style={{ width: 40, height: 28 }}
                  aria-hidden
                  dangerouslySetInnerHTML={{
                    __html: warshipProfileIconSvg(
                      shipNavyFillColor(obs.navyCode),
                      { width: 40, height: 28 },
                      "e",
                    ),
                  }}
                />
                <div className="min-w-0 flex-1">
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
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="border-t border-cyan-200/10 px-3 py-1.5">
        {tab !== "reports" ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {SHIP_NAVY_LEGEND.map((entry) => (
              <span
                key={entry.code}
                className="inline-flex items-center gap-1 text-[8px] text-cyan-100/55"
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: entry.color }}
                  aria-hidden
                />
                {en ? entry.labelEn : entry.labelKo}
              </span>
            ))}
          </div>
        ) : null}
        <p className="text-[9px] text-cyan-100/40">
          {tab === "reports"
            ? en
              ? "Links open the polled source pages (USNI/JSO) or matched naval RSS."
              : "링크는 폴링 중인 출처(USNI/JSO) 또는 해군 매칭 RSS로 연결됩니다."
            : t("westpacTrailLegend", lang)}
        </p>
      </div>
    </aside>
  );
}
