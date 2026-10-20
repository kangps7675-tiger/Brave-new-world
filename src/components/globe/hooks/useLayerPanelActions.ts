"use client";

import { useCallback, useEffect, type Dispatch, type SetStateAction, type MutableRefObject } from "react";
import type { LayerCategory } from "@/components/LayerCategoryPanel";
import type { LayerPanelTab } from "@/components/globe/LayerPanelHost";
import { EMPTY_LAYER_CATEGORIES } from "@/components/globe/constants";
import type { Selection } from "@/components/globe/types";
import type { FrictionTimelineStage } from "@/data/frictionEpisodeDeep";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import type { NavSelection } from "@/data/navRegions";
import { territorialEpisodeLat, territorialEpisodeLng, altitudeFromTerritorialZoom, territorialDeepDoc } from "@/data/territorialDisputeDeep";
import type { TerritorialDisputeEpisode } from "@/data/territorialDisputeEpisodes";
import { LAYER_ITEM_PREF_KEYS } from "@/lib/layerItemPrefKeys";
import { type LayerPrefs, DEFAULT_LAYER_PREFS, type LabelLanguage } from "@/lib/layerPrefs";
import { applyUltraLiteToLayerPrefs } from "@/lib/ultraLiteMode";

export type UseLayerPanelActionsOptions = {
  showLeftPanel: boolean;
  setShowLeftPanel: Dispatch<SetStateAction<boolean>>;
  leftPanelTab: LayerPanelTab;
  setLeftPanelTab: Dispatch<SetStateAction<LayerPanelTab>>;
  layerPanelDirty: boolean;
  setLayerPanelDirty: Dispatch<SetStateAction<boolean>>;
  deferLayerMapApplyRef: MutableRefObject<boolean>;
  panelDraftPatchRef: MutableRefObject<Partial<LayerPrefs>>;
  categorySnapshotRef: MutableRefObject<LayerCategory[] | null>;
  layerPanelSessionRef: MutableRefObject<number>;
  setIntelSheetOpen: Dispatch<SetStateAction<boolean>>;
  layerPanelReady: boolean;
  frozenPanelCategories: LayerCategory[] | null;
  setFrozenPanelCategories: Dispatch<SetStateAction<LayerCategory[] | null>>;
  setFrictionEpisodeBrief: Dispatch<SetStateAction<FrictionEpisode | null>>;
  setSelected: Dispatch<SetStateAction<Selection | null>>;
  ultraLiteRef: MutableRefObject<boolean>;
  layerPrefs: LayerPrefs;
  applyLayerPrefs: (next: LayerPrefs) => void;
  peekDraftPrefs: () => LayerPrefs;
  labelLanguage: LabelLanguage;
  setRegionNavSelection: Dispatch<SetStateAction<NavSelection | null>>;
  setEconNavSelection: Dispatch<SetStateAction<NavSelection | null>>;
  setRegimeSelectedEpisodeId: Dispatch<SetStateAction<string | null>>;
  setDisputeEpisodeSelectedId: Dispatch<SetStateAction<string | null>>;
  setTerritorialEpisodeBrief: Dispatch<SetStateAction<TerritorialDisputeEpisode | null>>;
  setTerritorialActiveStageId: Dispatch<SetStateAction<string | null>>;
  setTerritorialRevealedStageIds: Dispatch<SetStateAction<string[]>>;
  territorialSequenceRef: MutableRefObject<number[]>;
  clearTerritorialSequence: () => void;
  setFrictionActiveStageId: Dispatch<SetStateAction<string | null>>;
  historyImmersionRef: MutableRefObject<boolean>;
  flyTo: (lat: number, lng: number, altitude?: number | undefined, durationMs?: number | undefined, camera?: { pitch?: number | undefined; bearing?: number | undefined; } | undefined) => void;
  clearFrictionEpisodeTimer: () => void;
  layerCategories: LayerCategory[];
};

/**
 * 레이어 패널·좌측 드로어·마찰/영유권 에피소드 시작 콜백 묶음.
 * GlobeDashboard에서 추출 (분리 Phase D).
 */
