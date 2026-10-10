import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { authorizeCaseEditor, unauthorizedResponse } from "@/lib/caseFile/auth";
import {
  applyEvidenceRelevance,
  buildEvidenceRelevance,
  buildProvenEvidenceLink,
  firmsAcqToIso,
  formatTimeDeltaMinutes,
  freezeAirRaidEvidence,
  freezeFirmsEvidence,
  newEvidenceId,
  resolveAirRaidQueryFromIncident,
  resolveAisQueryFromIncident,
  resolveFirmsQueryFromIncident,
} from "@/lib/caseFile/serverFreeze";
import {
  freezeAdsbEvidence,
  freezeAisHistoryEvidence,
  resolveAdsbQueryFromIncident,
  trackLimitsText,
} from "@/lib/caseFile/trackFreeze";
import { freezeSatelliteEvidence } from "@/lib/caseFile/satelliteFreeze";
import { satelliteCredentialsConfigured } from "@/lib/caseFile/satelliteImagery";
import { freezeControlZoneEvidence } from "@/lib/caseFile/controlZone";
import { freezeFacilityEvidence, type FacilityCategory } from "@/lib/caseFile/nearbyFacilities";
import {
  applyCaseRevision,
  CaseNotFoundError,
  CaseRevConflictError,
  getCaseFile,
} from "@/lib/caseFile/store";
import { emptyIncident } from "@/lib/caseFile/types";
import type { EvidenceRole, EvidenceStrength } from "@/lib/caseFile/types";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVIDENCE_SOURCES = [
  "firms",
  "air-raid",
  "ais",
  "adsb",
  "satellite",
  "control-zone",
  "facility",
] as const;

