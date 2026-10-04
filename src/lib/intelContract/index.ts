export type {
  BundleKind,
  DisplayGrade,
  EvidenceBundle,
  GateReason,
  GateResult,
  Observation,
  ObservationModality,
  PublishSurface,
} from "@/lib/intelContract/types";

export { evaluateGate, summarizeGate } from "@/lib/intelContract/gate";
export {
  SURFACE_MIN_GRADE,
  canPublish,
  gradeAtLeast,
  gradeLabel,
} from "@/lib/intelContract/publish";
export { computeObservationStats, withComputedStats } from "@/lib/intelContract/bundleStats";

export {
  theaterSitrepToBundle,
  gateTheaterSitrep,
} from "@/lib/intelContract/adapters/fromTheaterSitrep";
export {
  conflictClusterToBundle,
  gateConflictCluster,
} from "@/lib/intelContract/adapters/fromConflictCluster";
export {
  escalationToBundle,
  gateEscalation,
  type EscalationGateInput,
} from "@/lib/intelContract/adapters/fromEscalation";
export {
  convergenceToBundle,
  gateConvergence,
  type ConvergenceEventLike,
} from "@/lib/intelContract/adapters/fromConvergence";
export {
  cesiumAlertToBundle,
  gateCesiumAlert,
  chokepointStressToBundle,
  gateChokepointStress,
} from "@/lib/intelContract/adapters/fromEconomyAlert";
export {
  breakingHeroToBundle,
  gateBreakingHero,
} from "@/lib/intelContract/adapters/fromBreakingFlash";

export {
  PIR_REGISTRY,
  matchPirsForOrigin,
  pirById,
  pirFulfillment,
  pirModalityStatus,
  type PirDef,
  type PirId,
  type PirModalityStatus,
} from "@/lib/intelContract/pirRegistry";

export {
  THEATER_CANON,
  canonForTheater,
  canonForSitrepRegion,
  canonForConflictTheater,
  canonGaps,
  formatCanonGapNote,
  type CanonChannel,
  type TheaterCanon,
} from "@/lib/intelContract/theaterCanonSources";

export { whyPublishLines } from "@/lib/intelContract/whyPublish";

export {
  runDisconfirmPass,
  resolveDisconfirmLog,
  candidatesFromNewsLike,
  DISCONFIRM_PATTERN,
  type DisconfirmLog,
  type DisconfirmCandidate,
} from "@/lib/intelContract/disconfirmPass";
export type { AdapterDisconfirmOpts } from "@/lib/intelContract/adapterOpts";

export {
  buildObserveWatchboard,
  type WatchboardItem,
  type WatchboardItemKind,
} from "@/lib/intelContract/buildObserveWatchboard";

export {
  watchboardItemToDeskFocus,
  deskGradeVisual,
  deskSlotOpacity,
  deskSpotlightRadiusKm,
  haversineKm,
  DESK_NON_FOCUS_ALPHA,
  SITREP_FLY_ANCHOR,
  type DeskFocus,
  type DeskFocusKind,
  type DeskGradeVisual,
  type DeskSlotOpacity,
} from "@/lib/intelContract/deskFocus";

export {
  buildCorroborationRings,
  deskVerifyPhase,
  litChannelCount,
  litRingCount,
  MODALITY_RING_COLOR,
  DESK_CHANNEL_STEP_MS,
  DESK_RING_STEP_MS,
  type CorroborationRingSpec,
  type DeskVerifyPhase,
} from "@/lib/intelContract/deskVerifySequence";

export {
  timeWindowAlpha,
  coolCssColor,
  disconfirmCollapseFactor,
  isPromotion,
  NEW_OBS_PULSE_MS,
} from "@/lib/intelContract/deskDynamics";

export {
  INTEL_UX,
  gradeLabelFriendly,
  gradeHint,
  markIntelDeskTipDone,
  readIntelDeskTipDone,
  shouldOfferIntelDeskTip,
} from "@/lib/intelContract/uxCopy";
