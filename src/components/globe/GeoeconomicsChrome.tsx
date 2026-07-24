"use client";

import {
  CriticalNodeInsightParchment,
  EconInsightParchment,
} from "@/components/EconInsightParchment";
import { EconomyRegionPanel } from "@/components/EconomyRegionPanel";
import type { EconInsightBrief } from "@/data/econInsightBriefs";
import type { NavSelection } from "@/data/navRegions";
import { resolveCriticalNodeBrief } from "@/data/resolveCriticalNodeBrief";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { IntelTheaterFilter, MapFlyTarget } from "@/lib/news/theaterMap";
import { t } from "@/lib/uiStrings";

export type GeoeconomicsChromeProps = {
  labelLanguage: LabelLanguage;
  isEconomyViewer: boolean;
  hasAnalysisSelection: boolean;
  econNavSelection: NavSelection | null;
  econInsightOpen: boolean;
  econInsightBrief: EconInsightBrief | null;
  econInsightCompact: boolean;
  econNewsPanelReveal: boolean;
  onCloseEconNavSelection: () => void;
  onEconRegionOpenIntel: () => void;
  onEconRegionFlyToMap: (target: MapFlyTarget) => void;
  onCloseEconInsight: () => void;
  onSetEconNewsPanelReveal: (reveal: boolean) => void;
  onOpenIntelSheet: (options?: {
    theater?: IntelTheaterFilter;
    tab?: "news" | "video" | "telegram" | "viina";
    lat?: number;
    lng?: number;
    altitude?: number;
  }) => void;
};

export function GeoeconomicsChrome({
  labelLanguage,
  isEconomyViewer,
  hasAnalysisSelection,
  econNavSelection,
  econInsightOpen,
  econInsightBrief,
  econInsightCompact,
  econNewsPanelReveal,
  onCloseEconNavSelection,
  onEconRegionOpenIntel,
  onEconRegionFlyToMap,
  onCloseEconInsight,
  onSetEconNewsPanelReveal,
  onOpenIntelSheet,
}: GeoeconomicsChromeProps) {
  return (
    <>
      {econNavSelection &&
        !hasAnalysisSelection &&
        !econInsightOpen &&
        (econNewsPanelReveal ||
          !resolveCriticalNodeBrief({ navId: econNavSelection.id })) && (
          <>
            <button
              type="button"
              aria-label={t("ariaCloseEconomyRegion", labelLanguage)}
              className="absolute inset-0 z-20 bg-black/15 lg:bg-transparent"
              onClick={onCloseEconNavSelection}
            />
            <EconomyRegionPanel
              selection={econNavSelection}
              onClose={onCloseEconNavSelection}
              onOpenIntel={onEconRegionOpenIntel}
              onFlyToMap={onEconRegionFlyToMap}
            />
          </>
        )}

      {econInsightOpen && econInsightBrief ? (
        econInsightCompact ? (
          <CriticalNodeInsightParchment
            lang={labelLanguage}
            brief={econInsightBrief}
            onMapOnly={onCloseEconInsight}
            onOpenNews={() => {
              onCloseEconInsight();
              if (isEconomyViewer) {
                onSetEconNewsPanelReveal(true);
              } else {
                onOpenIntelSheet({ theater: "all", tab: "news" });
              }
            }}
          />
        ) : (
          <EconInsightParchment
            lang={labelLanguage}
            brief={econInsightBrief}
            onMapOnly={onCloseEconInsight}
            onOpenNews={() => {
              onCloseEconInsight();
              onSetEconNewsPanelReveal(true);
            }}
          />
        )
      ) : null}
    </>
  );
}
