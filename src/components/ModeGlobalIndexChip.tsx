"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GscpiGaugeFromData } from "@/components/GscpiGaugeFromData";
import { WorldTensionChip } from "@/components/WorldTensionChip";
import { SanctionsEvasionChip } from "@/components/SanctionsEvasionChip";
import { SanctionsEvasionPanel } from "@/components/SanctionsEvasionPanel";
import { MetricExplainPanel } from "@/components/MetricExplainPanel";
import { SwpcStatusChip } from "@/components/SwpcStatusChip";
import { FreightStressChip } from "@/components/FreightStressChip";
import { PortWatchStressChip } from "@/components/PortWatchStressChip";
import { MarketSessionChip } from "@/components/MarketSessionChip";
import { ImmersionDigitalClock } from "@/components/ImmersionDigitalClock";
import { useSanctionsEvasionSnapshot } from "@/hooks/useSanctionsEvasionSnapshot";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { MetricExplainId } from "@/lib/metricExplainCopy";
import type { ViewerMode } from "@/lib/viewPackages";
import { zc } from "@/lib/uiStack";

type ModeGlobalIndexChipProps = {
  viewerMode: ViewerMode;
  lang: LabelLanguage;
  wtiScore: number | null;
  wtiDelta?: number | null;
  wtiAsOf?: string | null;
  wtiIsEstimate?: boolean | null;
  showSesChip?: boolean;
  showGscpi?: boolean;
  showSwpc?: boolean;
  dense?: boolean;
  className?: string;
};

/**
 * 우상단 고정 — 모드별 전 세계 단일 지표.
 * 칩 클릭 시 계산·설계 설명 패널 (알아먹기 쉬운 줄글).
 */
