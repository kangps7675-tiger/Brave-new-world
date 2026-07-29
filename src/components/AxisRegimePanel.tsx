"use client";

import { useMemo, useState } from "react";
import type { AxisHubId } from "@/data/axisNetwork";
import { hubById } from "@/data/hubNav";
import {
  FRICTION_EPISODES,
  episodesForHub,
  episodeTitle,
  episodeLocationName,
  type FrictionEpisode,
} from "@/data/frictionEpisodes";
import type { LabelLanguage } from "@/lib/layerPrefs";

type AxisRegimePanelProps = {
  /** null이면 특정 허브 필터 없이 진영 내부(bloc) 전체 */
  hubId: AxisHubId | null;
  selectedEpisodeId: string | null;
  lang?: LabelLanguage;
  onSelectEpisode: (episode: FrictionEpisode) => void;
  onClose: () => void;
};

const LENS_LABEL: Record<string, { ko: string; en: string }> = {
  china: { ko: "중국 렌즈", en: "China lens" },
  russia: { ko: "러시아 렌즈", en: "Russia lens" },
  iran: { ko: "이란 렌즈", en: "Iran lens" },
  north_korea: { ko: "북한 렌즈", en: "DPRK lens" },
  global: { ko: "공통·블록", en: "Cross-bloc" },
};

/** 영토분쟁 아카이브 · 진영 내부(bloc) 렌즈 — 에피소드 클릭 → soft fly + 양피지 */
export function AxisRegimePanel({
  hubId,
  selectedEpisodeId,
  lang = "ko",
  onSelectEpisode,
  onClose,
}: AxisRegimePanelProps) {
  const hub = hubId ? hubById(hubId) : null;
  const [showGlobal, setShowGlobal] = useState(true);
  const en = lang === "en";

  const episodes = useMemo(
    () => hubId ? episodesForHub(hubId, showGlobal) : [...FRICTION_EPISODES],
    [hubId, showGlobal],
  );

  return (
    <aside
      id="axis-regime-panel"
      className="pointer-events-auto absolute right-3 top-20 z-[120] flex max-h-[min(78vh,560px)] w-[min(94vw,340px)] flex-col overflow-hidden rounded-2xl border border-violet-300/20 bg-[#120e18]/92 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-2 border-b border-violet-200/10 px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-200/55">
            {en
              ? `Territorial archive · intra-bloc · ${FRICTION_EPISODES.length} · locked`
              : `영토분쟁 아카이브 · 진영 내부 · ${FRICTION_EPISODES.length}건 · 잠금`}
          </p>
          <h2 className="mt-0.5 text-sm font-medium text-violet-50">
            {hub?.label ??
              (en
                ? `All hubs · ${FRICTION_EPISODES.length} sites`
                : `전체 허브 · ${FRICTION_EPISODES.length}건`)}
          </h2>
          <p className="mt-1 text-[10px] leading-4 text-violet-100/45">
            {en
              ? "This panel stays locked until you exit (✕). Zoom and mode switches will not leave it."
              : "나가기(✕) 전까지 이 창을 떠날 수 없습니다. 줌·모드 전환으로 탈출되지 않습니다."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-violet-300/25 px-2 py-1 text-[10px] text-violet-100/70 transition hover:border-violet-200/40 hover:text-violet-50"
        >
          {en ? "Exit" : "나가기"}
        </button>
      </div>

      {hubId ? (
      <div className="flex items-center gap-2 border-b border-violet-200/10 px-3 py-1.5">
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-violet-100/70">
          <input
            type="checkbox"
            checked={showGlobal}
            onChange={(e) => setShowGlobal(e.target.checked)}
            className="rounded border-violet-400/40"
          />
          {en ? "Include cross-bloc (Indochina · Africa)" : "공통(인도차이나·아프리카) 포함"}
        </label>
      </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 py-2">
        {episodes.length === 0 ? (
          <p className="px-2 py-4 text-xs text-violet-100/45">
            {en ? "No episodes to show." : "표시할 에피소드가 없습니다."}
          </p>
        ) : (
          episodes.map((ep) => {
            const active = selectedEpisodeId === ep.id;
            return (
              <button
                key={ep.id}
                type="button"
                onClick={() => onSelectEpisode(ep)}
                className={`block w-full rounded-lg border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-violet-300/45 bg-violet-500/20"
                    : "border-violet-200/10 bg-violet-500/5 hover:bg-violet-500/10"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-medium text-violet-50">{episodeTitle(ep, lang)}</p>
                  <span className="shrink-0 text-[9px] text-violet-200/45">
                    {ep.historicalYear}
                    {ep.yearEnd ? `–${ep.yearEnd}` : ""}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-violet-100/55">
                  {episodeLocationName(ep, lang)}
                </p>
                <p className="mt-0.5 text-[9px] uppercase tracking-wider text-violet-200/35">
                  {LENS_LABEL[ep.lens]?.[en ? "en" : "ko"] ?? ep.lens}
                </p>
              </button>
            );
          })
        )}
      </div>

      <p className="border-t border-violet-200/10 px-3 py-2 text-[9px] leading-4 text-violet-100/40">
        {en
          ? "Coordinates mark representative battle/site points. Based on public records, described without distortion. No exhaustive V-Dem timeline is used."
          : "좌표는 교전·현장 대표점(경도·위도). 공개 기록 기반 · 왜곡 없이 서술. V-Dem 전수 연표는 사용하지 않음."}
      </p>
    </aside>
  );
}
