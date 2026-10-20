/**
 * 뉴스 인사이트 응답 검증 — 원문 부분문자열 + 카탈로그 화이트리스트.
 */

import {
  isCatalogIdAllowed,
  type NewsInsightMode,
} from "@/data/newsInsightCatalog";
import type {
  NewsInsightExcerpt,
  NewsInsightHighlight,
  NewsInsightMapAction,
  NewsInsightPayload,
} from "@/lib/llm/newsInsightPrompt";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function whitelistIds(ids: unknown, mode: NewsInsightMode): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (id && isCatalogIdAllowed(id, mode) && !out.includes(id)) out.push(id);
  }
  return out;
}

function whitelistBundle(id: unknown, mode: NewsInsightMode): string | undefined {
  if (typeof id !== "string") return undefined;
  const trimmed = id.trim();
  if (!trimmed || !isCatalogIdAllowed(trimmed, mode)) return undefined;
  return trimmed;
}

/** 발췌 문자열이 원문(또는 제목)의 부분문자열인지 — 공백 정규화 허용 */
export function isVerbatimSubstring(quote: string, corpus: string): boolean {
  if (!quote.trim() || !corpus) return false;
  if (corpus.includes(quote)) return true;
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  return norm(corpus).includes(norm(quote));
}

function sanitizeHighlight(
  h: unknown,
  excerptText: string,
  mode: NewsInsightMode,
): NewsInsightHighlight | null {
  const row = asRecord(h);
  if (!row) return null;
  let start = typeof row.start === "number" ? Math.floor(row.start) : -1;
  let end = typeof row.end === "number" ? Math.floor(row.end) : -1;
  const layerIds = whitelistIds(row.layerIds, mode);
  const bundleId = whitelistBundle(row.bundleId, mode);

  if (layerIds.length === 0 && !bundleId) return null;

  if (start < 0 || end <= start || end > excerptText.length) {
    // 오프셋이 깨졌으면 layer용 텍스트 필드가 있으면 재탐색
    const hinted =
      typeof row.text === "string"
        ? row.text
        : typeof row.quote === "string"
          ? row.quote
          : "";
    if (hinted && excerptText.includes(hinted)) {
      start = excerptText.indexOf(hinted);
      end = start + hinted.length;
    } else {
      return null;
    }
  }

  const slice = excerptText.slice(start, end);
  if (!slice.trim()) return null;

  return {
    start,
    end,
    layerIds,
    ...(bundleId ? { bundleId } : {}),
  };
}

function sanitizeExcerpt(
  ex: unknown,
  corpus: string,
  mode: NewsInsightMode,
): NewsInsightExcerpt | null {
  const row = asRecord(ex);
  if (!row) return null;
  const text = typeof row.text === "string" ? row.text.trim() : "";
  if (!text || !isVerbatimSubstring(text, corpus)) return null;

  const rawHighlights = Array.isArray(row.highlights) ? row.highlights : [];
  const highlights: NewsInsightHighlight[] = [];
  for (const h of rawHighlights) {
    const clean = sanitizeHighlight(h, text, mode);
    if (clean) highlights.push(clean);
  }
  return { text, highlights };
}

function sanitizeMapAction(
  a: unknown,
  mode: NewsInsightMode,
): NewsInsightMapAction | null {
  const row = asRecord(a);
  if (!row) return null;
  const layerIds = whitelistIds(row.layerIds, mode);
  const bundleId = whitelistBundle(row.bundleId, mode);
  if (layerIds.length === 0 && !bundleId) return null;

  let center: { lat: number; lng: number } | undefined;
  const c = asRecord(row.center);
  if (c && typeof c.lat === "number" && typeof c.lng === "number") {
    if (
      Number.isFinite(c.lat) &&
      Number.isFinite(c.lng) &&
      c.lat >= -90 &&
      c.lat <= 90 &&
      c.lng >= -180 &&
      c.lng <= 180
    ) {
      center = { lat: c.lat, lng: c.lng };
    }
  }
  const altitude =
    typeof row.altitude === "number" && Number.isFinite(row.altitude)
      ? Math.min(8, Math.max(0.2, row.altitude))
      : undefined;

  return {
    layerIds,
    ...(bundleId ? { bundleId } : {}),
    ...(center ? { center } : {}),
    ...(altitude != null ? { altitude } : {}),
  };
}

export function parseAndSanitizeNewsInsight(
  rawText: string,
  corpus: string,
  mode: NewsInsightMode,
): NewsInsightPayload | null {
  let parsed: unknown;
  try {
    const trimmed = rawText.trim();
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    parsed = JSON.parse(fence ? fence[1].trim() : trimmed);
  } catch {
    return null;
  }
  const root = asRecord(parsed);
  if (!root) return null;

  const excerptsIn = Array.isArray(root.excerpts) ? root.excerpts : [];
  const excerpts: NewsInsightExcerpt[] = [];
  for (const ex of excerptsIn) {
    const clean = sanitizeExcerpt(ex, corpus, mode);
    if (clean) excerpts.push(clean);
  }

  const insight =
    typeof root.insight === "string" ? root.insight.trim().slice(0, 4000) : "";

  const actionsIn = Array.isArray(root.mapActions) ? root.mapActions : [];
  const mapActions: NewsInsightMapAction[] = [];
  for (const a of actionsIn) {
    const clean = sanitizeMapAction(a, mode);
    if (clean) mapActions.push(clean);
  }

  // 발췌가 전부 제목/코퍼스 앞부분을 최소 발췌로
  if (excerpts.length === 0) {
    const fallback = corpus.trim().slice(0, 200);
    if (fallback) excerpts.push({ text: fallback, highlights: [] });
  }

  return {
    excerpts: excerpts.slice(0, 4),
    insight,
    mapActions: mapActions.slice(0, 6),
  };
}
