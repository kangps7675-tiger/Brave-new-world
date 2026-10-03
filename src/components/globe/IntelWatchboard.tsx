"use client";

import { useState } from "react";
import { IntelGradeBadge } from "@/components/globe/IntelGradeBadge";
import type { WatchboardItem } from "@/lib/intelContract/buildObserveWatchboard";
import { INTEL_UX } from "@/lib/intelContract/uxCopy";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { TheaterSitrepRegionId } from "@/lib/theaterReport/types";

type Props = {
  lang: LabelLanguage;
  items: WatchboardItem[];
  onOpenSitrep: (region: TheaterSitrepRegionId) => void;
  onOpenAlert: (cesiumAlertId: string) => void;
  onDrill: (item: WatchboardItem) => void;
  /** 기능 안내 패널로 이어갈 때 */
  onOpenFullGuide?: () => void;
};

function kindLabel(kind: WatchboardItem["kind"], en: boolean): string {
  if (kind === "theater-sitrep") return en ? "Theater report" : "전황 보고서";
  if (kind === "maritime-alert") return en ? "Maritime alert" : "해상 경보";
  return en ? "Collecting" : "수집 중";
}

export function IntelWatchboard({
  lang,
  items,
  onOpenSitrep,
  onOpenAlert,
  onDrill,
  onOpenFullGuide,
}: Props) {
  const en = lang === "en";
  const L = en ? "en" : "ko";
  const [open, setOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const active = items.filter((i) => i.grade !== "hold");
  const held = items.filter((i) => i.grade === "hold");

  return (
    <section
      className="pointer-events-auto flex max-w-[min(22rem,84vw)] flex-col overflow-hidden rounded-md border border-teal-500/40 bg-[#041018]/92"
      aria-label={INTEL_UX.watchboardTitle[L]}
      data-intel-watchboard
    >
      <div
        className={`flex w-full items-start justify-between gap-2 px-2.5 py-1.5 text-teal-100/90 ${
          open ? "border-b border-teal-500/25" : ""
        }`}
      >
        <button
          type="button"
          className="min-w-0 flex-1 text-left transition hover:bg-teal-500/10"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flex items-center gap-1.5 text-micro font-medium tracking-wide">
            {INTEL_UX.watchboardTitle[L]}
            <span className="tabular-nums font-normal text-teal-200/70">
              {active.length}
              {held.length > 0
                ? en
                  ? ` · ${held.length} waiting`
                  : ` · 모으는 중 ${held.length}`
                : ""}
              <span aria-hidden>{open ? " ▾" : " ▴"}</span>
            </span>
          </span>
          {open ? (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-teal-200/55">
              {INTEL_UX.watchboardSubtitle[L]}
            </p>
          ) : null}
        </button>
        <button
          type="button"
          className="mt-0.5 shrink-0 rounded-sm border border-teal-400/35 px-1.5 py-0.5 text-[10px] text-teal-100/90 hover:bg-teal-500/15"
          aria-expanded={helpOpen}
          aria-controls="intel-watchboard-help"
          onClick={() => setHelpOpen((v) => !v)}
        >
          ?
        </button>
      </div>

      {helpOpen ? (
        <div
          id="intel-watchboard-help"
          className="space-y-1.5 border-b border-teal-500/25 bg-teal-950/40 px-2.5 py-2 text-[10px] leading-snug text-teal-100/85"
        >
          <p className="font-semibold text-teal-50">{INTEL_UX.helpTitle[L]}</p>
          <ul className="list-disc space-y-1 pl-3.5">
            {INTEL_UX.helpBody[L].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {onOpenFullGuide ? (
            <button
              type="button"
              className="mt-1 text-[10px] font-medium text-teal-200 underline underline-offset-2 hover:text-teal-50"
              onClick={onOpenFullGuide}
            >
              {en ? "Open full feature guide" : "전체 기능 안내 열기"}
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className={`min-h-0 overflow-hidden ${open ? "" : "pointer-events-none"}`}>
          {items.length === 0 ? (
            <p className="px-2.5 py-2 text-micro text-teal-200/55">
              {INTEL_UX.watchboardEmpty[L]}
            </p>
          ) : (
            <div className="intel-scroll-y max-h-72 overflow-y-auto">
              {active.length > 0 ? (
                <p className="px-2.5 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-teal-300/55">
                  {INTEL_UX.watchboardActiveHeader[L]}
                </p>
              ) : null}
              <ul>
                {active.map((item) => (
                  <WatchRow
                    key={item.id}
                    item={item}
                    en={en}
                    L={L}
                    tabbable={open}
                    onOpenSitrep={onOpenSitrep}
                    onOpenAlert={onOpenAlert}
                    onDrill={onDrill}
                  />
                ))}
              </ul>
              {held.length > 0 ? (
                <>
                  <p className="mt-1 border-t border-teal-500/20 px-2.5 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-stone-300/55">
                    {INTEL_UX.watchboardHoldHeader[L]}
                  </p>
                  <p className="px-2.5 pb-1 text-[10px] text-stone-400/70">
                    {INTEL_UX.watchboardHoldHint[L]}
                  </p>
                  <ul>
                    {held.map((item) => (
                      <WatchRow
                        key={item.id}
                        item={item}
                        en={en}
                        L={L}
                        tabbable={open}
                        muted
                        onOpenSitrep={onOpenSitrep}
                        onOpenAlert={onOpenAlert}
                        onDrill={onDrill}
                      />
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function WatchRow({
  item,
  en,
  L,
  tabbable,
  muted,
  onOpenSitrep,
  onOpenAlert,
  onDrill,
}: {
  item: WatchboardItem;
  en: boolean;
  L: "ko" | "en";
  tabbable: boolean;
  muted?: boolean;
  onOpenSitrep: (region: TheaterSitrepRegionId) => void;
  onOpenAlert: (cesiumAlertId: string) => void;
  onDrill: (item: WatchboardItem) => void;
}) {
  const title = en ? item.titleEn : item.titleKo;
  const sub = en ? item.subtitleEn : item.subtitleKo;
  return (
    <li
      className={`border-b border-teal-500/15 px-2.5 py-1.5 last:border-b-0 ${
        muted ? "opacity-80" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          tabIndex={tabbable ? 0 : -1}
          className="min-w-0 flex-1 rounded-sm text-left hover:bg-teal-500/10"
          title={INTEL_UX.openItemHint[L]}
          onClick={() => {
            if (item.sitrepRegion) onOpenSitrep(item.sitrepRegion);
            else if (item.cesiumAlertId) onOpenAlert(item.cesiumAlertId);
            else onDrill(item);
          }}
        >
          <div className="flex flex-wrap items-center gap-1">
            <IntelGradeBadge grade={item.grade} lang={en ? "en" : "ko"} />
            <span className="text-[10px] text-teal-300/55">
              {kindLabel(item.kind, en)}
            </span>
            {item.pirScore > 0 ? (
              <span className="text-[10px] text-teal-300/60">
                {INTEL_UX.pirLabel[L]} {(item.pirScore * 100).toFixed(0)}%
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-meta text-teal-50">{title}</p>
          {sub ? (
            <p className="mt-0.5 line-clamp-1 text-[10px] text-teal-200/45">{sub}</p>
          ) : null}
        </button>
        <button
          type="button"
          tabIndex={tabbable ? 0 : -1}
          className="shrink-0 rounded-sm border border-teal-400/30 px-1.5 py-0.5 text-[10px] text-teal-100/85 hover:bg-teal-500/15"
          title={en ? "See sources and grade reasons" : "출처와 등급 이유 보기"}
          onClick={() => onDrill(item)}
        >
          {INTEL_UX.drillButton[L]}
        </button>
      </div>
    </li>
  );
}
