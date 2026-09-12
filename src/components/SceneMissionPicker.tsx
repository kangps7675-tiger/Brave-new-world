"use client";

import { useDialog } from "@/hooks/useDialog";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  SCENE_MISSION_CARDS,
  type SceneMissionId,
} from "@/lib/sceneMissions";
import { t } from "@/lib/uiStrings";
import type { HotTheaterFocus } from "@/lib/hotTheaterLayers";

type SceneMissionPickerProps = {
  lang: LabelLanguage;
  /** 오늘의 전선 카드에 표시할 핫존 라벨 (없으면 기본 힌트) */
  hotFocus: HotTheaterFocus | null;
  onSelect: (id: SceneMissionId) => void;
  onDismiss: () => void;
};

/**
 * Nullschool식 전역뷰 위 — 장면 4장. GEV first-run 카드와 같은 역할.
 */
export function SceneMissionPicker({
  lang,
  hotFocus,
  onSelect,
  onDismiss,
}: SceneMissionPickerProps) {
  const en = lang === "en";
  const dialogRef = useDialog<HTMLDivElement>({
    open: true,
    onClose: onDismiss,
    trapFocus: true,
  });

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="pointer-events-auto fixed inset-0 z-[820] flex items-end justify-center bg-[#02040a]/55 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scene-mission-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-sky-400/25 bg-[#0a1428]/95 shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
        <div className="border-b border-sky-400/20 px-5 py-4">
          <p className="text-meta font-medium uppercase tracking-[0.18em] text-sky-200/70">
            {t("sceneMissionEyebrow", lang)}
          </p>
          <h2
            id="scene-mission-title"
            className="mt-1 text-lg font-semibold text-slate-50 sm:text-xl"
          >
            {t("sceneMissionTitle", lang)}
          </h2>
          <p className="mt-1 text-caption text-slate-400">
            {t("sceneMissionSubtitle", lang)}
          </p>
        </div>
        <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4">
          {SCENE_MISSION_CARDS.map((card) => {
            const title = en ? card.titleEn : card.titleKo;
            let hint = en ? card.hintEn : card.hintKo;
            if (card.id === "frontline" && hotFocus) {
              hint = en ? hotFocus.labelEn : hotFocus.labelKo;
            }
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelect(card.id)}
                className="flex flex-col rounded-xl border border-sky-400/20 bg-sky-500/[0.06] px-4 py-3.5 text-left transition hover:border-sky-300/45 hover:bg-sky-500/15"
              >
                <span className="text-sm font-semibold text-sky-50">{title}</span>
                <span className="mt-1.5 text-caption leading-snug text-sky-100/65">{hint}</span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end border-t border-white/5 px-4 py-3">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md px-3 py-1.5 text-caption text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            {t("close", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

type ReturnToGlobeChipProps = {
  lang: LabelLanguage;
  onClick: () => void;
};

export function ReturnToGlobeChip({ lang, onClick }: ReturnToGlobeChipProps) {
  return (
    <div className="pointer-events-auto fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[750] -translate-x-1/2">
      <button
        type="button"
        onClick={onClick}
        className="rounded-full border border-sky-300/40 bg-[#0a1428]/92 px-4 py-2 text-caption font-semibold tracking-wide text-sky-50 shadow-lg backdrop-blur-md hover:border-sky-200/60 hover:bg-sky-500/20"
      >
        {t("returnToGlobe", lang)}
      </button>
    </div>
  );
}
