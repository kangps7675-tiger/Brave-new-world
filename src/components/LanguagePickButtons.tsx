"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";

type LanguagePickButtonsProps = {
  lang: LabelLanguage;
  onChange: (lang: LabelLanguage) => void;
  /** 경고창 상단용 large / 단독 게이트용 hero */
  size?: "large" | "hero";
};

/**
 * 한·영 언어 선택 — 진입 경고창·등불 전 게이트 공용.
 * 라벨은 양쪽에 이중언어로 고정해, 어느 모드로 열리든 바로 고를 수 있게 한다.
 */
export function LanguagePickButtons({
  lang,
  onChange,
  size = "large",
}: LanguagePickButtonsProps) {
  const hero = size === "hero";
  return (
    <div className="w-full" role="group" aria-label="Language / 언어">
      <p
        className={`text-center font-medium tracking-wide text-amber-100/70 ${
          hero ? "text-[13px] sm:text-sm" : "text-[11px] sm:text-xs"
        }`}
      >
        Select language · 언어 선택
      </p>
      <div className={`mt-2.5 grid grid-cols-2 gap-2.5 ${hero ? "sm:gap-3" : ""}`}>
        <button
          type="button"
          onClick={() => onChange("ko")}
          aria-pressed={lang === "ko"}
          className={`rounded-xl border font-semibold transition ${
            hero ? "px-4 py-4 text-base sm:py-5 sm:text-lg" : "px-3 py-3 text-sm sm:text-[15px]"
          } ${
            lang === "ko"
              ? "border-amber-400/55 bg-amber-500/20 text-amber-50 shadow-[0_0_24px_rgba(245,158,11,0.12)]"
              : "border-slate-600/45 bg-black/45 text-slate-400 hover:border-amber-400/35 hover:text-amber-100/90"
          }`}
        >
          한국어
        </button>
        <button
          type="button"
          onClick={() => onChange("en")}
          aria-pressed={lang === "en"}
          className={`rounded-xl border font-semibold transition font-en ${
            hero ? "px-4 py-4 text-base sm:py-5 sm:text-lg" : "px-3 py-3 text-sm sm:text-[15px]"
          } ${
            lang === "en"
              ? "border-amber-400/55 bg-amber-500/20 text-amber-50 shadow-[0_0_24px_rgba(245,158,11,0.12)]"
              : "border-slate-600/45 bg-black/45 text-slate-400 hover:border-amber-400/35 hover:text-amber-100/90"
          }`}
        >
          English
        </button>
      </div>
    </div>
  );
}
