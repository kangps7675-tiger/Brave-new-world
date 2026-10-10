"use client";

import { IntelGradeBadge } from "@/components/globe/IntelGradeBadge";
import { PirFulfillmentCard } from "@/components/globe/PirFulfillmentCard";
import type { PirModalityStatus } from "@/lib/intelContract/pirRegistry";
import type { GateResult, ObservationModality } from "@/lib/intelContract/types";
import { INTEL_UX } from "@/lib/intelContract/uxCopy";
import { whyPublishLines } from "@/lib/intelContract/whyPublish";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  lang: LabelLanguage;
  gate: GateResult | null;
  pirStatuses?: PirModalityStatus[];
  onClose: () => void;
};

function modalityLabel(m: ObservationModality, en: boolean): string {
  const row = INTEL_UX.modality[m];
  return en ? row.en : row.ko;
}

/** 게이트 코드 대신, 유저가 읽을 짧은 주의/신뢰 문장 */
function reasonLine(
  r: GateResult["reasons"][number],
  en: boolean,
): string {
  const detail = en ? r.detailEn : r.detailKo;
  if (r.ok) {
    return en ? `Looks solid: ${detail}` : `괜찮은 점: ${detail}`;
  }
  return en ? `Keep in mind: ${detail}` : `참고: ${detail}`;
}

export function IntelSourceDrill({
  lang,
  gate,
  pirStatuses = [],
  onClose,
}: Props) {
  const en = lang === "en";
  const L = en ? "en" : "ko";
  if (!gate) return null;

  const { bundle } = gate;
  const title = en ? bundle.titleEn : bundle.titleKo;
  const claim = en ? bundle.claimEn : bundle.claimKo;
  const why = whyPublishLines(gate, pirStatuses, L);
  const topPir = pirStatuses[0] ?? null;
  const softReasons = gate.reasons.filter((r) => !r.ok).slice(0, 4);
  const okCount = gate.reasons.filter((r) => r.ok).length;

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
        <p className="rounded-sm border border-teal-500/20 bg-teal-950/35 px-2 py-1.5 text-micro leading-snug text-teal-100/75">
          {en
            ? "Why this item is worth a look on the map — and how sure you can be. Not a forecast."
            : "지도에서 왜 눈에 띄는지, 얼마나 믿을지 짧게 정리합니다. 예측이 아닙니다."}
        </p>

        <section>
          <p className="font-semibold text-teal-200/80">
            {INTEL_UX.drillWhyHeader[L]}
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-4 text-micro leading-snug text-teal-100/85">
            {why.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </section>

        {topPir ? <PirFulfillmentCard lang={lang} status={topPir} /> : null}

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
          {okCount > 0 ? (
            <p className="mt-0.5 text-teal-100/65">
              {en
                ? `${okCount} check(s) lined up with open sources.`
                : `공개 출처 기준 ${okCount}가지가 맞아떨어집니다.`}
            </p>
          ) : null}
        </section>

        {softReasons.length > 0 ? (
          <section>
            <p className="font-semibold text-teal-200/80">
              {INTEL_UX.drillReasons[L]}
            </p>
            <ul className="mt-1.5 space-y-1">
              {softReasons.map((r) => (
                <li
                  key={`${r.code}:${r.detailKo}`}
                  className="text-amber-200/90"
                >
                  {reasonLine(r, en)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

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

        <p className="border-t border-teal-500/20 pt-2 text-micro text-teal-200/55">
          {INTEL_UX.drillFoot[L]}
        </p>
      </div>
    </aside>
  );
}
