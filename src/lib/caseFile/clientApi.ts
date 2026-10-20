import {
  draftToCaseFileInput,
  type CaseDraft,
} from "@/lib/caseFile/buildDraft";
import type { SanitizeNote } from "@/lib/caseFile/sanitizeEvidence";
import type { SoftEvidenceKind } from "@/lib/caseFile/softEvidence";
import type {
  CaseFile,
  CaseIncident,
  CaseRevisionOp,
  EvidenceLink,
  EvidenceRole,
  EvidenceStrength,
  Verdict,
} from "@/lib/caseFile/types";
import type { VerdictExplanation } from "@/lib/caseFile/verdict";

export class CaseApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "CaseApiError";
    this.status = status;
    this.body = body;
  }
}

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.trim()}`,
  };
}

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function extractCaseDraft(
  token: string,
  input: { url?: string; text?: string; outlet?: string },
): Promise<CaseDraft> {
  const res = await fetch("/api/cases/extract", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  const body = (await parseJson(res)) as { draft?: CaseDraft; error?: string };
  if (!res.ok || !body?.draft) {
    throw new CaseApiError(res.status, body?.error || "extract failed", body);
  }
  return body.draft;
}

export async function createCaseFromDraft(
  token: string,
  draft: CaseDraft,
): Promise<{ caseFile: CaseFile; sanitizeNotes: SanitizeNote[] }> {
  const res = await fetch("/api/cases", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      caseFile: draftToCaseFileInput(draft),
    }),
  });
  const body = (await parseJson(res)) as {
    caseFile?: CaseFile;
    sanitizeNotes?: SanitizeNote[];
    error?: string;
  };
  if (!res.ok || !body?.caseFile) {
    throw new CaseApiError(res.status, body?.error || "create failed", body);
  }
  return {
    caseFile: body.caseFile,
    sanitizeNotes: body.sanitizeNotes ?? [],
  };
}

export async function fetchCaseFile(caseId: string): Promise<{
  caseFile: CaseFile;
  explanation: VerdictExplanation;
}> {
  const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}`, {
    method: "GET",
    cache: "no-store",
  });
  const body = (await parseJson(res)) as {
    caseFile?: CaseFile;
    explanation?: VerdictExplanation;
    error?: string;
  };
  if (!res.ok || !body?.caseFile) {
    throw new CaseApiError(res.status, body?.error || "not found", body);
  }
  return {
    caseFile: body.caseFile,
    explanation: body.explanation ?? {
      caseVerdict: body.caseFile.verdict,
      core: [],
      why: "",
      whatWouldChange: [],
      nonCoreNote: "",
    },
  };
}

export type SensorEvidenceSource =
  | "firms"
  | "air-raid"
  | "ais"
  | "adsb"
  | "satellite"
  | "control-zone"
  | "facility";

export type AttachSensorEvidenceInput = {
  token: string;
  caseId: string;
  expectedRev: number;
  claimId: string;
  source: SensorEvidenceSource;
  role?: EvidenceRole;
  requestedStrength?: EvidenceStrength;
  adsb?: { radiusKm?: number; windowHours?: number; pickHex?: string };
  facility?: { radiusKm?: number };
  /** 반경·선택만 — 좌표·시각은 서버가 사건 앵커에서 정함 */
  firms?: {
    radiusKm: number;
    pickId?: string;
  };
  airRaid?: {
    radiusKm: number;
    windowHours?: number;
    pickThreatId?: string;
    pickAlertId?: string;
  };
  ais?: {
    radiusKm: number;
    windowHours?: number;
    category?: "military" | "commercial" | "other" | "all";
    pickId?: string;
    pickMmsi?: string;
  };
};

export async function reviseCaseFile(input: {
  token: string;
  caseId: string;
  expectedRev: number;
  op: CaseRevisionOp;
  nextCase: CaseFile;
  reason?: string;
}): Promise<{ caseFile: CaseFile; sanitizeNotes: SanitizeNote[] }> {
  const res = await fetch(
    `/api/cases/${encodeURIComponent(input.caseId)}/revisions`,
    {
      method: "POST",
      headers: authHeaders(input.token),
      body: JSON.stringify({
        expectedRev: input.expectedRev,
        op: input.op,
        nextCase: input.nextCase,
        reason: input.reason,
      }),
    },
  );
  const body = (await parseJson(res)) as {
    caseFile?: CaseFile;
    sanitizeNotes?: SanitizeNote[];
    error?: string;
    currentRev?: number;
  };
  if (!res.ok || !body?.caseFile) {
    throw new CaseApiError(
      res.status,
      body?.error ||
        (res.status === 409
          ? `rev conflict (current=${body?.currentRev ?? "?"})`
          : "revise failed"),
      body,
    );
  }
  return {
    caseFile: body.caseFile,
    sanitizeNotes: body.sanitizeNotes ?? [],
  };
}

