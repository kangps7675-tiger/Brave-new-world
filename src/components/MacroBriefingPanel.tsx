"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  densityLabel,
  trustBadgeLabel,
  type MacroBriefingPayload,
  type MacroDensityBadge,
  type MacroDomain,
  type MacroStep,
  type MacroTopic,
  type MacroTrustBadge,
} from "@/lib/macroBriefing";
import { zc } from "@/lib/uiStack";

type MacroBriefingPanelProps = {
  open: boolean;
  folded: boolean;
  domain: MacroDomain;
  lang: LabelLanguage;
  payload: MacroBriefingPayload | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onFold: () => void;
  onUnfold: () => void;
  onDomainChange: (domain: MacroDomain) => void;
  onStepActivate: (step: MacroStep, topic: MacroTopic) => void;
};

function TrustChip({ badge, lang }: { badge: MacroTrustBadge | null; lang: LabelLanguage }) {
  if (!badge) return null;
  const label = trustBadgeLabel(badge, lang);
  const tone =
    badge === "high-confidence"
      ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
      : badge === "corroborated"
        ? "border-sky-400/50 bg-sky-500/15 text-sky-100"
        : "border-amber-400/40 bg-amber-500/10 text-amber-100";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone}`}>
      {label}
    </span>
  );
}

function DensityChip({
  badge,
  lang,
}: {
  badge: MacroDensityBadge;
  lang: LabelLanguage;
}) {
  if (badge === "none") return null;
  const label = densityLabel(badge, lang);
  return (
    <span className="rounded-full border border-violet-400/45 bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-100">
      {label}
    </span>
  );
}

export function MacroBriefingPanel({
  open,
  folded,
  domain,
  lang,
  payload,
  loading,
  error,
  onClose,
  onFold,
  onUnfold,
  onDomainChange,
  onStepActivate,
}: MacroBriefingPanelProps) {
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  useEffect(() => {
    if (!payload?.topics.length) {
      setActiveTopicId(null);
      setActiveStepId(null);
      return;
    }
    const first = payload.topics[0];
    setActiveTopicId(first.id);
    setActiveStepId(first.steps[0]?.id ?? null);
  }, [payload]);

  if (folded && !open) {
    return (
      <div className={`pointer-events-auto fixed left-0 top-[42%] ${zc("panel")}`}>
        <button
          type="button"
          onClick={onUnfold}
          className="group flex items-center gap-1.5 rounded-r-md border border-l-0 border-sky-500/50 bg-slate-950/90 py-2.5 pl-1.5 pr-2 text-sky-50 shadow-[0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-slate-900 hover:pl-2.5"
          aria-label={lang === "en" ? "Reopen macro briefing" : "거시 요약본 다시 펼치기"}
          title={lang === "en" ? "Macro briefing" : "거시 요약본"}
        >
          <span
            className="text-micro font-semibold tracking-[0.14em]"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {lang === "en" ? "Brief" : "요약"}
          </span>
        </button>
      </div>
    );
  }

  if (!open) return null;

  const topics = payload?.topics ?? [];
  const activeTopic = topics.find((t) => t.id === activeTopicId) ?? topics[0] ?? null;

  return (
    <aside
      className={`pointer-events-auto fixed bottom-3 right-3 top-[4.75rem] flex w-[min(22.5rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-xl border border-sky-200/20 bg-slate-950/92 text-sky-50 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-md ${zc("panel")}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="macro-briefing-title"
    >
      <header className="flex items-start justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="min-w-0">
          <h2 id="macro-briefing-title" className="text-sm font-semibold tracking-wide">
            {lang === "en" ? "Macro briefing" : "거시 요약본"}
          </h2>
          <p className="mt-0.5 text-[11px] text-sky-100/65">
            {lang === "en"
              ? "RSS outlets × GDELT density — macro themes only"
              : "RSS 매체 × GDELT 밀도 — 거시 테마만"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onFold}
            className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-sky-100/80 hover:bg-white/5"
          >
            {lang === "en" ? "Fold" : "접기"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-sky-100/80 hover:bg-white/5"
            aria-label={lang === "en" ? "Close" : "닫기"}
          >
            ✕
          </button>
        </div>
      </header>

      <div className="flex gap-1 border-b border-white/10 px-3 py-2">
        {(
          [
            ["geo", lang === "en" ? "Geopolitics" : "지정학"],
            ["econ", lang === "en" ? "Geoeconomics" : "지경학"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onDomainChange(id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              domain === id
                ? "bg-sky-400/20 text-sky-50 ring-1 ring-sky-300/40"
                : "text-sky-100/60 hover:bg-white/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <p className="py-8 text-center text-xs text-sky-100/60">
            {lang === "en" ? "Loading themes…" : "테마 불러오는 중…"}
          </p>
        ) : null}
        {error ? (
          <p className="py-4 text-center text-xs text-amber-200/90">{error}</p>
        ) : null}
        {!loading && !error && topics.length === 0 ? (
          <p className="py-8 text-center text-xs text-sky-100/60">
            {lang === "en"
              ? "No macro themes ranked yet. Check back after the next news warm."
              : "순위화된 거시 테마가 아직 없습니다. 다음 뉴스 워밍 후 다시 확인하세요."}
          </p>
        ) : null}

        <ul className="flex flex-col gap-2">
          {topics.map((topic, index) => {
            const selected = activeTopic?.id === topic.id;
            return (
              <li key={topic.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTopicId(topic.id);
                    setActiveStepId(topic.steps[0]?.id ?? null);
                    if (topic.steps[0]) onStepActivate(topic.steps[0], topic);
                    else if (topic.camera) {
                      onStepActivate(
                        {
                          id: `${topic.id}:root`,
                          kind: "gdelt-density",
                          body: topic.heatLabel,
                          headline: null,
                          sources: [],
                          trustBadge: topic.trustBadge,
                          densityBadge: topic.densityBadge,
                          camera: topic.camera,
                        },
                        topic,
                      );
                    }
                  }}
                  className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                    selected
                      ? "border-sky-300/45 bg-sky-400/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[10px] font-semibold tracking-wider text-sky-200/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate text-[11px] text-sky-100/55">{topic.heatLabel}</span>
                  </div>
                  <p className="mt-1 text-[13px] font-medium leading-snug text-sky-50">
                    {topic.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <TrustChip badge={topic.trustBadge} lang={lang} />
                    <DensityChip badge={topic.densityBadge} lang={lang} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {activeTopic ? (
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sky-200/70">
              {lang === "en" ? "Steps" : "단계"}
            </p>
            <ol className="flex flex-col gap-2">
              {activeTopic.steps.map((step, i) => {
                const on = activeStepId === step.id;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStepId(step.id);
                        onStepActivate(step, activeTopic);
                      }}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                        on
                          ? "border-amber-300/40 bg-amber-400/10"
                          : "border-white/10 bg-black/20 hover:border-white/20"
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-sky-200/60">
                          {lang === "en" ? `Step ${i + 1}` : `${i + 1}단계`}
                        </span>
                        <TrustChip badge={step.trustBadge} lang={lang} />
                        {step.densityBadge ? (
                          <DensityChip badge={step.densityBadge} lang={lang} />
                        ) : null}
                      </div>
                      <p className="text-[12px] leading-relaxed text-sky-50/95">{step.body}</p>
                      {step.sources.length > 0 ? (
                        <ul className="mt-1.5 space-y-0.5">
                          {step.sources.slice(0, 3).map((s) => (
                            <li key={s.url} className="truncate text-[10px] text-sky-200/55">
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-sky-100 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {s.source}: {s.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
