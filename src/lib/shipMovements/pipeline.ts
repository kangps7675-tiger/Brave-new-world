import { createHash } from "node:crypto";
import { extractObservationsRuleBased, navyLabels, vesselKey } from "@/lib/shipMovements/extract";
import { geocodeObservation } from "@/lib/shipMovements/geocode";
import { fetchJsoNavalReports } from "@/lib/shipMovements/jso";
import type {
  GeocodedObservation,
  ShipMovementObservationRow,
  ShipMovementReportDraft,
} from "@/lib/shipMovements/types";
import { fetchUsniFleetTrackerReports } from "@/lib/shipMovements/usni";

export type BuiltShipMovementBatch = {
  reports: ShipMovementReportDraft[];
  observations: ShipMovementObservationRow[];
  meta: {
    usniVia: string;
    usniCount: number;
    jsoCount: number;
    jsoLinkCount: number;
  };
};

function obsId(reportId: string, vesselKeyStr: string, idx: number): string {
  const h = createHash("sha256")
    .update(`${reportId}|${vesselKeyStr}|${idx}`)
    .digest("hex")
    .slice(0, 16);
  return `smo:${h}`;
}

function titleForObs(
  report: ShipMovementReportDraft,
  geo: GeocodedObservation,
): { ko: string; en: string } {
  const name = geo.vesselName || geo.hullNumber || "함정";
  const nameEn = geo.vesselName || geo.hullNumber || "Vessel";
  const locKo = geo.locationLabelKo ? ` · ${geo.locationLabelKo}` : "";
  const locEn = geo.locationLabelEn ? ` · ${geo.locationLabelEn}` : "";
  return {
    ko: `${name}${locKo}`,
    en: `${nameEn}${locEn}`,
  };
}

export function observationsFromReport(
  report: ShipMovementReportDraft,
  nowIso: string,
): ShipMovementObservationRow[] {
  const extracted = extractObservationsRuleBased(report);
  const sourceConfidence = report.source === "jso" ? ("observed" as const) : ("reported" as const);

  return extracted.map((ex, idx) => {
    const geo = geocodeObservation(ex, { sourceConfidence });
    const navy = navyLabels(geo.navyCode);
    const vKey = vesselKey(geo.vesselName, geo.hullNumber, geo.navyCode);
    const titles = titleForObs(report, geo);
    const missingKo =
      geo.locationStatus === "missing" ||
      geo.locationStatus === "unresolved" ||
      geo.locationStatus === "ambiguous"
        ? geo.locationLabelKo
        : null;
    const missingEn =
      geo.locationStatus === "missing" ||
      geo.locationStatus === "unresolved" ||
      geo.locationStatus === "ambiguous"
        ? geo.locationLabelEn
        : null;

    // JSO 관측은 observed로 승격 (상대위치 성공 시)
    const confidence =
      report.source === "jso" && geo.locationStatus === "precise" ? "observed" : geo.confidence;

    return {
      id: obsId(report.id, vKey, idx),
      reportId: report.id,
      vesselKey: vKey,
      vesselName: geo.vesselName,
      hullNumber: geo.hullNumber,
      navyCode: geo.navyCode,
      navyLabelKo: navy.ko ?? geo.navy,
      navyLabelEn: navy.en ?? geo.navy,
      titleKo: titles.ko,
      titleEn: titles.en,
      summaryKo: report.summaryKo,
      summaryEn: report.summaryEn,
      locationLabelKo: geo.locationLabelKo,
      locationLabelEn: geo.locationLabelEn,
      missingLocationNoteKo: missingKo,
      missingLocationNoteEn: missingEn,
      observedAt: geo.observedAt,
      locationStatus: geo.locationStatus,
      confidence,
      vesselConfidence: geo.vesselConfidence,
      method: geo.method,
      mapEligible: geo.mapEligible ? 1 : 0,
      lat: geo.lat,
      lng: geo.lng,
      precisionKm: geo.precisionKm,
      placeId: geo.placeId,
      evidenceJson: JSON.stringify(geo.evidenceQuotes),
      reviewStatus: "pending",
      reviewNote: null,
      reviewedAt: null,
      weekStart: report.weekStart,
      source: report.source,
      sourceUrl: report.url,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });
}

export async function buildShipMovementBatch(opts?: {
  fetchImpl?: typeof fetch;
  includeJso?: boolean;
}): Promise<BuiltShipMovementBatch> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const includeJso = opts?.includeJso !== false;
  const nowIso = new Date().toISOString();

  const usni = await fetchUsniFleetTrackerReports({ fetchImpl });
  const jso = includeJso
    ? await fetchJsoNavalReports({ fetchImpl, maxReports: 5 })
    : { reports: [], linkCount: 0 };

  const reports = [...usni.reports, ...jso.reports];
  const observations = reports.flatMap((r) => observationsFromReport(r, nowIso));

  return {
    reports,
    observations,
    meta: {
      usniVia: usni.via,
      usniCount: usni.reports.length,
      jsoCount: jso.reports.length,
      jsoLinkCount: jso.linkCount,
    },
  };
}
