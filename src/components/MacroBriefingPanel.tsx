"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  tickerDisplayName,
  verdictLabel,
  type MarketReactionVerdict,
  type StockTickerItem,
} from "@/lib/stockTickers";
import { yahooQuoteUrl } from "@/lib/theaterAssets";
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

type ReactionState = {
  verdict: MarketReactionVerdict;
  peakSigma: number | null;
  loading: boolean;
  error: string | null;
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
    <span className={`rounded-full border px-2 py-0.5 text-micro font-medium ${tone}`}>
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
    <span className="rounded-full border border-violet-400/45 bg-violet-500/15 px-2 py-0.5 text-micro font-medium text-violet-100">
      {label}
    </span>
  );
}

function formatChange(pct: number | null | undefined, lang: LabelLanguage): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  const unit = lang === "en" ? "%" : "%";
  return `${sign}${pct.toFixed(2)}${unit}`;
}

function verdictTone(verdict: MarketReactionVerdict): string {
  if (verdict === "impact") return "border-rose-400/45 bg-rose-500/15 text-rose-100";
  if (verdict === "mild") return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  if (verdict === "none") return "border-white/20 bg-white/5 text-sky-100/70";
  return "border-slate-400/35 bg-slate-500/10 text-slate-200/80";
}

function MacroMarketBlock({
  topic,
  lang,
  tickersBySymbol,
  reaction,
}: {
  topic: MacroTopic;
  lang: LabelLanguage;
  tickersBySymbol: Map<string, StockTickerItem>;
  reaction: ReactionState | null;
}) {
  if (!topic.marketSymbols.length) return null;
  const ko = lang !== "en";

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-micro font-semibold uppercase tracking-wider text-sky-200/70">
          {ko ? "시장 관측" : "Market watch"}
        </p>
        {reaction && !reaction.loading ? (
          <span
            className={`rounded-full border px-2 py-0.5 text-micro font-medium ${verdictTone(reaction.verdict)}`}
            title={
              reaction.peakSigma != null
                ? `${ko ? "피크 σ" : "Peak σ"} ${reaction.peakSigma.toFixed(2)}`
                : undefined
            }
          >
            {verdictLabel(reaction.verdict, ko)}
            {reaction.peakSigma != null && Number.isFinite(reaction.peakSigma)
              ? ` · ${Math.abs(reaction.peakSigma).toFixed(1)}σ`
              : ""}
          </span>
        ) : null}
        {reaction?.loading ? (
          <span className="text-micro text-sky-100/45">
            {ko ? "σ 계산 중…" : "Measuring σ…"}
          </span>
        ) : null}
      </div>
      <p className="mb-2 text-micro leading-snug text-sky-100/55">{topic.marketNote}</p>
      <ul className="flex flex-col gap-1">
        {topic.marketSymbols.map((symbol) => {
          const row = tickersBySymbol.get(symbol);
          const name = tickerDisplayName(symbol, lang);
          const change = row?.changePercent ?? null;
          const up = change != null && change > 0;
          const down = change != null && change < 0;
          return (
            <li key={symbol}>
              <a
                href={yahooQuoteUrl(symbol)}
                target="_blank"
                rel="noreferrer"
                className="flex items-baseline justify-between gap-2 rounded-md border border-white/10 bg-black/25 px-2 py-1.5 transition hover:border-white/25 hover:bg-white/[0.04]"
                title={symbol}
              >
                <span className="min-w-0 truncate text-meta text-sky-50/95">{name}</span>
                <span
                  className={`shrink-0 tabular-nums text-micro font-medium ${
                    up ? "text-emerald-300" : down ? "text-rose-300" : "text-sky-100/55"
                  }`}
                >
                  {formatChange(change, lang)}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-micro leading-snug text-sky-100/40">
        {ko
          ? "기사 시각 대비 선물·지수 움직임(σ). 방향·매매 권유 아님 · 과거 시세 기반 관측."
          : "Size vs usual move (σ) since the story time. Not directional advice — historical quotes only."}
      </p>
      {reaction?.error ? (
        <p className="mt-1 text-micro text-amber-200/70">{reaction.error}</p>
      ) : null}
    </div>
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
  const [tickers, setTickers] = useState<StockTickerItem[]>([]);
  const [reaction, setReaction] = useState<ReactionState | null>(null);

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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch("/api/stock-tickers")
      .then(async (res) => {
        if (!res.ok) throw new Error("tickers");
        const json = (await res.json()) as { tickers?: StockTickerItem[] };
        if (!cancelled) setTickers(json.tickers ?? []);
      })
      .catch(() => {
        if (!cancelled) setTickers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const topics = payload?.topics ?? [];
  const activeTopic = topics.find((t) => t.id === activeTopicId) ?? topics[0] ?? null;

  useEffect(() => {
    if (!open || !activeTopic?.marketSymbols.length) {
      setReaction(null);
      return;
    }
    let cancelled = false;
    const age =
      activeTopic.marketAgeMinutes != null && Number.isFinite(activeTopic.marketAgeMinutes)
        ? activeTopic.marketAgeMinutes
        : 0;
    const params = new URLSearchParams({
      theater: activeTopic.marketTheater || "all",
      ageMinutes: String(Math.min(age, 60 * 24 * 30)),
      viewerMode: "economy",
      mode: "reaction",
    });
    if (activeTopic.marketChokepointId) {
      params.set("chokepointId", activeTopic.marketChokepointId);
    }

    setReaction({ verdict: "pending", peakSigma: null, loading: true, error: null });
    void fetch(`/api/stock-tickers/reaction?${params}`)
      .then(async (res) => {
        const json = (await res.json()) as {
          verdict?: MarketReactionVerdict;
          peakSigma?: number | null;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setReaction({
            verdict: "pending",
            peakSigma: null,
            loading: false,
            error: json.error ?? (lang === "en" ? "Reaction unavailable" : "반응 데이터 없음"),
          });
          return;
        }
        setReaction({
          verdict: json.verdict ?? "pending",
          peakSigma: json.peakSigma ?? null,
          loading: false,
          error: null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setReaction({
            verdict: "pending",
            peakSigma: null,
            loading: false,
            error: lang === "en" ? "Reaction unavailable" : "반응 데이터 없음",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, activeTopic?.id, activeTopic?.marketAgeMinutes, activeTopic?.marketTheater, activeTopic?.marketChokepointId, activeTopic?.marketSymbols.length, lang]);

  const tickersBySymbol = useMemo(() => {
    const map = new Map<string, StockTickerItem>();
    for (const t of tickers) map.set(t.symbol, t);
    return map;
  }, [tickers]);

  if (folded && !open) {
    return (
      <div
        className={`pointer-events-auto fixed ${zc("panel")}`}
        style={{
          /* 좌측 메뉴 peep·엣지 hit-strip과 겹치지 않게 — 내비 아래, 스트립 안쪽 */
          left: "max(2.75rem, calc(1.15rem + env(safe-area-inset-left, 0px)))",
          top: "calc(var(--hover-nav-height, 5rem) + 0.65rem)",
        }}
      >
        <button
          type="button"
          onClick={onUnfold}
          className="group flex items-center gap-1.5 rounded-md border border-sky-500/50 bg-slate-950/90 py-2.5 pl-1.5 pr-2 text-sky-50 shadow-[0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-slate-900 hover:pl-2.5"
          aria-label={lang === "en" ? "Reopen today’s overview" : "오늘 한눈에 다시 펼치기"}
          title={lang === "en" ? "Overview" : "오늘 한눈에"}
        >
          <span
            className="text-micro font-semibold tracking-[0.14em]"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {lang === "en" ? "Overview" : "한눈에"}
          </span>
        </button>
      </div>
    );
  }

  if (!open) return null;

  return (
    <aside
      className={`pointer-events-auto fixed flex w-[min(22.5rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-xl border border-sky-200/20 bg-slate-950/92 text-sky-50 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-md ${zc("panel")}`}
      style={{
        /* 우측 상시 지표 칩·하단 인텔 독과 겹치지 않게 CSS 변수로 비움 */
        top: "calc(var(--hover-nav-height, 4.75rem) + 0.45rem)",
        right: "calc(var(--mode-index-chip-width, 0px) + 0.85rem)",
        bottom:
          "calc(var(--bottom-intel-stack-clearance, 8.5rem) + 0.85rem + env(safe-area-inset-bottom, 0px))",
        maxWidth:
          "min(22.5rem, calc(100vw - var(--mode-index-chip-width, 0px) - 1.75rem))",
      }}
      role="dialog"
      aria-modal="false"
      aria-labelledby="macro-briefing-title"
    >
      <header className="flex items-start justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="min-w-0">
          <h2 id="macro-briefing-title" className="text-sm font-semibold tracking-wide">
            {lang === "en" ? "Overview" : "오늘 한눈에"}
          </h2>
          <p className="mt-0.5 text-micro text-sky-100/65">
            {lang === "en"
              ? "Fear spikes & key talks · RSS × GDELT (interpretive)"
              : "불안 국면·주요 회담 위주 · RSS × GDELT (해석용)"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onFold}
            className="rounded-md border border-white/15 px-2 py-1 text-micro text-sky-100/80 hover:bg-white/5"
          >
            {lang === "en" ? "Fold" : "접기"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-2 py-1 text-micro text-sky-100/80 hover:bg-white/5"
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
            className={`rounded-full px-2.5 py-1 text-micro font-medium transition ${
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
                    <span className="text-micro font-semibold tracking-wider text-sky-200/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate text-micro text-sky-100/55">{topic.heatLabel}</span>
                  </div>
                  <p className="mt-1 text-meta font-medium leading-snug text-sky-50">
                    {topic.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <TrustChip badge={topic.trustBadge} lang={lang} />
                    <DensityChip badge={topic.densityBadge} lang={lang} />
                    {topic.marketSymbols.slice(0, 3).map((sym) => (
                      <span
                        key={sym}
                        className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-micro text-emerald-100/90"
                      >
                        {tickerDisplayName(sym, lang)}
                      </span>
                    ))}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {activeTopic ? (
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="mb-2 text-micro font-semibold uppercase tracking-wider text-sky-200/70">
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
                        <span className="text-micro text-sky-200/60">
                          {lang === "en" ? `Step ${i + 1}` : `${i + 1}단계`}
                        </span>
                        <TrustChip badge={step.trustBadge} lang={lang} />
                        {step.densityBadge ? (
                          <DensityChip badge={step.densityBadge} lang={lang} />
                        ) : null}
                      </div>
                      <p className="text-meta leading-relaxed text-sky-50/95">{step.body}</p>
                      {step.sources.length > 0 ? (
                        <ul className="mt-1.5 space-y-0.5">
                          {step.sources.slice(0, 3).map((s) => (
                            <li key={s.url} className="truncate text-micro text-sky-200/55">
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

            <MacroMarketBlock
              topic={activeTopic}
              lang={lang}
              tickersBySymbol={tickersBySymbol}
              reaction={reaction}
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
