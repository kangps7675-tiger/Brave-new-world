/**
 * 출처 종류 × 세부 주장 — 근거 강도 상한.
 * 클라이언트가 "강"을 보내도 서버가 이 표로 깎거나 거부한다.
 */

import type { ClaimKind, EvidenceStrength } from "@/lib/caseFile/types";
import type { EvidenceSourceKind } from "@/lib/caseFile/sourceKind";

/** null = 이 주장에 그 출처를 뒷받침/반박으로 쓸 수 없음 */
export type StrengthCap = EvidenceStrength | null;

const RANK: Record<EvidenceStrength, number> = {
  weak: 1,
  medium: 2,
  strong: 3,
};

export function strengthRank(s: EvidenceStrength): number {
  return RANK[s];
}

export function minStrength(
  a: EvidenceStrength,
  b: EvidenceStrength,
): EvidenceStrength {
  return strengthRank(a) <= strengthRank(b) ? a : b;
}

type CapRow = Record<ClaimKind, StrengthCap>;

/**
 * 기준표 초안.
 * Tzeva 시간=강, NEPTUN 장소=약·수단=중, FIRMS 주체=불가 등.
 */
const CAPS: Record<EvidenceSourceKind, CapRow> = {
  firms: {
    place: "medium",
    time: "medium",
    occurrence: "medium",
    damage: "weak",
    means: null,
    actor: null,
  },
  "tzeva-adom": {
    place: "medium",
    time: "strong",
    occurrence: "medium",
    damage: null,
    means: "medium",
    actor: null,
  },
  neptun: {
    place: "weak",
    time: "medium",
    occurrence: "medium",
    damage: null,
    means: "medium",
    actor: null,
  },
  ais: {
    place: "medium",
    time: "medium",
    occurrence: "medium",
    damage: null,
    means: null,
    actor: null,
  },
  /** 군용기 항적 — 그 근처에 있었다는 정황. 수단(기종)은 중까지 */
  adsb: {
    place: "weak",
    time: "weak",
    occurrence: "weak",
    damage: null,
    means: "medium",
    actor: "weak",
  },
  /** 통제 구역 — 누가 그 땅을 쥐고 있었는지. 사건 자체는 증명하지 않음 */
  "control-zone": {
    place: null,
    time: null,
    occurrence: null,
    damage: null,
    means: null,
    actor: "weak",
  },
  /** 주변 시설 — 기사에 나온 표적이 그 자리에 실제로 있는지 */
  facility: {
    place: "weak",
    time: null,
    occurrence: null,
    damage: null,
    means: null,
    actor: null,
  },
  /** "강"은 sanitize에서 전후 쌍+촬영일 충족 시에만 허용, 아니면 medium */
  satellite: {
    place: "strong",
    time: "medium",
    occurrence: "strong",
    damage: "strong",
    means: "weak",
    actor: null,
  },
  /** "강"은 sanitize에서 geolocationMethod 기록 시에만 허용, 아니면 medium */
  photo: {
    place: "strong",
    time: "medium",
    occurrence: "strong",
    damage: "medium",
    means: "medium",
    actor: null,
  },
  liveua: {
    place: "weak",
    time: "weak",
    occurrence: "weak",
    damage: "weak",
    means: "weak",
    actor: null,
  },
  ukmto: {
    place: "medium",
    time: "medium",
    occurrence: "medium",
    damage: null,
    means: "weak",
    actor: null,
  },
  /** 언론 매칭 공식 — 당사자·공식 발표에 가깝게 (언론 Tier 3와 동일) */
  official: {
    place: "weak",
    time: "weak",
    occurrence: "weak",
    damage: "weak",
    means: "weak",
    actor: "weak",
  },
  /** Tier는 mediaTierForSourceKey로 세분 — 여기 기본은 Tier 2 */
  media: {
    place: "medium",
    time: "medium",
    occurrence: "medium",
    damage: "medium",
    means: "weak",
    actor: "weak",
  },
  manual: {
    place: "medium",
    time: "medium",
    occurrence: "medium",
    damage: "medium",
    means: "weak",
    actor: null,
  },
  other: {
    place: "weak",
    time: "weak",
    occurrence: "weak",
    damage: "weak",
    means: "weak",
    actor: null,
  },
};

const MEDIA_TIER1: CapRow = {
  place: "medium",
  time: "medium",
  occurrence: "medium",
  damage: "medium",
  means: "weak",
  actor: "weak",
};

const MEDIA_TIER3: CapRow = {
  place: "weak",
  time: "weak",
  occurrence: "weak",
  damage: "weak",
  means: "weak",
  actor: "weak",
};

export function strengthCapFor(
  kind: EvidenceSourceKind,
  claimKind: ClaimKind,
  mediaTier?: 1 | 2 | 3,
): StrengthCap {
  if (kind === "media") {
    const row =
      mediaTier === 1 ? MEDIA_TIER1 : mediaTier === 3 ? MEDIA_TIER3 : CAPS.media;
    return row[claimKind];
  }
  return CAPS[kind][claimKind];
}

/** 요청 강도를 상한 이하로. 상한이 null이면 null(거부). */
export function clampEvidenceStrength(
  requested: EvidenceStrength,
  cap: StrengthCap,
): EvidenceStrength | null {
  if (cap == null) return null;
  return minStrength(requested, cap);
}
