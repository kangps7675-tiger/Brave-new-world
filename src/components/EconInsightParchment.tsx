"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PARCHMENT_FOLD_EXIT_MS } from "@/components/ParchmentLetter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import {
  insightRiskToCss,
  type EconInsightBrief,
  type MarketLinkDirection,
} from "@/data/econInsightBriefs";
import { localizeEconInsightBrief } from "@/data/criticalNodeKoreanBriefs";
import { CRITICAL_NODES_ATTRIBUTION } from "@/data/criticalNodes";
import { useDialog } from "@/hooks/useDialog";
import {
  emitParchmentFoldSound,
  emitParchmentUnfoldSound,
} from "@/components/SoundEffectsBridge";
import { PanelSkeletonGrid } from "@/components/PanelSkeletons";

type MacroShockSummary = {
  latest?: number | null;
  deltaPp?: number | null;
  rangePp?: number | null;
  latestYear?: string | null;
  min?: number | null;
  max?: number | null;
};

type WorldStatsMacro = {
  disabled?: boolean;
  name?: string;
  gdpUsd?: number | null;
  gdpPerCapitaUsd?: number | null;
  tradePctGdp?: number | null;
  population?: number | null;
  milSpendPctGdp?: number | null;
  inflationPct?: number | null;
  gdpGrowthPct?: number | null;
  unemploymentPct?: number | null;
  currentAccountPctGdp?: number | null;
  govDebtPctGdp?: number | null;
  incomeLevel?: string;
  shocks?: {
    inflation?: MacroShockSummary | null;
    growth?: MacroShockSummary | null;
  };
  peers?: Array<{
    id?: string;
    name?: string;
    inflationPct?: number | null;
    gdpGrowthPct?: number | null;
  }>;
  narrativeKo?: string[];
  narrativeEn?: string[];
  error?: string;
  attribution?: string;
};

function arrowFor(dir: MarketLinkDirection): string {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "·";
}

function riskLabel(level: EconInsightBrief["riskLevel"], lang: LabelLanguage): string {
  if (lang === "en") return `RISK · ${level}`;
  if (level === "CRITICAL") return "위험도 · 치명";
  if (level === "HIGH") return "위험도 · 높음";
  return "위험도 · 안정";
}

function formatUsdBn(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
  return `$${value.toLocaleString()}`;
}

function formatSignedPct(value: number | null | undefined, digits = 1): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** 정기·허브 요약은 즉시 전문 표시. 서사형 분쟁사 양피지만 타자 연출 유지. */
const TYPEWRITER_ENABLED = false;
const TYPE_MS_PER_CHAR = 26;

const PARCHMENT_STACK =
  'var(--font-wanted), "Wanted Sans Variable", "Wanted Sans", sans-serif';

export type EconInsightParchmentProps = {
  lang: LabelLanguage;
  brief: EconInsightBrief;
  onMapOnly: () => void;
  onOpenNews: () => void;
  compact?: boolean;
};

