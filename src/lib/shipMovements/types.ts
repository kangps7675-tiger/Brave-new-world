/**
 * 서태평양 주간 함선 이동기 — 공개 관측 기록 (실시간 AIS가 아님).
 */

export type ShipMovementSource =
  | "usni-westpac-pulse"
  | "usni-fleet-tracker"
  | "jso"
  | "cross-strait-signal";

export type LocationStatus =
  | "precise"
  | "chokepoint"
  | "broad"
  | "missing"
  | "unresolved"
  | "ambiguous";

export type LocationConfidence = "observed" | "reported" | "estimated";

export type ReviewStatus = "pending" | "approved" | "rejected" | "needs_place";

export type VesselConfidence = "high" | "medium" | "low";

export type GeocodeMethod =
  | "relative-bearing"
  | "gazetteer-point"
  | "gazetteer-axis"
  | "gazetteer-sea"
  | "manual"
  | "none";

export type ExtractedLocationPhrase = {
  raw: string;
  placeName: string | null;
  bearingDeg: number | null;
  distanceKm: number | null;
  directionText: string | null;
};

export type ExtractedObservation = {
  vesselName: string | null;
  hullNumber: string | null;
  navy: string | null;
  navyCode: string | null;
  observedAt: string | null;
  location: ExtractedLocationPhrase;
  evidenceQuotes: string[];
  vesselConfidence: VesselConfidence;
};

export type GeocodedObservation = ExtractedObservation & {
  locationStatus: LocationStatus;
  mapEligible: boolean;
  confidence: LocationConfidence;
  method: GeocodeMethod;
  lat: number | null;
  lng: number | null;
  precisionKm: number | null;
  locationLabelKo: string | null;
  locationLabelEn: string | null;
  placeId: string | null;
};

export type ShipMovementReportDraft = {
  id: string;
  source: ShipMovementSource;
  sourceLabel: string;
  url: string;
  title: string;
  titleKo: string;
  titleEn: string;
  summaryKo: string | null;
  summaryEn: string | null;
  publishedAt: string | null;
  weekStart: string | null;
  contentHash: string;
  rawExcerpt: string;
};

export type ShipMovementObservationRow = {
  id: string;
  reportId: string;
  vesselKey: string;
  vesselName: string | null;
  hullNumber: string | null;
  navyCode: string | null;
  navyLabelKo: string | null;
  navyLabelEn: string | null;
  titleKo: string;
  titleEn: string;
  summaryKo: string | null;
  summaryEn: string | null;
  locationLabelKo: string | null;
  locationLabelEn: string | null;
  missingLocationNoteKo: string | null;
  missingLocationNoteEn: string | null;
  observedAt: string | null;
  locationStatus: LocationStatus;
  confidence: LocationConfidence;
  vesselConfidence: VesselConfidence;
  method: GeocodeMethod;
  mapEligible: number;
  lat: number | null;
  lng: number | null;
  precisionKm: number | null;
  placeId: string | null;
  evidenceJson: string;
  reviewStatus: ReviewStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  weekStart: string | null;
  source: ShipMovementSource;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicShipObservation = {
  id: string;
  reportId: string;
  vesselKey: string;
  vesselName: string | null;
  hullNumber: string | null;
  navyCode: string | null;
  navyLabel: string | null;
  title: string;
  summary: string | null;
  locationLabel: string | null;
  missingLocationNote: string | null;
  observedAt: string | null;
  locationStatus: LocationStatus;
  confidence: LocationConfidence;
  vesselConfidence: VesselConfidence;
  method: GeocodeMethod;
  mapEligible: boolean;
  lat: number | null;
  lng: number | null;
  precisionKm: number | null;
  weekStart: string | null;
  source: ShipMovementSource;
  sourceUrl: string;
  evidenceQuotes: string[];
};
