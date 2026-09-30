"use client";

import { brandName } from "@/lib/brand";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { useDialog } from "@/hooks/useDialog";
import { t } from "@/lib/uiStrings";
import { zc } from "@/lib/uiStack";

/** 언어 직후 목적(Job) — ViewerMode id와 맞추되 ask/browse는 별도 */
export type PurposeJobId = "conflict" | "satellite" | "economy" | "ask" | "browse";

type PurposeJobOverlayProps = {
  lang: LabelLanguage;
  onSelect: (job: PurposeJobId) => void;
  /** 메뉴에서 다시 연 경우 — 닫기(X) 허용 */
  allowDismiss?: boolean;
  onDismiss?: () => void;
};

const JOBS: Array<{
  id: Exclude<PurposeJobId, "browse">;
  icon: string;
  titleKey: "purposeJobConflict" | "purposeJobSatellite" | "purposeJobEconomy" | "purposeJobAsk";
  hintKey:
    | "purposeJobConflictHint"
    | "purposeJobSatelliteHint"
    | "purposeJobEconomyHint"
    | "purposeJobAskHint";
}> = [
  {
    id: "conflict",
    icon: "⚔",
    titleKey: "purposeJobConflict",
    hintKey: "purposeJobConflictHint",
  },
  {
    id: "satellite",
    icon: "🛰",
    titleKey: "purposeJobSatellite",
    hintKey: "purposeJobSatelliteHint",
  },
  {
    id: "economy",
    icon: "📈",
    titleKey: "purposeJobEconomy",
    hintKey: "purposeJobEconomyHint",
  },
  {
    id: "ask",
    icon: "💬",
    titleKey: "purposeJobAsk",
    hintKey: "purposeJobAskHint",
  },
];

/**
 * LanguageGate 직후 — 「무엇을 볼까요」목적 카드.
 * 패키지/모드 피커가 아니라 유저 Jobs 문장.
 */
export function PurposeJobOverlay({
  lang,
  onSelect,
  allowDismiss = false,
  onDismiss,
}: PurposeJobOverlayProps) {
  const dialogRef = useDialog<HTMLDivElement>({
    open: true,
    closeOnEscape: allowDismiss,
    onClose: allowDismiss ? onDismiss : undefined,
  });

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className={`fixed inset-0 ${zc("gate")} flex items-center justify-center overflow-y-auto bg-[#02040a]/92 p-4 backdrop-blur-sm outline-none`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="purpose-job-title"
    >
      <div className="relative my-auto w-full max-w-lg rounded-2xl border border-sky-400/20 bg-[#0a1428]/95 p-5 shadow-2xl sm:p-7">
        {allowDismiss && onDismiss ? (
          <button
            type="button"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200"
            aria-label={lang === "en" ? "Close" : "닫기"}
            onClick={onDismiss}
          >
            ×
          </button>
        ) : null}

        <p className="text-left text-meta font-medium tracking-[0.28em] text-sky-200/60">
          {brandName(lang)}
        </p>
        <h1
          id="purpose-job-title"
          className="mt-3 text-left text-xl font-semibold text-slate-50 sm:text-2xl"
        >
          {t("purposeJobTitle", lang)}
        </h1>
        <p className="mt-1.5 text-left text-sm text-slate-400">
          {t("purposeJobSubtitle", lang)}
        </p>

        {/* LTR: 전선 → 3D → 시장 → 묻기 (grid는 좌→우·위→아래) */}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {JOBS.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => onSelect(job.id)}
              className="flex flex-col items-start gap-1 rounded-xl border border-sky-300/15 bg-white/[0.03] px-3.5 py-3 text-left transition hover:border-sky-300/35 hover:bg-sky-400/10"
            >
              <span className="text-lg" aria-hidden>
                {job.icon}
              </span>
              <span className="text-sm font-semibold text-slate-50">
                {t(job.titleKey, lang)}
              </span>
              <span className="text-caption leading-snug text-slate-400">
                {t(job.hintKey, lang)}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onSelect("browse")}
          className="mt-4 w-full rounded-xl border border-transparent py-2.5 text-left text-sm text-slate-400 transition hover:border-white/10 hover:bg-white/[0.03] hover:text-slate-200 sm:text-center"
        >
          {t("purposeJobBrowse", lang)}
        </button>
      </div>
    </div>
  );
}
