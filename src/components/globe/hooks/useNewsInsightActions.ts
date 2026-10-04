"use client";

import { useCallback, useEffect, type Dispatch, type SetStateAction, type MutableRefObject } from "react";
import type { AskLayersApplyPayload } from "@/components/AskLayersOverlay";
import type { NewsInsightApplyPayload } from "@/components/NewsInsightPanel";
import type { EntryGate, NewsStreamNeonMarker, NewsInsightCalloutMarker, Selection } from "@/components/globe/types";
import type { NavSelection } from "@/data/navRegions";
import { type NewsInsightMode, patchFromNewsInsightIds, resolveFlyHint } from "@/data/newsInsightCatalog";
import type { CameraViewState } from "@/hooks/useCameraViewport";
import { detectBattlefieldZone, applyBattlefieldPreset, type BattlefieldZone } from "@/lib/battlefieldPresets";
import { buildDomainOverviewPrefs } from "@/lib/entryOverview";
import type { LayerPrefs } from "@/lib/layerPrefs";
import { THEATER_FLY_TO } from "@/lib/news/theaterMap";
import type { NewsStreamItem } from "@/lib/news/types";
import { stripEconomyGeopoliticsPatch } from "@/lib/viewerChrome";

import type { EnterEconomyRegionFocusFn, EnterTheaterFocusFn } from "@/components/globe/hooks/useTheaterNavigation";

export type UseNewsInsightActionsOptions = {
  showLeftPanel: boolean;
  layerDropdownOpen: boolean;
  layerPanelDirty: boolean;
  setIntelSheetOpen: Dispatch<SetStateAction<boolean>>;
  isEconomyViewer: boolean;
  layerPrefsLiveRef: MutableRefObject<LayerPrefs>;
  showModePicker: boolean;
  entryGate: EntryGate;
  setNewsPerspectives: Dispatch<SetStateAction<NewsStreamNeonMarker | null>>;
  setNewsInsightCallout: Dispatch<SetStateAction<NewsInsightCalloutMarker | null>>;
  battlefieldSoftZoneRef: MutableRefObject<BattlefieldZone | null>;
  battlefieldManualUntilRef: MutableRefObject<number>;
  userLayerPinRef: MutableRefObject<boolean>;
  pinUserLayers: () => void;
  selected: Selection | null;
  setSelected: Dispatch<SetStateAction<Selection | null>>;
  ultraLiteRef: MutableRefObject<boolean>;
  applyLayerPrefs: (next: LayerPrefs) => void;
  patchLayerPrefsSoft: (patch: Partial<LayerPrefs>) => void;
  setEconNavSelection: Dispatch<SetStateAction<NavSelection | null>>;
  setEconNewsPanelReveal: Dispatch<SetStateAction<boolean>>;
  historyStoryLockedRef: MutableRefObject<boolean>;
  filterCenter: { lat: number; lng: number; };
  flyTo: (lat: number, lng: number, altitude?: number | undefined, durationMs?: number | undefined, camera?: { pitch?: number | undefined; bearing?: number | undefined; } | undefined) => void;
  interruptFlySnap: () => void;
  layerViewState: CameraViewState;
  dismissLayerPanel: (closePanel?: boolean) => void;
  enterTheaterFocus: EnterTheaterFocusFn;
  enterEconomyRegionFocus: EnterEconomyRegionFocusFn;
};

/**
 * 레이어 질문 적용·뉴스 인사이트 지도 적용·네비게이션 핸들러 묶음.
 * GlobeDashboard에서 추출 (분리 Phase D).
 */