export function ModeGlobalIndexChip({
  viewerMode,
  lang,
  wtiScore,
  wtiDelta,
  wtiAsOf,
  wtiIsEstimate,
  showSesChip = true,
  showGscpi = true,
  showSwpc = true,
  dense = false,
  className = "",
}: ModeGlobalIndexChipProps) {
  const isEconomy = viewerMode === "economy";
  const stackRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [sesPanelOpen, setSesPanelOpen] = useState(false);
  const [explainId, setExplainId] = useState<MetricExplainId | null>(null);
  const sesEntry = useSanctionsEvasionSnapshot();

  const openExplain = useCallback((id: MetricExplainId) => {
    setSesPanelOpen(false);
    setExplainId((prev) => (prev === id ? null : id));
  }, []);

  const publishChromeObstacles = useCallback(() => {
    const root = document.documentElement;
    const stackEl = stackRef.current;
    if (!stackEl) {
      root.style.setProperty("--mode-index-chip-height", "0px");
      root.style.setProperty("--mode-index-chip-stack-bottom", "0px");
      root.style.setProperty("--mode-index-chip-bottom", "0px");
      root.style.setProperty("--mode-index-chip-width", "0px");
      return;
    }
    const stackRect = stackEl.getBoundingClientRect();
    const stackBottom = Math.max(0, Math.ceil(stackRect.bottom));
    const stackHeight = Math.max(0, Math.ceil(stackRect.height));
    const stackWidth = Math.max(0, Math.ceil(stackRect.width));

    let chromeBottom = stackBottom;
    const panelEl = panelRef.current;
    if ((sesPanelOpen || explainId) && panelEl) {
      const panelBottom = Math.ceil(panelEl.getBoundingClientRect().bottom);
      chromeBottom = Math.max(stackBottom, panelBottom);
    }

    root.style.setProperty("--mode-index-chip-height", `${stackHeight}px`);
    root.style.setProperty("--mode-index-chip-stack-bottom", `${stackBottom}px`);
    root.style.setProperty("--mode-index-chip-bottom", `${chromeBottom}px`);
    root.style.setProperty("--mode-index-chip-width", `${stackWidth}px`);
  }, [sesPanelOpen, explainId]);

  useEffect(() => {
    publishChromeObstacles();
    const stackEl = stackRef.current;
    if (!stackEl) return;

    const ro = new ResizeObserver(publishChromeObstacles);
    ro.observe(stackEl);
    const panelEl = panelRef.current;
    if (panelEl) ro.observe(panelEl);

    window.addEventListener("resize", publishChromeObstacles);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", publishChromeObstacles);
      const root = document.documentElement;
      root.style.setProperty("--mode-index-chip-height", "0px");
      root.style.setProperty("--mode-index-chip-stack-bottom", "0px");
      root.style.setProperty("--mode-index-chip-bottom", "0px");
      root.style.setProperty("--mode-index-chip-width", "0px");
    };
  }, [publishChromeObstacles, sesPanelOpen, explainId]);

  useEffect(() => {
    if (!sesPanelOpen && !explainId) return;
    const id = window.requestAnimationFrame(publishChromeObstacles);
    return () => window.cancelAnimationFrame(id);
  }, [sesPanelOpen, explainId, publishChromeObstacles]);

  const showAuxSwpc = showSwpc && !dense;
  const showSesPanel = !isEconomy && showSesChip && sesPanelOpen;
  const showExplain = Boolean(explainId);

  const chipBtn =
    "cursor-pointer text-left transition ring-offset-1 hover:ring-1 hover:ring-sky-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400/70";

  return (
    <>
      <div
        ref={stackRef}
        className={`pointer-events-auto fixed z-[300] flex max-w-[min(20rem,calc(100vw-1.5rem))] flex-col items-end gap-1.5 ${className}`}
        style={{
          top: "max(0.75rem, env(safe-area-inset-top, 0px))",
          right: "max(0.75rem, env(safe-area-inset-right, 0px))",
        }}
        data-chrome-obstacle="mode-index-chip"
        data-chrome-density={dense ? "dense" : "full"}
      >
        {!dense ? <ImmersionDigitalClock lang={lang} /> : null}
        <div
          className={`flex w-full flex-col items-end gap-1.5 ${
            dense && isEconomy ? "flex-row flex-wrap justify-end" : ""
          }`}
        >
          {isEconomy ? (
            <>
              {showGscpi ? (
                <button
                  type="button"
                  className={`${chipBtn} w-full max-w-full`}
                  onClick={() => openExplain("gscpi")}
                  aria-expanded={explainId === "gscpi"}
                  aria-label={lang === "en" ? "Explain shipping congestion" : "물류 혼잡도 설명"}
                >
                  <GscpiGaugeFromData lang={lang} compact className="shadow-lg backdrop-blur-md" />
                </button>
              ) : null}
              <div className="flex flex-wrap justify-end gap-1.5">
                <button
                  type="button"
                  className={chipBtn}
                  onClick={() => openExplain("freight")}
                  aria-expanded={explainId === "freight"}
                >
                  <FreightStressChip lang={lang} />
                </button>
                <button
                  type="button"
                  className={chipBtn}
                  onClick={() => openExplain("portwatch")}
                  aria-expanded={explainId === "portwatch"}
                >
                  <PortWatchStressChip lang={lang} />
                </button>
                {dense ? (
                  <button
                    type="button"
                    className={chipBtn}
                    onClick={() => openExplain("market-session")}
                    aria-expanded={explainId === "market-session"}
                  >
                    <MarketSessionChip lang={lang} />
                  </button>
                ) : null}
              </div>
              {!dense ? (
                <button
                  type="button"
                  className={chipBtn}
                  onClick={() => openExplain("market-session")}
                  aria-expanded={explainId === "market-session"}
                >
                  <MarketSessionChip lang={lang} />
                </button>
              ) : null}
            </>
          ) : (
            <>
              <button
                type="button"
                className={`${chipBtn} w-full max-w-full`}
                onClick={() => openExplain("gts")}
                aria-expanded={explainId === "gts"}
                aria-label={lang === "en" ? "Explain tension score" : "긴장지수 설명"}
              >
                <WorldTensionChip
                  score={wtiScore}
                  deltaScore={wtiDelta}
                  asOf={wtiAsOf}
                  isEstimate={Boolean(wtiIsEstimate)}
                  lang={lang}
                  className="w-full max-w-full shadow-lg backdrop-blur-md"
                />
              </button>
              {showSesChip ? (
                <div className="flex w-full max-w-full flex-col items-stretch gap-1">
                  <SanctionsEvasionChip
                    score={sesEntry.snapshot?.score ?? null}
                    deltaScore={sesEntry.snapshot?.deltaScore}
                    asOf={sesEntry.snapshot?.generatedAt ?? sesEntry.loadedAt}
                    lang={lang}
                    dense={dense}
                    active={sesPanelOpen}
                    onClick={() => {
                      setExplainId(null);
                      setSesPanelOpen((v) => !v);
                    }}
                    className="w-full max-w-full shadow-lg backdrop-blur-md"
                  />
                  <button
                    type="button"
                    className="self-end rounded px-1.5 py-0.5 text-micro text-amber-200/70 underline-offset-2 hover:text-amber-100 hover:underline"
                    onClick={() => openExplain("ses")}
                  >
                    {lang === "en" ? "How this score works" : "이 점수 어떻게 나오나요?"}
                  </button>
                </div>
              ) : null}
            </>
          )}
          {showAuxSwpc ? (
            <button
              type="button"
              className={chipBtn}
              onClick={() => openExplain("swpc")}
              aria-expanded={explainId === "swpc"}
            >
              <SwpcStatusChip lang={lang} className="shadow-lg backdrop-blur-md" />
            </button>
          ) : null}
        </div>
      </div>

      {showSesPanel ? (
        <div
          ref={panelRef}
          className={`pointer-events-auto fixed ${zc("navMenu")} w-[min(20rem,calc(100vw-1.5rem))]`}
          style={{
            top: "calc(var(--mode-index-chip-stack-bottom, 3.5rem) + 0.4rem)",
            right: "max(0.75rem, env(safe-area-inset-right, 0px))",
            maxHeight:
              "calc(100dvh - var(--mode-index-chip-stack-bottom, 3.5rem) - var(--bottom-intel-stack-clearance, 8.5rem) - 1.5rem)",
          }}
          data-chrome-obstacle="ses-panel"
        >
          <SanctionsEvasionPanel lang={lang} onClose={() => setSesPanelOpen(false)} />
        </div>
      ) : null}

      {showExplain && explainId ? (
        <div
          ref={panelRef}
          className={`pointer-events-auto fixed ${zc("navMenu")} w-[min(22rem,calc(100vw-1.5rem))]`}
          style={{
            top: "calc(var(--mode-index-chip-stack-bottom, 3.5rem) + 0.4rem)",
            right: "max(0.75rem, env(safe-area-inset-right, 0px))",
            maxHeight:
              "calc(100dvh - var(--mode-index-chip-stack-bottom, 3.5rem) - var(--bottom-intel-stack-clearance, 8.5rem) - 1.5rem)",
          }}
          data-chrome-obstacle="metric-explain"
        >
          <MetricExplainPanel
            metricId={explainId}
            lang={lang}
            onClose={() => setExplainId(null)}
          />
        </div>
      ) : null}
    </>
  );
}
