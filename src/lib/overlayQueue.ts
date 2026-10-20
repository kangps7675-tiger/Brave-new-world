/**
 * 동시 모달/배너 — 한 번에 하나만.
 * 우선순위 정본: `@/config/geowatch.config` overlay.bannerPriority
 *
 * 브리핑(양피지)·진입 게이트는 이 큐보다 상위(화면 점유)로 취급한다.
 */

import { GEOWATCH_CONFIG } from "@/config/geowatch.config";

export type OverlayBannerKind =
  | "airRaid"
  | "adsbEmergency"
  /** 확전 신호 — 임계선을 넘은 사건 보도 (escalationSignals) */
  | "escalation"
  | "exercise"
  | "maritime"
  | "tickerSpike"
  | "tensionCut"
  | "hotTheater"
  | "coach"
  | "ultraLite";

/** 낮을수록 우선 — SSOT */
export const OVERLAY_BANNER_PRIORITY: Record<OverlayBannerKind, number> = {
  ...GEOWATCH_CONFIG.overlay.bannerPriority,
};

export type OverlayBannerCandidates = Partial<Record<OverlayBannerKind, boolean>>;

export type BuildOverlayBannerCandidatesInput = {
  briefingBusy: boolean;
  airRaidOffer: boolean;
  adsbEmergencyOffer: boolean;
  /** 확전 신호가 노출 임계를 넘었는가 (escalationFeed) */
  escalationOffer: boolean;
  exerciseOffer: boolean;
  maritimeOffer: boolean;
  /** Databento 선물 SPIKE 오퍼 */
  tickerSpikeOffer: boolean;
  tensionSpike: boolean;
  hotTheaterOffer: boolean;
  coachActive: boolean;
  /** FPS 프로브 Ultra-Lite 제안 (강제 아님) */
  ultraLiteOffer: boolean;
  isEconomyViewer: boolean;
  entryGateOpen: boolean;
  modePickerOpen: boolean;
};

/**
 * Host/대시보드 공통 — 배너 후보 플래그 조립.
 * 브리핑 busy면 emergency~maritime 억제. 긴장컷·핫지역·코치는 게이트/피커와도 충돌 방지.
 */
export function buildOverlayBannerCandidates(
  input: BuildOverlayBannerCandidatesInput,
): OverlayBannerCandidates {
  const {
    briefingBusy,
    airRaidOffer,
    adsbEmergencyOffer,
    escalationOffer,
    exerciseOffer,
    maritimeOffer,
    tickerSpikeOffer,
    tensionSpike,
    hotTheaterOffer,
    coachActive,
    ultraLiteOffer,
    isEconomyViewer,
    entryGateOpen,
    modePickerOpen,
  } = input;

  const gateClear = !entryGateOpen && !modePickerOpen;

  return {
    airRaid: airRaidOffer && !briefingBusy,
    adsbEmergency: adsbEmergencyOffer && !briefingBusy,
    // 확전 신호는 게이트·피커가 열려 있으면 억제한다 (첫 화면 방해 금지)
    escalation: escalationOffer && !briefingBusy && gateClear,
    exercise: exerciseOffer && !briefingBusy,
    maritime: maritimeOffer && !briefingBusy,
    tickerSpike: tickerSpikeOffer && !briefingBusy && gateClear,
    tensionCut: tensionSpike && !briefingBusy && !isEconomyViewer && gateClear,
    hotTheater: hotTheaterOffer && !briefingBusy && gateClear,
    coach: coachActive && gateClear,
    ultraLite: ultraLiteOffer && !briefingBusy && gateClear,
  };
}

/**
 * 후보 중 최상위 1개만 반환. 없으면 null.
 * 예: airRaid + maritime 동시 → "airRaid"
 */
export function resolveTopOverlayBanner(
  candidates: OverlayBannerCandidates,
): OverlayBannerKind | null {
  let best: OverlayBannerKind | null = null;
  let bestPri = Number.POSITIVE_INFINITY;
  for (const key of Object.keys(OVERLAY_BANNER_PRIORITY) as OverlayBannerKind[]) {
    if (!candidates[key]) continue;
    const pri = OVERLAY_BANNER_PRIORITY[key];
    if (pri < bestPri) {
      bestPri = pri;
      best = key;
    }
  }
  return best;
}

export function canShowOverlayBanner(
  kind: OverlayBannerKind,
  candidates: OverlayBannerCandidates,
): boolean {
  return resolveTopOverlayBanner(candidates) === kind;
}
