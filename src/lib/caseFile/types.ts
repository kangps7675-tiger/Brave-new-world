/**
 * 조사 사건 파일 — 세부 주장 단위 근거·판정.
 * 판정은 규칙으로 계산하고, 사람이 바꾸면 override에 이유를 남긴다.
 */

export type CaseEventType = "maritime" | "strike" | "other";

export type ClaimKind =
  | "place"
  | "time"
  | "occurrence"
  | "damage"
  | "means"
  | "actor";

export type Verdict = "confirmed" | "partial" | "unconfirmed" | "refuted";

export type EvidenceRole = "supports" | "contradicts" | "context";

export type EvidenceStrength = "strong" | "medium" | "weak";

export type CommercialUseFlag = "allowed" | "license-required" | "unknown";

export type MediaTier = 1 | 2 | 3;

export type CaseArticle = {
  url?: string;
  text: string;
  outlet?: string;
  tier?: MediaTier;
  publishedAt?: string;
};

/** 사건 장소 — 센서 조회·거리 계산의 기준 (주장 문장과 별도) */
export type CasePlace = {
  label: string;
  lat: number;
  lng: number;
  precision: string;
  source: "impact" | "gazetteer" | "editor" | "none";
};

export type OccurredAtSource = "body" | "article" | "editor" | "none";

/**
 * 구조화된 사건 앵커. 센서 근거는 이 값으로만 조회한다
 * (클라이언트 카메라/현재 시각 금지).
 */
export type CaseIncident = {
  place: CasePlace | null;
  occurredAt: string | null;
  occurredAtSource: OccurredAtSource;
};

/** 근거 ↔ 사건 앵커 거리·시간차 (결과물·판정 강등용) */
export type EvidenceRelevance = {
  distanceKm: number | null;
  /** 근거 시각 − 사건 시각 (분). 근거가 뒤면 양수 */
  timeDeltaMinutes: number | null;
  summary: string;
};

export type EvidenceLink = {
  id: string;
  /** firms / ais / neptun / tzeva-adom / manual / … */
  sourceKey: string;
  role: EvidenceRole;
  strength: EvidenceStrength;
  /** 이 근거가 실제로 보여주는 것 (과장 금지) */
  shows: string;
  limits: string;
  capturedAt: string;
  /** 붙인 순간의 데이터 스냅샷 */
  frozenPayload: unknown;
  /** R2 object key */
  imageKey?: string;
  commercialUse: CommercialUseFlag;
  /** 사건 앵커 대비 거리·시간차 */
  relevance?: EvidenceRelevance;
};

export type ClaimOverride = {
  verdict: Verdict;
  reason: string;
  /** 편집자 표시용 */
  at?: string;
};

export type Claim = {
  id: string;
  kind: ClaimKind;
  statement: string;
  /** 지도·센서로 확인 가능한 주장인지 */
  mapCheckable: boolean;
  evidence: EvidenceLink[];
  /** 규칙으로 계산된 판정 */
  verdict: Verdict;
  /** 사람이 바꾼 판정 — 있으면 결과물에 「편집자 판단」 */
  override?: ClaimOverride;
};

export type CaseFile = {
  id: string;
  title?: string;
  article: CaseArticle;
  eventType: CaseEventType;
  /** 센서 조회·관련성 계산의 기준 위치·시각 */
  incident: CaseIncident;
  claims: Claim[];
  /** 핵심 세부 주장(장소·시간·사건 발생)에서 자동 계산 */
  verdict: Verdict;
  rev: number;
  createdAt?: string;
  updatedAt?: string;
};

export function emptyIncident(): CaseIncident {
  return { place: null, occurredAt: null, occurredAtSource: "none" };
}

/** 전체 판정에 들어가는 핵심 주장 (수단·주체 제외) */
export const CORE_CLAIM_KINDS: readonly ClaimKind[] = [
  "place",
  "time",
  "occurrence",
] as const;

export type CaseRevisionOp =
  | "create"
  | "update_article"
  | "update_claim"
  | "update_incident"
  | "add_evidence"
  | "remove_evidence"
  | "set_override"
  | "clear_override"
  | "set_event_type"
  | "recompute";

export type CaseRevisionRecord = {
  caseId: string;
  rev: number;
  at: string;
  op: CaseRevisionOp;
  payload: unknown;
  reason?: string;
};
