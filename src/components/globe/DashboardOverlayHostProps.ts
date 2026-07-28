import type { AirRaidBriefingContent } from "@/components/AirRaidBriefingParchment";
import type { AirRaidOffer } from "@/components/AirRaidOfferBanner";
import type { AirRaidFocusTarget } from "@/components/TzevaAdomPanel";
import type { AirRaidSirenKind } from "@/lib/airRaidFocus";
import type { MaritimeAlertOffer } from "@/components/MaritimeAlertOfferBanner";
import type { UkmtoBriefingContent } from "@/lib/ukmtoHatch";
import type { NavareaBriefingContent } from "@/lib/navareaSecurity";
import type { TensionSpikeSnapshot, TensionCutDestination } from "@/lib/tensionSpikeCut";
import type { HotTheaterFocus } from "@/lib/hotTheaterLayers";

/**
 * 5단계 분리 — DashboardOverlayHost의 경보성 prop을 4개 그룹으로 정리한 타입.
 * Host 컴포넌트 자체는 여전히 평탄한(flat) props를 받지만(회귀 위험 최소화),
 * GlobeDashboard 쪽 JSX 정리를 위해 `overlayHostPropGroups.ts`의
 * `buildOverlayHostAlertProps`가 이 그룹 타입을 입력으로 받아 평탄화한다.
 */
export type AirRaidAlertGroup = {
  offer: AirRaidOffer | null;
  briefing: AirRaidBriefingContent | null;
  showCoach: boolean;
  onDismissOffer: () => void;
  onSetBriefing: (v: AirRaidBriefingContent | null) => void;
  onReleaseBusy: () => void;
  onFocus: (
    target: AirRaidFocusTarget,
    kind: AirRaidSirenKind,
    options?: { deferSirenUntilArrive?: boolean; skipSiren?: boolean },
  ) => void;
  onMaybeOfferCoach: () => void;
};

export type MaritimeAlertGroup = {
  offer: MaritimeAlertOffer | null;
  ukmtoBriefing: UkmtoBriefingContent | null;
  navareaBriefing: NavareaBriefingContent | null;
  onAccept: () => void;
  onDismiss: () => void;
  onCloseUkmto: () => void;
  onCloseNavarea: () => void;
};

export type TensionAlertGroup = {
  spike: TensionSpikeSnapshot | null;
  onDismiss: () => void;
  onJump: (destination: TensionCutDestination) => void;
};

export type HotTheaterAlertGroup = {
  offer: HotTheaterFocus | null;
  onAccept: () => void;
  onDismiss: () => void;
};

export type OverlayHostAlertGroups = {
  airRaid: AirRaidAlertGroup;
  maritime: MaritimeAlertGroup;
  tension: TensionAlertGroup;
  hotTheater: HotTheaterAlertGroup;
};
