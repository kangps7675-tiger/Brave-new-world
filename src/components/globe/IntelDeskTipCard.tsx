"use client";

import { INTEL_UX } from "@/lib/intelContract/uxCopy";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  lang: LabelLanguage;
  onDismiss: () => void;
  onOpenGuide?: () => void;
};

/**
 * 관측대 설명 카드 — 첫 방문 유저가 관측대를 처음 켤 때만 자동 표시.
 * 일반·재방문 유저에게는 뜨지 않는다 (등불뉴스와 정책이 다름).
 */
export function IntelDeskTipCard({ lang, onDismiss, onOpenGuide }: Props) {
  const en = lang === "en";
  const L = en ? "en" : "ko";

  return (
    <aside
      className="pointer-events-auto w-[min(20rem,88vw)] rounded-md border border-teal-400/45 bg-[#06141c]/95 px-3 py-2.5 shadow-xl backdrop-blur-sm"
      role="status"
      aria-live="polite"
      data-intel-desk-tip
    >
      <p className="text-micro font-semibold tracking-wide text-teal-100">
        {INTEL_UX.observeFirstTipTitle[L]}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-teal-100/85">
        {INTEL_UX.observeFirstTipBody[L]}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-sm border border-teal-300/40 bg-teal-800/50 px-2.5 py-1 text-[11px] font-medium text-teal-50 hover:bg-teal-700/60"
          onClick={onDismiss}
        >
          {INTEL_UX.observeFirstTipCta[L]}
        </button>
        {onOpenGuide ? (
          <button
            type="button"
            className="text-[11px] text-teal-200/80 underline underline-offset-2 hover:text-teal-50"
            onClick={onOpenGuide}
          >
            {en ? "Feature guide" : "기능 안내"}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
