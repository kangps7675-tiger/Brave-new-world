"use client";

import {
  axisRelationKindBlurb,
  axisRelationKindLabel,
  type AxisRelationKind,
} from "@/data/axisNetwork";
import { corridorStatusLabel } from "@/data/strategicCorridors";
import type { SelectedAxisLink } from "@/lib/axisLinkSelection";
import { SIPRI_ARMS_LENS_ENABLED } from "@/lib/licensing/sipriPolicy";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { zc } from "@/lib/uiStack";

type AxisLinkChipProps = {
  link: SelectedAxisLink;
  lang?: LabelLanguage;
  onDismiss: () => void;
  onHubBrief: () => void;
  onArms: () => void;
  onNews: () => void;
  onHighlightArmsDeals: () => void;
};

function bodyFor(link: SelectedAxisLink, lang: "ko" | "en"): string {
  if (link.corridorStatus === "under-construction") {
    return lang === "en"
      ? "Mapped corridor still under construction — shown without completion glint."
      : "실측 회랑이지만 아직 건설중 — 완공 글린트 없이 표시합니다.";
  }
  if (link.mode === "arms" && SIPRI_ARMS_LENS_ENABLED) {
    return lang === "en"
      ? "Dashed arc · registered conventional transfer summary between axis partners."
      : "점선 · 축 파트너 사이 등록된 재래식 이전 요약입니다.";
  }
  if (link.relationKind) {
    return axisRelationKindBlurb(link.relationKind, lang);
  }
  return lang === "en"
    ? "Dashed arc linking CRINK hubs and partners."
    : "CRINK 허브·파트너를 잇는 점선입니다.";
}

function primaryCta(
  kind: AxisRelationKind | null,
  mode: "network" | "arms",
): "hub" | "arms" | "news" | "deals" {
  if (SIPRI_ARMS_LENS_ENABLED) {
    if (mode === "arms") return "deals";
    if (kind === "arms") return "arms";
  }
  if (kind === "hybrid") return "news";
  return "hub";
}

export function AxisLinkChip({
  link,
  lang = "ko",
  onDismiss,
  onHubBrief,
  onArms,
  onNews,
  onHighlightArmsDeals,
}: AxisLinkChipProps) {
  const en = lang === "en";
  const langKey = en ? "en" : "ko";
  const kindLabel = link.relationKind
    ? axisRelationKindLabel(link.relationKind, langKey)
    : null;
  const statusLabel = corridorStatusLabel(link.corridorStatus, langKey);
  const pair = `${link.fromName} ↔ ${link.toName}`;
  const primary = primaryCta(link.relationKind, link.mode);

  const armsMeta = [
    link.category,
    link.tiv != null ? `TIV ${link.tiv}` : null,
    link.count != null ? (en ? `${link.count} deals` : `${link.count}건`) : null,
    link.years,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside
      id="axis-link-chip"
      className={`pointer-events-auto absolute right-3 top-20 ${zc("panel")} w-[min(92vw,300px)] overflow-hidden rounded-xl border border-violet-300/25 bg-[#120e18]/92 shadow-2xl backdrop-blur-xl`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-violet-200/10 px-3 py-2">
        <div className="min-w-0">
          <p className="text-micro uppercase tracking-[0.18em] text-violet-200/50">
            {en ? "Axis link" : "축 관계망"}
          </p>
          <h2 className="mt-0.5 truncate text-sm font-medium text-violet-50">
            {link.mode === "arms" && link.fromName && link.toName
              ? `${link.fromName} → ${link.toName}`
              : link.label}
          </h2>
          <p className="mt-0.5 text-micro text-violet-100/55">
            {[kindLabel, statusLabel, pair].filter(Boolean).join(" · ")}
          </p>
          {armsMeta ? (
            <p className="mt-0.5 text-micro text-orange-200/55">{armsMeta}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="tap-target flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-full text-xs text-violet-100/50 transition hover:bg-white/5 hover:text-violet-50"
          aria-label={en ? "Dismiss" : "닫기"}
        >
          ✕
        </button>
      </div>

      <p className="px-3 py-2 text-xs leading-snug text-violet-100/70">
        {bodyFor(link, langKey)}
      </p>

      <div className="flex flex-wrap gap-1.5 border-t border-violet-200/10 px-3 py-2">
        {primary === "deals" ? (
          <button
            type="button"
            onClick={onHighlightArmsDeals}
            className="rounded-md border border-orange-300/30 bg-orange-500/15 px-2.5 py-1.5 text-micro text-orange-50 transition hover:bg-orange-500/25"
          >
            {en ? "Show in arms list" : "딜 목록에서 보기"}
          </button>
        ) : null}
        {primary === "arms" ? (
          <button
            type="button"
            onClick={onArms}
            className="rounded-md border border-orange-300/30 bg-orange-500/15 px-2.5 py-1.5 text-micro text-orange-50 transition hover:bg-orange-500/25"
          >
            {en ? "Arms transfers" : "무기이전"}
          </button>
        ) : null}
        {primary === "hub" || primary === "news" ? (
          <button
            type="button"
            onClick={primary === "hub" ? onHubBrief : onNews}
            className="rounded-md border border-violet-300/30 bg-violet-500/15 px-2.5 py-1.5 text-micro text-violet-50 transition hover:bg-violet-500/25"
          >
            {primary === "hub"
              ? en
                ? "Hub brief"
                : "허브 브리프"
              : en
                ? "Related news"
                : "관련 소식"}
          </button>
        ) : null}
        {primary !== "hub" ? (
          <button
            type="button"
            onClick={onHubBrief}
            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-micro text-violet-100/80 transition hover:bg-white/10"
          >
            {en ? "Open hub" : "허브로 보기"}
          </button>
        ) : null}
        {primary !== "news" && primary !== "deals" ? (
          <button
            type="button"
            onClick={onNews}
            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-micro text-violet-100/80 transition hover:bg-white/10"
          >
            {en ? "Related news" : "관련 소식"}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
