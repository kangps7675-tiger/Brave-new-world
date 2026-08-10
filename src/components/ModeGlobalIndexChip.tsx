"use client";

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
  className?: string;
};

/**
 * 우상단 고정 — 모드별 전 세계 단일 지표.
 * 지정학: 글로벌 긴장지수(GTI).
 * 지경학: GSCPI + 해운 프록시 + PortWatch 3칩 + 세션 개장 (합산 점수 없음).
 *
 * 위치는 하드코딩. HoverNav·우측 사이드 레일과 CSS 변수로 맞추지 않는다.
 * 전자시계는 칩 왼쪽 — 상단 검색바(중앙·축소)와 겹치지 않게 우측 클러스터로 묶는다.
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

  return (
    <div
      className={`pointer-events-auto fixed z-[300] flex items-start gap-2 ${className}`}
      style={{
        top: "max(0.75rem, env(safe-area-inset-top, 0px))",
        right: "max(0.75rem, env(safe-area-inset-right, 0px))",
      }}
    >
      <ImmersionDigitalClock lang={lang} />
      <div className="flex flex-col items-end gap-1.5">
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
    </div>
  );
}
