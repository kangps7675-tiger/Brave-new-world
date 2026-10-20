"use client";

import { useMemo } from "react";
import type { NavSelection } from "@/data/navRegions";
import type { WhereIsItPoolItem } from "@/lib/whereIsItGame";
import { pickGdeltTierPins } from "@/lib/gdeltLocationTags";
import { resolveBottomAlertPanel } from "@/lib/localOverlayPolicy";
import { ultraLiteGdeltPinScale } from "@/lib/ultraLiteMode";
import {
  ECON_NAV_TO_CRITICAL_NODE,
  focusCriticalNodeIds,
} from "@/data/criticalNodes";
import { stressForChokepoint } from "@/lib/chokepointStressForUi";
import { chokeStressHex } from "@/lib/chokeStressColor";
import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import { assetVolatilityHintForPoint } from "@/lib/assetVolatilityHint";
import type { StaticGlobePoint } from "@/components/globe/types";
import type { AisVessel, ConflictEvent, FirmsFire, StaticPoint } from "@/data/geoTypes";

export type UseAlertDisplayModelOptions = {
  gdeltEvents: ConflictEvent[];
  firmsFires: FirmsFire[];
  aisVessels: AisVessel[];
  scoredEvents: Parameters<typeof pickGdeltTierPins>[0];
  gdeltMenuCoreAlerts: ConflictEvent[];
  localDisputeAlerts: unknown[];
  showGdeltLayers: boolean;
  showAnyDisputeOverlay: boolean;
  gdeltError: string | null;
  gdeltLoading: boolean;
  loadError: string | null;
  isLoading: boolean;
  showLocalAlertPanel: boolean;
  showGdeltAlertPanel: boolean;
  showGdeltAlliance: boolean;
  showGdeltProtests: boolean;
  layerViewState: { lat: number; lng: number; altitude: number };
  ultraLite: boolean;
  econNavSelection: NavSelection | null;
  visibleStaticPoints: StaticPoint[];
  showLogisticsRisk: boolean;
  showLogisticsStress: boolean;
  ukmtoIncidents: Parameters<typeof stressForChokepoint>[1];
  portWatchByChokeId: Record<string, Parameters<typeof stressForChokepoint>[2]>;
  assetTickerSnapshot: Parameters<typeof assetVolatilityHintForPoint>[1];
};

/** 우측 하단 경보·GDELT 핀·정적 포인트·병목 글로우 — GlobeDashboard에서 추출. */
export function useAlertDisplayModel(opts: UseAlertDisplayModelOptions) {
  const {
    gdeltEvents,
    firmsFires,
    aisVessels,
    scoredEvents,
    gdeltMenuCoreAlerts,
    localDisputeAlerts,
    showGdeltLayers,
    showAnyDisputeOverlay,
    gdeltError,
    gdeltLoading,
    loadError,
    isLoading,
    showLocalAlertPanel,
    showGdeltAlertPanel,
    showGdeltAlliance,
    showGdeltProtests,
    layerViewState,
    ultraLite,
    econNavSelection,
    visibleStaticPoints,
    showLogisticsRisk,
    showLogisticsStress,
    ukmtoIncidents,
    portWatchByChokeId,
    assetTickerSnapshot,
  } = opts;

  const whereIsItPool = useMemo((): WhereIsItPoolItem[] => {
    const out: WhereIsItPoolItem[] = [];
    for (const e of gdeltEvents.slice(0, 80)) {
      if (Number.isFinite(e.lat) && Number.isFinite(e.lng)) {
        out.push({ lat: e.lat, lng: e.lng, source: "gdelt", id: e.id });
      }
    }
    for (const f of firmsFires.slice(0, 60)) {
      if (Number.isFinite(f.lat) && Number.isFinite(f.lng)) {
        out.push({ lat: f.lat, lng: f.lng, source: "firms", id: f.id });
      }
    }
    for (const v of aisVessels.slice(0, 40)) {
      if (Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
        out.push({ lat: v.lat, lng: v.lng, source: "ais", id: v.id });
      }
    }
    return out;
  }, [aisVessels, firmsFires, gdeltEvents]);

  const bottomAlertPanel = useMemo(
    () =>
      resolveBottomAlertPanel({
        showGdeltLayers,
        showDisputes: showAnyDisputeOverlay,
        gdeltError,
        gdeltLoading,
        gdeltAlertCount: gdeltMenuCoreAlerts.length,
        loadError,
        isLoading,
        localAlertCount: localDisputeAlerts.length,
        wantLocalPanel: showLocalAlertPanel,
        wantGdeltPanel: showGdeltAlertPanel,
      }),
    [
      showGdeltLayers,
      showAnyDisputeOverlay,
      gdeltError,
      gdeltLoading,
      gdeltMenuCoreAlerts.length,
      loadError,
      isLoading,
      localDisputeAlerts.length,
      showLocalAlertPanel,
      showGdeltAlertPanel,
    ],
  );

  const gdeltTierPins = useMemo(() => {
    const pins = pickGdeltTierPins(scoredEvents, {
      showAlliance: showGdeltAlliance,
      showProtest: showGdeltProtests,
      view: layerViewState,
    });
    if (!ultraLite) return pins;
    const max = Math.max(4, Math.ceil(pins.length * ultraLiteGdeltPinScale()));
    return pins.slice(0, Math.min(50, max));
  }, [layerViewState, scoredEvents, showGdeltAlliance, showGdeltProtests, ultraLite]);

  const staticGlobePoints = useMemo<StaticGlobePoint[]>(() => {
    const focusNodeId = econNavSelection
      ? ECON_NAV_TO_CRITICAL_NODE[econNavSelection.id]
      : undefined;
    const focusIds = focusCriticalNodeIds(focusNodeId);
    const focusing = focusIds.size > 0;

    return visibleStaticPoints
      .filter((point) => {
        if (point.kind !== "critical-node" || !focusing) return true;
        const id = String(point.meta?.criticalNodeId ?? "");
        return focusIds.has(id);
      })
      .map((point) => {
        if (point.kind !== "critical-node" || !focusing) {
          return {
            ...point,
            markerId: `static-${point.id}`,
            displayKind: "static" as const,
          };
        }
        const id = String(point.meta?.criticalNodeId ?? "");
        const isPrimary = id === focusNodeId;
        return {
          ...point,
          markerId: `static-${point.id}`,
          displayKind: "static" as const,
          meta: {
            ...point.meta,
            focusRole: isPrimary ? "primary" : "cascade",
          },
        };
      });
  }, [econNavSelection, visibleStaticPoints]);

  const chokeGlowColorById = useMemo(() => {
    if (!showLogisticsRisk || !showLogisticsStress) return undefined;
    const out: Record<string, string> = {};
    for (const p of LOGISTICS_RISK_POINTS) {
      if (p.kind !== "chokepoint") continue;
      const stress = stressForChokepoint(
        p,
        ukmtoIncidents,
        portWatchByChokeId[p.id] ?? null,
        assetVolatilityHintForPoint(p.meta?.relatedTickers as string | undefined, assetTickerSnapshot),
      );
      out[p.id] = chokeStressHex(stress.level);
    }
    return out;
  }, [showLogisticsRisk, showLogisticsStress, ukmtoIncidents, portWatchByChokeId, assetTickerSnapshot]);

  return {
    whereIsItPool,
    bottomAlertPanel,
    gdeltTierPins,
    staticGlobePoints,
    chokeGlowColorById,
  };
}
