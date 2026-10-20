import type { ConflictEvent, ConflictZoneFeature, DisputeArea, GeoJsonGeometry } from "@/data/geoTypes";
import { loadCloudStaticJson } from "@/lib/cloudStaticJson";
import { resolveDisputeCenter } from "@/lib/disputeCenter";
import { disputeGeometryBbox, isCombatHazard } from "@/lib/disputeHatch";
import { loadServerDisputes } from "@/lib/serverDisputes";

export type AiWarZoneFeature = ConflictZoneFeature & {
  aiScore: number;
  aiSummary: string;
  detectedBy: "ai-demo";
  sources: string[];
};

type GdeltPoint = { lat: number; lng: number; tier?: string };

function centerDistanceDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const latDist = Math.abs(a.lat - b.lat);
  const lngDist = Math.abs(a.lng - b.lng);
  return Math.sqrt(latDist ** 2 + lngDist ** 2);
}

function bboxToRectPolygon(box: {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}): GeoJsonGeometry {
  const { minLat, maxLat, minLng, maxLng } = box;
  return {
    type: "Polygon",
    coordinates: [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ],
  };
}

function padBbox(
  box: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  padDeg: number,
) {
  return {
    minLat: box.minLat - padDeg,
    maxLat: box.maxLat + padDeg,
    minLng: box.minLng - padDeg,
    maxLng: box.maxLng + padDeg,
  };
}

function centerFromBbox(box: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  return {
    lat: (box.minLat + box.maxLat) / 2,
    lng: (box.minLng + box.maxLng) / 2,
  };
}

function isValidRegionBox(box: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  const spanLng = box.maxLng - box.minLng;
  const spanLat = box.maxLat - box.minLat;
  return spanLng > 0.05 && spanLng <= 14 && spanLat > 0.05 && spanLat <= 14;
}

function scoreToTension(score: number): ConflictZoneFeature["tension"] {
  if (score >= 72) return "high";
  if (score >= 48) return "medium";
  return "low";
}

function disputeBaseScore(dispute: DisputeArea): number {
  let score = 30;
  if (isCombatHazard(dispute)) score += 38;
  if (dispute.tension === "high") score += 22;
  else if (dispute.tension === "medium") score += 12;
  else score += 4;
  if (dispute.categories?.includes("①")) score += 8;
  if ((dispute.matchedEventCount ?? 0) > 0) score += Math.min(12, dispute.matchedEventCount);
  return Math.min(98, score);
}

function buildAiSummary(dispute: DisputeArea, warHits: number, score: number): string {
  const parts: string[] = [];
  if (isCombatHazard(dispute)) parts.push("실전투·폭격 신호");
  if (dispute.tension === "high") parts.push("고긴장 영토 분쟁");
  else if (dispute.tension === "medium") parts.push("중긴장 분쟁");
  if (warHits > 0) parts.push(`최근 전투 뉴스 ${warHits}건 집중`);
  parts.push(`AI 데모 신뢰도 ${score}%`);
  return parts.join(" · ");
}

async function loadWarGdeltPoints(): Promise<GdeltPoint[]> {
  const raw = await loadCloudStaticJson<{ events?: ConflictEvent[] } | ConflictEvent[]>(
    "gdelt-events.json",
  );
  const events = Array.isArray(raw) ? raw : raw?.events;
  if (!Array.isArray(events)) return [];
  return events
    .filter((event) => event.eventTier === "war" && Number.isFinite(event.lat) && Number.isFinite(event.lng))
    .map((event) => ({ lat: event.lat, lng: event.lng, tier: event.eventTier }));
}

function countWarHitsNear(center: { lat: number; lng: number }, points: GdeltPoint[], radiusDeg = 4.5) {
  return points.filter((point) => centerDistanceDeg(center, point) <= radiusDeg).length;
}

function zoneFromDispute(dispute: DisputeArea, warPoints: GdeltPoint[]): AiWarZoneFeature | null {
  const resolvedCenter = resolveDisputeCenter(dispute);
  let box =
    dispute.geometry != null ? disputeGeometryBbox(dispute.geometry) : null;
  if (!box) {
    const pad = 1.8;
    box = {
      minLat: resolvedCenter.lat - pad,
      maxLat: resolvedCenter.lat + pad,
      minLng: resolvedCenter.lng - pad,
      maxLng: resolvedCenter.lng + pad,
    };
  } else {
    box = padBbox(box, 0.12);
  }
  if (!isValidRegionBox(box)) return null;

  const center = centerFromBbox(box);
  const warHits = countWarHitsNear(center, warPoints);
  const score = Math.min(99, disputeBaseScore(dispute) + Math.min(18, warHits * 2));
  const tension = scoreToTension(score);

  return {
    id: `ai-war-${dispute.id}`,
    kind: "conflict-zone",
    name: dispute.name,
    center,
    geometry: bboxToRectPolygon(box),
    eventCount: Math.max(warHits, dispute.matchedEventCount ?? 0, 1),
    tension,
    aiScore: score,
    aiSummary: buildAiSummary(dispute, warHits, score),
    detectedBy: "ai-demo",
    sources: ["Natural Earth", warHits > 0 ? "GDELT war" : "curated tension"],
  };
}

/**
 * AI API 없이 데모: Natural Earth 분쟁 구역 + GDELT 전투 뉴스 밀도로 전쟁지역 자동 탐지.
 */
export async function detectAiWarZonesDemo(): Promise<AiWarZoneFeature[]> {
  const disputes = await loadServerDisputes();
  const warPoints = await loadWarGdeltPoints();

  const candidates = disputes.filter((dispute) => {
    if (isCombatHazard(dispute)) return true;
    if (dispute.tension === "high" || dispute.tension === "medium") return true;
    if (dispute.categories?.includes("①") || dispute.categories?.includes("③")) return true;
    return countWarHitsNear(resolveDisputeCenter(dispute), warPoints, 3.5) >= 3;
  });

  const zones: AiWarZoneFeature[] = [];
  for (const dispute of candidates) {
    const zone = zoneFromDispute(dispute, warPoints);
    if (zone) zones.push(zone);
  }

  return zones.sort((a, b) => b.aiScore - a.aiScore).slice(0, 28);
}
