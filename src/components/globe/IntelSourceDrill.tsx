"use client";

import { IntelGradeBadge } from "@/components/globe/IntelGradeBadge";
import { summarizeGate } from "@/lib/intelContract/gate";
import type { GateResult, ObservationModality } from "@/lib/intelContract/types";
import { INTEL_UX } from "@/lib/intelContract/uxCopy";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  lang: LabelLanguage;
  gate: GateResult | null;
  onClose: () => void;
};

function modalityLabel(m: ObservationModality, en: boolean): string {
  const row = INTEL_UX.modality[m];
  return en ? row.en : row.ko;
}

export function IntelSourceDrill({ lang, gate, onClose }: Props) {
  const en = lang === "en";
  const L = en ? "en" : "ko";
  if (!gate) return null;

  const { bundle } = gate;
  const title = en ? bundle.titleEn : bundle.titleKo;
  const claim = en ? bundle.claimEn : bundle.claimKo;
  const summary = summarizeGate(gate, L);

  return (
    <aside
      className="pointer-events-auto flex max-h-[min(70vh,34rem)] w-[min(22rem,92vw)] flex-col overflow-hidden rounded-md border border-teal-500/35 bg-[#071018]/94 shadow-xl backdrop-blur-sm"
      role="dialog"
      aria-label={INTEL_UX.drillTitle[L]}
      data-intel-source-drill
    >
      <header className="flex items-start justify-between gap-2 border-b border-teal-500/25 px-3 py-2">
        <div className="min-w-0">
          <p className="text-micro tracking-wide text-teal-200/70">
            {INTEL_UX.drillTitle[L]}
          </p>
          <h2 className="mt-0.5 line-clamp-2 text-meta font-semibold text-teal-50">
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <IntelGradeBadge grade={gate.grade} lang={lang} />
          <button
            type="button"
            className="rounded-sm border border-white/20 px-1.5 py-0.5 text-micro text-white/80"
            onClick={onClose}
            aria-label={en ? "Close" : "닫기"}
          >
            ×
          </button>
        </div>
      </header>

      <div className="intel-scroll-y min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2 text-micro text-teal-100/90">
        <p className="rounded-sm border border-teal-500/20 bg-teal-950/35 px-2 py-1.5 text-[10px] leading-snug text-teal-100/75">
          {en
            ? "This panel shows why the item was graded — not a prediction or secret brief."
            : "등급이 나온 이유를 풀어 보여 줍니다. 예측이나 비밀 브리핑이 아닙니다."}
        </p>

        {claim ? (
          <section>
            <p className="font-semibold text-teal-200/80">
              {INTEL_UX.drillClaim[L]}
            </p>
            <p className="mt-0.5 leading-snug">{claim}</p>
          </section>
        ) : null}

        <section>
          <p className="font-semibold text-teal-200/80">
            {INTEL_UX.drillHow[L]}
          </p>
          <p className="mt-1 text-teal-100/80">
            {INTEL_UX.drillIndependence[L](
              bundle.independenceCount,
              bundle.modalityCount,
            )}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-teal-100/50">
            {bundle.method}
          </p>
        </section>

        <section>
          <p className="font-semibold text-teal-200/80">
            {INTEL_UX.drillReasons[L]}
          </p>
          <p className="mt-0.5 text-teal-100/75">{summary}</p>
          <ul className="mt-1.5 space-y-1">
            {gate.reasons.map((r) => (
              <li
                key={`${r.code}:${r.detailKo}`}
                className={r.ok ? "text-emerald-200/85" : "text-amber-200/90"}
              >
                <span className="font-medium">
                  {r.ok ? (en ? "OK" : "통과") : en ? "Note" : "주의"}
                </span>
                {" · "}
                {en ? r.detailEn : r.detailKo}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="font-semibold text-teal-200/80">
            {INTEL_UX.drillSources[L]}
          </p>
          <ul className="mt-1 space-y-1.5">
            {bundle.observations.slice(0, 12).map((o) => (
              <li key={o.id} className="leading-snug">
                <span className="text-teal-300/70">
                  [{modalityLabel(o.modality, en)}]
                </span>{" "}
                {o.label || o.sourceKey}
                {o.url ? (
                  <>
                    {" · "}
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-teal-400/40 underline-offset-2"
                    >
                      {en ? "open source" : "원문 보기"}
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {bundle.killCriteria.length > 0 ? (
          <section>
            <p className="font-semibold text-teal-200/80">
              {INTEL_UX.drillKill[L]}
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {bundle.killCriteria.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {bundle.altHypothesis ? (
          <section>
            <p className="font-semibold text-teal-200/80">
              {INTEL_UX.drillAlt[L]}
            </p>
            <p className="mt-0.5">
              {en ? bundle.altHypothesis.labelEn : bundle.altHypothesis.labelKo}
            </p>
          </section>
        ) : null}

        <p className="border-t border-teal-500/20 pt-2 text-[10px] text-teal-200/55">
          {INTEL_UX.drillFoot[L]}
        </p>
      </div>
    </aside>
  );
}