export function EconInsightParchment({
  lang,
  brief,
  onMapOnly,
  onOpenNews,
  compact = false,
}: EconInsightParchmentProps) {
  /**
   * 경제 인사이트 양피지 (P1-7).
   * Escape는 「지도만 보기」와 같은 의미 — 이 양피지를 접고 지도로 돌아간다.
   * 「뉴스 열기」는 다른 곳으로 이동하는 동작이라 Escape에 매핑하지 않는다.
   */
  const dialogRef = useDialog<HTMLDivElement>({ open: true, onClose: onMapOnly });
  const [phase, setPhase] = useState<"idle" | "folding" | "done">("idle");
  const [worldStats, setWorldStats] = useState<WorldStatsMacro | null>(null);
  const [macroLoading, setMacroLoading] = useState(false);
  const [typedChars, setTypedChars] = useState(0);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const typingSkipRef = useRef(false);
  const typingIntervalRef = useRef<number | null>(null);
  const displayBrief = useMemo(() => localizeEconInsightBrief(brief, lang), [brief, lang]);
  const title = lang === "en" ? displayBrief.titleEn : displayBrief.titleKo;
  const macroNarrative = useMemo(() => {
    if (!worldStats || worldStats.disabled) return [] as string[];
    const lines = lang === "en" ? worldStats.narrativeEn : worldStats.narrativeKo;
    return (lines ?? []).slice(0, compact ? 2 : 4);
  }, [worldStats, lang, compact]);
  const paragraphs = useMemo(
    () => (compact ? displayBrief.paragraphs.slice(0, 3) : displayBrief.paragraphs),
    [displayBrief.paragraphs, compact],
  );
  const fullBody = useMemo(() => paragraphs.join("\n\n"), [paragraphs]);
  const totalChars = fullBody.length;
  const typingDone = typedChars >= totalChars;

  useEffect(() => {
    emitParchmentUnfoldSound();
  }, []);

  useEffect(() => {
    typingSkipRef.current = false;
    setTypedChars(0);
    const reduced =
      prefersReducedMotion();
    if (!TYPEWRITER_ENABLED || reduced || totalChars === 0) {
      typingSkipRef.current = true;
      setTypedChars(totalChars);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      if (typingSkipRef.current) {
        window.clearInterval(id);
        typingIntervalRef.current = null;
        return;
      }
      i += 1;
      setTypedChars(i);
      if (i >= totalChars) {
        window.clearInterval(id);
        typingIntervalRef.current = null;
      }
    }, TYPE_MS_PER_CHAR);
    typingIntervalRef.current = id;
    return () => {
      window.clearInterval(id);
      typingIntervalRef.current = null;
    };
  }, [totalChars, fullBody]);

  const visibleParagraphs = useMemo(() => {
    if (typedChars >= totalChars) return paragraphs;
    let remaining = typedChars;
    const out: string[] = [];
    for (const p of paragraphs) {
      if (remaining <= 0) break;
      if (remaining >= p.length) {
        out.push(p);
        remaining -= p.length;
        if (remaining > 0) remaining = Math.max(0, remaining - 2);
      } else {
        out.push(p.slice(0, remaining));
        remaining = 0;
      }
    }
    return out.length > 0 ? out : [""];
  }, [paragraphs, typedChars, totalChars]);

  useEffect(() => {
    const el = bodyScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [typedChars, typingDone]);

  useEffect(() => {
    if (!displayBrief.countryHint) {
      setWorldStats(null);
      setMacroLoading(false);
      return;
    }
    let cancelled = false;
    setMacroLoading(true);
    const q = encodeURIComponent(displayBrief.countryHint);
    void fetch(`/api/world-stats/macro?country=${q}`)
      .then((r) => r.json())
      .then((data: WorldStatsMacro) => {
        if (cancelled) return;
        if (data?.disabled) {
          setWorldStats(null);
          return;
        }
        setWorldStats(data);
      })
      .catch(() => {
        if (!cancelled) setWorldStats(null);
      })
      .finally(() => {
        if (!cancelled) setMacroLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [displayBrief.countryHint]);

  const finish = useCallback(
    (next: () => void) => {
      if (phase !== "idle") return;
      if (!typingDone) {
        typingSkipRef.current = true;
        if (typingIntervalRef.current != null) {
          window.clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setTypedChars(totalChars);
        return;
      }
      setPhase("folding");
      emitParchmentFoldSound();
      const reduced =
        prefersReducedMotion();
      window.setTimeout(() => {
        setPhase("done");
        next();
      }, reduced ? 80 : PARCHMENT_FOLD_EXIT_MS);
    },
    [phase, totalChars, typingDone],
  );

  const exiting = phase === "folding" || phase === "done";
  const gdp = formatUsdBn(worldStats?.gdpUsd);
  const gdpPc = formatUsdBn(worldStats?.gdpPerCapitaUsd);
  const growth = formatSignedPct(worldStats?.gdpGrowthPct);
  const inflation = formatSignedPct(worldStats?.inflationPct);
  const unemp = formatSignedPct(worldStats?.unemploymentPct);
  const inflShock = worldStats?.shocks?.inflation;
  const growthShock = worldStats?.shocks?.growth;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className={`welcome-letter-scrim fixed inset-0 z-[700] flex items-center justify-center p-3 sm:p-6 ${
        exiting ? "welcome-letter-scrim--exit" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="econ-insight-title"
      aria-busy={phase === "folding"}
    >
      <div className="welcome-letter-stage">
        <div
          className={`econ-insight-parchment welcome-letter-card ${
            exiting ? "welcome-letter-card--fold-exit" : "welcome-letter-card--unfold-enter"
          }`}
          style={{ fontFamily: PARCHMENT_STACK }}
        >
          <div className="welcome-parchment welcome-letter-face welcome-letter-face--front relative flex max-h-[min(92vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-sm shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="welcome-parchment-edge pointer-events-none absolute inset-0" aria-hidden />
            <div className="welcome-parchment-filigree pointer-events-none absolute inset-0" aria-hidden />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-7 py-8 sm:px-12 sm:py-10">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                <span
                  className={`rounded-sm border px-3 py-1 font-mono text-[0.72rem] tracking-[0.18em] ${insightRiskToCss(displayBrief.riskLevel)}`}
                >
                  {riskLabel(displayBrief.riskLevel, lang)}
                </span>
              </div>

              <h1
                id="econ-insight-title"
                className="welcome-letter-title shrink-0 text-center text-[1.55rem] leading-[1.45] tracking-[0.04em] text-[#3d2a18] sm:text-[1.95rem]"
                style={{ fontFamily: PARCHMENT_STACK, fontWeight: 600 }}
              >
                {title}
              </h1>

              <p
                className="mt-3 text-center text-[0.95rem] leading-relaxed tracking-[0.01em] text-[#5a4428]"
                style={{ fontFamily: PARCHMENT_STACK, fontWeight: 400 }}
              >
                {displayBrief.impactLine}
              </p>

              {displayBrief.marketLinks.length > 0 ? (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {displayBrief.marketLinks.map((link) => (
                    <span
                      key={link.symbol}
                      className="rounded-sm border border-[#8b6914]/35 bg-[#efe0b8]/70 px-2.5 py-1 text-[0.78rem] tracking-wide text-[#3d2a18]"
                      style={{ fontFamily: PARCHMENT_STACK, fontWeight: 500 }}
                    >
                      {link.symbol} {arrowFor(link.direction)}
                    </span>
                  ))}
                </div>
              ) : null}

              {macroLoading && !worldStats ? (
                <div className="mt-4">
                  <PanelSkeletonGrid count={4} minHeight={64} />
                </div>
              ) : null}

              {worldStats &&
              !worldStats.disabled &&
              (gdp ||
                growth ||
                inflation ||
                worldStats.population != null ||
                worldStats.tradePctGdp != null ||
                worldStats.milSpendPctGdp != null) ? (
                <div className="mt-4 rounded-sm border border-[#8b6914]/28 bg-[#f6ebcf]/55 px-3 py-2.5 text-center text-[0.82rem] leading-relaxed text-[#4a3724]">
                  <div className="font-medium tracking-[0.04em]" style={{ fontFamily: PARCHMENT_STACK }}>
                    {worldStats.name ?? displayBrief.countryHint}
                    {worldStats.incomeLevel ? ` · ${worldStats.incomeLevel}` : ""} ·{" "}
                    {lang === "en" ? "Macro pulse" : "거시 펄스"}
                  </div>
                  <div
                    className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[0.75rem]"
                    style={{ fontFamily: PARCHMENT_STACK, fontWeight: 500 }}
                  >
                    {gdp ? <span>GDP {gdp}</span> : null}
                    {gdpPc ? (
                      <span>
                        {lang === "en" ? "GDP/cap" : "1인당"} {gdpPc}
                      </span>
                    ) : null}
                    {growth ? (
                      <span>
                        {lang === "en" ? "Growth" : "성장"} {growth}
                      </span>
                    ) : null}
                    {inflation ? (
                      <span>
                        {lang === "en" ? "CPI" : "인플레"} {inflation}
                      </span>
                    ) : null}
                    {unemp ? (
                      <span>
                        {lang === "en" ? "Unemp" : "실업"} {unemp}
                      </span>
                    ) : null}
                    {worldStats.population != null ? (
                      <span>
                        {lang === "en" ? "Pop" : "인구"}{" "}
                        {(worldStats.population / 1e6).toFixed(1)}M
                      </span>
                    ) : null}
                    {worldStats.tradePctGdp != null ? (
                      <span>
                        {lang === "en" ? "Trade" : "무역"}{" "}
                        {worldStats.tradePctGdp.toFixed(0)}% GDP
                      </span>
                    ) : null}
                    {worldStats.milSpendPctGdp != null ? (
                      <span>
                        {lang === "en" ? "Defense" : "국방"}{" "}
                        {worldStats.milSpendPctGdp.toFixed(1)}% GDP
                      </span>
                    ) : null}
                    {worldStats.govDebtPctGdp != null ? (
                      <span>
                        {lang === "en" ? "Debt" : "부채"}{" "}
                        {worldStats.govDebtPctGdp.toFixed(0)}% GDP
                      </span>
                    ) : null}
                  </div>
                  {(inflShock?.rangePp != null || growthShock?.rangePp != null) && !compact ? (
                    <div
                      className="mt-2 space-y-0.5 text-[0.72rem] leading-snug text-[#5a4428]"
                      style={{ fontFamily: PARCHMENT_STACK }}
                    >
                      {inflShock?.rangePp != null ? (
                        <p>
                          {lang === "en"
                            ? `Inflation window: ${inflShock.min?.toFixed(1)}→${inflShock.max?.toFixed(1)}% (range ${inflShock.rangePp.toFixed(1)}pp)${
                                inflShock.deltaPp != null
                                  ? ` · YoY ${formatSignedPct(inflShock.deltaPp)}p`
                                  : ""
                              }`
                            : `인플레 창: ${inflShock.min?.toFixed(1)}→${inflShock.max?.toFixed(1)}% (범위 ${inflShock.rangePp.toFixed(1)}%p)${
                                inflShock.deltaPp != null
                                  ? ` · 전년비 ${formatSignedPct(inflShock.deltaPp)}p`
                                  : ""
                              }`}
                        </p>
                      ) : null}
                      {growthShock?.rangePp != null ? (
                        <p>
                          {lang === "en"
                            ? `Growth window: ${growthShock.min?.toFixed(1)}→${growthShock.max?.toFixed(1)}% (range ${growthShock.rangePp.toFixed(1)}pp)${
                                growthShock.deltaPp != null
                                  ? ` · YoY ${formatSignedPct(growthShock.deltaPp)}p`
                                  : ""
                              }`
                            : `성장 창: ${growthShock.min?.toFixed(1)}→${growthShock.max?.toFixed(1)}% (범위 ${growthShock.rangePp.toFixed(1)}%p)${
                                growthShock.deltaPp != null
                                  ? ` · 전년비 ${formatSignedPct(growthShock.deltaPp)}p`
                                  : ""
                              }`}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {worldStats.peers && worldStats.peers.length > 0 && !compact ? (
                    <div
                      className="mt-2 flex flex-wrap justify-center gap-x-2 gap-y-1 text-[0.7rem] text-[#5a4428]"
                      style={{ fontFamily: PARCHMENT_STACK }}
                    >
                      {worldStats.peers.map((p) => (
                        <span
                          key={p.id ?? p.name}
                          className="rounded-sm border border-[#8b6914]/25 bg-[#efe0b8]/55 px-1.5 py-0.5"
                        >
                          {p.name} {formatSignedPct(p.gdpGrowthPct) ?? "—"} /{" "}
                          {formatSignedPct(p.inflationPct) ?? "—"}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-1.5 text-[0.65rem] tracking-[0.02em] text-[#7a6348]/85">
                    {worldStats.attribution ?? "Statistics of the World"}
                  </div>
                </div>
              ) : null}

              <div className="welcome-letter-divider mx-auto mt-4 shrink-0" aria-hidden />

              <div
                ref={bodyScrollRef}
                className="welcome-letter-body mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain text-[1.02rem] leading-[1.9] tracking-[0.01em] text-[#3f2e1c] sm:text-[1.08rem]"
                style={{ fontFamily: PARCHMENT_STACK, fontWeight: 400 }}
                aria-live="polite"
              >
                {visibleParagraphs.map((p, i) => (
                  <p key={i} className="welcome-letter-verse whitespace-pre-line text-pretty">
                    {p}
                    {!typingDone && i === visibleParagraphs.length - 1 ? (
                      <span className="parchment-type-caret" aria-hidden>
                        ▍
                      </span>
                    ) : null}
                  </p>
                ))}
                {typingDone && macroNarrative.length > 0 ? (
                  <div className="space-y-3 border-t border-[#8b6914]/20 pt-3">
                    <p
                      className="text-[0.72rem] uppercase tracking-[0.18em] text-[#7a6348]"
                      style={{ fontFamily: PARCHMENT_STACK, fontWeight: 500 }}
                    >
                      {lang === "en" ? "Country macro · live" : "국가 거시 · 라이브"}
                    </p>
                    {macroNarrative.map((line, i) => (
                      <p
                        key={`macro-${i}`}
                        className="welcome-letter-verse whitespace-pre-line text-pretty text-[0.95rem] leading-[1.75] text-[#4a3724]"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                ) : null}
                {typingDone ? (
                  <p className="pt-1 text-[0.72rem] tracking-[0.02em] text-[#7a6348]/90">
                    {CRITICAL_NODES_ATTRIBUTION}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="relative flex shrink-0 flex-col gap-2 border-t border-[#8b6914]/25 bg-[#f3e4c4]/80 px-5 py-3.5 sm:flex-row sm:justify-center sm:gap-3">
              <button
                type="button"
                onClick={() => finish(onOpenNews)}
                disabled={phase !== "idle"}
                className="rounded-sm border border-[#8b6914]/35 bg-[#e8d5a8]/80 px-4 py-2.5 text-[0.92rem] tracking-[0.04em] text-[#3d2a18] transition hover:bg-[#f7ecd0] disabled:cursor-wait disabled:opacity-70"
                style={{ fontFamily: PARCHMENT_STACK, fontWeight: 500 }}
              >
                {!typingDone
                  ? lang === "en"
                    ? "Skip typing"
                    : "타자 건너뛰기"
                  : lang === "en"
                    ? "Fold → news panel"
                    : "접고 뉴스 패널로"}
              </button>
              <button
                type="button"
                onClick={() => finish(onMapOnly)}
                disabled={phase !== "idle"}
                className="rounded-sm border border-[#8b6914]/45 bg-[#efe0b8] px-4 py-2.5 text-[0.92rem] tracking-[0.04em] text-[#3d2a18] shadow-sm transition hover:bg-[#f7ecd0] disabled:cursor-wait disabled:opacity-70"
                style={{ fontFamily: PARCHMENT_STACK, fontWeight: 500 }}
              >
                {!typingDone
                  ? lang === "en"
                    ? "Skip typing"
                    : "타자 건너뛰기"
                  : lang === "en"
                    ? "Map only"
                    : "지도만 남기기"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CriticalNodeInsightParchment(props: EconInsightParchmentProps) {
  return <EconInsightParchment {...props} compact />;
}
