"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NatoPerimeterCrossEvent } from "@/lib/natoEasternPerimeter";

type Props = {
  cross: NatoPerimeterCrossEvent;
  lang: LabelLanguage;
  onDismiss?: () => void;
};

/**
 * 1차 접경 경보 — 속보 양피지 전 얇은 칩 (추적 중).
 */
export function NatoPerimeterAlertChip({ cross, lang, onDismiss }: Props) {
  const ko = lang !== "en";
  const country = ko ? cross.countryNameKo : cross.countryNameEn;
  const headline = ko
    ? "국경 경보 · 접경 교차 관측"
    : "Border alert · perimeter cross observed";
  const body = ko
    ? `${country} 영토·영공 방향 UAV/정찰 궤적 교차. 관측만 표시합니다.`
    : `UAV/recon track crossed toward ${country}. Observation only.`;

  return (
    <div
      className="pointer-events-auto fixed left-1/2 top-[max(0.65rem,env(safe-area-inset-top))] z-[805] w-[min(92vw,28rem)] -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2 rounded-md border border-rose-400/45 bg-[#1a080c]/92 px-3 py-2 shadow-[0_12px_36px_rgba(60,0,10,0.45)] backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold tracking-wide text-rose-100">{headline}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-rose-100/75">{body}</p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded border border-white/10 px-2 py-0.5 text-[10px] text-rose-100/70 hover:bg-white/5"
          >
            {ko ? "닫기" : "Dismiss"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
