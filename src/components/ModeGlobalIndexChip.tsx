"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GscpiGaugeFromData } from "@/components/GscpiGaugeFromData";
import { WorldTensionChip } from "@/components/WorldTensionChip";
import { SanctionsEvasionChip } from "@/components/SanctionsEvasionChip";
import { SanctionsEvasionPanel } from "@/components/SanctionsEvasionPanel";
import { SwpcStatusChip } from "@/components/SwpcStatusChip";
import { FreightStressChip } from "@/components/FreightStressChip";
import { PortWatchStressChip } from "@/components/PortWatchStressChip";
import { MarketSessionChip } from "@/components/MarketSessionChip";
import { ImmersionDigitalClock } from "@/components/ImmersionDigitalClock";
import { useSanctionsEvasionSnapshot } from "@/hooks/useSanctionsEvasionSnapshot";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

type ModeGlobalIndexChipProps = {
  viewerMode: ViewerMode;
  lang: LabelLanguage;
  /** GTI 점수 (지정학) */
  wtiScore: number | null;
  wtiDelta?: number | null;
  wtiAsOf?: string | null;
  /** 공식 스냅샷 대신 전장 점수로 즉석 산출한 잠정치인지 */
  wtiIsEstimate?: boolean | null;
  /** 지정학 제재 회피 강도 칩 */
  showSesChip?: boolean;
  /** 지경학 GSCPI 게이지 표시 여부 */
  showGscpi?: boolean;
  /** NOAA SWPC 우주기상 칩 */
  showSwpc?: boolean;
  dense?: boolean;
  className?: string;
};

/**
 * 우상단 고정 — 모드별 전 세계 단일 지표.
 * 지정학: GTS + 제재 회피 강도 + SWPC — 세로 스택.
 * `--mode-index-chip-stack-bottom` = 칩만, `--mode-index-chip-bottom` = 열린 패널까지
 * (우측 레ail이 패널 아래로 밀리도록).
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
  const sesEntry = useSanctionsEvasionSnapshot();

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
    if (sesPanelOpen && panelEl) {
      const panelBottom = Math.ceil(panelEl.getBoundingClientRect().bottom);
      chromeBottom = Math.max(stackBottom, panelBottom);
    }

    root.style.setProperty("--mode-index-chip-height", `${stackHeight}px`);
    root.style.setProperty("--mode-index-chip-stack-bottom", `${stackBottom}px`);
    root.style.setProperty("--mode-index-chip-bottom", `${chromeBottom}px`);
    root.style.setProperty("--mode-index-chip-width", `${stackWidth}px`);
  }, [sesPanelOpen]);

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
  }, [publishChromeObstacles, sesPanelOpen]);

  /** 패널 DOM 마운트 직후 한 프레임 뒤 재측정 */
  useEffect(() => {
    if (!sesPanelOpen) return;
    const id = window.requestAnimationFrame(publishChromeObstacles);
    return () => window.cancelAnimationFrame(id);
  }, [sesPanelOpen, publishChromeObstacles]);

  const showAuxSwpc = showSwpc && !dense;
  const showSesPanel = !isEconomy && showSesChip && sesPanelOpen;

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
                <GscpiGaugeFromData lang={lang} compact className="shadow-lg backdrop-blur-md" />
              ) : null}
              <div className="flex flex-wrap justify-end gap-1.5">
                <FreightStressChip lang={lang} />
                <PortWatchStressChip lang={lang} />
                {dense ? <MarketSessionChip lang={lang} /> : null}
              </div>
              {!dense ? <MarketSessionChip lang={lang} /> : null}
            </>
          ) : (
            <>
              <WorldTensionChip
                score={wtiScore}
                deltaScore={wtiDelta}
                asOf={wtiAsOf}
                isEstimate={Boolean(wtiIsEstimate)}
                lang={lang}
                className="w-full max-w-full shadow-lg backdrop-blur-md"
              />
              {showSesChip ? (
                <SanctionsEvasionChip
                  score={sesEntry.snapshot?.score ?? null}
                  deltaScore={sesEntry.snapshot?.deltaScore}
                  asOf={sesEntry.snapshot?.generatedAt ?? sesEntry.loadedAt}
                  lang={lang}
                  dense={dense}
                  active={sesPanelOpen}
                  onClick={() => setSesPanelOpen((v) => !v)}
                  className="w-full max-w-full shadow-lg backdrop-blur-md"
                />
              ) : null}
            </>
          )}
          {showAuxSwpc ? (
            <SwpcStatusChip lang={lang} className="shadow-lg backdrop-blur-md" />
          ) : null}
        </div>
      </div>

      {showSesPanel ? (
        <div
          ref={panelRef}
          className="pointer-events-auto fixed z-[305] w-[min(20rem,calc(100vw-1.5rem))]"
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
    </>
  );
}
