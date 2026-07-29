"use client";

import {
  NEWS_TRUST_TIERS,
  localizeOsint,
  localizeTier,
  trustIntroLine,
  trustPanelSubtitle,
  trustPanelTitle,
  type TrustLang,
} from "@/data/newsTrustTiers";
import type { LabelLanguage } from "@/lib/layerPrefs";

type NewsTrustTierPanelProps = {
  open: boolean;
  onClose: () => void;
  lang: LabelLanguage;
};

const TIER_BADGE: Record<1 | 2 | 3, string> = {
  1: "border-emerald-400/40 bg-emerald-950/40 text-emerald-100",
  2: "border-amber-400/40 bg-amber-950/35 text-amber-100",
  3: "border-rose-400/40 bg-rose-950/35 text-rose-100",
};

function toTrustLang(lang: LabelLanguage): TrustLang {
  return lang === "en" ? "en" : "ko";
}

export function NewsTrustTierPanel({ open, onClose, lang }: NewsTrustTierPanelProps) {
  if (!open) return null;

  const tLang = toTrustLang(lang);
  const isEn = tLang === "en";
  const osint = localizeOsint(tLang);

  return (
    <>
      <button
        type="button"
        aria-label={isEn ? "Close trust grades panel" : "신뢰도 패널 닫기"}
        className="absolute inset-0 z-[500] bg-[#0a1528]/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        className="intel-panel absolute right-3 top-14 z-[600] flex max-h-[calc(100vh-4.5rem)] w-[min(calc(100vw-1.5rem),420px)] flex-col overflow-hidden rounded-2xl shadow-2xl"
        role="dialog"
        aria-label={trustPanelTitle(tLang)}
      >
        <div className="flex items-start justify-between gap-3 border-b border-sky-300/15 px-4 py-3">
          <div>
            <p className="text-micro uppercase tracking-[0.28em] text-sky-200/70">Trust</p>
            <h2 className="mt-1 text-lg font-semibold text-sky-50">{trustPanelTitle(tLang)}</h2>
            <p className="mt-1 text-meta text-sky-100/55">{trustPanelSubtitle(tLang)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-sky-200/15 px-2 py-1 text-xs text-sky-100/80 transition hover:border-sky-200/30 hover:text-sky-50"
          >
            {isEn ? "Close" : "닫기"}
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <p className="rounded-xl border border-sky-400/20 bg-sky-950/30 px-3 py-2.5 text-caption leading-5 text-sky-50/90">
            {trustIntroLine(tLang)}
          </p>

          <section>
            <h3 className="text-meta font-medium uppercase tracking-[0.18em] text-sky-200/65">
              {isEn ? "Axis 1 · News editorial independence" : "축 1 · 뉴스 편집독립"}
            </h3>
            <ul className="mt-2 space-y-3">
              {NEWS_TRUST_TIERS.map((tier) => {
                const copy = localizeTier(tier, tLang);
                return (
                  <li
                    key={copy.tier}
                    className="rounded-xl border border-sky-300/12 bg-black/20 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-micro font-semibold tracking-wide ${TIER_BADGE[copy.tier]}`}
                      >
                        Tier {copy.tier}
                      </span>
                      <p className="text-sm font-medium text-sky-50">{copy.label}</p>
                    </div>
                    <p className="mt-2 text-caption leading-5 text-sky-100/85">{copy.summary}</p>
                    <p className="mt-1.5 text-meta leading-5 text-sky-100/60">{copy.criteria}</p>
                    <p className="mt-2 text-micro leading-4 text-sky-200/50">{copy.examples}</p>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-cyan-900/35 bg-cyan-950/15 p-3">
            <h3 className="text-sm font-medium text-cyan-100">{osint.title}</h3>
            <p className="mt-2 text-caption leading-5 text-sky-100/80">{osint.summary}</p>
            <ul className="mt-2.5 list-disc space-y-1 pl-4 text-meta leading-5 text-sky-100/70">
              {osint.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <p className="text-micro leading-4 text-slate-500">
            {isEn
              ? "Classification logic lives in mediaTiers.ts. This panel is for readers — not legal advice."
              : "실제 분류 로직은 mediaTiers.ts. 본 안내는 독자용 설명이며 법률 자문이 아닙니다."}
          </p>
        </div>
      </aside>
    </>
  );
}
