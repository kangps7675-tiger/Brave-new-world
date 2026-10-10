/**
 * 서버 증명(HMAC)이 필요 없는 근거 — 언론·사진·위성·수동.
 * 강도·상업이용은 sanitizeCaseFile이 저장 시 다시 clamp.
 */

import { classifyMediaTier, extractHostname } from "@/lib/news/mediaTiers";
import { commercialUseForSourceKey } from "@/lib/caseFile/commercialUse";
import {
  clampEvidenceStrength,
  strengthCapFor,
} from "@/lib/caseFile/strengthCaps";
import type {
  ClaimKind,
  EvidenceLink,
  EvidenceRole,
  EvidenceStrength,
} from "@/lib/caseFile/types";

export type SoftEvidenceKind = "media" | "photo" | "satellite" | "manual";

function newEvidenceId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export type BuildSoftEvidenceInput = {
  kind: SoftEvidenceKind;
  claimKind: ClaimKind;
  role: EvidenceRole;
  shows?: string;
  limits?: string;
  requestedStrength?: EvidenceStrength;
  imageKey?: string;
  /** media */
  url?: string;
  outlet?: string;
  /** photo */
  imageUrl?: string;
  geolocationMethod?: string;
  /** satellite before/after */
  beforeUrl?: string;
  afterUrl?: string;
  beforeDate?: string;
  afterDate?: string;
  /** manual free note */
  note?: string;
};

