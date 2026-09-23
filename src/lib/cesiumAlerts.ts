import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import { STRATEGIC_CORRIDORS } from "@/data/strategicCorridors";
import type { AisVessel } from "@/data/geoTypes";
import {
  stressForChokepoint,
  type ChokepointAisObservation,
  type ChokepointAssetVolatility,
} from "@/lib/chokepointStressForUi";
import { shouldOfferChokepointStressParchment } from "@/lib/logisticsStress";
import { exerciseFlyTarget } from "@/lib/militaryExerciseHatch";
import type { MilitaryExercise } from "@/lib/militaryExercises";
import type { NavareaFeaturePoint } from "@/lib/navareaHatch";
import { isSecurityCriticalNavarea, isUkmtoOfferWorthy } from "@/lib/navareaSecurity";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";

/**
 * AIS 통과 게이트 중심. 박스 정의는 workers/cron-ingest/src/aisZones.ts 와 맞춘다.
 */
export const AIS_GATE_CENTERS: ReadonlyArray<{
  id: string;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
}> = [
  { id: "hormuz", nameKo: "호르무즈 해협", nameEn: "Strait of Hormuz", lat: 26.6, lng: 56.3 },
  { id: "bab-el-mandeb", nameKo: "바브엘만데브", nameEn: "Bab el-Mandeb", lat: 12.6, lng: 43.35 },
  { id: "suez", nameKo: "수에즈 운하", nameEn: "Suez Canal", lat: 30.6, lng: 32.4 },
  { id: "malacca", nameKo: "믈라카 해협", nameEn: "Strait of Malacca", lat: 2.5, lng: 102 },
  { id: "taiwan-strait", nameKo: "대만 해협", nameEn: "Taiwan Strait", lat: 24.25, lng: 119.75 },
  { id: "bashi-channel", nameKo: "바시 해협", nameEn: "Bashi Channel", lat: 20.75, lng: 121.75 },
  { id: "bosporus", nameKo: "보스포루스", nameEn: "Bosporus", lat: 41.1, lng: 29.05 },
  { id: "panama", nameKo: "파나마 운하", nameEn: "Panama Canal", lat: 9.15, lng: -79.65 },
  { id: "great-belt", nameKo: "덴마크 해협", nameEn: "Danish Straits", lat: 55.35, lng: 11 },
  { id: "gulf-of-finland", nameKo: "핀란드만", nameEn: "Gulf of Finland", lat: 59.6, lng: 25.75 },
  { id: "bering-strait", nameKo: "베링 해협", nameEn: "Bering Strait", lat: 65.6, lng: -168.7 },
];

export type CesiumAlertKind =
  | "ukmto"
  | "navarea"
  | "portwatch"
  | "exercise"
  | "ais-gate"
  | "dark-fleet"
  | "route";

export type CesiumAlertItem = {
  id: string;
  kind: CesiumAlertKind;
  title: string;
  detail: string;
  lat: number;
  lng: number;
  path?: { lat: number; lng: number }[];
};

const KIND_CAP: Record<CesiumAlertKind, number> = {
  ukmto: 5,
  navarea: 5,
  portwatch: 4,
  exercise: 4,
  "ais-gate": 11,
  "dark-fleet": 5,
  route: 4,
};

function take(items: CesiumAlertItem[], kind: CesiumAlertKind): CesiumAlertItem[] {
  return items.filter((item) => item.kind === kind).slice(0, KIND_CAP[kind]);
}

function corridorPoints(corridor: (typeof STRATEGIC_CORRIDORS)[number]) {
  if (corridor.legs && corridor.legs.length > 0) {
    return corridor.legs.flatMap((leg) => leg.waypoints);
  }
  return corridor.waypoints;
}

