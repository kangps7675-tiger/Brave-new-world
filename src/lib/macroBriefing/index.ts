export type {
  MacroBriefingPayload,
  MacroCameraHint,
  MacroDensityBadge,
  MacroDomain,
  MacroGdeltInputEvent,
  MacroRssInputItem,
  MacroSourceLink,
  MacroStep,
  MacroThemeId,
  MacroTopic,
  MacroTrustBadge,
} from "./types";

export { buildMacroBriefing, flattenNewsStreamItems } from "./rollup";
export { assignGdeltTheme, assignRssTheme } from "./assignTheme";
export {
  computeGdeltBoost,
  computeRssHeat,
  computeThemeHeat,
  densityBadgeFromGdelt,
  densityLabel,
  filterGdeltLast24h,
  heatLabel,
  rssIndependentKeys,
  trustBadgeFromRss,
} from "./heat";
export {
  cameraForTheme,
  candidateThemeIds,
  chokeThemeId,
  econThemeId,
  macroThemeTitle,
  theaterThemeId,
} from "./themes";
export {
  catalystStepBody,
  gdeltDensityStepBody,
  rssClusterStepBody,
  trustBadgeLabel,
} from "./narrative";
