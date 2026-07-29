"use client";

import { useMemo, useState } from "react";
import type { DisputeHotspotEntry } from "@/lib/disputeHotspots";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { TerritorialDisputeEpisode } from "@/data/territorialDisputeEpisodes";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import {
  ARCHIVE_CONTINENT_LABEL,
  ARCHIVE_CONTINENT_ORDER,
  ARCHIVE_LENS_LABEL,
  archiveContinentCounts,
  archiveEpisodeLocation,
  archiveEpisodeTitle,
  archiveYearLabel,
  filterArchiveEpisodes,
  territorialArchiveEpisodes,
  type ArchiveContinent,
  type ArchiveEpisode,
  type ArchiveLens,
} from "@/data/territorialArchive";

type DisputeHotspotPanelProps = {
  hotspots: DisputeHotspotEntry[];
  selectedId: string | null;
  selectedEpisodeId?: string | null;
  selectedFrictionId?: string | null;
  lang?: LabelLanguage;
  onSelect: (hotspot: DisputeHotspotEntry) => void;
  onSelectEpisode?: (episode: TerritorialDisputeEpisode) => void;
  onSelectFriction?: (episode: FrictionEpisode) => void;
  onClose: () => void;
};

type PanelTab = "archive" | "hotspots";
type LensFilter = ArchiveLens | "all";
type ContinentFilter = ArchiveContinent | "all";

const TENSION_LABEL: Record<DisputeHotspotEntry["tension"], { ko: string; en: string; dot: string }> = {
  high: { ko: "고위험·실전투 근접", en: "High · combat-adjacent", dot: "bg-rose-400" },
  medium: { ko: "중긴장", en: "Medium tension", dot: "bg-amber-400" },
  low: { ko: "저긴장", en: "Low tension", dot: "bg-slate-400" },
};

/**
 * 영토분쟁 통합 아카이브 — 진영 내부 + 국경·화약고를 한 목록·렌즈 필터로.
 */
