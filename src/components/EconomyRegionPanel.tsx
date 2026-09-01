"use client";

import { useEffect, useMemo, useState } from "react";
import type { NavSelection } from "@/data/navRegions";
import {
  ECON_REGION_KEYWORDS,
  ECON_REGION_TICKERS,
} from "@/data/econNavRegions";
import { countryHintForEconNav } from "@/data/econInsightBriefs";
import { useNewsStreamContext } from "@/components/BottomIntelStack";
import { NewsArticleCard } from "@/components/NewsArticleCard";
import { ECONOMY_TIER_LABELS } from "@/lib/news/mediaTiers";
import type { MapFlyTarget } from "@/lib/news/theaterMap";
import type { NewsStreamItem } from "@/lib/news/types";
import { useLocale } from "@/contexts/LocaleContext";

type EconomyRegionPanelProps = {
  selection: NavSelection;
  onClose: () => void;
  onOpenIntel: () => void;
  onFlyToMap?: (target: MapFlyTarget) => void;
  onOpenNewsInsight?: (item: NewsStreamItem) => void;
};

type RegionMacro = {
  disabled?: boolean;
  name?: string;
  gdpGrowthPct?: number | null;
  inflationPct?: number | null;
  unemploymentPct?: number | null;
  gdpUsd?: number | null;
  tradePctGdp?: number | null;
  shocks?: {
    inflation?: { rangePp?: number | null; deltaPp?: number | null } | null;
    growth?: { rangePp?: number | null; deltaPp?: number | null } | null;
  };
  peers?: Array<{ name?: string; gdpGrowthPct?: number | null; inflationPct?: number | null }>;
  narrativeKo?: string[];
  narrativeEn?: string[];
  attribution?: string;
};

