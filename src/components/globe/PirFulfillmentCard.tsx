"use client";

import type { PirModalityStatus } from "@/lib/intelContract/pirRegistry";
import type { ObservationModality } from "@/lib/intelContract/types";
import { INTEL_UX } from "@/lib/intelContract/uxCopy";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  lang: LabelLanguage;
  status: PirModalityStatus;
  compact?: boolean;
};

function modLabel(m: ObservationModality, en: boolean): string {
  const row = INTEL_UX.modality[m];
  return en ? row.en : row.ko;
}

function chips(mods: ObservationModality[], en: boolean): string {
  if (mods.length === 0) return "—";
  return mods.map((m) => modLabel(m, en)).join(" · ");
}

/** PIR 필요 / 확보 / 빈칸 카드 */
export function PirFulfillmentCard({ lang, status, compact }: Props) {
  const en = lang === "en";
  const L = en ? "en" : "ko";
  const title = en ? status.pir.titleEn : status.pir.titleKo;
  const pct = Math.round(status.score * 100);

  return (
    <div
      className={`rounded-sm border border-teal-500/25 bg-teal-950/30 ${
        compact ? "px-1.5 py-1" : "px-2 py-1.5"
      }`}
      data-pir-fulfillment={status.pir.id}
    >
      <p className="line-clamp-1 text-[10px] font-medium text-teal-100/90">
        {INTEL_UX.pirLabel[L]} · {title}
        <span className="ml-1 tabular-nums text-teal-300/65">{pct}%</span>
      </p>
      <dl
        className={`mt-0.5 grid gap-x-2 text-[10px] leading-snug ${
          compact ? "grid-cols-1" : "grid-cols-1"
        }`}
      >
        <div className="flex gap-1 text-teal-200/70">
          <dt className="shrink-0 font-medium text-teal-300/55">
            {INTEL_UX.pirNeed[L]}
          </dt>
          <dd>{chips(status.required, en)}</dd>
        </div>
        <div className="flex gap-1 text-emerald-200/80">
          <dt className="shrink-0 font-medium text-emerald-300/55">
            {INTEL_UX.pirHave[L]}
          </dt>
          <dd>{chips(status.present, en)}</dd>
        </div>
        <div className="flex gap-1 text-amber-200/85">
          <dt className="shrink-0 font-medium text-amber-300/55">
            {INTEL_UX.pirMissing[L]}
          </dt>
          <dd>
            {status.missing.length === 0
              ? en
                ? "None"
                : "없음"
              : chips(status.missing, en)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
