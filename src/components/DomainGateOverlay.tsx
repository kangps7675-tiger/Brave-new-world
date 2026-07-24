"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { brandName } from "@/lib/brand";
import { t } from "@/lib/uiStrings";
import type { ViewerMode } from "@/lib/viewerChrome";
import { loadPerfPrefs, savePerfPrefs } from "@/lib/ultraLiteMode";

type DomainGateOverlayProps = {
  onSelect: (mode: ViewerMode, ultraLite: boolean) => void;
  /** 선택 진입 — 환영 편지 (기본 플로우에서는 건너뜀) */
  onOpenLetter?: () => void;
  /** 선택 진입 — 성능·사운드 주의 안내 */
  onOpenCaution?: () => void;
};

export function DomainGateOverlay({ onSelect, onOpenLetter, onOpenCaution }: DomainGateOverlayProps) {
  const { lang } = useLocale();
  const [ultraLite, setUltraLite] = useState(false);

  useEffect(() => {
    setUltraLite(loadPerfPrefs().ultraLite);
  }, []);

  const toggleUltraLite = () => {
    setUltraLite((current) => {
      const next = !current;
      savePerfPrefs({ ultraLite: next });
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-[#02040a]/95 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="domain-gate-title"
    >
      <div className="my-auto w-full max-w-2xl rounded-2xl border border-sky-400/20 bg-[#0a1428]/95 p-6 shadow-2xl sm:p-8">
        <p className="text-center text-[11px] font-medium tracking-[0.28em] text-sky-200/70 sm:tracking-[0.36em]">
          {brandName(lang)}
        </p>
        <h1
          id="domain-gate-title"
          className="mt-2 text-center text-xl font-semibold text-slate-50 sm:text-2xl"
        >
          {t("domainGateTitle", lang)}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">{t("domainGateSubtitle", lang)}</p>

        <div className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/[0.07] px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-amber-50">{t("domainUltraLiteLabel", lang)}</span>
            <button
              type="button"
              role="switch"
              aria-checked={ultraLite}
              aria-label={t("domainUltraLiteLabel", lang)}
              onClick={toggleUltraLite}
              className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                ultraLite
                  ? "border-amber-300/55 bg-amber-400/85"
                  : "border-slate-600 bg-slate-800/90"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  ultraLite ? "left-6" : "left-0.5"
                }`}
              />
            </button>
          </div>
          <p className="mt-2.5 text-[13px] font-medium leading-snug text-amber-100/95">
            {t("domainUltraLiteHook", lang)}
          </p>
          <p className="mt-1.5 text-[11px] text-amber-200/55">
            {ultraLite ? t("domainUltraLiteOnHint", lang) : t("domainUltraLiteOffHint", lang)}
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelect("conflict", ultraLite)}
            className="flex flex-col rounded-2xl border border-orange-400/35 bg-orange-500/10 px-5 py-8 text-left transition hover:border-orange-300/55 hover:bg-orange-500/15"
          >
            <span className="text-lg font-semibold text-orange-50">{t("domainConflictTitle", lang)}</span>
            <span className="mt-3 text-sm leading-relaxed text-orange-100/75">
              {t("domainConflictHint", lang)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onSelect("economy", ultraLite)}
            className="flex flex-col rounded-2xl border border-emerald-400/35 bg-emerald-500/10 px-5 py-8 text-left transition hover:border-emerald-300/55 hover:bg-emerald-500/15"
          >
            <span className="text-lg font-semibold text-emerald-50">{t("domainEconomyTitle", lang)}</span>
            <span className="mt-3 text-sm leading-relaxed text-emerald-100/75">
              {t("domainEconomyHint", lang)}
            </span>
          </button>
        </div>

        {(onOpenLetter || onOpenCaution) ? (
          <div className="mt-5 flex items-center justify-center gap-5 text-[12px] text-slate-500">
            {onOpenLetter ? (
              <button
                type="button"
                onClick={onOpenLetter}
                className="underline decoration-slate-600 underline-offset-4 transition hover:text-slate-300"
              >
                {lang === "en" ? "Read the welcome letter" : "환영 편지 읽기"}
              </button>
            ) : null}
            {onOpenCaution ? (
              <button
                type="button"
                onClick={onOpenCaution}
                className="underline decoration-slate-600 underline-offset-4 transition hover:text-slate-300"
              >
                {lang === "en" ? "Performance & sound notes" : "성능·사운드 안내"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
