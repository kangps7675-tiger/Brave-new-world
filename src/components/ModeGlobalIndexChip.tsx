"use client";

import { useEffect, useRef } from "react";
import { GscpiGaugeFromData } from "@/components/GscpiGaugeFromData";
import { WorldTensionChip } from "@/components/WorldTensionChip";
import { SwpcStatusChip } from "@/components/SwpcStatusChip";
import { FreightStressChip } from "@/components/FreightStressChip";
import { PortWatchStressChip } from "@/components/PortWatchStressChip";
import { MarketSessionChip } from "@/components/MarketSessionChip";
import { ImmersionDigitalClock } from "@/components/ImmersionDigitalClock";
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
  /**
   * 태블릿·중간 폭 — 스택을 한 줄로 압축, SWPC 숨김.
   * 우레일·유틸이 `--mode-index-chip-height`로 비켜설 수 있게 높이만 줄인다.
   */
  dense?: boolean;
  className?: string;
};

/**
 * 우상단 고정 — 모드별 전 세계 단일 지표.
 * 지정학: 글로벌 긴장지수(GTI).
 * 지경학: GSCPI + 해운 프록시 + PortWatch 3칩 + 세션 개장 (합산 점수 없음).
 *
 * 실제 높이·하단을 `--mode-index-chip-height` / `--mode-index-chip-bottom`으로 게시해
 * 우레일·compact 유틸 top이 겹치지 않게 한다.
 */
export function ModeGlobalIndexChip({
  viewerMode,
  lang,
  wtiScore,
  wtiDelta,
  wtiAsOf,
  showGscpi = true,
  showSwpc = true,
  dense = false,
  className = "",
}: ModeGlobalIndexChipProps) {
  const isEconomy = viewerMode === "economy";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!el) {
      root.style.setProperty("--mode-index-chip-height", "0px");
      root.style.setProperty("--mode-index-chip-bottom", "0px");
      return;
    }
    const publish = () => {
      const rect = el.getBoundingClientRect();
      const h = Math.max(0, Math.ceil(rect.height));
      const bottom = Math.max(0, Math.ceil(rect.bottom));
      const w = Math.max(0, Math.ceil(rect.width));
      root.style.setProperty("--mode-index-chip-height", `${h}px`);
      root.style.setProperty("--mode-index-chip-bottom", `${bottom}px`);
      root.style.setProperty("--mode-index-chip-width", `${w}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    window.addEventListener("resize", publish);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", publish);
      root.style.setProperty("--mode-index-chip-height", "0px");
      root.style.setProperty("--mode-index-chip-bottom", "0px");
      root.style.setProperty("--mode-index-chip-width", "0px");
    };
  }, [dense, isEconomy, showGscpi, showSwpc]);

  const showAuxSwpc = showSwpc && !dense;

  return (
    <div
      ref={ref}
      className={`pointer-events-auto fixed z-[300] flex items-start gap-2 ${className}`}
      style={{
        top: "max(0.75rem, env(safe-area-inset-top, 0px))",
        right: "max(0.75rem, env(safe-area-inset-right, 0px))",
      }}
      data-chrome-density={dense ? "dense" : "full"}
    >
      {!dense ? <ImmersionDigitalClock lang={lang} /> : null}
      <div
        className={`flex items-end gap-1.5 ${
          dense ? "flex-row flex-wrap justify-end" : "flex-col"
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
          <WorldTensionChip
            score={wtiScore}
            deltaScore={wtiDelta}
            asOf={wtiAsOf}
            lang={lang}
            className="shadow-lg backdrop-blur-md"
          />
        )}
        {showAuxSwpc ? <SwpcStatusChip lang={lang} className="shadow-lg backdrop-blur-md" /> : null}
      </div>
    </div>
  );
}
