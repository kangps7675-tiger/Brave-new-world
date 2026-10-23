import type { AisVessel } from "@/data/geoTypes";
import type { SeaIncident } from "@/lib/seaBrief";

/** 사용자가 등록한 「내 배」 한 척. AIS 신호는 MMSI·선명으로만 맞출 수 있다 (IMO는 AIS 위치 신호에 없다). */
export type FleetEntry = { kind: "mmsi" | "imo" | "name"; value: string };

export const FLEET_STORAGE_KEY = "straitdesk-my-fleet";
export const FLEET_MAX = 50;
const INCIDENT_WINDOW_MS = 72 * 3_600_000;
const NEAR_NM = 50;

/** 쉼표·줄바꿈·공백 덩어리로 나눠 MMSI(9자리)/IMO(7자리)/선명으로 분류한다. 중복은 뺀다. */
export function parseFleetInput(text: string): FleetEntry[] {
  const seen = new Set<string>();
  const out: FleetEntry[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const v = raw.trim().replace(/^imo\s*/i, "").replace(/^mmsi\s*/i, "");
    if (!v) continue;
    const kind: FleetEntry["kind"] = /^\d{9}$/.test(v) ? "mmsi" : /^\d{7}$/.test(v) ? "imo" : "name";
    const value = kind === "name" ? v.toUpperCase() : v;
    const key = `${kind}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind, value });
    if (out.length >= FLEET_MAX) break;
  }
  return out;
}

export function loadFleet(): FleetEntry[] {
  try {
    const raw = window.localStorage.getItem(FLEET_STORAGE_KEY);
    return raw ? parseFleetInput((JSON.parse(raw) as FleetEntry[]).map((e) => e.value).join("\n")) : [];
  } catch {
    return [];
  }
}

export function saveFleet(entries: FleetEntry[]): void {
  try {
    window.localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* 저장 불가 환경 — 화면 안에서만 유지 */
  }
}

export type FleetStatus = {
  entry: FleetEntry;
  /** AIS에서 찾은 배. IMO 등록은 항상 null (맞출 방법이 없다). */
  vessel: AisVessel | null;
};

export function matchFleet(entries: FleetEntry[], vessels: readonly AisVessel[]): FleetStatus[] {
  return entries.map((entry) => {
    if (entry.kind === "imo") return { entry, vessel: null };
    const vessel =
      entry.kind === "mmsi"
        ? vessels.find((v) => v.mmsi === entry.value) ?? null
        : vessels.find((v) => v.shipName?.trim().toUpperCase() === entry.value) ?? null;
    return { entry, vessel };
  });
}

function nm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3440.065;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type FleetAlert = { entry: FleetEntry; vesselName: string | null; incident: SeaIncident; distanceNm: number };

/** 최근 72시간 안 피격·나포·승선 사건 50해리 안에 있는 내 배. */
export function fleetNearIncidents(statuses: FleetStatus[], incidents: SeaIncident[], now = Date.now()): FleetAlert[] {
  const recent = incidents.filter((i) => {
    if (!["Attack", "Hijack", "Boarding"].includes(i.incidentTypeName)) return false;
    const t = i.utcDateOfIncident ? Date.parse(i.utcDateOfIncident) : NaN;
    return Number.isFinite(t) && now - t <= INCIDENT_WINDOW_MS;
  });
  const out: FleetAlert[] = [];
  for (const s of statuses) {
    if (!s.vessel) continue;
    for (const inc of recent) {
      const d = nm(s.vessel.lat, s.vessel.lng, inc.lat, inc.lng);
      if (d <= NEAR_NM) out.push({ entry: s.entry, vesselName: s.vessel.shipName, incident: inc, distanceNm: Math.round(d) });
    }
  }
  return out.sort((a, b) => a.distanceNm - b.distanceNm);
}
