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
  buildObserveWatchboard,
  type WatchboardItem,
  type WatchboardItemKind,
} from "@/lib/intelContract/buildObserveWatchboard";

export {
  INTEL_UX,
  gradeLabelFriendly,
  gradeHint,
  markIntelDeskTipDone,
  readIntelDeskTipDone,
  shouldOfferIntelDeskTip,
} from "@/lib/intelContract/uxCopy";