/** 사건 위치·시각 앵커 갱신 + place/time 주장 문장 동기화 */
export function applyIncidentToCaseFile(
  caseFile: CaseFile,
  incident: CaseIncident,
): CaseFile {
  return {
    ...caseFile,
    incident,
    claims: caseFile.claims.map((c) => {
      if (c.kind === "place") {
        return {
          ...c,
          statement: incident.place
            ? `${incident.place.label} (${incident.place.precision}, ${incident.place.source})`
            : "장소 미추출 — 지도에서 지정",
        };
      }
      if (c.kind === "time") {
        return {
          ...c,
          statement: incident.occurredAt
            ? incident.occurredAtSource === "article"
              ? `${incident.occurredAt} (기사 발행 시각 기준)`
              : incident.occurredAtSource === "editor"
                ? `${incident.occurredAt} (편집자 지정)`
                : incident.occurredAt
            : "시간 미추출",
        };
      }
      return c;
    }),
  };
}

export type AttachSoftEvidenceInput = {
  token: string;
  caseId: string;
  expectedRev: number;
  claimId: string;
  source: SoftEvidenceKind;
  role?: EvidenceRole;
  requestedStrength?: EvidenceStrength;
  shows?: string;
  limits?: string;
  url?: string;
  outlet?: string;
  imageUrl?: string;
  imageKey?: string;
  geolocationMethod?: string;
  beforeUrl?: string;
  afterUrl?: string;
  beforeDate?: string;
  afterDate?: string;
  note?: string;
};

export async function attachSoftEvidence(
  input: AttachSoftEvidenceInput,
): Promise<{
  caseFile: CaseFile;
  evidence: EvidenceLink;
  sanitizeNotes: SanitizeNote[];
}> {
  const res = await fetch(
    `/api/cases/${encodeURIComponent(input.caseId)}/evidence/soft`,
    {
      method: "POST",
      headers: authHeaders(input.token),
      body: JSON.stringify({
        expectedRev: input.expectedRev,
        claimId: input.claimId,
        source: input.source,
        role: input.role,
        requestedStrength: input.requestedStrength,
        shows: input.shows,
        limits: input.limits,
        url: input.url,
        outlet: input.outlet,
        imageUrl: input.imageUrl,
        imageKey: input.imageKey,
        geolocationMethod: input.geolocationMethod,
        beforeUrl: input.beforeUrl,
        afterUrl: input.afterUrl,
        beforeDate: input.beforeDate,
        afterDate: input.afterDate,
        note: input.note,
      }),
    },
  );
  const body = (await parseJson(res)) as {
    caseFile?: CaseFile;
    evidence?: EvidenceLink;
    sanitizeNotes?: SanitizeNote[];
    error?: string;
    currentRev?: number;
  };
  if (!res.ok || !body?.caseFile || !body?.evidence) {
    throw new CaseApiError(
      res.status,
      body?.error ||
        (res.status === 409
          ? `rev conflict (current=${body?.currentRev ?? "?"})`
          : "soft attach failed"),
      body,
    );
  }
  return {
    caseFile: body.caseFile,
    evidence: body.evidence,
    sanitizeNotes: body.sanitizeNotes ?? [],
  };
}