export function buildSoftEvidenceLink(
  input: BuildSoftEvidenceInput,
): EvidenceLink | { error: string } {
  const role: EvidenceRole =
    input.role === "contradicts" || input.role === "context"
      ? input.role
      : "supports";

  if (input.kind === "media") {
    const url = (input.url ?? "").trim();
    if (!url || !isHttpUrl(url)) {
      return { error: "언론 근거는 http(s) URL이 필요합니다" };
    }
    const host = extractHostname(url);
    const tier = classifyMediaTier("", url);
    const outlet = (input.outlet ?? "").trim() || host || "media";
    const shows =
      input.shows?.trim() ||
      `${outlet} 보도${host ? ` (${host})` : ""} · Tier ${tier}`;
    const limits =
      input.limits?.trim() ||
      "언론은 주장·인용일 뿐 — 지도 센서 확인과 별개. 등급은 URL 도메인만으로 산정";
    const cap = strengthCapFor("media", input.claimKind, tier);
    const requested = input.requestedStrength ?? "medium";
    const strength =
      cap == null
        ? "weak"
        : (clampEvidenceStrength(requested, cap) ?? "weak");
    let outRole = role;
    if (cap == null && outRole !== "context") outRole = "context";
    return {
      id: newEvidenceId("ev"),
      sourceKey: `media:${host || "unknown"}`,
      role: outRole,
      strength: outRole === "context" ? "weak" : strength,
      shows,
      limits,
      capturedAt: new Date().toISOString(),
      frozenPayload: {
        url,
        outlet,
        host,
        tier,
        note: input.note?.trim() || undefined,
      },
      imageKey: input.imageKey,
      commercialUse: commercialUseForSourceKey("media"),
    };
  }

  if (input.kind === "photo") {
    const imageUrl = (input.imageUrl ?? input.url ?? "").trim();
    const hasImage = Boolean(input.imageKey) || (imageUrl && isHttpUrl(imageUrl));
    if (!hasImage && role !== "context") {
      return { error: "사진 근거는 imageKey 또는 이미지 URL이 필요합니다" };
    }
    const method = (input.geolocationMethod ?? "").trim();
    const shows =
      input.shows?.trim() ||
      (method
        ? `현장 사진 · 위치 맞춤: ${method.slice(0, 48)}`
        : "현장 사진");
    const limits =
      input.limits?.trim() ||
      "사진 위치·시각은 편집자 기록에 의존 — 강은 위치 맞춤 방법 기록 시에만";
    const cap = strengthCapFor("photo", input.claimKind);
    const requested = input.requestedStrength ?? (method.length >= 8 ? "strong" : "medium");
    const strength =
      cap == null
        ? "weak"
        : (clampEvidenceStrength(requested, cap) ?? "weak");
    let outRole = role;
    if (cap == null && outRole !== "context") outRole = "context";
    return {
      id: newEvidenceId("ev"),
      sourceKey: "photo",
      role: outRole,
      strength: outRole === "context" ? "weak" : strength,
      shows,
      limits,
      capturedAt: new Date().toISOString(),
      frozenPayload: {
        url: imageUrl || undefined,
        imageUrl: imageUrl || undefined,
        geolocationMethod: method || undefined,
        note: input.note?.trim() || undefined,
      },
      imageKey: input.imageKey,
      commercialUse: commercialUseForSourceKey("photo"),
    };
  }

  if (input.kind === "satellite") {
    const beforeUrl = (input.beforeUrl ?? "").trim();
    const afterUrl = (input.afterUrl ?? "").trim();
    const singleUrl = (input.url ?? input.imageUrl ?? "").trim();
    const beforeDate = (input.beforeDate ?? "").trim();
    const afterDate = (input.afterDate ?? "").trim();
    const hasPair =
      (beforeUrl && isHttpUrl(beforeUrl) && afterUrl && isHttpUrl(afterUrl)) ||
      Boolean(input.imageKey);
    const hasSingle = singleUrl && isHttpUrl(singleUrl);
    if (!hasPair && !hasSingle && role !== "context") {
      return {
        error: "위성 근거는 전후 URL(또는 단일 URL/imageKey)이 필요합니다",
      };
    }
    const shows =
      input.shows?.trim() ||
      (beforeDate && afterDate
        ? `위성 전후 ${beforeDate} → ${afterDate}`
        : "위성 영상");
    const limits =
      input.limits?.trim() ||
      "위성은 열원·피해 후보 — 강은 전후 쌍+촬영일 충족 시에만";
    const cap = strengthCapFor("satellite", input.claimKind);
    const qualifiesStrong = Boolean(
      beforeUrl &&
        afterUrl &&
        beforeDate &&
        afterDate &&
        isHttpUrl(beforeUrl) &&
        isHttpUrl(afterUrl),
    );
    const requested =
      input.requestedStrength ?? (qualifiesStrong ? "strong" : "medium");
    const strength =
      cap == null
        ? "weak"
        : (clampEvidenceStrength(requested, cap) ?? "weak");
    let outRole = role;
    if (cap == null && outRole !== "context") outRole = "context";
    return {
      id: newEvidenceId("ev"),
      sourceKey: "satellite",
      role: outRole,
      strength: outRole === "context" ? "weak" : strength,
      shows,
      limits,
      capturedAt: new Date().toISOString(),
      frozenPayload: {
        beforeUrl: beforeUrl || undefined,
        afterUrl: afterUrl || undefined,
        beforeDate: beforeDate || undefined,
        afterDate: afterDate || undefined,
        url: singleUrl || undefined,
        note: input.note?.trim() || undefined,
      },
      imageKey: input.imageKey,
      commercialUse: commercialUseForSourceKey("satellite"),
    };
  }

  // manual
  const url = (input.url ?? "").trim();
  const note = (input.note ?? "").trim();
  const hasArtifact =
    Boolean(input.imageKey) || (url && isHttpUrl(url)) || note.length >= 8;
  if (!hasArtifact && role !== "context") {
    return { error: "수동 근거는 URL·이미지·설명(8자+) 중 하나가 필요합니다" };
  }
  const shows = input.shows?.trim() || note.slice(0, 80) || "수동 근거";
  const limits =
    input.limits?.trim() || "편집자 수동 기록 — 센서 증명 없음";
  const cap = strengthCapFor("manual", input.claimKind);
  const requested = input.requestedStrength ?? "weak";
  const strength =
    cap == null
      ? "weak"
      : (clampEvidenceStrength(requested, cap) ?? "weak");
  let outRole = role;
  if (cap == null && outRole !== "context") outRole = "context";
  // URL/이미지 없으면 supports라도 sanitize가 맥락으로 내림 — note만이면 context로 시작
  if (!(input.imageKey || (url && isHttpUrl(url))) && outRole !== "context") {
    outRole = "context";
  }
  return {
    id: newEvidenceId("ev"),
    sourceKey: "manual",
    role: outRole,
    strength: outRole === "context" ? "weak" : strength,
    shows,
    limits,
    capturedAt: new Date().toISOString(),
    frozenPayload: {
      url: url && isHttpUrl(url) ? url : undefined,
      note: note || undefined,
    },
    imageKey: input.imageKey,
    commercialUse: commercialUseForSourceKey("manual"),
  };
}
