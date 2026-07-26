/**
 * 공개/관리자용 주간 함선 이동 조회 헬퍼.
 */

import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { shipMovementObservations } from "@/db/schema";
import type {
  LocationStatus,
  PublicShipObservation,
  ReviewStatus,
} from "@/lib/shipMovements/types";

const LOCATION_PRIORITY: Record<LocationStatus, number> = {
  ambiguous: 0,
  unresolved: 1,
  missing: 2,
  broad: 3,
  chokepoint: 4,
  precise: 5,
};

export function toPublicObservation(
  row: typeof shipMovementObservations.$inferSelect,
  lang: "ko" | "en",
): PublicShipObservation {
  let evidenceQuotes: string[] = [];
  try {
    evidenceQuotes = JSON.parse(row.evidenceJson || "[]") as string[];
  } catch {
    evidenceQuotes = [];
  }

  return {
    id: row.id,
    reportId: row.reportId,
    vesselKey: row.vesselKey,
    vesselName: row.vesselName,
    hullNumber: row.hullNumber,
    navyCode: row.navyCode,
    navyLabel: lang === "en" ? row.navyLabelEn : row.navyLabelKo,
    title: lang === "en" ? row.titleEn : row.titleKo,
    summary: lang === "en" ? row.summaryEn : row.summaryKo,
    locationLabel: lang === "en" ? row.locationLabelEn : row.locationLabelKo,
    missingLocationNote:
      lang === "en" ? row.missingLocationNoteEn : row.missingLocationNoteKo,
    observedAt: row.observedAt,
    locationStatus: row.locationStatus as LocationStatus,
    confidence: row.confidence as PublicShipObservation["confidence"],
    vesselConfidence: row.vesselConfidence as PublicShipObservation["vesselConfidence"],
    method: row.method as PublicShipObservation["method"],
    mapEligible: row.mapEligible === 1,
    lat: row.lat,
    lng: row.lng,
    precisionKm: row.precisionKm,
    weekStart: row.weekStart,
    source: row.source as PublicShipObservation["source"],
    sourceUrl: row.sourceUrl,
    evidenceQuotes,
  };
}

/** 공개 지도용 — 승인 + mapEligible + 좌표 */
export async function listApprovedMapObservations(
  db: AppDb,
  opts?: { week?: string | null; limit?: number },
) {
  const limit = Math.min(300, Math.max(1, opts?.limit ?? 120));
  const clauses = [
    eq(shipMovementObservations.reviewStatus, "approved"),
    eq(shipMovementObservations.mapEligible, 1),
    sql`${shipMovementObservations.lat} IS NOT NULL`,
    sql`${shipMovementObservations.lng} IS NOT NULL`,
  ];
  if (opts?.week) clauses.push(eq(shipMovementObservations.weekStart, opts.week));

  return db
    .select()
    .from(shipMovementObservations)
    .where(and(...clauses))
    .orderBy(desc(shipMovementObservations.observedAt), desc(shipMovementObservations.updatedAt))
    .limit(limit);
}

/** 주간 타임라인 — 승인된 사실 (위치 미상 포함) */
export async function listApprovedTimelineObservations(
  db: AppDb,
  opts?: { week?: string | null; limit?: number },
) {
  const limit = Math.min(400, Math.max(1, opts?.limit ?? 200));
  const clauses = [eq(shipMovementObservations.reviewStatus, "approved")];
  if (opts?.week) clauses.push(eq(shipMovementObservations.weekStart, opts.week));

  return db
    .select()
    .from(shipMovementObservations)
    .where(and(...clauses))
    .orderBy(desc(shipMovementObservations.observedAt), asc(shipMovementObservations.titleKo))
    .limit(limit);
}

/** 관리자 검토 큐 — 애매한 것부터 */
export async function listReviewQueue(
  db: AppDb,
  opts?: { status?: ReviewStatus; limit?: number },
) {
  const limit = Math.min(300, Math.max(1, opts?.limit ?? 100));
  const status = opts?.status ?? "pending";
  const rows = await db
    .select()
    .from(shipMovementObservations)
    .where(eq(shipMovementObservations.reviewStatus, status))
    .orderBy(desc(shipMovementObservations.updatedAt))
    .limit(limit);

  return rows.sort((a, b) => {
    const pa = LOCATION_PRIORITY[a.locationStatus as LocationStatus] ?? 9;
    const pb = LOCATION_PRIORITY[b.locationStatus as LocationStatus] ?? 9;
    if (pa !== pb) return pa - pb;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });
}
