import type { AirRaidBriefingContent } from "@/components/AirRaidBriefingParchment";
import type { AirRaidOffer } from "@/components/AirRaidOfferBanner";
import type { AirRaidFocusTarget } from "@/components/TzevaAdomPanel";
import type { AirRaidSirenKind } from "@/lib/airRaidFocus";
import type { MaritimeAlertOffer } from "@/components/MaritimeAlertOfferBanner";
import type { UkmtoBriefingContent } from "@/lib/ukmtoHatch";
import type { NavareaBriefingContent } from "@/lib/navareaSecurity";
import type { TensionSpikeSnapshot, TensionCutDestination } from "@/lib/tensionSpikeCut";
import type { HotTheaterFocus } from "@/lib/hotTheaterLayers";
import type { ExerciseBriefingContent } from "@/components/ExerciseBriefingParchment";
import type { ExerciseOffer } from "@/components/ExerciseOfferBanner";
import type { ChokepointStressBriefing } from "@/lib/chokepointStressBriefing";
import type { DisplayGrade } from "@/lib/intelContract/types";
import type { AdsbEmergencyOffer } from "@/components/globe/hooks/useAdsbEmergencyAlert";
import type { NatoPerimeterAlertState } from "@/components/globe/hooks/useNatoPerimeterDroneAlert";
import type { PerfProbeResult } from "@/lib/perfProbe";
import type { BreakingFlashBriefing } from "@/lib/news/breakingFlash";
import type { EscalationOffer } from "@/components/globe/hooks/useEscalationSignals";
import type { DashboardOverlayHostProps } from "@/components/globe/DashboardOverlayHost";
import type { NeptunAlerts } from "@/lib/neptun";
import type { NeptunStreamStatus } from "@/hooks/useNeptunStream";
import type { TzevaAdomAlert } from "@/lib/tzevaAdom";
import type { NewfeedsAttackPoint } from "@/lib/newfeeds";

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

export type ExerciseChokepointGroup = {
  offer: ExerciseOffer | null;
  briefing: ExerciseBriefingContent | null;
  chokepointBriefing: ChokepointStressBriefing | null;
  chokepointGrade?: DisplayGrade;
  onDismissOffer: () => void;
  onSetBriefing: (v: ExerciseBriefingContent | null) => void;
  onSetChokepointBriefing: (v: ChokepointStressBriefing | null) => void;
  onChokepointDrill?: () => void;
  onChokepointOpenObserve?: () => void;
  onExerciseFlyTo: () => void;
  onChokepointFlyTo: () => void;
};

export type PerimeterOfferGroup = {
  adsbOffer: AdsbEmergencyOffer | null;
  onGoToObserveFromAdsb?: () => void;
  onDismissAdsb: () => void;
  natoAlert: NatoPerimeterAlertState;
  onDismissNato: () => void;
};

export type UltraLiteOfferGroup = {
  visible: boolean;
  probe: PerfProbeResult | null;
  onAccept: () => void;
  onDismiss: () => void;
};

/** Phase C — NEPTUN·Tzeva·Newfeeds 관측 피드 상태 prop 묶음 */
export type ObserveFeedGroup = {
  showNeptun: boolean;
  neptunAlertCount: number;
  showTzevaAdom: boolean;
  showNewfeedsIranAttacks: boolean;
  neptunAlerts: NeptunAlerts | null;
  neptunLive: boolean;
  neptunStatus: NeptunStreamStatus;
  neptunError: string | null;
  tzevaAdomActive: TzevaAdomAlert[];
  tzevaAdomHistory: TzevaAdomAlert[];
  tzevaAdomLive: boolean;
  tzevaAdomStatus: "idle" | "loading" | "ok" | "error" | "stub" | "geo-blocked";
  tzevaAdomGeoRestricted: boolean;
  tzevaAdomError: string | null;
  newfeedsAttacks: NewfeedsAttackPoint[];
  newfeedsThreatLabel: string | null;
  newfeedsLive: boolean;
  newfeedsStatus: "idle" | "loading" | "ok" | "error";
  newfeedsError: string | null;
};

/** Phase C — OverlayHost 하단 크롬·게이트·패널 액션 콜백 prop 묶음 */
export type ChromeActionsGroup = Pick<
  DashboardOverlayHostProps,
  | "onCloseLeftPanel"
  | "onToggleLeftPanel"
  | "onOpenLeftPanel"
  | "onSetShowUsCarriers"
  | "onSetShowGpsInterference"
  | "onSetShowUsDfcSupplyChain"
  | "onSetShowBriTradeConnectivity"
  | "onSetShowQuickStart"
  | "onSetShowViewerIntro"
  | "onSetShowTrustPanel"
  | "onSetShowSourcesPanel"
  | "onSetShowFeatureGuide"
  | "onSetShowControlsGuide"
  | "onSetAskLayersOpen"
  | "onSetShowMobileAlertFeed"
  | "onAskLayersApply"
  | "onSetShowFirstVisitTour"
  | "onSetTourActive"
  | "getSceneForShare"
  | "onSetSentinelActive"
  | "onSetPlayOverlay"
  | "onSetShowCityLabels"
  | "onEndLiveBriefing"
  | "flyTo"
  | "onSetWhatsNewUpdate"
  | "onLabelLanguageChange"
  | "onConfirmLabelLanguage"
  | "onConfirmPurposeJob"
  | "onDismissPurposeJob"
  | "onLangChoiceConfirmed"
  | "onSetEntryGate"
  | "onDomainSelect"
  | "onModeApply"
  | "onCustomLayerApply"
  | "onModePickerCancel"
  | "onSetChromeCoachStep"
  | "onSetIntelSheetOpen"
  | "onFrictionCoachStepChange"
  | "onSetShowAirRaidCoach"
  | "onOpenClearanceRecovery"
  | "onSetClearanceChipSettled"
  | "onSetWeeklyRecapCollapsed"
  | "onSetShowTourInvite"
  | "onSetPeriodicBriefing"
  | "onSetFoldedPeriodicBriefing"
  | "onSetTomorrowTensionPrompt"
  | "onSetClearanceStatus"
  | "onToggleDailyRankPanel"
  | "onBeginLiveBriefing"
>;

export type BreakingEscalationGroup = {
  breakingFlash: BreakingFlashBriefing | null;
  onDismissBreakingFlash: () => void;
  breakingFlashGrade?: DisplayGrade;
  onBreakingFlashDrill?: () => void;
  onBreakingFlashGoToLocation?: () => void;
  escalationOffer: EscalationOffer | null;
  onDismissEscalationOffer: () => void;
  escalationDisplayGrade?: DisplayGrade;
  onEscalationDrill?: () => void;
};
