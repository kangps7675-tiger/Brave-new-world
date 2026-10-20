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
import type { NewsStreamItem } from "@/lib/news/types";
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
  onOpenNewsInsight?: (item: NewsStreamItem) => void;
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
  onOpenNewsInsight,
  onCloseEconInsight,
  onSetEconNewsPanelReveal,
  onOpenIntelSheet,
}: GeoeconomicsChromeProps) {
  return (
    <>
      {econNavSelection &&
        isEconomyViewer &&
        !hasAnalysisSelection &&
        !econInsightOpen &&
        (econNewsPanelReveal ||
          !resolveCriticalNodeBrief({ navId: econNavSelection.id })) && (
          <>
            <button
              type="button"
              aria-label={t("ariaCloseEconomyRegion", labelLanguage)}
              className="absolute inset-0 z-[500] bg-black/20 lg:bg-black/10"
              onClick={onCloseEconNavSelection}
            />
            <EconomyRegionPanel
              selection={econNavSelection}
              onClose={onCloseEconNavSelection}
              onOpenIntel={onEconRegionOpenIntel}
              onFlyToMap={onEconRegionFlyToMap}
              onOpenNewsInsight={onOpenNewsInsight}
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