export function DisputeHotspotPanel({
  hotspots,
  selectedId,
  selectedEpisodeId = null,
  selectedFrictionId = null,
  lang = "ko",
  onSelect,
  onSelectEpisode,
  onSelectFriction,
  onClose,
}: DisputeHotspotPanelProps) {
  const en = lang === "en";
  const [tab, setTab] = useState<PanelTab>("archive");
  const [lens, setLens] = useState<LensFilter>("all");
  const [continent, setContinent] = useState<ContinentFilter>("all");

  const hotspotById = useMemo(() => {
    const m = new Map<string, DisputeHotspotEntry>();
    for (const h of hotspots) m.set(h.id, h);
    return m;
  }, [hotspots]);

  const archiveAll = useMemo(() => territorialArchiveEpisodes(), []);
  const archiveList = useMemo(
    () => filterArchiveEpisodes({ lens, continent }),
    [lens, continent],
  );

  const selectedArchive = useMemo((): ArchiveEpisode | null => {
    if (selectedFrictionId) {
      return archiveAll.find((e) => e.kind === "friction" && e.id === selectedFrictionId) ?? null;
    }
    if (selectedEpisodeId) {
      return archiveAll.find((e) => e.kind === "territorial" && e.id === selectedEpisodeId) ?? null;
    }
    return null;
  }, [archiveAll, selectedEpisodeId, selectedFrictionId]);

  const activeTerritorial =
    selectedArchive?.kind === "territorial" ? selectedArchive.territorial ?? null : null;

  function selectArchive(ep: ArchiveEpisode) {
    if (ep.kind === "friction" && ep.friction) onSelectFriction?.(ep.friction);
    else if (ep.kind === "territorial" && ep.territorial) onSelectEpisode?.(ep.territorial);
  }

  const lensCounts = useMemo(
    () => ({
      all: archiveAll.length,
      bloc: archiveAll.filter((e) => e.lens === "bloc").length,
      border: archiveAll.filter((e) => e.lens === "border").length,
    }),
    [archiveAll],
  );

  const continentCounts = useMemo(() => archiveContinentCounts(lens), [lens]);

  return (
    <aside
      id="dispute-hotspot-panel"
      className="pointer-events-auto absolute right-3 top-20 z-[120] flex max-h-[min(78vh,560px)] w-[min(94vw,340px)] flex-col overflow-hidden rounded-2xl border border-rose-300/25 bg-[#160d10]/92 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-2 border-b border-rose-200/10 px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-rose-200/60">
            {en
              ? `${archiveAll.length} episodes · past → powder kegs`
              : `${archiveAll.length}건 · 과거→화약고`}
          </p>
          <h2 className="mt-0.5 text-sm font-medium text-rose-50">
            {en ? "Territorial archive" : "영토분쟁 아카이브"}
          </h2>
          <p className="mt-1 text-[10px] leading-4 text-rose-100/45">
            {en
              ? "One comprehensive archive: intra-bloc clashes and border flashpoints in a single timeline."
              : "진영 내부 충돌과 국경·화약고를 하나의 타임라인으로 — 포괄 작성·열람."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-rose-300/25 px-2 py-1 text-[10px] text-rose-100/70 transition hover:border-rose-200/40 hover:text-rose-50"
        >
          {en ? "Exit" : "나가기"}
        </button>
      </div>

      <div className="flex gap-1 border-b border-rose-200/10 px-3 py-1.5">
        <button
          type="button"
          onClick={() => setTab("archive")}
          className={`rounded-md px-2.5 py-0.5 text-[10px] ${
            tab === "archive"
              ? "bg-rose-500/25 text-rose-50"
              : "text-rose-100/55 hover:bg-rose-500/10"
          }`}
        >
          {en ? `Archive · ${archiveAll.length}` : `아카이브 · ${archiveAll.length}`}
        </button>
        <button
          type="button"
          onClick={() => setTab("hotspots")}
          className={`rounded-md px-2.5 py-0.5 text-[10px] ${
            tab === "hotspots"
              ? "bg-rose-500/25 text-rose-50"
              : "text-rose-100/55 hover:bg-rose-500/10"
          }`}
        >
          {en ? `Today · ${hotspots.length}` : `현재 핫스팟 · ${hotspots.length}`}
        </button>
      </div>

      {tab === "archive" ? (
        <div className="space-y-1.5 border-b border-rose-200/10 px-3 py-1.5">
          <div className="flex flex-wrap gap-1">
            {(["all", "bloc", "border"] as const).map((key) => {
              const label = ARCHIVE_LENS_LABEL[key];
              const count = lensCounts[key];
              const active = lens === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLens(key)}
                  className={`rounded-md px-2 py-0.5 text-[9px] ${
                    active
                      ? "bg-amber-500/20 text-amber-50"
                      : "text-rose-100/50 hover:bg-rose-500/10"
                  }`}
                >
                  {en ? label.en : label.ko}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setContinent("all")}
              className={`rounded-md px-2 py-0.5 text-[9px] ${
                continent === "all"
                  ? "bg-sky-500/20 text-sky-50"
                  : "text-rose-100/50 hover:bg-rose-500/10"
              }`}
            >
              {en ? ARCHIVE_CONTINENT_LABEL.all.en : ARCHIVE_CONTINENT_LABEL.all.ko}
              <span className="ml-1 opacity-60">{continentCounts.all}</span>
            </button>
            {ARCHIVE_CONTINENT_ORDER.map((key) => {
              const label = ARCHIVE_CONTINENT_LABEL[key];
              const count = continentCounts[key];
              if (count === 0) return null;
              const active = continent === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setContinent(key)}
                  className={`rounded-md px-2 py-0.5 text-[9px] ${
                    active
                      ? "bg-sky-500/20 text-sky-50"
                      : "text-rose-100/50 hover:bg-rose-500/10"
                  }`}
                >
                  {en ? label.en : label.ko}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 py-2">
        {tab === "archive" ? (
          <>
            {archiveList.length === 0 ? (
              <p className="px-2 py-4 text-xs text-rose-100/45">
                {en
                  ? "No episodes match this lens · continent filter."
                  : "이 렌즈·대륙 조합에 해당하는 에피소드가 없습니다."}
              </p>
            ) : null}
            {archiveList.map((ep) => {
              const active =
                (ep.kind === "friction" && selectedFrictionId === ep.id) ||
                (ep.kind === "territorial" && selectedEpisodeId === ep.id);
              const isBloc = ep.lens === "bloc";
              return (
                <button
                  key={ep.key}
                  type="button"
                  onClick={() => selectArchive(ep)}
                  className={`block w-full rounded-lg border px-2.5 py-2 text-left transition ${
                    active
                      ? isBloc
                        ? "border-violet-300/45 bg-violet-500/20"
                        : "border-rose-300/45 bg-rose-500/20"
                      : isBloc
                        ? "border-violet-200/10 bg-violet-500/5 hover:bg-violet-500/10"
                        : "border-rose-200/10 bg-rose-500/5 hover:bg-rose-500/10"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`text-[11px] font-medium ${
                        isBloc ? "text-violet-50" : "text-rose-50"
                      }`}
                    >
                      {archiveEpisodeTitle(ep, en ? "en" : "ko")}
                    </p>
                    <span
                      className={`shrink-0 text-[9px] ${
                        isBloc ? "text-violet-200/55" : "text-rose-200/55"
                      }`}
                    >
                      {archiveYearLabel(ep)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-amber-200/55">
                    {en
                      ? isBloc
                        ? "Intra-bloc"
                        : "Border · keg"
                      : isBloc
                        ? "진영 내부"
                        : "국경·화약고"}
                    <span className="mx-1 opacity-40">·</span>
                    {en
                      ? ARCHIVE_CONTINENT_LABEL[ep.continent].en
                      : ARCHIVE_CONTINENT_LABEL[ep.continent].ko}
                  </p>
                  {ep.parties.length > 0 ? (
                    <p className="mt-0.5 text-[10px] text-amber-200/85">
                      {ep.parties.join(" · ")}
                    </p>
                  ) : null}
                  <p
                    className={`mt-0.5 line-clamp-1 text-[10px] ${
                      isBloc ? "text-violet-100/55" : "text-rose-100/55"
                    }`}
                  >
                    {archiveEpisodeLocation(ep, en ? "en" : "ko")}
                  </p>
                </button>
              );
            })}

            {activeTerritorial ? (
              <div className="mt-2 space-y-2 rounded-lg border border-rose-300/20 bg-rose-950/40 px-2.5 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-rose-200/50">
                  {en ? "Then" : "당시"}
                </p>
                <p className="text-[11px] leading-relaxed text-rose-50/90">
                  {en ? activeTerritorial.briefingEn : activeTerritorial.briefing}
                </p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/55">
                  {en ? "Now · living link" : "오늘날 · 현세 연결"}
                </p>
                <p className="text-[11px] leading-relaxed text-amber-50/85">
                  {en ? activeTerritorial.presentLinkEn : activeTerritorial.presentLinkKo}
                </p>
                {activeTerritorial.linkedHotspotIds.some((id) => hotspotById.has(id)) ? (
                  <>
                    <p className="text-[10px] text-rose-100/50">
                      {en ? "Linked current sites" : "연결된 현재 핫스팟"}
                    </p>
                    <div className="flex flex-col gap-1">
                      {activeTerritorial.linkedHotspotIds.map((id) => {
                        const h = hotspotById.get(id);
                        if (!h) return null;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => onSelect(h)}
                            className={`rounded-md border px-2 py-1.5 text-left text-[10px] transition ${
                              selectedId === id
                                ? "border-amber-300/40 bg-amber-500/15 text-amber-50"
                                : "border-rose-200/15 text-rose-100/75 hover:bg-rose-500/10"
                            }`}
                          >
                            <span className="font-medium">{h.name}</span>
                            <span className="mt-0.5 block line-clamp-1 text-rose-100/45">
                              {h.overviewKo}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </>
        ) : hotspots.length === 0 ? (
          <p className="px-2 py-4 text-xs text-rose-100/45">
            {en ? "Loading dispute data…" : "분쟁 데이터를 불러오는 중…"}
          </p>
        ) : (
          hotspots.map((hotspot) => {
            const active = selectedId === hotspot.id;
            const tensionMeta = TENSION_LABEL[hotspot.tension];
            return (
              <button
                key={hotspot.id}
                type="button"
                onClick={() => onSelect(hotspot)}
                className={`block w-full rounded-lg border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-rose-300/45 bg-rose-500/20"
                    : "border-rose-200/10 bg-rose-500/5 hover:bg-rose-500/10"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-medium text-rose-50">{hotspot.name}</p>
                  <span className="flex shrink-0 items-center gap-1 text-[9px] text-rose-200/55">
                    <span className={`h-1.5 w-1.5 rounded-full ${tensionMeta.dot}`} />
                    {en ? tensionMeta.en : tensionMeta.ko}
                  </span>
                </div>
                {hotspot.parties.length > 0 ? (
                  <p className="mt-0.5 text-[10px] text-amber-200/85">
                    {hotspot.parties.join(" vs ")}
                  </p>
                ) : null}
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-rose-100/55">
                  {hotspot.overviewKo}
                </p>
              </button>
            );
          })
        )}
      </div>

      <p className="border-t border-rose-200/10 px-3 py-2 text-[9px] leading-4 text-rose-100/40">
        {en
          ? "Filter by lens and continent. Selecting an episode opens the map sequence and parchment brief."
          : "렌즈·대륙으로 걸러 보세요. 에피소드를 고르면 맵 연출과 양피지 서술이 이어집니다."}
      </p>
    </aside>
  );
}
