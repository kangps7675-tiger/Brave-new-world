import type { ConflictEvent } from "@/data/geoTypes";
import { scoreEvents } from "@/data/eventTiers";
import { buildGdeltPointTitle } from "@/lib/gdeltNewsAlert";
import {
  readGdeltFromIngestWorker,
  readGdeltPointsFromD1,
} from "@/lib/d1LiveSnapshots";
import { fetchLatestGdeltEvents } from "@/lib/gdeltParse";
import type { MacroGdeltInputEvent } from "@/lib/macroBriefing/types";
import { isOceanGeopoliticsTag } from "@/lib/oceanGeopoliticsTheaters";

function tierFromQueryTag(tag: string | null): ConflictEvent["eventTier"] {
  const t = (tag || "").toLowerCase();
  if (t.includes("alliance") || t.includes("axis-network")) return "alliance";
  if (t.includes("land-war")) return "war";
  if (t.includes("protest")) return "protest";
  return "diplomatic";
}

function mapPoint(point: {
  id: string;
  lat: number;
  lng: number;
  name: string | null;
  url: string | null;
  mentionCount: number | null;
  queryTag: string | null;
}): ConflictEvent {
  const title = buildGdeltPointTitle({
    name: point.name,
    url: point.url,
    queryTag: point.queryTag,
  });
  return {
    id: point.id,
    globalEventId: point.id,
    eventDate: null,
    country: null,
    lat: point.lat,
    lng: point.lng,
    category: "Strategic developments",
    severity: 2,
    goldsteinScale: -2,
    sourceUrl: point.url,
    title,
    createdAt: null,
    eventTier: isOceanGeopoliticsTag(point.queryTag || title)
      ? "diplomatic"
      : tierFromQueryTag(point.queryTag),
  };
}

export type LoadMacroGdeltResult = {
  events: MacroGdeltInputEvent[];
  source: "d1" | "ingest-worker" | "live" | "empty";
};

/** 매크로 브리핑용 GDELT — D1 → ingest worker → live export */
export async function loadMacroGdeltEvents(max = 800): Promise<LoadMacroGdeltResult> {
  try {
    const fromD1 = await readGdeltPointsFromD1(max);
    if (fromD1 && fromD1.count > 0) {
      const scored = scoreEvents(fromD1.events.map(mapPoint));
      return { events: scoredToMacro(scored), source: "d1" };
    }
    const fromWorker = await readGdeltFromIngestWorker(max);
    if (fromWorker && fromWorker.count > 0) {
      const scored = scoreEvents(fromWorker.events.map(mapPoint));
      return { events: scoredToMacro(scored), source: "ingest-worker" };
    }
    const live = await fetchLatestGdeltEvents({ sliceCount: 2 });
    const events = (live.events as ConflictEvent[]) || [];
    if (events.length > 0) {
      return { events: scoredToMacro(scoreEvents(events)), source: "live" };
    }
  } catch {
    /* fall through */
  }
  return { events: [], source: "empty" };
}

function scoredToMacro(
  scored: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string | null;
    sourceUrl: string | null;
    eventTier: string;
    tensionScore: number;
    importanceGrade: string;
    createdAt: string | null;
    eventDate: string | null;
  }>,
): MacroGdeltInputEvent[] {
  return scored.map((e) => ({
    id: e.id,
    lat: e.lat,
    lng: e.lng,
    title: e.title,
    sourceUrl: e.sourceUrl,
    eventTier: e.eventTier,
    tensionScore: e.tensionScore,
    importanceGrade: e.importanceGrade,
    createdAt: e.createdAt,
    eventDate: e.eventDate,
  }));
}
