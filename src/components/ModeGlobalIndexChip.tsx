"use client";

import { useEffect, useRef } from "react";
import { GscpiGaugeFromData } from "@/components/GscpiGaugeFromData";
import { WorldTensionChip } from "@/components/WorldTensionChip";
import { SwpcStatusChip } from "@/components/SwpcStatusChip";
import { FreightStressChip } from "@/components/FreightStressChip";
import { PortWatchStressChip } from "@/components/PortWatchStressChip";
import { MarketSessionChip } from "@/components/MarketSessionChip";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

type ModeGlobalIndexChipProps = {
  viewerMode: ViewerMode;
  lang: LabelLanguage;
  /** GTI 점수 (지정학) */
  wtiScore: number | null;
  wtiDelta?: number | null;
  wtiAsOf?: string | null;
  /** 지경학 GSCPI 게이지 표시 여부 */
  showGscpi?: boolean;
  /** NOAA SWPC 우주기상 칩 */
  showSwpc?: boolean;
  className?: string;
};

/**
 * 우상단 고정 — 모드별 전 세계 단일 지표.
 * 지정학: 글로벌 긴장지수(GTI).
 * 지경학: GSCPI + 해운 프록시 + PortWatch 3칩 + 세션 개장 (합산 점수 없음).
 */
export function ModeGlobalIndexChip({
  viewerMode,
  lang,
  wtiScore,
  wtiDelta,
  wtiAsOf,
  showGscpi = true,
  showSwpc = true,
  className = "",
}: ModeGlobalIndexChipProps) {
  const isEconomy = viewerMode === "economy";
  const ref = useRef<HTMLDivElement>(null);

  /**
   * 우측 상단 레일(항모·후원·Watch 등)이 이 칩 아래로 비켜설 수 있게
   * 실제 높이를 `--mode-index-chip-height`로 publish. 언마운트 시 0으로 복구.
   */
  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!el) {
      root.style.setProperty("--mode-index-chip-height", "0px");
      return;
    }
    const publish = () => {
      const h = Math.max(0, Math.ceil(el.getBoundingClientRect().height));
      root.style.setProperty("--mode-index-chip-height", `${h}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty("--mode-index-chip-height", "0px");
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`pointer-events-auto fixed right-3 z-[80] flex flex-col items-end gap-1.5 sm:right-4 ${className}`}
      style={{
        top: "calc(var(--hover-nav-base-height, 0px) + max(0.45rem, env(safe-area-inset-top, 0px)))",
      }}
    >
      {isEconomy ? (
        <>
          {showGscpi ? (
            <GscpiGaugeFromData lang={lang} compact className="shadow-lg backdrop-blur-md" />
          ) : null}
          <div className="flex flex-wrap justify-end gap-1.5">
            <FreightStressChip lang={lang} />
            <PortWatchStressChip lang={lang} />
          </div>
          <MarketSessionChip lang={lang} />
        </>
      ) : (
        <WorldTensionChip
          score={wtiScore}
          deltaScore={wtiDelta}
          asOf={wtiAsOf}
          lang={lang}
          className="shadow-lg backdrop-blur-md"
        />
      )}
      {showSwpc ? <SwpcStatusChip lang={lang} className="shadow-lg backdrop-blur-md" /> : null}
    </div>
  );
}