export function useLayerPanelActions(opts: UseLayerPanelActionsOptions) {
  const {
    showLeftPanel,
    setShowLeftPanel,
    leftPanelTab,
    setLeftPanelTab,
    layerPanelDirty,
    setLayerPanelDirty,
    deferLayerMapApplyRef,
    panelDraftPatchRef,
    categorySnapshotRef,
    layerPanelSessionRef,
    setIntelSheetOpen,
    layerPanelReady,
    frozenPanelCategories,
    setFrozenPanelCategories,
    setFrictionEpisodeBrief,
    setSelected,
    ultraLiteRef,
    layerPrefs,
    applyLayerPrefs,
    peekDraftPrefs,
    labelLanguage,
    setRegionNavSelection,
    setEconNavSelection,
    setRegimeSelectedEpisodeId,
    setDisputeEpisodeSelectedId,
    setTerritorialEpisodeBrief,
    setTerritorialActiveStageId,
    setTerritorialRevealedStageIds,
    territorialSequenceRef,
    clearTerritorialSequence,
    setFrictionActiveStageId,
    historyImmersionRef,
    flyTo,
    clearFrictionEpisodeTimer,
    layerCategories,
  } = opts;

  useEffect(() => {
    categorySnapshotRef.current = null;
    setFrozenPanelCategories(null);
  }, [labelLanguage]);

  useEffect(() => {
    if (!showLeftPanel) {
      categorySnapshotRef.current = null;
      panelDraftPatchRef.current = {};
      setFrozenPanelCategories(null);
      return;
    }
    if (
      layerPanelReady &&
      frozenPanelCategories === null &&
      layerCategories !== EMPTY_LAYER_CATEGORIES
    ) {
      categorySnapshotRef.current = layerCategories;
      setFrozenPanelCategories(layerCategories);
    }
  }, [frozenPanelCategories, layerCategories, layerPanelReady, showLeftPanel]);

  const dismissLayerPanel = useCallback(
    (closePanel = true) => {
      // soft-apply 중인 초안이 있으면 닫을 때 커밋(버리기 → 체크했는데 안 보임 방지)
      if (layerPanelDirty) {
        deferLayerMapApplyRef.current = false;
        const latest = peekDraftPrefs();
        applyLayerPrefs(latest);
        panelDraftPatchRef.current = {};
        setLayerPanelDirty(false);
      }
      deferLayerMapApplyRef.current = false;
      if (closePanel) {
        setShowLeftPanel(false);
      }
      const flush = () => {
        categorySnapshotRef.current = null;
        setFrozenPanelCategories(null);
      };
      if (closePanel && typeof window !== "undefined") {
        window.requestAnimationFrame(flush);
      } else {
        flush();
      }
    },
    [applyLayerPrefs, layerPanelDirty, peekDraftPrefs],
  );

  const toggleLeftPanel = useCallback(() => {
    if (showLeftPanel) {
      dismissLayerPanel(true);
      return;
    }
    setLeftPanelTab("layers");
    setSelected(null);
    setIntelSheetOpen(false);
    if (!historyImmersionRef.current) setRegionNavSelection(null);
    setEconNavSelection(null);
    setShowLeftPanel(true);
  }, [dismissLayerPanel, showLeftPanel]);

  const openLeftDrawer = useCallback(
    (tab: LayerPanelTab) => {
      if (showLeftPanel && leftPanelTab === tab) {
        dismissLayerPanel(true);
        return;
      }
      setLeftPanelTab(tab);
      setSelected(null);
      setIntelSheetOpen(false);
      if (!historyImmersionRef.current) setRegionNavSelection(null);
      setEconNavSelection(null);
      setShowLeftPanel(true);
    },
    [dismissLayerPanel, leftPanelTab, showLeftPanel],
  );

  const closeLeftPanel = useCallback(() => {
    dismissLayerPanel(true);
  }, [dismissLayerPanel]);

  const ensureLeftPanelOpen = useCallback(() => {
    setLeftPanelTab("layers");
    setShowLeftPanel(true);
  }, []);

  const handleResetCheckboxSettings = useCallback(() => {
    const next: LayerPrefs = ultraLiteRef.current
      ? applyUltraLiteToLayerPrefs({
          ...DEFAULT_LAYER_PREFS,
          labelLanguage: layerPrefs.labelLanguage,
        })
      : {
          ...DEFAULT_LAYER_PREFS,
          labelLanguage: layerPrefs.labelLanguage,
        };
    panelDraftPatchRef.current = {};
    deferLayerMapApplyRef.current = false;
    applyLayerPrefs(next);
    setLayerPanelDirty(false);

    const base = categorySnapshotRef.current ?? frozenPanelCategories;
    if (base) {
      const updated = base.map((category) => ({
        ...category,
        items: category.items.map((item) => {
          const key = LAYER_ITEM_PREF_KEYS[item.id];
          if (!key || typeof next[key] !== "boolean") return item;
          return { ...item, checked: next[key] as boolean };
        }),
      }));
      categorySnapshotRef.current = updated;
      setFrozenPanelCategories(updated);
    }
    layerPanelSessionRef.current += 1;
  }, [applyLayerPrefs, frozenPanelCategories, layerPrefs.labelLanguage]);

  const selectFrictionStage = useCallback(
    (stage: FrictionTimelineStage) => {
      setFrictionActiveStageId(stage.id);
      flyTo(stage.coordinates[1], stage.coordinates[0], 0.72, 900, { pitch: 48, bearing: -8 });
    },
    [flyTo],
  );

  const selectTerritorialStage = useCallback(
    (stage: FrictionTimelineStage) => {
      setTerritorialActiveStageId(stage.id);
      setTerritorialRevealedStageIds((prev) =>
        prev.includes(stage.id) ? prev : [...prev, stage.id],
      );
      flyTo(stage.coordinates[1], stage.coordinates[0], 0.72, 900, {
        pitch: 48,
        bearing: -8,
      });
    },
    [flyTo],
  );

  const beginTerritorialEpisode = useCallback(
    (episode: TerritorialDisputeEpisode) => {
      clearTerritorialSequence();
      clearFrictionEpisodeTimer();
      setRegimeSelectedEpisodeId(null);
      setFrictionEpisodeBrief(null);
      setFrictionActiveStageId(null);
      setDisputeEpisodeSelectedId(episode.id);
      setTerritorialEpisodeBrief(null);
      setTerritorialActiveStageId(null);
      setTerritorialRevealedStageIds([]);

      flyTo(
        territorialEpisodeLat(episode),
        territorialEpisodeLng(episode),
        altitudeFromTerritorialZoom(episode.zoom),
        1100,
        { pitch: 48, bearing: -6 },
      );

      const deep = territorialDeepDoc(episode.id);
      const stages = [...(deep?.stages ?? [])].sort((a, b) => a.order - b.order);
      stages.forEach((stage, index) => {
        const timer = window.setTimeout(() => {
          setTerritorialRevealedStageIds((prev) =>
            prev.includes(stage.id) ? prev : [...prev, stage.id],
          );
          setTerritorialActiveStageId(stage.id);
          flyTo(stage.coordinates[1], stage.coordinates[0], 0.7, 850, {
            pitch: 50,
            bearing: -10 + index * 4,
          });
        }, 650 + index * 900);
        territorialSequenceRef.current.push(timer);
      });

      const parchmentTimer = window.setTimeout(
        () => {
          setTerritorialEpisodeBrief(episode);
        },
        650 + stages.length * 900 + 700,
      );
      territorialSequenceRef.current.push(parchmentTimer);
    },
    [clearFrictionEpisodeTimer, clearTerritorialSequence, flyTo],
  );

  return {
    dismissLayerPanel,
    toggleLeftPanel,
    openLeftDrawer,
    closeLeftPanel,
    ensureLeftPanelOpen,
    handleResetCheckboxSettings,
    selectFrictionStage,
    selectTerritorialStage,
    beginTerritorialEpisode,
  };
}
