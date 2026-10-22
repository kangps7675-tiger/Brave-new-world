import type { AisVessel } from "@/data/geoTypes";

export type IncidentVessel = AisVessel & {
  incident: 1 | 2;
  incidentCaseId?: string | null;
  incidentType?: string | null;
};

const TTL_MS = 5 * 60_000;
let cache: { at: number; promise: Promise<IncidentVessel[]> } | null = null;

/** /api/incident-vessels — 훅과 사건 패널이 한 요청을 같이 쓴다. 실패하면 빈 배열. */
export function loadIncidentVessels(force = false): Promise<IncidentVessel[]> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.promise;
  const promise = fetch("/api/incident-vessels")
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { vessels?: IncidentVessel[] } | null) => (Array.isArray(j?.vessels) ? (j!.vessels as IncidentVessel[]) : []))
    .catch(() => [] as IncidentVessel[]);
  cache = { at: Date.now(), promise };
  return promise;
}
