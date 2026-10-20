export type {
  ConflictConfidence,
  ConflictEventCategory,
  ConflictEventCluster,
  ConflictEventSource,
  ConflictTheater,
  RawConflictEvent,
} from "@/lib/conflictEvents/types";
export { CLUSTER_DEFAULTS } from "@/lib/conflictEvents/clusterConfig";
export { conflictEventsReplaceLegacy, LEGACY_CONFLICT_LAYER_IDS, stripLegacyConflictPrefs } from "@/lib/conflictEvents/flags";
export {
  extractRawConflictEvent,
  extractRawConflictEvents,
  locatedEventsOnly,
  ambiguousUnlocatedEvents,
} from "@/lib/conflictEvents/extractRawEvents";
export { clusterConflictEvents, duplicatePinRate } from "@/lib/conflictEvents/clusterEvents";
export {
  confidenceFromSourceCount,
  independentSourceLine,
  uniqueSourceKey,
} from "@/lib/conflictEvents/confidence";
export {
  buildConflictEventClusters,
  clusterToMarker,
  filterClustersByTheaters,
  selectConflictEventMarkers,
  CONFLICT_THEATER_FILTERS,
  MAX_CONFLICT_EVENT_MARKERS_BY_TIER,
} from "@/lib/conflictEvents/buildLayer";
export type { ConflictEventHtmlMarker } from "@/lib/conflictEvents/buildLayer";
export {
  CONFLICT_THEATER_META,
  CONFLICT_THEATER_ORDER,
  CONFLICT_THEATER_DEFAULT_ON,
  CONFLICT_THEATER_PREF_KEY,
  CONFLICT_THEATER_PANEL_ID,
} from "@/lib/conflictEvents/theaterMeta";
