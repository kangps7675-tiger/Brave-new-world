"use client";

import { LanguagePickButtons } from "@/components/LanguagePickButtons";
import { brandName } from "@/lib/brand";
import type { LabelLanguage } from "@/lib/layerPrefs";

type LanguageGateOverlayProps = {
  lang: LabelLanguage;
  onSelect: (lang: LabelLanguage) => void;
};

/**
 * 등불·메인 UI 직전 — 언어를 한 번도 확정하지 않은 방문자를 막는다.
 * caution을 스킵한 재방문·개발 기본 ko에도 적용.
 */
export function LanguageGateOverlay({ lang, onSelect }: LanguageGateOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[10025] flex items-center justify-center overflow-y-auto bg-[#02040a]/96 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-gate-title"
    >
      <div className="my-auto w-full max-w-md rounded-2xl border border-amber-400/25 bg-[#0a1428]/95 p-6 shadow-2xl sm:p-8">
        <p className="text-center text-[11px] font-medium tracking-[0.28em] text-amber-200/65">
          {brandName(lang)}
        </p>
        <h1
          id="lang-gate-title"
          className="mt-3 text-center text-xl font-semibold text-slate-50 sm:text-2xl"
        >
          Language
        </h1>
        <p className="mt-1.5 text-center text-sm text-slate-400">언어를 선택한 뒤 등불이 켜집니다</p>
        <p className="mt-0.5 text-center text-[12px] text-slate-500">
          Choose a language before today&apos;s lamp briefing
        </p>
        <div className="mt-6">
          <LanguagePickButtons lang={lang} onChange={onSelect} size="hero" />
        </div>
      </div>
    </div>
  );
}
