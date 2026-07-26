import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shipMovementObservations, shipMovementReports } from "@/db/schema";
import { buildShipMovementBatch } from "@/lib/shipMovements/pipeline";
import type { ShipMovementObservationRow, ShipMovementReportDraft } from "@/lib/shipMovements/types";

export type UpsertShipMovementsResult = {
  ok: boolean;
  reports: number;
  observations: number;
  meta: {
    usniVia: string;
    usniCount: number;
    jsoCount: number;
    jsoLinkCount: number;
  };
  error?: string;
};

function reportValues(r: ShipMovementReportDraft, ingestedAt: string) {
  return {
    id: r.id,
    source: r.source,
    sourceLabel: r.sourceLabel,
    url: r.url,
    title: r.title,
    titleKo: r.titleKo,
    titleEn: r.titleEn,
    summaryKo: r.summaryKo,
    summaryEn: r.summaryEn,
    publishedAt: r.publishedAt,
    weekStart: r.weekStart,
    contentHash: r.contentHash,
    rawExcerpt: r.rawExcerpt,
    ingestedAt,
  };
}

function obsValues(o: ShipMovementObservationRow) {
  return {
    id: o.id,
    reportId: o.reportId,
    vesselKey: o.vesselKey,
    vesselName: o.vesselName,
    hullNumber: o.hullNumber,
    navyCode: o.navyCode,
    navyLabelKo: o.navyLabelKo,
    navyLabelEn: o.navyLabelEn,
    titleKo: o.titleKo,
    titleEn: o.titleEn,
    summaryKo: o.summaryKo,
    summaryEn: o.summaryEn,
    locationLabelKo: o.locationLabelKo,
    locationLabelEn: o.locationLabelEn,
    missingLocationNoteKo: o.missingLocationNoteKo,
    missingLocationNoteEn: o.missingLocationNoteEn,
    observedAt: o.observedAt,
    locationStatus: o.locationStatus,
    confidence: o.confidence,
    vesselConfidence: o.vesselConfidence,
    method: o.method,
    mapEligible: o.mapEligible,
    lat: o.lat,
    lng: o.lng,
    precisionKm: o.precisionKm,
    placeId: o.placeId,
    evidenceJson: o.evidenceJson,
    reviewStatus: o.reviewStatus,
    reviewNote: o.reviewNote,
    reviewedAt: o.reviewedAt,
    weekStart: o.weekStart,
    source: o.source,
    sourceUrl: o.sourceUrl,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

/**
 * USNI·JSO 수집 → D1 upsert.
 * 이미 승인/거절된 observation은 좌표·리뷰를 덮어쓰지 않고 요약·증거만 갱신한다.
 */
export async function upsertShipMovementsFromSources(): Promise<UpsertShipMovementsResult> {
  const batch = await buildShipMovementBatch();
  const ingestedAt = new Date().toISOString();

  try {
    const db = await getDb();

    for (const report of batch.reports) {
      await db
        .insert(shipMovementReports)
        .values(reportValues(report, ingestedAt))
        .onConflictDoUpdate({
          target: shipMovementReports.id,
          set: {
            title: report.title,
            titleKo: report.titleKo,
            titleEn: report.titleEn,
            summaryKo: report.summaryKo,
            summaryEn: report.summaryEn,
            publishedAt: report.publishedAt,
            weekStart: report.weekStart,
            contentHash: report.contentHash,
            rawExcerpt: report.rawExcerpt,
            ingestedAt,
          },
        });
    }

    for (const obs of batch.observations) {
      const existingRows = await db
        .select()
        .from(shipMovementObservations)
        .where(eq(shipMovementObservations.id, obs.id))
        .limit(1);
      const existing = existingRows[0];

      if (existing && (existing.reviewStatus === "approved" || existing.reviewStatus === "rejected")) {
        await db
          .update(shipMovementObservations)
          .set({
            summaryKo: obs.summaryKo,
            summaryEn: obs.summaryEn,
            evidenceJson: obs.evidenceJson,
            updatedAt: ingestedAt,
          })
          .where(eq(shipMovementObservations.id, obs.id));
        continue;
      }

      const next = obsValues({
        ...obs,
        reviewStatus: (existing?.reviewStatus as ShipMovementObservationRow["reviewStatus"]) ?? "pending",
        createdAt: existing?.createdAt ?? obs.createdAt,
        updatedAt: ingestedAt,
      });

      await db
        .insert(shipMovementObservations)
        .values(next)
        .onConflictDoUpdate({
          target: shipMovementObservations.id,
          set: {
            vesselKey: next.vesselKey,
            vesselName: next.vesselName,
            hullNumber: next.hullNumber,
            navyCode: next.navyCode,
            navyLabelKo: next.navyLabelKo,
            navyLabelEn: next.navyLabelEn,
            titleKo: next.titleKo,
            titleEn: next.titleEn,
            summaryKo: next.summaryKo,
            summaryEn: next.summaryEn,
            locationLabelKo: next.locationLabelKo,
            locationLabelEn: next.locationLabelEn,
            missingLocationNoteKo: next.missingLocationNoteKo,
            missingLocationNoteEn: next.missingLocationNoteEn,
            observedAt: next.observedAt,
            locationStatus: next.locationStatus,
            confidence: next.confidence,
            vesselConfidence: next.vesselConfidence,
            method: next.method,
            mapEligible: next.mapEligible,
            lat: next.lat,
            lng: next.lng,
            precisionKm: next.precisionKm,
            placeId: next.placeId,
            evidenceJson: next.evidenceJson,
            weekStart: next.weekStart,
            source: next.source,
            sourceUrl: next.sourceUrl,
            updatedAt: ingestedAt,
          },
        });
    }

    return {
      ok: true,
      reports: batch.reports.length,
      observations: batch.observations.length,
      meta: batch.meta,
    };
  } catch (error) {
    return {
      ok: false,
      reports: 0,
      observations: 0,
      meta: batch.meta,
      error: error instanceof Error ? error.message : "upsert failed",
    };
  }
}
