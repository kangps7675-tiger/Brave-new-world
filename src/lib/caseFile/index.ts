export type {
  CaseArticle,
  CaseEventType,
  CaseFile,
  CaseIncident,
  CasePlace,
  CaseRevisionOp,
  CaseRevisionRecord,
  Claim,
  ClaimKind,
  ClaimOverride,
  CommercialUseFlag,
  EvidenceLink,
  EvidenceRelevance,
  EvidenceRole,
  EvidenceStrength,
  MediaTier,
  OccurredAtSource,
  Verdict,
} from "@/lib/caseFile/types";
export { CORE_CLAIM_KINDS, emptyIncident } from "@/lib/caseFile/types";
export { buildClaimTemplates } from "@/lib/caseFile/claimTemplates";
export { commercialUseForSourceKey } from "@/lib/caseFile/commercialUse";
export {
  evidenceSourceKind,
  mediaTierFromSourceKey,
} from "@/lib/caseFile/sourceKind";
export type { EvidenceSourceKind, MediaTierHint } from "@/lib/caseFile/sourceKind";
export {
  clampEvidenceStrength,
  minStrength,
  strengthCapFor,
  strengthRank,
} from "@/lib/caseFile/strengthCaps";
export type { StrengthCap } from "@/lib/caseFile/strengthCaps";
export { sanitizeCaseFile, sanitizeClaimEvidence } from "@/lib/caseFile/sanitizeEvidence";
export type { SanitizeNote, SanitizeResult } from "@/lib/caseFile/sanitizeEvidence";
export {
  computeCaseVerdict,
  computeClaimVerdict,
  effectiveClaimVerdict,
  evidence,
  explainCaseVerdict,
  refreshCaseVerdicts,
} from "@/lib/caseFile/verdict";
export type { VerdictExplanation } from "@/lib/caseFile/verdict";
export {
  INVESTIGATION_STEPS,
  deriveInvestigationStep,
  investigationStepProgress,
} from "@/lib/caseFile/investigationSteps";
export type {
  InvestigationStepId,
  StepState,
} from "@/lib/caseFile/investigationSteps";
export {
  eventTypeLabel,
  findStepsForEventType,
  isProcedureItemDone,
  procedureChecklistFor,
} from "@/lib/caseFile/procedureChecklists";
export type {
  FindStep,
  ProcedureCheckItem,
  SensorAttachMode,
} from "@/lib/caseFile/procedureChecklists";
export {
  applyCaseRevision,
  CaseNotFoundError,
  CaseRevConflictError,
  createCaseFile,
  getCaseFile,
} from "@/lib/caseFile/store";
export { authorizeCaseEditor, unauthorizedResponse } from "@/lib/caseFile/auth";
export {
  buildCaseDraft,
  buildCaseDraftFromText,
  draftToCaseFileInput,
  findOccurredHint,
} from "@/lib/caseFile/buildDraft";
export type { CaseDraft, PlaceDraft } from "@/lib/caseFile/buildDraft";
export {
  extractParagraphText,
  fetchAndExtractArticle,
  parseArticleMetaFromHtml,
} from "@/lib/caseFile/extractArticle";
export type { ExtractedArticle } from "@/lib/caseFile/extractArticle";
export { uploadCaseEvidenceImage } from "@/lib/caseFile/r2Upload";
export { buildSoftEvidenceLink } from "@/lib/caseFile/softEvidence";
export type {
  BuildSoftEvidenceInput,
  SoftEvidenceKind,
} from "@/lib/caseFile/softEvidence";
export {
  isInvestigatePublicEnabled,
  plainVerdictBlurb,
  runPublicInvestigate,
  validateInvestigateInput,
} from "@/lib/caseFile/investigatePublic";
export {
  checkInvestigateRateLimit,
  clientKeyFromRequest,
  INVESTIGATE_LIMITS,
  resetInvestigateRateLimitForTests,
} from "@/lib/caseFile/investigateRateLimit";
export {
  AIR_RAID_DEFAULT_WINDOW_HOURS,
  AIS_DEFAULT_WINDOW_HOURS,
  FIRMS_TIME_WINDOW_HOURS,
  SERVER_PROVEN_FLAG,
  applyEvidenceRelevance,
  buildEvidenceRelevance,
  buildProvenEvidenceLink,
  evidenceHmacSecret,
  firmsAcqToIso,
  formatTimeDeltaMinutes,
  freezeAirRaidEvidence,
  freezeAisEvidence,
  freezeFirmsEvidence,
  hashCanonicalJson,
  hashStoredProvenBody,
  isServerProvenPayload,
  requiresServerProof,
  resolveAirRaidQueryFromIncident,
  resolveAisQueryFromIncident,
  resolveFirmsQueryFromIncident,
  sealServerFrozenPayload,
  verifyServerProvenPayload,
} from "@/lib/caseFile/serverFreeze";
export type {
  AirRaidFreezeQuery,
  AirRaidFreezeResult,
  AisFreezePick,
  AisFreezeQuery,
  AisFreezeResult,
  BuildProvenEvidenceInput,
  FirmsFreezeQuery,
  FirmsFreezeResult,
  ServerFrozenPayload,
  ServerFrozenPayloadUnsigned,
} from "@/lib/caseFile/serverFreeze";
