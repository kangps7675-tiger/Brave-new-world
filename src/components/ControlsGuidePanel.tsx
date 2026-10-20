"use client";

import { useEffect } from "react";
import {
  CONTROLS_GUIDE_SECTIONS,
  controlsGuideCopy,
  markControlsGuideDone,
} from "@/lib/controlsGuide";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { zc } from "@/lib/uiStack";

type Props = {
  open: boolean;
  lang: LabelLanguage;
  onClose: () => void;
};

function KeyCap({ label }: { label: string }) {
  return (
    <kbd className="inline-flex min-w-[1.6rem] items-center justify-center rounded-md border border-sky-200/35 bg-[#0c1a30] px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-sky-50 shadow-[inset_0_-1px_0_rgba(0,0,0,0.35)]">
      {label}
    </kbd>
  );
}

/**
 * 지구본 기본 조작키 안내 — 첫 방문 자동 + 메뉴에서 재오픈.
 */
export function ControlsGuidePanel({ open, lang, onClose }: Props) {
  const en = lang === "en";
  const copy = controlsGuideCopy(lang);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        markControlsGuideDone();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const dismiss = () => {
    markControlsGuideDone();
    onClose();
  };

  return (
    <>
      <button
        type="button"
        aria-label={en ? "Close controls guide" : "조작 안내 닫기"}
        className={`fixed inset-0 ${zc("panelScrim")} bg-[#061018]/55 backdrop-blur-[2px]`}
        onClick={dismiss}
      />
      <aside
        className={`intel-panel fixed left-1/2 top-[min(12vh,5.5rem)] ${zc("panel")} flex max-h-[min(78vh,36rem)] w-[min(calc(100vw-1.5rem),26rem)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-sky-300/25 bg-[#071422]/96 shadow-2xl backdrop-blur-md`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="controls-guide-title"
        data-globe-keys="off"
      >
        <header className="border-b border-sky-300/15 px-4 py-3">
          <p className="text-micro uppercase tracking-[0.22em] text-sky-200/65">
            {en ? "Controls" : "조작"}
          </p>
          <h2
            id="controls-guide-title"
            className="mt-1 text-lg font-semibold text-sky-50"
          >
            {copy.title}
          </h2>
          <p className="mt-1 text-micro leading-snug text-sky-100/70">
            {copy.subtitle}
          </p>
        </header>

        <div className="intel-scroll-y min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
          {CONTROLS_GUIDE_SECTIONS.map((section) => (
            <section key={section.titleKo}>
              <h3 className="mb-1.5 text-micro font-semibold uppercase tracking-wide text-sky-200/75">
                {en ? section.titleEn : section.titleKo}
              </h3>
              <ul className="space-y-2">
                {section.rows.map((row) => (
                  <li
                    key={`${row.labelKo}:${row.keys.join("+")}`}
                    className="flex items-start gap-2.5 rounded-lg border border-sky-400/10 bg-sky-950/25 px-2.5 py-2"
                  >
                    <div className="flex shrink-0 flex-wrap items-center gap-1 pt-0.5">
                      {row.keys.map((k, i) => (
                        <span key={`${k}-${i}`} className="inline-flex items-center gap-1">
                          {i > 0 ? (
                            <span className="text-[10px] text-sky-200/45">+</span>
                          ) : null}
                          <KeyCap label={k} />
                        </span>
                      ))}
                    </div>
                    <p className="min-w-0 flex-1 text-meta leading-snug text-sky-50/95">
                      {en ? row.labelEn : row.labelKo}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-[10px] leading-snug text-sky-200/50">
            {copy.reopenHint}
          </p>
        </div>

        <footer className="border-t border-sky-300/15 px-4 py-3">
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-xl border border-sky-300/35 bg-sky-500/20 px-3 py-2.5 text-caption font-semibold text-sky-50 transition hover:border-sky-200/50 hover:bg-sky-500/30"
          >
            {copy.cta}
          </button>
        </footer>
      </aside>
    </>
  );
}
