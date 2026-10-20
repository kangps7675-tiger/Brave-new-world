"use client";

import { LanguagePickButtons } from "@/components/LanguagePickButtons";
import { brandName } from "@/lib/brand";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { useDialog } from "@/hooks/useDialog";

type LanguageGateOverlayProps = {
  lang: LabelLanguage;
  onSelect: (lang: LabelLanguage) => void;
};

/**
 * 등불·메인 UI 직전 — 언어를 한 번도 확정하지 않은 방문자를 막는다.
 * caution을 스킵한 재방문·개발 기본 ko에도 적용.
 */
export function LanguageGateOverlay({ lang, onSelect }: LanguageGateOverlayProps) {
  /** 언어 선택 게이트 — 고르지 않고 빠져나갈 수 없다 (P1-7) */
  const dialogRef = useDialog<HTMLDivElement>({ open: true, closeOnEscape: false });
  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[800] flex items-center justify-center overflow-y-auto bg-[#02040a]/96 p-4 backdrop-blur-sm outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-gate-title"
    >
      <div className="my-auto w-full max-w-md rounded-2xl border border-amber-400/25 bg-[#0a1428]/95 p-6 shadow-2xl sm:p-8">
        <p className="text-center text-meta font-medium tracking-[0.28em] text-amber-200/65">
          {brandName(lang)}
        </p>
        <h1
          id="lang-gate-title"
          className="mt-3 text-center text-xl font-semibold text-slate-50 sm:text-2xl"
        >
          Language
        </h1>
        <p className="mt-1.5 text-center text-sm text-slate-400">
          언어를 고르면 전 세계 지도로 들어갑니다
        </p>
        <p className="mt-0.5 text-center text-caption text-slate-500">
          Choose a language to enter the global map
        </p>
        <div className="mt-6">
          <LanguagePickButtons lang={lang} onChange={onSelect} size="hero" />
        </div>
      </div>
    </div>
  );
}
