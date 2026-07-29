"use client";

import { BRAND_MOTIF, BRAND_NAME, BRAND_TAGLINE, brandName } from "@/lib/brand";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";
import { useDialog } from "@/hooks/useDialog";

type WelcomeBriefOverlayProps = {
  lang: LabelLanguage;
  onContinue: () => void;
};

/**
 * 모바일(compact)용 짧은 환영 — 데스크톱 양피지 편지를 대체하지 않고,
 * caution → domain 사이에 브랜드·취지 한 화면만 둔다.
 */
export function WelcomeBriefOverlay({ lang, onContinue }: WelcomeBriefOverlayProps) {
  /** 진입 게이트 — 계속하기를 눌러야 통과. Escape로 건너뛰면 안 된다 (P1-7) */
  const dialogRef = useDialog<HTMLDivElement>({ open: true, closeOnEscape: false });
  const en = lang === "en";

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="entry-terminal-boot fixed inset-0 z-[800] flex items-center justify-center overflow-y-auto p-3 sm:p-4 outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-brief-brand"
    >
      <div className="entry-terminal-boot__scan" aria-hidden />
      <div className="entry-terminal-boot__panel relative my-auto w-full max-w-md">
        <p className="text-center font-data-mono text-micro tracking-[0.28em] text-amber-400/55">
          {BRAND_MOTIF[lang]}
        </p>

        <h1
          id="welcome-brief-brand"
          className={`mt-3 text-center text-[1.85rem] leading-tight tracking-tight text-amber-50 sm:text-[2.1rem] ${
            en ? "font-en" : "parchment-letter--history"
          }`}
          style={
            en
              ? { fontFamily: "var(--font-parchment-en), Georgia, serif", fontWeight: 600 }
              : { fontWeight: 600 }
          }
        >
          {brandName(lang)}
        </h1>
        {!en ? (
          <p className="mt-1.5 text-center font-data-mono text-micro tracking-[0.22em] text-slate-400">
            {BRAND_NAME.en}
          </p>
        ) : null}

        <p className="mt-5 text-center text-[14px] leading-relaxed text-amber-100/85">
          {BRAND_TAGLINE[lang]}
        </p>

        <p className="mt-4 text-center text-body leading-relaxed text-slate-300">
          {t("welcomeBriefBody", lang)}
        </p>

        <p className="mt-5 text-center font-data-mono text-micro tracking-[0.12em] text-slate-500">
          {t("welcomeBriefQuote", lang)}
        </p>

        <button
          type="button"
          onClick={onContinue}
          className="entry-terminal-boot__cta mt-7 w-full font-data-mono"
        >
          {t("welcomeBriefCta", lang)}
        </button>
      </div>
    </div>
  );
}
