/**
 * 서버 측 근거 검증 — 클라이언트가 보낸 strength / commercialUse / role을 신뢰하지 않음.
 */

import { classifyMediaTier } from "@/lib/news/mediaTiers";
import { commercialUseForSourceKey } from "@/lib/caseFile/commercialUse";
import {
  requiresServerProof,
  verifyServerProvenPayload,
  type ServerFrozenPayload,
} from "@/lib/caseFile/serverFreeze";
import {
  checkSatelliteRelevance,
  checkSensorRelevance,
  normalizeIncident,
} from "@/lib/caseFile/relevanceCheck";
import {
  evidenceSourceKind,
  type MediaTierHint,
} from "@/lib/caseFile/sourceKind";
import {
  clampEvidenceStrength,
  strengthCapFor,
} from "@/lib/caseFile/strengthCaps";
import type {
  CaseFile,
  CaseIncident,
  Claim,
  EvidenceLink,
  EvidenceRole,
  EvidenceStrength,
} from "@/lib/caseFile/types";
import { emptyIncident } from "@/lib/caseFile/types";
import { refreshCaseVerdicts } from "@/lib/caseFile/verdict";

export type SanitizeNote = {
  evidenceId: string;
  claimKind: Claim["kind"];
  action: "clamped" | "demoted_to_context" | "rejected" | "commercial_overwritten";
  detail: string;
};

export type SanitizeResult = {
  caseFile: CaseFile;
  notes: SanitizeNote[];
};

/** 언론 URL — 없으면 뒷받침 불가 */
function mediaUrl(ev: EvidenceLink): string {
  const payload = ev.frozenPayload as { url?: string } | null | undefined;
  return (payload && typeof payload.url === "string" && payload.url.trim()) || "";
}

/**
 * 언론 Tier — sourceKey·매체명·payload.tier는 무시.
 * URL 도메인만 classifyMediaTier로 계산. URL 없으면 Tier 3.
 */
function resolveMediaTier(ev: EvidenceLink): MediaTierHint {
  const url = mediaUrl(ev);
  if (!url) return 3;
  // 매체명으로 Tier 1을 위조하지 못하게 outlet은 비움
  return classifyMediaTier("", url) as MediaTierHint;
}

function hasManualArtifact(ev: EvidenceLink): boolean {
  if (ev.imageKey) return true;
  const payload = ev.frozenPayload as
    | { url?: string; imageUrl?: string; href?: string }
    | null
    | undefined;
  if (!payload || typeof payload !== "object") return false;
  return Boolean(
    (typeof payload.url === "string" && payload.url.trim()) ||
      (typeof payload.imageUrl === "string" && payload.imageUrl.trim()) ||
      (typeof payload.href === "string" && payload.href.trim()),
  );
}

/** 위성·사진 공통 — R2 키 또는 원본 URL */
function hasVisualArtifact(ev: EvidenceLink): boolean {
  return hasManualArtifact(ev);
}

/** 서버가 Copernicus에서 직접 받아 서명한 위성 전후 장면 */
function isServerProvenSatellite(ev: EvidenceLink): boolean {
  return (
    verifyServerProvenPayload(ev.frozenPayload) && ev.frozenPayload.sourceKind === "satellite"
  );
}

/** 선박 이력에서 사건 시각을 덮는 신호 끊김이 있었는가 */
function aisGapCoversIncident(ev: EvidenceLink): boolean {
  const results = (ev.frozenPayload as { results?: { gaps?: unknown } } | null)?.results;
  const gaps = results?.gaps;
  return (
    Array.isArray(gaps) &&
    gaps.some((g) => Boolean(g && typeof g === "object" && (g as { coversIncident?: unknown }).coversIncident))
  );
}

/**
 * 위성 "강" — 전후 영상 한 쌍 + 촬영일.
 * frozenPayload: beforeImageKey/afterImageKey (또는 beforeUrl/afterUrl) + beforeDate/afterDate
 */
