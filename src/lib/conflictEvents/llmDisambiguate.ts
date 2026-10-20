/**
 * 좌표 미확정 + 카테고리 키워드만 걸린 애매 케이스.
 * 전량 호출 금지 — 배치당 maxCalls.
 * LLM은 gazetteer id 만 고른다. 좌표를 지어내지 않는다.
 */
import { gazetteerById, GAZETTEER } from "@/lib/geo/gazetteer";
import { LLM_DISAMBIGUATE_MAX_PER_BATCH } from "@/lib/conflictEvents/clusterConfig";
import { ambiguousUnlocatedEvents } from "@/lib/conflictEvents/extractRawEvents";
import type { RawConflictEvent } from "@/lib/conflictEvents/types";
import { callClaudeMessages } from "@/lib/llm/claudeMessages";

export type LlmDisambiguateBudget = {
  apiKey: string;
  maxCalls?: number;
  signal?: AbortSignal;
};

function parsePlaceIds(text: string): Map<string, string> {
  const out = new Map<string, string>();
  const fence = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const jsonText = fence?.[0] ?? text;
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    const rows = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && "matches" in parsed
        ? (parsed as { matches: unknown }).matches
        : [];
    if (!Array.isArray(rows)) return out;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const id = String((row as { id?: unknown }).id ?? "");
      const placeId = String((row as { placeId?: unknown }).placeId ?? "");
      if (id && placeId && gazetteerById(placeId)) out.set(id, placeId);
    }
  } catch {
    return out;
  }
  return out;
}

export async function disambiguateUnlocatedEvents(
  events: RawConflictEvent[],
  budget: LlmDisambiguateBudget,
): Promise<RawConflictEvent[]> {
  const maxCalls = Math.min(
    budget.maxCalls ?? LLM_DISAMBIGUATE_MAX_PER_BATCH,
    LLM_DISAMBIGUATE_MAX_PER_BATCH,
  );
  const candidates = ambiguousUnlocatedEvents(events).slice(0, maxCalls);
  if (candidates.length === 0 || !budget.apiKey.trim()) return events;

  const catalog = GAZETTEER.map((g) => `${g.id}|${g.en}|${g.ko}`).join("\n");
  const payload = candidates.map((e) => ({
    id: e.id,
    title: e.title,
    snippet: e.snippet.slice(0, 280),
  }));

  const result = await callClaudeMessages({
    apiKey: budget.apiKey,
    maxTokens: 400,
    signal: budget.signal,
    system:
      "You map news headlines to a gazetteer id. Return JSON {\"matches\":[{\"id\",\"placeId\"}]}. " +
      "placeId MUST be one of the catalog ids. If unsure, omit the row. Never invent coordinates.",
    user: `CATALOG:\n${catalog}\n\nITEMS:\n${JSON.stringify(payload)}`,
  });

  if (!result.ok) return events;
  const hits = parsePlaceIds(result.text);
  if (hits.size === 0) return events;

  return events.map((event) => {
    const placeId = hits.get(event.id);
    if (!placeId) return event;
    const place = gazetteerById(placeId);
    if (!place) return event;
    return {
      ...event,
      lat: place.lat,
      lng: place.lng,
      theater: place.theater,
      matchedPlaceId: place.id,
      extraction: "llm",
    };
  });
}