export function buildCesiumAlerts(input: {
  lang: "ko" | "en";
  ukmtoIncidents: UkmtoIncidentPoint[];
  navareaFeatures: NavareaFeaturePoint[];
  exercises: MilitaryExercise[];
  disguisedVessels: AisVessel[];
  portWatchByChokeId: Record<string, ChokepointAisObservation>;
  assetByChokeId?: Record<string, ChokepointAssetVolatility>;
}): CesiumAlertItem[] {
  const en = input.lang === "en";
  const ukmto = [...input.ukmtoIncidents]
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
    .sort((a, b) => Number(isUkmtoOfferWorthy(b.incidentTypeName)) - Number(isUkmtoOfferWorthy(a.incidentTypeName)))
    .map((item): CesiumAlertItem => ({
      id: `ukmto:${item.id}`,
      kind: "ukmto",
      title: item.place || item.region || item.incidentTypeName,
      detail: [item.incidentTypeName, item.vesselName].filter(Boolean).join(" · "),
      lat: item.lat,
      lng: item.lng,
    }));

  const navarea = input.navareaFeatures
    .filter((feature) => isSecurityCriticalNavarea(feature))
    .filter((feature) => feature.lat != null && feature.lng != null)
    .map((feature): CesiumAlertItem => ({
      id: `navarea:${feature.id}`,
      kind: "navarea",
      title: feature.areaHint || feature.region,
      detail: feature.description.replace(/\s+/g, " ").slice(0, 96),
      lat: feature.lat as number,
      lng: feature.lng as number,
    }));

  const portwatch: CesiumAlertItem[] = [];
  for (const point of LOGISTICS_RISK_POINTS) {
    const ais = input.portWatchByChokeId[point.id] ?? null;
    const asset = input.assetByChokeId?.[point.id] ?? null;
    const stress = stressForChokepoint(point, input.ukmtoIncidents, ais, asset);
    if (!shouldOfferChokepointStressParchment(stress, ais ?? undefined)) continue;
    const pct = ais && Number.isFinite(ais.changePct) ? ais.changePct : null;
    const siren = stress.graded && stress.level === "elevated";
    const name =
      en && typeof point.meta?.nameEn === "string" ? point.meta.nameEn : point.name;
    portwatch.push({
      id: `portwatch:${point.id}`,
      kind: "portwatch",
      title: name,
      detail: [
        siren ? (en ? "Siren · A-grade" : "사이렌 · A급") : null,
        pct != null ? `PortWatch ${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%` : en ? "B-grade transit" : "B급 통항",
      ]
        .filter(Boolean)
        .join(" · "),
      lat: point.lat,
      lng: point.lng,
    });
  }

  const exercises: CesiumAlertItem[] = [];
  for (const ex of input.exercises) {
    const fly = exerciseFlyTarget(ex);
    if (!fly) continue;
    exercises.push({
      id: `exercise:${ex.id}`,
      kind: "exercise",
      title: ex.title,
      detail: en ? "Exercise brief" : "훈련 브리프",
      lat: fly.lat,
      lng: fly.lng,
    });
  }

  const gates = AIS_GATE_CENTERS.map((gate): CesiumAlertItem => ({
    id: `ais-gate:${gate.id}`,
    kind: "ais-gate",
    title: en ? gate.nameEn : gate.nameKo,
    detail: en ? "AIS gate" : "AIS 게이트",
    lat: gate.lat,
    lng: gate.lng,
  }));

  const dark = input.disguisedVessels
    .filter((vessel) => Number.isFinite(vessel.lat) && Number.isFinite(vessel.lng))
    .slice(0, KIND_CAP["dark-fleet"])
    .map((vessel): CesiumAlertItem => ({
      id: `dark-fleet:${vessel.id}`,
      kind: "dark-fleet",
      title: vessel.shipName || vessel.mmsi,
      detail: en ? "Dark fleet" : "다크플릿",
      lat: vessel.lat,
      lng: vessel.lng,
    }));

  const routes: CesiumAlertItem[] = [];
  for (const corridor of STRATEGIC_CORRIDORS) {
    if (
      corridor.mode !== "sea" &&
      corridor.category !== "military-logistics" &&
      corridor.category !== "sanctions-evasion"
    ) {
      continue;
    }
    const points = corridorPoints(corridor).filter(
      (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
    );
    if (points.length === 0) continue;
    const mid = points[Math.floor(points.length / 2)]!;
    routes.push({
      id: `route:${corridor.id}`,
      kind: "route",
      title: en ? corridor.nameEn : corridor.nameKo,
      detail: en ? "Corridor" : "항로",
      lat: mid.lat,
      lng: mid.lng,
      path: points.map((point) => ({ lat: point.lat, lng: point.lng })),
    });
  }

  return [
    ...take(ukmto, "ukmto"),
    ...take(navarea, "navarea"),
    ...take(portwatch, "portwatch"),
    ...take(exercises, "exercise"),
    ...take(gates, "ais-gate"),
    ...take(dark, "dark-fleet"),
    ...take(routes, "route"),
  ];
}
