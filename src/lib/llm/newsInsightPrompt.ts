/**
 * 뉴스 인사이트 — Claude 프롬프트 + 응답 스키마.
 * 발췌는 원문 그대로; 인사이트만 재서술.
 */

import {
  catalogSummaryForPrompt,
  type NewsInsightMode,
} from "@/data/newsInsightCatalog";

export type NewsInsightRequestInput = {
  url: string;
  title: string;
  source?: string | null;
  publishedAt?: string | null;
  bodyOrSnippet?: string | null;
  mode: NewsInsightMode;
  lang: "ko" | "en";
};

export type NewsInsightHighlight = {
  start: number;
  end: number;
  layerIds: string[];
  bundleId?: string;
};

export type NewsInsightExcerpt = {
  text: string;
  highlights: NewsInsightHighlight[];
};

export type NewsInsightMapAction = {
  layerIds: string[];
  bundleId?: string;
  center?: { lat: number; lng: number };
  altitude?: number;
};

export type NewsInsightPayload = {
  excerpts: NewsInsightExcerpt[];
  insight: string;
  mapActions: NewsInsightMapAction[];
};

export function buildNewsInsightSystem(lang: "ko" | "en", mode: NewsInsightMode): string {
  const catalog = catalogSummaryForPrompt(mode);
  if (lang === "en") {
    return [
      "You analyze one news article for a geopolitical / geoeconomic map product.",
      "Return ONLY valid JSON matching the schema. No markdown fences.",
      "Schema: { excerpts: [{ text, highlights: [{ start, end, layerIds, bundleId? }] }], insight: string, mapActions: [{ layerIds, bundleId?, center?: {lat,lng}, altitude? }] }",
      "excerpts.text MUST be 1–2 sentences copied VERBATIM from the article body/snippet (or title if body empty). Do NOT rewrite, translate, or paraphrase excerpts.",
      "highlights: character offsets into that excerpt.text. Highlight ONLY spans that map to catalog ids. If nothing maps, use empty highlights[].",
      "layerIds / bundleId MUST be ids from the catalog below. Prefer bundleId for strategic multi-layer sentences.",
      "insight: prose answering who/what/when/where/why/how + causal hypothesis tone. Do NOT invent facts. Label uncertainty. Not a translation dump.",
      "mapActions: optional fly targets for mapped layers/bundles. Omit if none.",
      `Viewer mode: ${mode}. Use only catalog entries allowed for this mode.`,
      "CATALOG:",
      catalog,
    ].join("\n");
  }
  return [
    "당신은 지정학·지경학 지도 제품용 뉴스 분석기입니다.",
    "유효한 JSON만 반환하십시오. 마크다운 코드펜스 금지.",
    "스키마: { excerpts: [{ text, highlights: [{ start, end, layerIds, bundleId? }] }], insight: string, mapActions: [{ layerIds, bundleId?, center?: {lat,lng}, altitude? }] }",
    "excerpts.text는 기사 본문/발췌(없으면 제목)에서 1~2문장을 원문 그대로 복사하십시오. 재작성·번역·의역 금지.",
    "highlights는 해당 excerpts.text 안의 문자 오프셋입니다. 카탈로그 id로 맵에 올릴 수 있는 표현만 하이라이트. 없으면 highlights는 [].",
    "layerIds·bundleId는 아래 카탈로그 id만. 전략 문장은 bundleId를 우선.",
    "insight는 6하원칙·인과를 가설 톤의 줄글로. 사실 날조 금지. 불확실하면 명시. 장문 번역 금지.",
    "mapActions는 맵에 올릴 레이어/번들용(선택). 없으면 [].",
    `뷰어 모드: ${mode}. 이 모드에 허용된 카탈로그만 사용.`,
    "CATALOG:",
    catalog,
  ].join("\n");
}

export function buildNewsInsightUserMessage(input: NewsInsightRequestInput): string {
  const body =
    (input.bodyOrSnippet && input.bodyOrSnippet.trim()) ||
    input.title;
  const lines = [
    `Title: ${input.title}`,
    `URL: ${input.url}`,
    `Mode: ${input.mode}`,
    `Lang: ${input.lang}`,
  ];
  if (input.source) lines.push(`Source: ${input.source}`);
  if (input.publishedAt) lines.push(`Published: ${input.publishedAt}`);
  lines.push("BodyOrSnippet:");
  lines.push(body.slice(0, 6000));
  lines.push(
    input.lang === "en"
      ? "Pick verbatim excerpts from BodyOrSnippet. Write insight in English."
      : "BodyOrSnippet에서 원문 발췌를 고르십시오. insight는 한국어 ~습니다체로.",
  );
  return lines.join("\n");
}

export function stubNewsInsightPayload(input: NewsInsightRequestInput): NewsInsightPayload {
  const snippet =
    (input.bodyOrSnippet && input.bodyOrSnippet.trim()) ||
    input.title;
  const text = snippet.slice(0, 220);
  const insight =
    input.lang === "en"
      ? "Automated stub insight: map layers were not inferred. Open the original article and use Show on map after a live analysis run."
      : "자동 스텁 인사이트입니다. 레이어는 추론되지 않았습니다. 원문을 확인한 뒤 실제 분석이 되면 「지도에서 보기」를 사용할 수 있습니다.";
  return {
    excerpts: [{ text, highlights: [] }],
    insight,
    mapActions: [],
  };
}

export function fallbackInsightOnError(
  input: NewsInsightRequestInput,
): string {
  return input.lang === "en"
    ? "Insight unavailable right now. Excerpts and the source link remain available."
    : "인사이트를 지금은 가져오지 못했습니다. 발췌와 원문 링크는 그대로 확인할 수 있습니다.";
}
