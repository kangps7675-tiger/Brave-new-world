"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  displaySesDelta,
  displaySesScore,
  formatSesBriefingLead,
  formatSesTitle,
  SES,
  sesBand,
  sesBandLabel,
  sesMethodologyProseShort,
} from "@/lib/ses";
import type { SanctionsEvasionSnapshot } from "@/lib/sanctionsEvasionScore";
import { useSanctionsEvasionSnapshot } from "@/hooks/useSanctionsEvasionSnapshot";

type Props = {
  lang: LabelLanguage;
  onClose: () => void;
};

export function SanctionsEvasionPanel({ lang, onClose }: Props) {
  const { snapshot } = useSanctionsEvasionSnapshot();
  if (!snapshot) {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-[#120a04]/94 p-3 shadow-2xl backdrop-blur-md">
        <p className="text-meta text-amber-100/70">
          {lang === "en" ? "Computing intensity…" : "제재 회피 강도 집계 중…"}
        </p>
      </div>
    );
  }

  return <SanctionsEvasionPanelBody lang={lang} snapshot={snapshot} onClose={onClose} />;
}

function SanctionsEvasionPanelBody({
  lang,
  snapshot,
  onClose,
}: {
  lang: LabelLanguage;
  snapshot: SanctionsEvasionSnapshot;
  onClose: () => void;
}) {
  const ko = lang !== "en";
  const score = displaySesScore(snapshot.score) ?? 0;
  const band = sesBandLabel(sesBand(snapshot.score), ko);
  const delta = displaySesDelta(snapshot.deltaScore);
  const lead = formatSesBriefingLead(snapshot, ko ? "ko" : "en");

  return (
    <div
      className="pointer-events-auto flex max-h-[min(52vh,28rem)] flex-col overflow-hidden rounded-xl border border-amber-400/30 bg-[#120a04]/94 shadow-2xl backdrop-blur-md"
      role="dialog"
      aria-label={formatSesTitle(ko)}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <p className="min-w-0 truncate text-meta font-semibold text-amber-100">
          {formatSesTitle(ko)}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={ko ? "제재 회피 강도 패널 닫기" : "Close sanctions evasion intensity panel"}
          className="tap-target flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-500/60 bg-slate-950/90 text-sm text-slate-200 transition hover:border-slate-300 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="intel-scroll-y min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
        <div className="rounded-lg border border-amber-500/25 bg-gradient-to-br from-amber-950/40 via-slate-950/60 to-slate-950/80 p-3">
          <p className="text-micro font-semibold uppercase tracking-[0.18em] text-amber-300/80">
            {formatSesTitle(ko)}
          </p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="text-3xl font-black tabular-nums tracking-tight text-amber-50">
              {score}
              <span className="text-lg font-semibold opacity-60">/100</span>
            </p>
            <p className="text-right text-meta text-amber-200/90">{band}</p>
          </div>
          {delta != null ? (
            <p className="mt-1 text-meta text-slate-400">
              {ko ? "직전 기록 대비 " : "vs prior "}
              <span className={delta > 0 ? "text-amber-300" : "text-emerald-300"}>
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            </p>
          ) : null}
          <p className="mt-2 text-body leading-relaxed text-slate-300/90">{lead}</p>
        </div>

        <p className="mt-3 text-meta leading-relaxed text-slate-400">
          {sesMethodologyProseShort(ko)}
        </p>
        <p className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/8 px-2 py-1.5 text-micro text-amber-200/85">
          {ko ? SES.ethicsKo : SES.ethicsEn}
        </p>

        <div className="mt-3">
          <p className="text-micro font-semibold uppercase tracking-wider text-slate-500">
            {ko ? "상위 회랑 신호" : "Top corridor signals"}
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {snapshot.topDrivers.map((d) => (
              <li
                key={d.corridorId}
                className="rounded-md border border-white/8 bg-black/25 px-2 py-1.5"
              >
                <p className="text-meta font-medium text-amber-50/95">
                  {ko ? d.nameKo : d.nameEn}
                </p>
                <p className="text-micro text-slate-400">
                  {ko ? "강도" : "Intensity"}{" "}
                  {Math.round(d.intensity * 100)}
                  {d.status ? ` · ${d.status}` : ""}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-micro text-slate-500">
            {ko
              ? `sanctions-evasion 회랑 ${snapshot.corridorCount}건 · 데이터 ${snapshot.generatedAt.slice(0, 10)}`
              : `${snapshot.corridorCount} sanctions-evasion corridors · data ${snapshot.generatedAt.slice(0, 10)}`}
          </p>
        </div>
      </div>
    </div>
  );
}
