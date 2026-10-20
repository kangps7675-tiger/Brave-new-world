/**
 * 레이어 호버 데이터 패널 — 패널 목록·지도 피처 공통 내용.
 * sourceCatalog + explainLayer + reliability를 한 카드로 묶는다.
 */

import { getSourceNote } from "@/data/sourceCatalog";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { explainLayer } from "@/lib/layerHoverExplain";
import { formatReliabilityForHover } from "@/lib/layerReliability";

export type LayerInfoHoverContent = {
  title: string;
  detail: string;
  body?: string;
  badge?: string;
  meta?: string;
  hint?: string;
  sourceUrl?: string | null;
  statusLabel?: string;
};

const STATUS_LABEL = {
  shipped: { ko: "운영", en: "Shipped" },
  planned: { ko: "계획", en: "Planned" },
  blocked: { ko: "차단", en: "Blocked" },
} as const;

export function buildLayerInfoHoverContent(
  layerId: string,
  lang: LabelLanguage,
  fallback?: { title?: string; detail?: string },
): LayerInfoHoverContent {
  const note = getSourceNote(layerId);
  const explain = explainLayer(layerId, lang);
  const rel = formatReliabilityForHover(layerId, lang);

  const title =
    fallback?.title?.trim() ||
    note?.source ||
    layerId;

  const detailParts: string[] = [];
  if (fallback?.detail?.trim()) detailParts.push(fallback.detail.trim());
  if (note?.notes?.trim() && note.notes.trim() !== fallback?.detail?.trim()) {
    detailParts.push(note.notes.trim());
  }
  const detail =
    detailParts[0] ||
    (lang === "en" ? "Layer data & source" : "레이어 데이터 · 출처");

  const body = explain || (detailParts.length > 1 ? detailParts.slice(1).join(" · ") : undefined);

  const metaBits: string[] = [];
  if (note) {
    metaBits.push(`${note.attribution} · ${note.cadence}`);
  }
  if (rel?.meta) metaBits.push(rel.meta);

  return {
    title,
    detail,
    body,
    badge: rel?.badge,
    meta: metaBits.length > 0 ? metaBits.join(" · ") : undefined,
    hint: rel?.hint,
    sourceUrl: note?.url || null,
    statusLabel: note ? STATUS_LABEL[note.status][lang] : undefined,
  };
}
