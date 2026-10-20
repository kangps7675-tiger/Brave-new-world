"use client";

import { useEffect, useRef } from "react";
import type { AxisHubId } from "@/data/axisNetwork";
import { hubById } from "@/data/hubNav";
import type { AxisArmsDeal } from "@/lib/axisArmsPaths";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  armsCategoryLabel,
  armsCitationLabel,
  armsCountryName,
  armsDescriptionLabel,
  armsPanelEmpty,
  armsPanelHeader,
  armsPanelTitle,
} from "@/lib/axisArmsI18n";
import { PanelSkeletonLines } from "@/components/PanelSkeletons";

type AxisArmsPanelProps = {
  hubId: AxisHubId;
  deals: AxisArmsDeal[];
  citation?: string;
  lang?: LabelLanguage;
  /** supplier/recipient ISO 쌍 — 목록에서 강조 */
  highlightPair?: { a: string; b: string } | null;
  /** 데이터 로드 중 — 레이아웃 스켈레톤 (P3-3) */
  loading?: boolean;
  onClose: () => void;
};

function pairMatch(
  d: AxisArmsDeal,
  pair: { a: string; b: string } | null | undefined,
): boolean {
  if (!pair) return false;
  const { a, b } = pair;
  return (
    (d.supplier === a && d.recipient === b) ||
    (d.supplier === b && d.recipient === a)
  );
}

export function AxisArmsPanel({
  hubId,
  deals,
  citation,
  lang = "ko",
  highlightPair = null,
  loading = false,
  onClose,
}: AxisArmsPanelProps) {
  const hub = hubById(hubId);
  const hubLabel = hub?.label ?? armsCountryName(hubId, lang);
  const citationText = armsCitationLabel(citation, lang);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  let highlightAssigned = false;

  useEffect(() => {
    if (!highlightPair) return;
    highlightRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightPair, hubId]);

  return (
    <aside className="pointer-events-auto absolute right-3 top-20 z-[600] flex max-h-[min(70vh,520px)] w-[min(92vw,320px)] flex-col overflow-hidden rounded-2xl border border-orange-300/20 bg-[#140f0a]/92 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-2 border-b border-orange-200/10 px-3 py-2.5">
        <div className="min-w-0">
          <nav
            aria-label={lang === "en" ? "Breadcrumb" : "경로"}
            className="flex flex-wrap items-center gap-1 text-micro uppercase tracking-[0.16em] text-orange-200/55"
          >
            <button
              type="button"
              onClick={onClose}
              className="truncate transition hover:text-orange-100"
            >
              {hubLabel}
            </button>
            <span aria-hidden>›</span>
            <span className="truncate text-orange-100/70">{armsPanelHeader(lang)}</span>
            <span aria-hidden>›</span>
            <span className="truncate text-orange-50/85">
              {lang === "en" ? "SIPRI detail" : "SIPRI 상세"}
            </span>
          </nav>
          <h2 className="mt-1 text-sm font-medium text-orange-50">
            {armsPanelTitle(hubLabel, lang)}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="tap-target flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-2 py-0.5 text-xs text-orange-100/50 transition hover:bg-white/5 hover:text-orange-50"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {loading && deals.length === 0 ? (
          <PanelSkeletonLines rows={5} />
        ) : deals.length === 0 ? (
          <p className="px-2 py-4 text-xs text-orange-100/45">{armsPanelEmpty(lang)}</p>
        ) : (
          deals.slice(0, 40).map((d, i) => {
            const desc = armsDescriptionLabel(d.description, lang);
            const highlighted = pairMatch(d, highlightPair);
            const attachRef = highlighted && !highlightAssigned;
            if (attachRef) highlightAssigned = true;
            return (
              <div
                key={`${d.supplier}-${d.recipient}-${d.designation}-${d.year}-${i}`}
                ref={attachRef ? highlightRef : undefined}
                className={
                  highlighted
                    ? "rounded-lg border border-orange-300/45 bg-orange-500/20 px-2.5 py-2 ring-1 ring-orange-300/30"
                    : "rounded-lg border border-orange-200/10 bg-orange-500/5 px-2.5 py-2"
                }
              >
                <p className="text-meta text-orange-50/95">
                  {armsCountryName(d.supplier, lang)} → {armsCountryName(d.recipient, lang)}
                  {d.year ? ` · ${d.year}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-orange-100/85">
                  {d.designation}
                  {desc ? ` · ${desc}` : ""}
                </p>
                <p className="mt-1 text-micro text-orange-200/45">
                  {armsCategoryLabel(d.category, lang)}
                  {typeof d.tiv === "number" ? ` · TIV ${d.tiv}` : ""}
                </p>
              </div>
            );
          })
        )}
      </div>
      {citationText ? (
        <p className="border-t border-orange-200/10 px-3 py-2 text-micro leading-4 text-orange-100/40">
          {citationText}
        </p>
      ) : null}
    </aside>
  );
}