export function useNewsInsightActions(opts: UseNewsInsightActionsOptions) {
  const {
    showLeftPanel,
    layerDropdownOpen,
    layerPanelDirty,
    setIntelSheetOpen,
    isEconomyViewer,
    layerPrefsLiveRef,
    showModePicker,
    entryGate,
    setNewsPerspectives,
    setNewsInsightCallout,
    battlefieldSoftZoneRef,
    battlefieldManualUntilRef,
    userLayerPinRef,
    pinUserLayers,
    selected,
    setSelected,
    ultraLiteRef,
    applyLayerPrefs,
    patchLayerPrefsSoft,
    setEconNavSelection,
    setEconNewsPanelReveal,
    historyStoryLockedRef,
    filterCenter,
    flyTo,
    interruptFlySnap,
    layerViewState,
    dismissLayerPanel,
    enterTheaterFocus,
    enterEconomyRegionFocus,
  } = opts;

  const handleAskLayersApply = useCallback(
    (payload: AskLayersApplyPayload) => {
      if (payload.patch && Object.keys(payload.patch).length > 0) {
        pinUserLayers();
        const patch = isEconomyViewer
          ? stripEconomyGeopoliticsPatch(payload.patch)
          : payload.patch;
        patchLayerPrefsSoft(patch);
      }
      const intent = payload.intent;
      if (intent === "middle-east" || intent === "red-sea-houthi" || intent === "today-hot") {
        battlefieldSoftZoneRef.current = "middle-east";
        battlefieldManualUntilRef.current = Date.now() + 24_000;
      } else if (intent === "ukraine") {
        battlefieldSoftZoneRef.current = "ukraine";
        battlefieldManualUntilRef.current = Date.now() + 24_000;
      } else if (intent === "china-taiwan") {
        battlefieldSoftZoneRef.current = "taiwan";
        battlefieldManualUntilRef.current = Date.now() + 24_000;
      } else if (intent === "korea") {
        battlefieldSoftZoneRef.current = "korea";
        battlefieldManualUntilRef.current = Date.now() + 24_000;
      }
      if (payload.fly) {
        interruptFlySnap();
        flyTo(payload.fly.lat, payload.fly.lng, payload.fly.altitude);
      }
    },
    [flyTo, interruptFlySnap, isEconomyViewer, patchLayerPrefsSoft, pinUserLayers],
  );

  const handleOpenNewsInsight = useCallback(
    (article: NewsStreamItem) => {
      dismissLayerPanel(true);
      setIntelSheetOpen(false);
      setNewsPerspectives(null);
      setNewsInsightCallout(null);
      setEconNavSelection(null);
      setEconNewsPanelReveal(false);
      // 표시 제목/요약은 NewsInsightPanel이 localizedTitle·Summary로 맞춤 (영문 고착 방지)
      setSelected({
        kind: "news-insight",
        item: { article },
      });
    },
    [dismissLayerPanel],
  );

  const handleNewsInsightApplyMap = useCallback(
    (payload: NewsInsightApplyPayload) => {
      const mode: NewsInsightMode = isEconomyViewer ? "economy" : "conflict";
      const ids = [...payload.layerIds];
      if (payload.bundleId) ids.push(payload.bundleId);
      const rawPatch = patchFromNewsInsightIds(ids, mode);
      if (Object.keys(rawPatch).length > 0) {
        pinUserLayers();
        const patch = isEconomyViewer
          ? stripEconomyGeopoliticsPatch(rawPatch)
          : rawPatch;
        patchLayerPrefsSoft(patch);
      }

      const hint = resolveFlyHint(payload.layerIds, payload.bundleId, mode);
      const article =
        selected?.kind === "news-insight" ? selected.item.article : null;
      const theaterFly = article ? THEATER_FLY_TO[article.theater] : null;
      const lat =
        payload.center?.lat ?? hint?.lat ?? theaterFly?.lat ?? filterCenter.lat;
      const lng =
        payload.center?.lng ?? hint?.lng ?? theaterFly?.lng ?? filterCenter.lng;
      const altitude =
        payload.altitude ?? hint?.altitude ?? theaterFly?.altitude ?? 1.85;

      interruptFlySnap();
      flyTo(lat, lng, altitude);

      if (selected?.kind === "news-insight") {
        setNewsInsightCallout({
          markerId: `news-insight-callout-${article?.id ?? "x"}`,
          displayKind: "news-insight-callout",
          id: article?.id ?? "news-insight",
          lat,
          lng,
          title: payload.calloutTitle,
          link: article?.link,
          article: article ?? undefined,
        });
      }
    },
    [
      filterCenter.lat,
      filterCenter.lng,
      flyTo,
      interruptFlySnap,
      isEconomyViewer,
      patchLayerPrefsSoft,
      pinUserLayers,
      selected,
    ],
  );

  useEffect(() => {
    if (selected?.kind !== "news-insight") {
      setNewsInsightCallout(null);
    }
  }, [selected]);

  function handleNavNavigate(selection: NavSelection) {
    if (isEconomyViewer) {
      enterEconomyRegionFocus(selection);
    } else {
      enterTheaterFocus(selection);
    }
  }

  useEffect(() => {
    if (isEconomyViewer || entryGate !== null || showModePicker) return;
    if (historyStoryLockedRef.current) return;
    // 유저가 직접 켠/끈 레이어는 전장 프리셋이 allShowOff로 지우지 않는다
    if (userLayerPinRef.current) return;
    // 레이어 패널·퀵 드롭다운을 여는 동안에도 soft-apply 금지
    if (showLeftPanel || layerDropdownOpen || layerPanelDirty) return;
    if (Date.now() < battlefieldManualUntilRef.current) return;

    // 드래그 idle 직후 전장 bbox 경계에서 zone이 흔들리면 프리셋이 연속 적용되며
    // 화면이 튕기듯 재구성된다 — 짧게 디바운스해 확정 zone만 반영
    const timer = window.setTimeout(() => {
      if (userLayerPinRef.current) return;
      if (Date.now() < battlefieldManualUntilRef.current) return;
      const zone = detectBattlefieldZone(
        layerViewState.lat,
        layerViewState.lng,
        layerViewState.altitude,
      );
      // 전역으로 다시 빠지면 ADS-B·AIS 등 상세 레이어를 끄고 히어로 3종만 유지
      if (!zone) {
        if (battlefieldSoftZoneRef.current == null) return;
        battlefieldSoftZoneRef.current = null;
        applyLayerPrefs(
          buildDomainOverviewPrefs("conflict", {
            labelLanguage: layerPrefsLiveRef.current.labelLanguage,
            ultraLite: ultraLiteRef.current,
          }),
        );
        return;
      }
      if (battlefieldSoftZoneRef.current === zone) return;
      battlefieldSoftZoneRef.current = zone;
      applyLayerPrefs(applyBattlefieldPreset(zone, layerPrefsLiveRef.current));
    }, 360);

    return () => window.clearTimeout(timer);
  }, [
    applyLayerPrefs,
    entryGate,
    isEconomyViewer,
    layerDropdownOpen,
    layerPanelDirty,
    layerViewState.altitude,
    layerViewState.lat,
    layerViewState.lng,
    showLeftPanel,
    showModePicker,
  ]);

  return {
    handleAskLayersApply,
    handleOpenNewsInsight,
    handleNewsInsightApplyMap,
    handleNavNavigate,
  };
}
