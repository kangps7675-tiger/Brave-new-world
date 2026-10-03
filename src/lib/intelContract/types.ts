import type { MediaTrustTier } from "@/lib/news/types";

export type ObservationModality =
  | "media"
  | "sensor"
  | "alert"
  | "official"
  | "stat"
  | "tip";

export type DisplayGrade = "drop" | "hold" | "low" | "std" | "high";

export type PublishSurface =
  | "watchboard"
  | "source_drill"
  | "map_hero"
  | "theater_sitrep"
  | "breaking_flash"
  | "escalation_banner"
  | "economy_alert";

export type BundleKind =
  | "incident"
  | "theater-window"
  | "indicator"
  | "escalation"
  | "maritime-alert";

export type Observation = {
  id: string;
  modality: ObservationModality;
  sourceKey: string;
  trustTier?: MediaTrustTier | null;
  occurredAt: string | null;
  geo?: {
    lat: number;
    lng: number;
    precision: "point" | "place" | "theater";
  };
  theater?: string | null;
  url?: string | null;
  payloadRef: string;
  label?: string;
  text?: string;
  /**
   * false면 G1 독립성·independenceCount에 넣지 않음.
   * 어댑터 스캐폴드(가짜 채널 부풀리기)는 반드시 false.
   * 생략 시 true.
   */
  countsTowardIndependence?: boolean;
};

export type EvidenceBundle = {
  bundleId: string;
  kind: BundleKind;
  titleKo: string;
  titleEn: string;
  observations: Observation[];
  independenceCount: number;
  modalityCount: number;
  timeSpanMs: number;
  geoOk: boolean;
  method: string;
  disconfirmLog: {
    queried: boolean;
    hitCount: number;
  };
  killCriteria: string[];
  altHypothesis?: {
    labelKo: string;
    labelEn: string;
    supportIds: string[];
  };
  /** 유저 노출용 주장 — citation 가능한 범위만 */
  claimKo?: string;
  claimEn?: string;
  /** 원본 링크 (sitrep region, cluster id 등) */
  originRef?: string;
};

export type GateReason = {
  code: string;
  ok: boolean;
  detailKo: string;
  detailEn: string;
};

export type GateResult = {
  grade: DisplayGrade;
  reasons: GateReason[];
  bundle: EvidenceBundle;
};
