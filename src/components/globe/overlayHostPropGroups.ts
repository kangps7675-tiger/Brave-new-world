import type { DashboardOverlayHostProps } from "@/components/globe/DashboardOverlayHost";
import type {
  BreakingEscalationGroup,
  ChromeActionsGroup,
  ExerciseChokepointGroup,
  ObserveFeedGroup,
  OverlayHostAlertGroups,
  PerimeterOfferGroup,
  UltraLiteOfferGroup,
} from "@/components/globe/DashboardOverlayHostProps";

type OverlayHostAlertProps = Pick<
  DashboardOverlayHostProps,
  | "airRaidOffer"
  | "airRaidBriefing"
  | "showAirRaidCoach"
  | "onDismissAirRaidOffer"
  | "onSetAirRaidBriefing"
  | "onReleaseAirRaidAutoBusy"
  | "onAirRaidFocus"
  | "onMaybeOfferAirRaidCoach"
  | "maritimeOffer"
  | "ukmtoBriefing"
  | "navareaBriefing"
  | "onAcceptMaritimeOffer"
  | "onDismissMaritimeOffer"
  | "onCloseUkmtoBriefing"
  | "onCloseNavareaBriefing"
  | "tensionSpike"
  | "onDismissTensionSpike"
  | "onTensionSpikeJump"
  | "hotTheaterOffer"
  | "onAcceptHotTheaterOffer"
  | "onDismissHotTheaterOffer"
>;

type OverlayHostExerciseProps = Pick<
  DashboardOverlayHostProps,
  | "exerciseOffer"
  | "exerciseBriefing"
  | "chokepointStressBriefing"
  | "chokepointStressGrade"
  | "onDismissExerciseOffer"
  | "onSetExerciseBriefing"
  | "onSetChokepointStressBriefing"
  | "onChokepointStressDrill"
  | "onChokepointOpenObserve"
  | "onExerciseFlyTo"
  | "onChokepointStressFlyTo"
>;

type OverlayHostPerimeterProps = Pick<
  DashboardOverlayHostProps,
  | "adsbEmergencyOffer"
  | "onGoToObserveFromAdsbEmergency"
  | "onDismissAdsbEmergencyOffer"
  | "natoPerimeterAlert"
  | "onDismissNatoPerimeterAlert"
>;

type OverlayHostUltraLiteProps = Pick<
  DashboardOverlayHostProps,
  | "ultraLiteOfferVisible"
  | "ultraLiteOfferProbe"
  | "onAcceptUltraLiteOffer"
  | "onDismissUltraLiteOffer"
>;

type OverlayHostObserveFeedProps = Pick<
  DashboardOverlayHostProps,
  | "showNeptun"
  | "neptunAlertCount"
  | "showTzevaAdom"
  | "showNewfeedsIranAttacks"
  | "neptunAlerts"
  | "neptunLive"
  | "neptunStatus"
  | "neptunError"
  | "tzevaAdomActive"
  | "tzevaAdomHistory"
  | "tzevaAdomLive"
  | "tzevaAdomStatus"
  | "tzevaAdomGeoRestricted"
  | "tzevaAdomError"
  | "newfeedsAttacks"
  | "newfeedsThreatLabel"
  | "newfeedsLive"
  | "newfeedsStatus"
  | "newfeedsError"
>;

type OverlayHostChromeActionsProps = ChromeActionsGroup;

type OverlayHostBreakingEscalationProps = Pick<
  DashboardOverlayHostProps,
  | "breakingFlash"
  | "onDismissBreakingFlash"
  | "breakingFlashGrade"
  | "onBreakingFlashDrill"
  | "onBreakingFlashGoToLocation"
  | "escalationOffer"
  | "onDismissEscalationOffer"
  | "escalationDisplayGrade"
  | "onEscalationDrill"
>;

/**
 * 5단계 분리 — 공습경보·해상경보·긴장스파이크·핫전장 오퍼 관련 prop 20여 개를
 * 4개 그룹 객체로 받아 DashboardOverlayHost가 기대하는 평탄한(flat) prop 객체로
 * 변환한다. GlobeDashboard JSX에서 `{...buildOverlayHostAlertProps({...})}` 형태로
 * 스프레드해 사용 — Host의 prop 시그니처는 바꾸지 않아 회귀 위험이 낮다.
 */
export function buildOverlayHostAlertProps({
  airRaid,
  maritime,
  tension,
  hotTheater,
}: OverlayHostAlertGroups): OverlayHostAlertProps {
  return {
    airRaidOffer: airRaid.offer,
    airRaidBriefing: airRaid.briefing,
    showAirRaidCoach: airRaid.showCoach,
    onDismissAirRaidOffer: airRaid.onDismissOffer,
    onSetAirRaidBriefing: airRaid.onSetBriefing,
    onReleaseAirRaidAutoBusy: airRaid.onReleaseBusy,
    onAirRaidFocus: airRaid.onFocus,
    onMaybeOfferAirRaidCoach: airRaid.onMaybeOfferCoach,
    maritimeOffer: maritime.offer,
    ukmtoBriefing: maritime.ukmtoBriefing,
    navareaBriefing: maritime.navareaBriefing,
    onAcceptMaritimeOffer: maritime.onAccept,
    onDismissMaritimeOffer: maritime.onDismiss,
    onCloseUkmtoBriefing: maritime.onCloseUkmto,
    onCloseNavareaBriefing: maritime.onCloseNavarea,
    tensionSpike: tension.spike,
    onDismissTensionSpike: tension.onDismiss,
    onTensionSpikeJump: tension.onJump,
    hotTheaterOffer: hotTheater.offer,
    onAcceptHotTheaterOffer: hotTheater.onAccept,
    onDismissHotTheaterOffer: hotTheater.onDismiss,
  };
}

