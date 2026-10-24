import type { Verdict, MatchStatus } from "@/lib/strikeMatch/scoreCandidates";

export type StrikeCandidateView = {
  mmsi: string;
  imo: string | null;
  name: string | null;
  shipType: number | null;
  verdict: Verdict;
  score: number;
  distanceKm: number;
  signals: Array<{ key: string; ko: string; en?: string }>;
};

export type ReportedNameView = {
  name: string;
  imo: string | null;
  mmsi: string | null;
  outlets: number;
  status: "new" | "unresolved";
  sources: Array<{ url: string; outlet: string | null; headline: string }>;
};

export type StrikeDetailView = {
  status: MatchStatus;
  top: StrikeCandidateView | null;
  candidates: StrikeCandidateView[];
  nearbyCount: number;
  limits: string[];
  nameSource?: { name: string; outlets: number } | null;
  reportedNames?: ReportedNameView[];
};

const TTL_MS = 10 * 60_000;
const cache = new Map<string, { at: number; promise: Promise<StrikeDetailView | null> }>();

/** /api/strikes/:id — 후보 목록 포함. 서버가 10분 캐시. 실패하면 null. */
export function loadStrikeDetail(caseId: string, fetchImpl: typeof fetch = fetch): Promise<StrikeDetailView | null> {
  const hit = cache.get(caseId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = fetchImpl(`/api/strikes/${encodeURIComponent(caseId)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { strike?: StrikeDetailView } | null) => j?.strike ?? null)
    .catch(() => null);
  cache.set(caseId, { at: Date.now(), promise });
  return promise;
}