/** 주장 문장·편집자 판정 갱신 */
export async function updateClaimFields(input: {
  token: string;
  caseId: string;
  expectedRev: number;
  caseFile: CaseFile;
  claimId: string;
  statement?: string;
  /** null이면 override 제거, undefined면 유지 */
  override?: { verdict: Verdict; reason: string } | null;
}): Promise<{ caseFile: CaseFile; sanitizeNotes: SanitizeNote[] }> {
  const nextCase: CaseFile = {
    ...input.caseFile,
    claims: input.caseFile.claims.map((c) => {
      if (c.id !== input.claimId) return c;
      let next = { ...c };
      if (typeof input.statement === "string") {
        next = { ...next, statement: input.statement };
      }
      if (input.override === null) {
        delete next.override;
      } else if (input.override) {
        next = {
          ...next,
          override: {
            verdict: input.override.verdict,
            reason: input.override.reason,
            at: new Date().toISOString(),
          },
        };
      }
      return next;
    }),
  };
  const op: CaseRevisionOp =
    input.override === null
      ? "clear_override"
      : input.override
        ? "set_override"
        : "update_claim";
  return reviseCaseFile({
    token: input.token,
    caseId: input.caseId,
    expectedRev: input.expectedRev,
    op,
    nextCase,
    reason: `${op} ${input.claimId}`,
  });
}

export async function attachSensorEvidence(
  input: AttachSensorEvidenceInput,
): Promise<{
  caseFile: CaseFile;
  evidence: EvidenceLink;
  sanitizeNotes: SanitizeNote[];
}> {
  const res = await fetch(
    `/api/cases/${encodeURIComponent(input.caseId)}/evidence`,
    {
      method: "POST",
      headers: authHeaders(input.token),
      body: JSON.stringify({
        expectedRev: input.expectedRev,
        claimId: input.claimId,
        source: input.source,
        role: input.role,
        requestedStrength: input.requestedStrength,
        firms: input.firms,
        airRaid: input.airRaid,
        ais: input.ais,
        adsb: input.adsb,
        facility: input.facility,
      }),
    },
  );
  const body = (await parseJson(res)) as {
    caseFile?: CaseFile;
    evidence?: EvidenceLink;
    sanitizeNotes?: SanitizeNote[];
    error?: string;
    currentRev?: number;
  };
  if (!res.ok || !body?.caseFile || !body?.evidence) {
    throw new CaseApiError(
      res.status,
      body?.error ||
        (res.status === 409
          ? `rev conflict (current=${body?.currentRev ?? "?"})`
          : "attach failed"),
      body,
    );
  }
  return {
    caseFile: body.caseFile,
    evidence: body.evidence,
    sanitizeNotes: body.sanitizeNotes ?? [],
  };
}

export async function uploadEvidenceImage(input: {
  token: string;
  caseId: string;
  evidenceId: string;
  imageBase64: string;
  contentType?: string;
}): Promise<{ imageKey: string }> {
  const res = await fetch(
    `/api/cases/${encodeURIComponent(input.caseId)}/evidence-image`,
    {
      method: "POST",
      headers: authHeaders(input.token),
      body: JSON.stringify({
        evidenceId: input.evidenceId,
        imageBase64: input.imageBase64,
        contentType: input.contentType ?? "image/png",
      }),
    },
  );
  const body = (await parseJson(res)) as { imageKey?: string; error?: string };
  if (!res.ok || !body?.imageKey) {
    throw new CaseApiError(res.status, body?.error || "image upload failed", body);
  }
  return { imageKey: body.imageKey };
}

/** 캡처 imageKey를 기존 근거에 붙인다 */
export async function patchEvidenceImageKey(input: {
  token: string;
  caseId: string;
  expectedRev: number;
  caseFile: CaseFile;
  evidenceId: string;
  imageKey: string;
}): Promise<CaseFile> {
  const nextCase: CaseFile = {
    ...input.caseFile,
    claims: input.caseFile.claims.map((c) => ({
      ...c,
      evidence: c.evidence.map((e) =>
        e.id === input.evidenceId ? { ...e, imageKey: input.imageKey } : e,
      ),
    })),
  };
  const res = await fetch(
    `/api/cases/${encodeURIComponent(input.caseId)}/revisions`,
    {
      method: "POST",
      headers: authHeaders(input.token),
      body: JSON.stringify({
        expectedRev: input.expectedRev,
        op: "add_evidence",
        nextCase,
        reason: `attach capture ${input.evidenceId}`,
      }),
    },
  );
  const body = (await parseJson(res)) as {
    caseFile?: CaseFile;
    error?: string;
    currentRev?: number;
  };
  if (!res.ok || !body?.caseFile) {
    throw new CaseApiError(
      res.status,
      body?.error ||
        (res.status === 409
          ? `rev conflict (current=${body?.currentRev ?? "?"})`
          : "patch image failed"),
      body,
    );
  }
  return body.caseFile;
}
