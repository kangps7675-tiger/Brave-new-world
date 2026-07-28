import type { DashboardOverlayHostProps } from "@/components/globe/DashboardOverlayHost";
import type { OverlayHostAlertGroups } from "@/components/globe/DashboardOverlayHostProps";

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
