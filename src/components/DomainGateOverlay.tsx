"use client";

import { useEffect, useState } from "react";
import { useDialog } from "@/hooks/useDialog";
import { zc } from "@/lib/uiStack";
import { useLocale } from "@/contexts/LocaleContext";
import { brandName } from "@/lib/brand";
import { t } from "@/lib/uiStrings";
import type { ViewerMode } from "@/lib/viewerChrome";
import { loadPerfPrefs, savePerfPrefs } from "@/lib/ultraLiteMode";

type DomainGateOverlayProps = {
  onSelect: (mode: ViewerMode, ultraLite: boolean) => void;
  /** 선택 진입 — 환영 편지/메시지 다시 읽기 */
  onOpenLetter?: () => void;
  /** 데이터 출처·한계 양피지 다시 읽기 */
  onOpenSources?: () => void;
  /** 선택 진입 — 주의 화면 다시 보기 */
  onOpenCaution?: () => void;
  /** compact면 짧은 welcome 재열기 라벨 사용 */
  letterLinkCompact?: boolean;
};

export function DomainGateOverlay({
  onSelect,
  onOpenLetter,
  onOpenSources,
  onOpenCaution,
  letterLinkCompact = false,
}: DomainGateOverlayProps) {
  const { lang } = useLocale();
  const [ultraLite, setUltraLite] = useState(false);
  /**
   * 도메인 선택은 **반드시 골라야** 통과하는 게이트다.
   * Escape로 닫으면 아무 모드도 안 정해진 상태가 되므로 closeOnEscape=false.
   * 대신 포커스 트랩·초기 포커스는 적용해 키보드로 조작할 수 있게 한다.
   */
  const dialogRef = useDialog<HTMLDivElement>({ open: true, closeOnEscape: false });

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
      ref={dialogRef}
      tabIndex={-1}
      className={`fixed inset-0 ${zc("gate")} flex items-center justify-center overflow-y-auto bg-[#02040a]/95 p-4 outline-none backdrop-blur-sm`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="domain-gate-title"
    >
      <div className="my-auto w-full max-w-2xl rounded-2xl border border-sky-400/20 bg-[#0a1428]/95 p-6 shadow-2xl sm:p-8">
        <p className="text-center text-meta font-medium tracking-[0.28em] text-sky-200/70 sm:tracking-[0.36em]">
          {brandName(lang)}
        </p>
        <h1
          id="domain-gate-title"
          className="mt-2 text-center text-xl font-semibold text-slate-50 sm:text-2xl"
        >
          {t("domainGateTitle", lang)}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-300">
          {t("domainGateSubtitle", lang)}
        </p>
        <p className="mt-1 text-center text-caption text-slate-500">
          {t("domainGateDetailHint", lang)}
        </p>

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
          <p className="mt-2.5 text-body font-medium leading-snug text-amber-100/95">
            {t("domainUltraLiteHook", lang)}
          </p>
          <p className="mt-1.5 text-meta text-amber-200/55">
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

        {(onOpenLetter || onOpenSources || onOpenCaution) ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-caption text-slate-500">
            {onOpenLetter ? (
              <button
                type="button"
                onClick={onOpenLetter}
                className="underline decoration-slate-600 underline-offset-4 transition hover:text-slate-300"
              >
                {t(letterLinkCompact ? "welcomeBriefReopen" : "welcomeLetterReopen", lang)}
              </button>
            ) : null}
            {onOpenSources ? (
              <button
                type="button"
                onClick={onOpenSources}
                className="underline decoration-slate-600 underline-offset-4 transition hover:text-slate-300"
              >
                {lang === "en" ? "Data sources & limits" : "데이터 출처·한계"}
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