function satelliteQualifiesStrong(ev: EvidenceLink): boolean {
  const p = ev.frozenPayload as Record<string, unknown> | null | undefined;
  if (!p || typeof p !== "object") return false;
  if (isServerProvenSatellite(ev)) {
    const r = p.results as Record<string, unknown> | undefined;
    const frameOk = (f: unknown) => {
      const o = f as { imageKey?: unknown; datetime?: unknown } | null | undefined;
      return Boolean(o && typeof o.imageKey === "string" && o.imageKey && typeof o.datetime === "string");
    };
    return Boolean(r && (r.mode === "optical" || r.mode === "sar") && frameOk(r.before) && frameOk(r.after));
  }
  const beforeKey =
    (typeof p.beforeImageKey === "string" && p.beforeImageKey.trim()) ||
    (typeof p.beforeUrl === "string" && p.beforeUrl.trim()) ||
    "";
  const afterKey =
    (typeof p.afterImageKey === "string" && p.afterImageKey.trim()) ||
    (typeof p.afterUrl === "string" && p.afterUrl.trim()) ||
    "";
  const beforeDate =
    (typeof p.beforeDate === "string" && p.beforeDate.trim()) ||
    (typeof p.acqBefore === "string" && p.acqBefore.trim()) ||
    "";
  const afterDate =
    (typeof p.afterDate === "string" && p.afterDate.trim()) ||
    (typeof p.acqAfter === "string" && p.acqAfter.trim()) ||
    "";
  return Boolean(beforeKey && afterKey && beforeDate && afterDate);
}

/** 사진 "강" — 위치 맞춘 방법(geolocationMethod) 기록이 있어야 함 */
function photoQualifiesStrong(ev: EvidenceLink): boolean {
  const p = ev.frozenPayload as
    | { geolocationMethod?: string; locationMethod?: string }
    | null
    | undefined;
  if (!p || typeof p !== "object") return false;
  const method =
    (typeof p.geolocationMethod === "string" && p.geolocationMethod.trim()) ||
    (typeof p.locationMethod === "string" && p.locationMethod.trim()) ||
    "";
  return method.length >= 8;
}

function appendLimitTag(limits: string, tag: string): string {
  const base = (limits || "").trim();
  if (base.includes(tag)) return base;
  return `${base} ${tag}`.trim();
}

/** 근거 문구 안의 이전 거리·시간 요약을 새 요약으로 교체 */
function refreshRelevanceInShows(
  shows: string,
  previousSummary: string | undefined,
  nextSummary: string,
): string {
  const text = shows || "";
  if (previousSummary && previousSummary !== nextSummary) {
    const old = `(${previousSummary})`;
    if (text.includes(old)) return text.replace(old, `(${nextSummary})`);
  }
  return text;
}