function matchesRegionKeywords(text: string, keywords: string[]): boolean {
  const blob = text.toLowerCase();
  return keywords.some((kw) => blob.includes(kw.toLowerCase()));
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function fmtUsd(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
  return `$${v.toLocaleString()}`;
}

export function EconomyRegionPanel({
  selection,
  onClose,
  onOpenIntel,
  onFlyToMap,
  onOpenNewsInsight,
}: EconomyRegionPanelProps) {
  const { lang } = useLocale();
  const { payload, localizedTitle, localizedSummary } = useNewsStreamContext();
  const tickers = ECON_REGION_TICKERS[selection.id];
  const countryHint = countryHintForEconNav(selection.id);
  const [macro, setMacro] = useState<RegionMacro | null>(null);

  useEffect(() => {
    if (!countryHint) {
      setMacro(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/world-stats/macro?country=${encodeURIComponent(countryHint)}`)
      .then((r) => r.json())
      .then((data: RegionMacro) => {
        if (cancelled) return;
        if (data?.disabled) {
          setMacro(null);
          return;
        }
        setMacro(data);
      })
      .catch(() => {
        if (!cancelled) setMacro(null);
      });
    return () => {
      cancelled = true;
    };
  }, [countryHint]);

  const articles = useMemo(() => {
    const keywords = ECON_REGION_KEYWORDS[selection.id] ?? [
      selection.label,
      ...(selection.parentLabel ? [selection.parentLabel] : []),
    ];
    if (!payload) return [];
    const all = [...payload.verified, ...payload.stateMedia].filter(
      (item) => item.feedTopic === "economy",
    );
    return all
      .filter((item) =>
        matchesRegionKeywords(`${item.title} ${item.summary ?? ""} ${item.source}`, keywords),
      )
      .slice(0, 12);
  }, [payload, selection.id, selection.label, selection.parentLabel]);

  const tier1 = articles.filter((a) => a.trustTier === 1);
  const tier2 = articles.filter((a) => a.trustTier === 2);
  const tier3 = articles.filter((a) => a.trustTier === 3);

  const macroLead = lang === "en" ? macro?.narrativeEn?.[0] : macro?.narrativeKo?.[0];

  const renderCard = (item: (typeof articles)[number], tier3Card?: boolean) => (
    <NewsArticleCard
      key={item.id}
      item={item}
      economyMode
      tier3={tier3Card}
      titleOverride={localizedTitle(item)}
      summaryOverride={localizedSummary(item)}
      onFlyToMap={onFlyToMap}
      onOpenInsight={onOpenNewsInsight}
    />
  );

  return (
    <aside className="intel-panel intel-sidebar-right absolute right-0 top-0 z-[600] flex h-full w-[min(100%,380px)] flex-col overflow-hidden border-l border-emerald-800/40 bg-[#071018]/94 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 border-b border-emerald-400/15 pb-3">
        <div className="min-w-0">
          <p className="text-micro uppercase tracking-[0.28em] text-emerald-200/70">Geo Markets</p>
          <h2 className="mt-1 text-lg font-semibold text-emerald-50">{selection.label}</h2>
          {selection.parentLabel ? (
            <p className="text-meta text-emerald-100/45">{selection.parentLabel}</p>
          ) : null}
          <p className="mt-1.5 text-caption leading-5 text-emerald-100/65">{selection.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-emerald-200/15 px-2 py-1 text-xs text-emerald-100/80 transition hover:text-emerald-50"
          aria-label="패널 닫기"
        >
          ✕
        </button>
      </div>

      {tickers ? (
        <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-950/25 px-3 py-2.5">
          <p className="text-micro uppercase tracking-[0.2em] text-emerald-200/55">관련 시장</p>
          <p className="mt-1 text-sm font-medium text-emerald-50">{tickers}</p>
        </div>
      ) : null}

      {macro && !macro.disabled ? (
        <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-950/40 px-3 py-2.5">
          <p className="text-micro uppercase tracking-[0.2em] text-emerald-200/55">
            {lang === "en" ? "Country macro" : "국가 거시"} · {macro.name ?? countryHint}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1 text-meta text-emerald-50/90">
            <span>GDP {fmtUsd(macro.gdpUsd)}</span>
            <span>
              {lang === "en" ? "Growth" : "성장"} {fmtPct(macro.gdpGrowthPct)}
            </span>
            <span>
              {lang === "en" ? "CPI" : "인플레"} {fmtPct(macro.inflationPct)}
            </span>
            <span>
              {lang === "en" ? "Unemp" : "실업"} {fmtPct(macro.unemploymentPct)}
            </span>
            {macro.tradePctGdp != null ? (
              <span>
                {lang === "en" ? "Trade" : "무역"} {macro.tradePctGdp.toFixed(0)}%
              </span>
            ) : null}
          </div>
          {macro.shocks?.inflation?.rangePp != null ? (
            <p className="mt-1.5 text-meta leading-4 text-emerald-100/70">
              {lang === "en"
                ? `Inflation shook ${macro.shocks.inflation.rangePp.toFixed(1)}pp in the recent window`
                : `인플레가 최근 창에서 ${macro.shocks.inflation.rangePp.toFixed(1)}%p 흔들림`}
              {macro.shocks.inflation.deltaPp != null
                ? lang === "en"
                  ? ` · YoY ${fmtPct(macro.shocks.inflation.deltaPp)}p`
                  : ` · 전년비 ${fmtPct(macro.shocks.inflation.deltaPp)}p`
                : ""}
            </p>
          ) : null}
          {macro.shocks?.growth?.rangePp != null ? (
            <p className="mt-1 text-meta leading-4 text-emerald-100/70">
              {lang === "en"
                ? `Growth range ${macro.shocks.growth.rangePp.toFixed(1)}pp`
                : `성장 범위 ${macro.shocks.growth.rangePp.toFixed(1)}%p`}
              {macro.shocks.growth.deltaPp != null
                ? lang === "en"
                  ? ` · YoY ${fmtPct(macro.shocks.growth.deltaPp)}p`
                  : ` · 전년비 ${fmtPct(macro.shocks.growth.deltaPp)}p`
                : ""}
            </p>
          ) : null}
          {macro.peers && macro.peers.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {macro.peers.map((p) => (
                <span
                  key={p.name}
                  className="rounded-md border border-emerald-400/20 bg-emerald-900/40 px-1.5 py-0.5 text-micro text-emerald-100/80"
                >
                  {p.name} {fmtPct(p.gdpGrowthPct)}/{fmtPct(p.inflationPct)}
                </span>
              ))}
            </div>
          ) : null}
          {macroLead ? (
            <p className="mt-2 text-meta leading-4 text-emerald-100/65">{macroLead}</p>
          ) : null}
          <p className="mt-1 text-micro tracking-wide text-emerald-200/40">
            {macro.attribution ?? "Statistics of the World"}
          </p>
        </div>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {articles.length === 0 ? (
          <p className="py-8 text-center text-sm text-emerald-100/45">
            이 구역 관련 경제 RSS가 아직 없습니다.
            <br />
            <button
              type="button"
              onClick={onOpenIntel}
              className="mt-2 text-emerald-300 underline-offset-2 hover:underline"
            >
              전체 경제 Intel 열기
            </button>
          </p>
        ) : (
          <div className="space-y-4">
            {tier1.length > 0 ? (
              <section>
                <p className="text-xs font-semibold text-emerald-50">
                  {ECONOMY_TIER_LABELS[1].label}
                </p>
                <p className="text-micro text-emerald-100/45">{ECONOMY_TIER_LABELS[1].detail}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {tier1.map((item) => renderCard(item))}
                </div>
              </section>
            ) : null}
            {tier2.length > 0 ? (
              <section>
                <p className="text-xs font-semibold text-emerald-50">
                  {ECONOMY_TIER_LABELS[2].label}
                </p>
                <p className="text-micro text-emerald-100/45">{ECONOMY_TIER_LABELS[2].detail}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {tier2.map((item) => renderCard(item))}
                </div>
              </section>
            ) : null}
            {tier3.length > 0 ? (
              <section>
                <p className="text-xs font-semibold text-emerald-50">
                  {ECONOMY_TIER_LABELS[3].label}
                </p>
                <p className="text-micro text-emerald-100/45">{ECONOMY_TIER_LABELS[3].detail}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {tier3.map((item) => renderCard(item, true))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenIntel}
        className="mt-3 w-full rounded-xl border border-emerald-400/30 bg-emerald-500/15 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-500/25"
      >
        📈 전체 경제 Intel
      </button>
    </aside>
  );
}
