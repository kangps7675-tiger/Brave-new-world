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
  allowsFrontlineCombatSound,
  resolveCombatTheaterAt,
} from "@/lib/theaterCombat";

type ViewCenter = { lat: number; lng: number };

type DisputeInput = Parameters<typeof disputeMatchesWarDiplomaticLayers>[0] &
  Parameters<typeof isCombatHazard>[0] &
  Parameters<typeof resolveDisputeCenter>[0] & { tension?: string };

export type ConflictAmbient = "global" | "frontline" | "taiwan-tension" | "tension" | null;
export type EconomyAmbient = "port" | "lng" | "construction" | "datacenter" | "pipeline" | null;

type AmbientSoundInputs = {
  isEconomyViewer: boolean;
  globeTier: GlobeLodTier;
  layerViewState: ViewCenter;
  filterCenter: ViewCenter;
  /** 활성 분쟁 외교사 에피소드 좌표 (없으면 null) — active war 에피소드만 전선음 */
  episodeCenter: ViewCenter | null;
  disputes: DisputeInput[];
  showAnyDisputeOverlay: boolean;
  showWarZones: boolean;
  showDiplomaticTension: boolean;
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
 * 우선순위: frontline > taiwan-tension > tension > global(전역·대륙) (지정학)
 * 항모 갑판은 클릭 전용 — 여기 포함하지 않음.
 * 지경학: pipeline → datacenter → port → lng(미세) → construction
 *         · 전역/대륙이고 허브 앰비언트 없으면 global thunder
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
    episodeCenter,
    disputes,
    showAnyDisputeOverlay,
    showWarZones,
    showDiplomaticTension,
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

  /**
   * 실제 교전(우크라·중동) 위 regional 이하 → 포격·총성.
   * 대만·한반도는 긴장음만 — 전선 레이어 ON이어도 교전음 금지.
   */
  const frontline = useMemo(() => {
    if (isEconomyViewer || !nearEnough) return false;
    const episodeInView =
      episodeCenter != null &&
      isCenterInView(
        episodeCenter,
        layerViewState,
        VIEWPORT_RADIUS_BY_TIER[globeTier] + 2.5,
      );
    return allowsFrontlineCombatSound({
      cameraLat: filterCenter.lat,
      cameraLng: filterCenter.lng,
      episodeCenter,
      episodeInView,
    });
  }, [
    episodeCenter,
    filterCenter.lat,
    filterCenter.lng,
    globeTier,
    isEconomyViewer,
    layerViewState,
    nearEnough,
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

  /** 미 항모 — 클릭 전용 (패스오버 앰비언트 제거) */

  const conflictAmbient = useMemo((): ConflictAmbient => {
    if (frontline) return "frontline";
    if (taiwanTension) return "taiwan-tension";
    if (tension) return "tension";
    // 전역·대륙 LOD — 지구본을 멀리 볼 때 상시 뇌우 앰비언트
    if (
      !isEconomyViewer &&
      (globeTier === "global" || globeTier === "continent")
    ) {
      return "global";
    }
    return null;
  }, [frontline, globeTier, isEconomyViewer, taiwanTension, tension]);

  const economyAmbient = useMemo((): EconomyAmbient => {
    if (!isEconomyViewer) return null;
    if (showOilPipelines || showGasPipelines) return "pipeline";
    if (showAiDataCenters || showInternetExchanges) return "datacenter";
    if (showPorts || showShippingLanes) return "port";
    if (showLngTerminals) return "lng";
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