type EvidenceBody = {
  expectedRev: number;
  claimId: string;
  source: (typeof EVIDENCE_SOURCES)[number];
  adsb?: { radiusKm?: number; windowHours?: number; pickHex?: string };
  facility?: { radiusKm?: number; category?: FacilityCategory };
  role?: EvidenceRole;
  shows?: string;
  limits?: string;
  requestedStrength?: EvidenceStrength;
  reason?: string;
  /** 반경·선택 ID만 허용. lat/lng/시각은 사건 앵커에서만 */
  firms?: { radiusKm?: number; pickId?: string; max?: number };
  airRaid?: {
    radiusKm?: number;
    windowHours?: number;
    sources?: Array<"neptun" | "tzeva-adom">;
    pickThreatId?: string;
    pickAlertId?: string;
  };
  ais?: {
    radiusKm?: number;
    windowHours?: number;
    category?: "military" | "commercial" | "other" | "all";
    pickId?: string;
    pickMmsi?: string;
  };
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * POST /api/cases/[id]/evidence
 * 서버가 사건 앵커(위치·시각)로 FIRMS / 공습 이력을 조회·해시·첨부.
 * 클라이언트가 보낸 좌표·시각은 쓰지 않는다.
 * Authorization: Bearer CASE_EDITOR_SECRET
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!authorizeCaseEditor(request)) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const caseId = (id || "").trim();
  if (!caseId) {
    return NextResponse.json(
      { error: "missing id" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  let body: EvidenceBody;
  try {
    body = (await request.json()) as EvidenceBody;
  } catch {
    return NextResponse.json(
      { error: "invalid JSON" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (typeof body.expectedRev !== "number" || !body.claimId?.trim() || !body.source) {
    return NextResponse.json(
      { error: "expectedRev, claimId, source 필요" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (!EVIDENCE_SOURCES.includes(body.source)) {
    return NextResponse.json(
      { error: `source는 ${EVIDENCE_SOURCES.join(" | ")}` },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const role: EvidenceRole =
    body.role === "contradicts" || body.role === "context" ? body.role : "supports";

  try {
    const db = await getDb();
    const found = await getCaseFile(db, caseId);
    if (!found) {
      return NextResponse.json(
        { error: "not found" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    const incident = found.caseFile.incident ?? emptyIncident();
    const claim = found.caseFile.claims.find((c) => c.id === body.claimId.trim());
    if (!claim) {
      return NextResponse.json(
        { error: "claim not found" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    let link;
    let freezeMeta: Record<string, unknown>;

    if (body.source === "ais") {
      const radiusKm = isFiniteNumber(body.ais?.radiusKm)
        ? body.ais!.radiusKm!
        : 20;
      const query = resolveAisQueryFromIncident(incident, {
        radiusKm,
        windowHours:
          typeof body.ais?.windowHours === "number"
            ? body.ais.windowHours
            : undefined,
        category: body.ais?.category,
        pickId: typeof body.ais?.pickId === "string" ? body.ais.pickId : undefined,
        pickMmsi:
          typeof body.ais?.pickMmsi === "string" ? body.ais.pickMmsi : undefined,
      });
      if ("error" in query) {
        return NextResponse.json(
          { error: query.error },
          { status: 400, headers: NO_STORE_HEADERS },
        );
      }
      const incidentIso = new Date(Date.parse(incident.occurredAt!)).toISOString();
      const frozen = await freezeAisHistoryEvidence(db, { ...query, incidentIso });
      const pick = frozen.pick;
      const shows =
        body.shows?.trim() ||
        (frozen.hits === 0
          ? "해당 범위에 탐지 없음"
          : pick
            ? `AIS ${pick.label} 최근접 ${pick.distanceKm}km (${pick.timestamp.slice(0, 16).replace("T", " ")} UTC)`
            : `AIS 반경 ${query.radiusKm}km 내 히트 ${frozen.hits}건`);
      const limits =
        body.limits?.trim() ||
        trackLimitsText(
          "AIS는 위치·식별 신호만 — 의도·화물·기만(AIS off)은 확인하지 않음",
          frozen,
          query.fromIso ?? incidentIso,
        );
      link = buildProvenEvidenceLink({
        claimKind: claim.kind,
        role: frozen.hits === 0 ? "context" : role,
        sourceKey: pick ? `ais:${pick.id.split(":")[0]}` : "ais",
        payload: frozen.payload,
        shows,
        limits,
        requestedStrength: body.requestedStrength,
      });
      if (pick) {
        const relevance = buildEvidenceRelevance({
          incident,
          evidenceLat: pick.lat,
          evidenceLng: pick.lng,
          evidenceAtIso: pick.timestamp,
        });
        link = applyEvidenceRelevance(link, relevance, {
          demoteFirmsOutsideWindow: false,
        });
      }
      freezeMeta = {
        hits: frozen.hits,
        pick: frozen.pick,
        gaps: frozen.gaps,
        coverageStart: frozen.coverageStart,
        resultHash: frozen.payload.resultHash,
        query: frozen.payload.query,
        relevance: link.relevance ?? null,
      };
    } else if (body.source === "adsb") {
      const query = resolveAdsbQueryFromIncident(incident, {
        radiusKm: isFiniteNumber(body.adsb?.radiusKm) ? body.adsb!.radiusKm! : 80,
        windowHours: isFiniteNumber(body.adsb?.windowHours) ? body.adsb!.windowHours : undefined,
        pickHex: typeof body.adsb?.pickHex === "string" ? body.adsb.pickHex : undefined,
      });
      if ("error" in query) {
        return NextResponse.json({ error: query.error }, { status: 400, headers: NO_STORE_HEADERS });
      }
      const frozen = await freezeAdsbEvidence(db, query);
      const pick = frozen.pick;
      const shows =
        body.shows?.trim() ||
        (pick
          ? `군용기 ${pick.label} 최근접 ${pick.distanceKm}km (${pick.timestamp.slice(0, 16).replace("T", " ")} UTC) · 반경 내 ${frozen.hits}대`
          : "해당 범위에 군용기 항적 없음");
      const limits =
        body.limits?.trim() ||
        trackLimitsText(
          "공개 ADS-B 신호만 — 신호를 끈 군용기·무인기는 보이지 않음 · 30분 간격 기록",
          frozen,
          query.fromIso,
        );
      link = buildProvenEvidenceLink({
        claimKind: claim.kind,
        role: frozen.hits === 0 ? "context" : role,
        sourceKey: pick ? `adsb:${pick.id.split(":")[0]}` : "adsb",
        payload: frozen.payload,
        shows,
        limits,
        requestedStrength: body.requestedStrength,
      });
      if (pick) {
        link = applyEvidenceRelevance(
          link,
          buildEvidenceRelevance({
            incident,
            evidenceLat: pick.lat,
            evidenceLng: pick.lng,
            evidenceAtIso: pick.timestamp,
          }),
          { demoteFirmsOutsideWindow: false },
        );
      }
      freezeMeta = {
        hits: frozen.hits,
        pick,
        coverageStart: frozen.coverageStart,
        resultHash: frozen.payload.resultHash,
        query: frozen.payload.query,
        relevance: link.relevance ?? null,
      };
    } else if (body.source === "satellite") {
      if (!satelliteCredentialsConfigured()) {
        return NextResponse.json(
          { error: "위성 영상 조회 설정 없음 (CDSE_CLIENT_ID / CDSE_CLIENT_SECRET)" },
          { status: 503, headers: NO_STORE_HEADERS },
        );
      }
      const evidenceId = newEvidenceId("ev");
      const frozen = await freezeSatelliteEvidence({ caseId, evidenceId, incident });
      if ("error" in frozen) {
        return NextResponse.json({ error: frozen.error }, { status: 400, headers: NO_STORE_HEADERS });
      }
      const { results } = frozen;
      const collectionHead = results.mode === "sar" ? "sentinel-1" : "sentinel-2";
      link = buildProvenEvidenceLink({
        id: evidenceId,
        claimKind: claim.kind,
        role: results.mode === "none" ? "context" : role,
        sourceKey: results.after?.sceneId
          ? `${collectionHead}:${results.after.sceneId}`
          : collectionHead,
        payload: frozen.payload,
        shows: body.shows?.trim() || frozen.shows,
        limits: body.limits?.trim() || frozen.limits,
        requestedStrength: body.requestedStrength,
        imageKey: frozen.imageKey ?? undefined,
      });
      freezeMeta = {
        mode: results.mode,
        cloudBlocked: results.cloudBlocked,
        before: results.before,
        after: results.after,
        notes: results.notes,
        resultHash: frozen.payload.resultHash,
      };
    } else if (body.source === "control-zone") {
      const frozen = await freezeControlZoneEvidence(incident);
      if ("error" in frozen) {
        return NextResponse.json({ error: frozen.error }, { status: 400, headers: NO_STORE_HEADERS });
      }
      link = buildProvenEvidenceLink({
        claimKind: claim.kind,
        role,
        sourceKey: `control-zone:${frozen.results.snapshot.id}`,
        payload: frozen.payload,
        shows: body.shows?.trim() || frozen.shows,
        limits: body.limits?.trim() || frozen.limits,
        requestedStrength: body.requestedStrength,
      });
      freezeMeta = {
        status: frozen.results.status,
        snapshot: frozen.results.snapshot,
        boundaryKm: frozen.results.boundaryKm,
        resultHash: frozen.payload.resultHash,
      };
    } else if (body.source === "facility") {
      const frozen = await freezeFacilityEvidence(incident, {
        radiusKm: isFiniteNumber(body.facility?.radiusKm) ? body.facility!.radiusKm : undefined,
        category: body.facility?.category,
      });
      if ("error" in frozen) {
        return NextResponse.json({ error: frozen.error }, { status: 400, headers: NO_STORE_HEADERS });
      }
      const pick = frozen.facilities[0];
      link = buildProvenEvidenceLink({
        claimKind: claim.kind,
        role: pick ? role : "context",
        sourceKey: pick ? `facility:${pick.osmId}` : "facility",
        payload: frozen.payload,
        shows: body.shows?.trim() || frozen.shows,
        limits: body.limits?.trim() || frozen.limits,
        requestedStrength: body.requestedStrength,
      });
      freezeMeta = {
        count: frozen.facilities.length,
        facilities: frozen.facilities.slice(0, 10),
        resultHash: frozen.payload.resultHash,
      };
    } else if (body.source === "firms") {
      const radiusKm = isFiniteNumber(body.firms?.radiusKm)
        ? body.firms!.radiusKm!
        : 15;
      const query = resolveFirmsQueryFromIncident(incident, {
        radiusKm,
        pickId:
          typeof body.firms?.pickId === "string" ? body.firms.pickId : undefined,
        max: typeof body.firms?.max === "number" ? body.firms.max : undefined,
      });
      if ("error" in query) {
        return NextResponse.json(
          { error: query.error },
          { status: 400, headers: NO_STORE_HEADERS },
        );
      }
      const frozen = await freezeFirmsEvidence(db, query);
      const pick = frozen.pick;
      const shows =
        body.shows?.trim() ||
        (frozen.hits === 0
          ? "해당 범위에 탐지 없음"
          : pick
            ? `FIRMS 열점 ${pick.distanceKm}km (${pick.acqDate ?? "날짜 미상"}${pick.acqTime ? ` ${pick.acqTime}` : ""})`
            : `FIRMS 반경 ${query.radiusKm}km 내 히트 ${frozen.hits}건`);
      const limits =
        body.limits?.trim() ||
        "FIRMS는 열원·화재 후보만 보여 주체·수단을 확인하지 않음";
      link = buildProvenEvidenceLink({
        claimKind: claim.kind,
        role: frozen.hits === 0 ? "context" : role,
        sourceKey: pick ? `firms:${pick.id}` : "firms",
        payload: frozen.payload,
        shows,
        limits,
        requestedStrength: body.requestedStrength,
      });
      if (pick) {
        const relevance = buildEvidenceRelevance({
          incident,
          evidenceLat: pick.lat,
          evidenceLng: pick.lng,
          evidenceAtIso: firmsAcqToIso(pick.acqDate, pick.acqTime),
        });
        link = applyEvidenceRelevance(link, relevance);
      }
      freezeMeta = {
        hits: frozen.hits,
        pick: frozen.pick,
        resultHash: frozen.payload.resultHash,
        query: frozen.payload.query,
        relevance: link.relevance ?? null,
      };
    } else {
      const radiusKm = isFiniteNumber(body.airRaid?.radiusKm)
        ? body.airRaid!.radiusKm!
        : 15;
      const sources = Array.isArray(body.airRaid?.sources)
        ? body.airRaid!.sources!.filter(
            (s): s is "neptun" | "tzeva-adom" =>
              s === "neptun" || s === "tzeva-adom",
          )
        : undefined;
      const query = resolveAirRaidQueryFromIncident(incident, {
        radiusKm,
        windowHours:
          typeof body.airRaid?.windowHours === "number"
            ? body.airRaid.windowHours
            : undefined,
        sources: sources?.length ? sources : undefined,
        pickThreatId:
          typeof body.airRaid?.pickThreatId === "string"
            ? body.airRaid.pickThreatId
            : undefined,
        pickAlertId:
          typeof body.airRaid?.pickAlertId === "string"
            ? body.airRaid.pickAlertId
            : undefined,
      });
      if ("error" in query) {
        return NextResponse.json(
          { error: query.error },
          { status: 400, headers: NO_STORE_HEADERS },
        );
      }
      const frozen = await freezeAirRaidEvidence(db, query);
      if ("error" in frozen) {
        return NextResponse.json(
          { error: frozen.error },
          { status: 400, headers: NO_STORE_HEADERS },
        );
      }
      const { payload, sourceKind, search } = frozen;
      const results = payload.results as {
        threat?: {
          lat?: number;
          lon?: number;
          distanceKm?: number;
          threatType?: string;
          sampledAt?: string;
        } | null;
        alert?: {
          regionName?: string | null;
          distanceKm?: number;
          startedAt?: string;
        } | null;
      };
      const shows =
        body.shows?.trim() ||
        (payload.resultCount === 0
          ? "해당 범위에 탐지 없음"
          : results.threat
            ? `공습 위협 ${results.threat.threatType ?? ""} ${results.threat.distanceKm ?? "?"}km`
            : results.alert
              ? `경보 ${results.alert.regionName ?? ""} ${results.alert.distanceKm ?? "?"}km`
              : `공습 이력 히트 ${payload.resultCount}건`);
      const limits =
        body.limits?.trim() ||
        (sourceKind === "tzeva-adom"
          ? "경보 구역·시각만 확인 — 정확한 타격 좌표·피해는 별도 근거 필요"
          : "위협 좌표·시각은 센서 추정 — 주체·수단은 지도만으로 확정하지 않음");
      link = buildProvenEvidenceLink({
        claimKind: claim.kind,
        role: payload.resultCount === 0 ? "context" : role,
        sourceKey: `${sourceKind}:${payload.pickId ?? "search"}`,
        payload,
        shows: shows.trim(),
        limits,
        requestedStrength: body.requestedStrength,
      });
      const relevance = buildEvidenceRelevance({
        incident,
        evidenceLat: results.threat?.lat ?? null,
        evidenceLng: results.threat?.lon ?? null,
        evidenceAtIso:
          results.threat?.sampledAt ?? results.alert?.startedAt ?? null,
      });
      const searchDist =
        results.threat?.distanceKm ?? results.alert?.distanceKm ?? null;
      if (searchDist != null) {
        relevance.distanceKm = searchDist;
      }
      const parts: string[] = [];
      if (relevance.distanceKm != null) {
        parts.push(`사건 지점에서 ${relevance.distanceKm}km`);
      }
      if (relevance.timeDeltaMinutes != null) {
        parts.push(
          `주장 시각 ${formatTimeDeltaMinutes(relevance.timeDeltaMinutes)}`,
        );
      }
      if (parts.length) relevance.summary = parts.join(", ");
      link = applyEvidenceRelevance(link, relevance, {
        demoteFirmsOutsideWindow: false,
      });
      freezeMeta = {
        sourceKind,
        summary: search.summary,
        resultHash: payload.resultHash,
        resultCount: payload.resultCount,
        query: payload.query,
        relevance: link.relevance ?? null,
      };
    }

    const nextCase = {
      ...found.caseFile,
      incident,
      claims: found.caseFile.claims.map((c) =>
        c.id === claim.id ? { ...c, evidence: [...c.evidence, link] } : c,
      ),
    };

    const { caseFile, sanitizeNotes } = await applyCaseRevision(db, caseId, {
      expectedRev: body.expectedRev,
      op: "add_evidence",
      nextCase,
      reason: body.reason ?? `attach ${body.source} evidence to ${claim.id}`,
    });

    return NextResponse.json(
      {
        caseFile,
        evidence: link,
        sanitizeNotes,
        freeze: freezeMeta,
        fetchedAt: new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof CaseNotFoundError) {
      return NextResponse.json(
        { error: "not found" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }
    if (error instanceof CaseRevConflictError) {
      return NextResponse.json(
        { error: "rev conflict", currentRev: error.currentRev },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }
    const message = error instanceof Error ? error.message : "evidence attach failed";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
