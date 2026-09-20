"use client";

import { useLocale } from "@/contexts/LocaleContext";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  ringBlurb,
  ringTitle,
  trustTagLabel,
  type DeepDiveRing,
} from "@/lib/deepDive/rings";
import { zc } from "@/lib/uiStack";

type DeepDiveRingPanelProps = {
  rings: DeepDiveRing[];
  activeRingId: string | null;
  onSelect: (ring: DeepDiveRing) => void;
  lang?: LabelLanguage;
};

/**
 * L2 고리 목록 — 심층 중 하단. 고리 클릭 → 레이어 씬 교체.
 */
export function DeepDiveRingPanel({
  rings,
  activeRingId,
  onSelect,
  lang: langProp,
}: DeepDiveRingPanelProps) {
  const { lang: ctxLang } = useLocale();
  const lang = langProp ?? ctxLang;
  if (rings.length === 0) return null;

  return (
    <div
      className={`pointer-events-auto fixed bottom-3 left-1/2 w-[min(100%-1.5rem,28rem)] -translate-x-1/2 ${zc("panel")}`}
      role="region"
      aria-label={lang === "en" ? "Deep-dive rings" : "심층 고리"}
    >
      <div className="rounded-lg border border-amber-900/25 bg-[#1a140c]/92 px-3 py-2.5 shadow-xl backdrop-blur-md">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-amber-200/70">
          {lang === "en" ? "L2 · Rings" : "L2 · 고리"}
        </p>
        <p className="mt-0.5 text-micro leading-snug text-amber-50/55">
          {lang === "en"
            ? "Tap a ring to swap the map scene (max 3 layers)."
            : "고리를 누르면 지도 씬이 바뀝니다 (레이어 최대 3)."}
        </p>
        <ul className="mt-2 max-h-[40vh] space-y-1.5 overflow-y-auto overscroll-contain">
          {rings.map((ring) => {
            const active = ring.id === activeRingId;
            return (
              <li key={ring.id}>
                <button
                  type="button"
                  onClick={() => onSelect(ring)}
                  className={`w-full rounded-md border px-2.5 py-2 text-left transition ${
                    active
                      ? "border-amber-400/50 bg-amber-500/15 text-amber-50"
                      : "border-white/10 bg-black/25 text-slate-200 hover:border-amber-500/30 hover:bg-black/40"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold leading-snug">
                      {ringTitle(ring, lang)}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-medium tracking-wide ${
                        active
                          ? "bg-amber-400/20 text-amber-100"
                          : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {trustTagLabel(ring.tag, lang)}
                    </span>
                  </span>
                  <span className="mt-1 block text-micro leading-snug text-slate-400">
                    {ringBlurb(ring, lang)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