/** Phase C — 훈련·병목 스트레스 양피지 prop 묶음 */
export function buildOverlayHostExerciseProps(
  group: ExerciseChokepointGroup,
): OverlayHostExerciseProps {
  return {
    exerciseOffer: group.offer,
    exerciseBriefing: group.briefing,
    chokepointStressBriefing: group.chokepointBriefing,
    chokepointStressGrade: group.chokepointGrade,
    onDismissExerciseOffer: group.onDismissOffer,
    onSetExerciseBriefing: group.onSetBriefing,
    onSetChokepointStressBriefing: group.onSetChokepointBriefing,
    onChokepointStressDrill: group.onChokepointDrill,
    onChokepointOpenObserve: group.onChokepointOpenObserve,
    onExerciseFlyTo: group.onExerciseFlyTo,
    onChokepointStressFlyTo: group.onChokepointFlyTo,
  };
}

/** Phase C — ADS-B 비상·NATO 접경 오퍼 prop 묶음 */
export function buildOverlayHostPerimeterProps(
  group: PerimeterOfferGroup,
): OverlayHostPerimeterProps {
  return {
    adsbEmergencyOffer: group.adsbOffer,
    onGoToObserveFromAdsbEmergency: group.onGoToObserveFromAdsb,
    onDismissAdsbEmergencyOffer: group.onDismissAdsb,
    natoPerimeterAlert: group.natoAlert,
    onDismissNatoPerimeterAlert: group.onDismissNato,
  };
}

/** Phase C — Ultra-Lite 제안 prop 묶음 */
export function buildOverlayHostUltraLiteProps(
  group: UltraLiteOfferGroup,
): OverlayHostUltraLiteProps {
  return {
    ultraLiteOfferVisible: group.visible,
    ultraLiteOfferProbe: group.probe,
    onAcceptUltraLiteOffer: group.onAccept,
    onDismissUltraLiteOffer: group.onDismiss,
  };
}

/** Phase C — NEPTUN·Tzeva·Newfeeds 관측 피드 prop 묶음 */
export function buildOverlayHostObserveFeedProps(
  group: ObserveFeedGroup,
): OverlayHostObserveFeedProps {
  return {
    showNeptun: group.showNeptun,
    neptunAlertCount: group.neptunAlertCount,
    showTzevaAdom: group.showTzevaAdom,
    showNewfeedsIranAttacks: group.showNewfeedsIranAttacks,
    neptunAlerts: group.neptunAlerts,
    neptunLive: group.neptunLive,
    neptunStatus: group.neptunStatus,
    neptunError: group.neptunError,
    tzevaAdomActive: group.tzevaAdomActive,
    tzevaAdomHistory: group.tzevaAdomHistory,
    tzevaAdomLive: group.tzevaAdomLive,
    tzevaAdomStatus: group.tzevaAdomStatus,
    tzevaAdomGeoRestricted: group.tzevaAdomGeoRestricted,
    tzevaAdomError: group.tzevaAdomError,
    newfeedsAttacks: group.newfeedsAttacks,
    newfeedsThreatLabel: group.newfeedsThreatLabel,
    newfeedsLive: group.newfeedsLive,
    newfeedsStatus: group.newfeedsStatus,
    newfeedsError: group.newfeedsError,
  };
}

/** Phase C — OverlayHost 하단 크롬·게이트 액션 콜백 prop 묶음 */
export function buildOverlayHostChromeActionsProps(
  group: ChromeActionsGroup,
): OverlayHostChromeActionsProps {
  return { ...group };
}

/** Phase C — 신속속보·확전 신호 prop 묶음 */
export function buildOverlayHostBreakingEscalationProps(
  group: BreakingEscalationGroup,
): OverlayHostBreakingEscalationProps {
  return {
    breakingFlash: group.breakingFlash,
    onDismissBreakingFlash: group.onDismissBreakingFlash,
    breakingFlashGrade: group.breakingFlashGrade,
    onBreakingFlashDrill: group.onBreakingFlashDrill,
    onBreakingFlashGoToLocation: group.onBreakingFlashGoToLocation,
    escalationOffer: group.escalationOffer,
    onDismissEscalationOffer: group.onDismissEscalationOffer,
    escalationDisplayGrade: group.escalationDisplayGrade,
    onEscalationDrill: group.onEscalationDrill,
  };
}
