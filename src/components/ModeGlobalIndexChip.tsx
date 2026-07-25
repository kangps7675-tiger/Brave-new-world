"use client";

import { GscpiGaugeFromData } from "@/components/GscpiGaugeFromData";
import { WorldTensionChip } from "@/components/WorldTensionChip";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

type ModeGlobalIndexChipProps = {
  viewerMode: ViewerMode;
  lang: LabelLanguage;
  /** WTI 점수 (지정학) */
  wtiScore: number | null;
  wtiDelta?: number | null;
  wtiAsOf?: string | null;
  /** 지경학 GSCPI 게이지 표시 여부 */
  showGscpi?: boolean;
  className?: string;
};

/**
 * 우상단 고정 — 모드별 전 세계 단일 지표.
 * 지정학: 세계 긴장도(WTI) · 지경학: 물류 혼잡도(GSCPI, 월간). 둘 다 0~100 점수.
 * HoverNav 높이만큼 아래로 밀어 겹침을 피한다.
 */
export function ModeGlobalIndexChip({
  viewerMode,
  lang,
  wtiScore,
  wtiDelta,
  wtiAsOf,
  showGscpi = true,
  className = "",
}: ModeGlobalIndexChipProps) {
  const isEconomy = viewerMode === "economy";

  return (
    <div
      className={`pointer-events-auto fixed right-3 z-[80] flex flex-col items-end sm:right-4 ${className}`}
      style={{
        top: "calc(var(--hover-nav-base-height, 0px) + max(0.45rem, env(safe-area-inset-top, 0px)))",
      }}
    >
      {isEconomy ? (
        showGscpi ? (
          <GscpiGaugeFromData lang={lang} compact className="shadow-lg backdrop-blur-md" />
        ) : null
      ) : (
        <WorldTensionChip
          score={wtiScore}
          deltaScore={wtiDelta}
          asOf={wtiAsOf}
          lang={lang}
          className="shadow-lg backdrop-blur-md"
        />
      )}
    </div>
  );
}