function sanitizeOneEvidence(
  claim: Claim,
  input: EvidenceLink,
  notes: SanitizeNote[],
  incident: CaseIncident,
): EvidenceLink | null {
  let ev = input;
  const kind = evidenceSourceKind(ev.sourceKey);
  const mediaTier = kind === "media" ? resolveMediaTier(ev) : undefined;
  const cap = strengthCapFor(kind, claim.kind, mediaTier);
  const commercialUse = commercialUseForSourceKey(ev.sourceKey);
  let gapClampWeak = false;

  if (ev.commercialUse !== commercialUse) {
    notes.push({
      evidenceId: ev.id,
      claimKind: claim.kind,
      action: "commercial_overwritten",
      detail: `commercialUse ${ev.commercialUse} → ${commercialUse} (server catalog)`,
    });
  }

  // 센서 근거: HMAC 봉인된 serverProven 스냅샷 없으면 뒷받침·반박 불가
  if (requiresServerProof(kind)) {
    if (!verifyServerProvenPayload(ev.frozenPayload)) {
      if (ev.role === "context" && ev.strength === "weak") {
        return { ...ev, commercialUse };
      }
      notes.push({
        evidenceId: ev.id,
        claimKind: claim.kind,
        action: "demoted_to_context",
        detail: `${kind} 근거에 유효한 서버 서명(proofSig) 없음 — 클라이언트 페이로드 거부`,
      });
      return {
        ...ev,
        role: "context" as EvidenceRole,
        strength: "weak",
        commercialUse,
        limits: `${ev.limits || ""} [서버: 미검증 센서 페이로드]`.trim(),
      };
    }

    // 서명된 sourceKind와 sourceKey 종류가 다르면 상한 위조 방지
    if (ev.frozenPayload.sourceKind !== kind) {
      notes.push({
        evidenceId: ev.id,
        claimKind: claim.kind,
        action: "demoted_to_context",
        detail: `sourceKind ${ev.frozenPayload.sourceKind} ≠ sourceKey ${kind} — 맥락으로만 보관`,
      });
      return {
        ...ev,
        role: "context",
        strength: "weak",
        commercialUse,
        limits: `${ev.limits || ""} [서버: sourceKind≠sourceKey]`.trim(),
      };
    }

    // 서버 조회 히트 0건 — 뒷받침/반박 불가
    if (
      ev.frozenPayload.resultCount === 0 &&
      (ev.role === "supports" || ev.role === "contradicts")
    ) {
      notes.push({
        evidenceId: ev.id,
        claimKind: claim.kind,
        action: "demoted_to_context",
        detail: "서버 조회 히트 0건 — 맥락으로만 보관",
      });
      return {
        ...ev,
        role: "context",
        strength: "weak",
        commercialUse,
        shows: ev.shows.trim() || "해당 범위에 탐지 없음",
        limits: `${ev.limits || ""} [서버: 해당 범위에 탐지 없음]`.trim(),
      };
    }

    // 현재 사건 기준점으로 거리·시간 재계산 — 붙인 뒤 역할을 되돌리거나 기준점을 옮겨도 다시 적용
    if (ev.frozenPayload.resultCount > 0) {
      const { relevance, demoteReason } = checkSensorRelevance(
        kind,
        ev.frozenPayload,
        incident,
      );
      ev = {
        ...ev,
        relevance,
        shows: refreshRelevanceInShows(ev.shows, ev.relevance?.summary, relevance.summary),
      };
      if (demoteReason && ev.role !== "context") {
        notes.push({
          evidenceId: ev.id,
          claimKind: claim.kind,
          action: "demoted_to_context",
          detail: `관련성 미달 — ${demoteReason}`,
        });
        return {
          ...ev,
          role: "context",
          strength: "weak",
          commercialUse,
          limits: appendLimitTag(ev.limits, `[서버: ${demoteReason}]`),
        };
      }
    }

    if (kind === "ais" && aisGapCoversIncident(ev)) {
      gapClampWeak = true;
      ev = { ...ev, limits: appendLimitTag(ev.limits, "[서버: 사건 시각에 선박 신호 끊김]") };
    }
  }

  // 서버 서명 위성 전후 장면: 영상 영역·촬영 순서를 현재 기준점으로 다시 확인
  if (kind === "satellite" && isServerProvenSatellite(ev)) {
    const { relevance, demoteReason } = checkSatelliteRelevance(
      ev.frozenPayload as ServerFrozenPayload,
      incident,
    );
    ev = { ...ev, relevance };
    if (demoteReason && ev.role !== "context") {
      notes.push({
        evidenceId: ev.id,
        claimKind: claim.kind,
        action: "demoted_to_context",
        detail: `위성 영상 사용 불가 — ${demoteReason}`,
      });
      return {
        ...ev,
        role: "context",
        strength: "weak",
        commercialUse,
        limits: appendLimitTag(ev.limits, `[서버: ${demoteReason}]`),
      };
    }
  }

  // 언론: URL 없으면 뒷받침·반박 불가 (매체명만으로 Tier 위조 방지)
  if (
    kind === "media" &&
    (ev.role === "supports" || ev.role === "contradicts") &&
    !mediaUrl(ev)
  ) {
    notes.push({
      evidenceId: ev.id,
      claimKind: claim.kind,
      action: "demoted_to_context",
      detail: "언론 근거에 URL 없음 — 맥락으로만 보관",
    });
    return {
      ...ev,
      role: "context" as EvidenceRole,
      strength: "weak",
      commercialUse,
      limits: `${ev.limits || ""} [서버: 언론 URL 필수]`.trim(),
    };
  }

  // 수동 근거: URL/이미지 없으면 뒷받침·반박 불가
  if (
    kind === "manual" &&
    (ev.role === "supports" || ev.role === "contradicts") &&
    !hasManualArtifact(ev)
  ) {
    notes.push({
      evidenceId: ev.id,
      claimKind: claim.kind,
      action: "demoted_to_context",
      detail: "수동 근거에 URL/이미지 없음 — 맥락으로만 보관",
    });
    return {
      ...ev,
      role: "context" as EvidenceRole,
      strength: "weak",
      commercialUse,
      limits: `${ev.limits || ""} [서버: 수동 근거 증빙 없음]`.trim(),
    };
  }

  // 위성·사진: 이미지/URL 없으면 뒷받침·반박 불가
  if (
    (kind === "satellite" || kind === "photo") &&
    (ev.role === "supports" || ev.role === "contradicts") &&
    !hasVisualArtifact(ev)
  ) {
    notes.push({
      evidenceId: ev.id,
      claimKind: claim.kind,
      action: "demoted_to_context",
      detail: `${kind} 근거에 imageKey/URL 없음 — 맥락으로만 보관`,
    });
    return {
      ...ev,
      role: "context" as EvidenceRole,
      strength: "weak",
      commercialUse,
      limits: `${ev.limits || ""} [서버: ${kind} 증빙 없음]`.trim(),
    };
  }

  if (cap == null) {
    if (ev.role === "context") {
      return { ...ev, strength: "weak", commercialUse };
    }
    notes.push({
      evidenceId: ev.id,
      claimKind: claim.kind,
      action: "demoted_to_context",
      detail: `${kind}는 ${claim.kind} 주장에 뒷받침/반박 불가 — 맥락으로 강등`,
    });
    return {
      ...ev,
      role: "context",
      strength: "weak",
      commercialUse,
      limits: `${ev.limits || ""} [서버: ${kind}→${claim.kind} 상한 없음]`.trim(),
    };
  }

  const requested = (["strong", "medium", "weak"] as EvidenceStrength[]).includes(
    ev.strength,
  )
    ? ev.strength
    : "weak";

  // 위성·사진 "강"은 추가 조건 충족 시에만 — 아니면 중 이하
  let effectiveCap = cap;
  if (
    (kind === "satellite" || kind === "photo") &&
    effectiveCap === "strong"
  ) {
    const qualifies =
      kind === "satellite"
        ? satelliteQualifiesStrong(ev)
        : photoQualifiesStrong(ev);
    if (!qualifies) {
      effectiveCap = "medium";
    }
  }
  if (gapClampWeak) effectiveCap = "weak";

  const clamped = clampEvidenceStrength(requested, effectiveCap);
  if (clamped == null) {
    notes.push({
      evidenceId: ev.id,
      claimKind: claim.kind,
      action: "rejected",
      detail: "강도 상한 없음",
    });
    return null;
  }

  if (clamped !== requested) {
    notes.push({
      evidenceId: ev.id,
      claimKind: claim.kind,
      action: "clamped",
      detail: `strength ${requested} → ${clamped} (cap ${effectiveCap} for ${kind}/${claim.kind}${mediaTier ? ` tier${mediaTier}` : ""})`,
    });
  }

  return {
    ...ev,
    strength: clamped,
    commercialUse,
  };
}

export function sanitizeClaimEvidence(
  claim: Claim,
  notes: SanitizeNote[],
  incident: CaseIncident = emptyIncident(),
): Claim {
  const next: EvidenceLink[] = [];
  for (const ev of claim.evidence ?? []) {
    const cleaned = sanitizeOneEvidence(claim, ev, notes, incident);
    if (cleaned) next.push(cleaned);
  }
  return { ...claim, evidence: next };
}

/** 저장 직전 — 사건 기준점 정리, 모든 근거 검증 후 판정 재계산 */
export function sanitizeCaseFile(caseFile: CaseFile): SanitizeResult {
  const notes: SanitizeNote[] = [];
  const incident = normalizeIncident(caseFile.incident);
  const claims = caseFile.claims.map((c) => sanitizeClaimEvidence(c, notes, incident));
  const next = refreshCaseVerdicts({
    ...caseFile,
    incident,
    claims,
  });
  return { caseFile: next, notes };
}
