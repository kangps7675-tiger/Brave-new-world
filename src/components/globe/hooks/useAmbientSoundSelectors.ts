"use client";

import { useMemo } from "react";
import type { GlobeLodTier } from "@/lib/globeLod";
import { VIEWPORT_RADIUS_BY_TIER, isCenterInView } from "@/lib/viewportCull";
import { resolveDisputeCenter } from "@/lib/disputeCenter";
import {
  disputeMatchesWarDiplomaticLayers,
  isCombatHazard,
} from "@/lib/disputeHatch";
import {
  resolveActiveWarTheaterAt,
  resolveCombatTheaterAt,
} from "@/lib/theaterCombat";

type ViewCenter = { lat: number; lng: number };

type DisputeInput = Parameters<typeof disputeMatchesWarDiplomaticLayers>[0] &
  Parameters<typeof isCombatHazard>[0] &
  Parameters<typeof resolveDisputeCenter>[0] & { tension?: string };

export type ConflictAmbient = "frontline" | "taiwan-tension" | "tension" | "carrier" | null;
export type EconomyAmbient = "port" | "construction" | "datacenter" | "pipeline" | null;

type AmbientSoundInputs = {
  isEconomyViewer: boolean;
  globeTier: GlobeLodTier;
  layerViewState: ViewCenter;
  filterCenter: ViewCenter;
  showUkraineControl: boolean;
  /** 활성 분쟁 외교사 에피소드 좌표 (없으면 null) */
  episodeCenter: ViewCenter | null;
  disputes: DisputeInput[];
  showAnyDisputeOverlay: boolean;
  showWarZones: boolean;
  showDiplomaticTension: boolean;
  visibleUsCarriers: ViewCenter[];
  showUsCarriers: boolean;
  showOilPipelines: boolean;
  showGasPipelines: boolean;
  showAiDataCenters: boolean;
  showInternetExchanges: boolean;
  showPorts: boolean;
  showShippingLanes: boolean;
  showLngTerminals: boolean;
  showEconomicCenters: boolean;
};

/**
 * 앰비언트 사운드 셀렉터 — GlobeDashboard에서 추출 (분리 2단계).
 * 카메라·레이어 상태로 "지금 어떤 배경음이 맞는가"만 계산한다. 재생은 호출측.
 *
 * 우선순위: frontline > taiwan-tension > tension > carrier (지정학) / 지경학은 별도.
 */
export function useAmbientSoundSelectors(inputs: AmbientSoundInputs): {
  conflictAmbient: ConflictAmbient;
  economyAmbient: EconomyAmbient;
} {
  const {
    isEconomyViewer,
    globeTier,
    layerViewState,
    filterCenter,
    showUkraineControl,
    episodeCenter,
    disputes,
    showAnyDisputeOverlay,
    showWarZones,
    showDiplomaticTension,
    visibleUsCarriers,
    showUsCarriers,
    showOilPipelines,
    showGasPipelines,
    showAiDataCenters,
    showInternetExchanges,
    showPorts,
    showShippingLanes,
    showLngTerminals,
    showEconomicCenters,
  } = inputs;

  const nearEnough =
    globeTier === "regional" || globeTier === "near" || globeTier === "village";

  /** 실제 교전(우크라·중동/이란) 위 regional 이하 → 전장 사운드. 대만·한반도 제외 */
  const frontline = useMemo(() => {
    if (isEconomyViewer || !nearEnough) return false;
    if (showUkraineControl) return true;
    // 분쟁 외교사 선택 구역 — 체크박스 없이 해당 좌표에서만 교전음
    if (episodeCenter) {
      const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeTier] + 2.5;
      if (isCenterInView(episodeCenter, layerViewState, radiusDeg)) return true;
    }
    return resolveActiveWarTheaterAt(filterCenter.lat, filterCenter.lng) != null;
  }, [
    episodeCenter,
    filterCenter.lat,
    filterCenter.lng,
    globeTier,
    isEconomyViewer,
    layerViewState,
    nearEnough,
    showUkraineControl,
  ]);

  /** 대만해협 — 시계 틱 긴장 앰비언트 */
  const taiwanTension = useMemo(() => {
    if (isEconomyViewer || frontline || !nearEnough) return false;
    return resolveCombatTheaterAt(filterCenter.lat, filterCenter.lng) === "china-taiwan";
  }, [filterCenter.lat, filterCenter.lng, frontline, isEconomyViewer, nearEnough]);

  /** 긴장 rumble: 한반도 박스, 또는 고긴장 분쟁 구역 (대만·전장음 제외) */
  const tension = useMemo(() => {
    if (isEconomyViewer || frontline || taiwanTension || !nearEnough) return false;

    const theater = resolveCombatTheaterAt(filterCenter.lat, filterCenter.lng);
    if (theater === "korea") return true;

    if (!showAnyDisputeOverlay) return false;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeTier] + 2;
    return disputes.some((dispute) => {
      if (!disputeMatchesWarDiplomaticLayers(dispute, showWarZones, showDiplomaticTension)) {
        return false;
      }
      if (!(isCombatHazard(dispute) || dispute.tension === "high")) return false;
      return isCenterInView(resolveDisputeCenter(dispute), layerViewState, radiusDeg);
    });
  }, [
    disputes,
    filterCenter.lat,
    filterCenter.lng,
    frontline,
    globeTier,
    isEconomyViewer,
    layerViewState,
    nearEnough,
    showAnyDisputeOverlay,
    showDiplomaticTension,
    showWarZones,
    taiwanTension,
  ]);

  /** 미 항모가 뷰에 있으면 갑판 앰비언스 */
  const carrier = useMemo(() => {
    if (isEconomyViewer || frontline || taiwanTension || tension || !showUsCarriers) {
      return false;
    }
    if (visibleUsCarriers.length === 0) return false;
    const radiusDeg = VIEWPORT_RADIUS_BY_TIER[globeTier] + 4;
    return visibleUsCarriers.some((c) =>
      isCenterInView({ lat: c.lat, lng: c.lng }, layerViewState, radiusDeg),
    );
  }, [
    frontline,
    globeTier,
    isEconomyViewer,
    layerViewState,
    showUsCarriers,
    taiwanTension,
    tension,
    visibleUsCarriers,
  ]);

  const conflictAmbient = useMemo((): ConflictAmbient => {
    if (frontline) return "frontline";
    if (taiwanTension) return "taiwan-tension";
    if (tension) return "tension";
    if (carrier) return "carrier";
    return null;
  }, [carrier, frontline, taiwanTension, tension]);

  const economyAmbient = useMemo((): EconomyAmbient => {
    if (!isEconomyViewer) return null;
    if (showOilPipelines || showGasPipelines) return "pipeline";
    if (showAiDataCenters || showInternetExchanges) return "datacenter";
    if (showPorts || showShippingLanes || showLngTerminals) return "port";
    if (showEconomicCenters) return "construction";
    return null;
  }, [
    isEconomyViewer,
    showAiDataCenters,
    showEconomicCenters,
    showGasPipelines,
    showInternetExchanges,
    showLngTerminals,
    showOilPipelines,
    showPorts,
    showShippingLanes,
  ]);

  return { conflictAmbient, economyAmbient };
}
