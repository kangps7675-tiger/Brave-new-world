/**
 * URL/본문 → 저장 전 사건 초안 (DB에 쓰지 않음).
 */

import { matchConflictCategory } from "@/lib/conflictEvents/categoryKeywords";
import { parseOccurredAt } from "@/lib/conflictEvents/geo";
import { matchGazetteer } from "@/lib/geo/gazetteer";
import { classifyMediaTier } from "@/lib/news/mediaTiers";
import { resolveImpactPlace } from "@/lib/telegramPlaceMatch";
import { buildClaimTemplates } from "@/lib/caseFile/claimTemplates";
import {
  fetchAndExtractArticle,
  type ExtractedArticle,
} from "@/lib/caseFile/extractArticle";
import { refreshCaseVerdicts } from "@/lib/caseFile/verdict";
import type {
  CaseEventType,
  CaseFile,
  CasePlace,
  Claim,
  MediaTier,
  OccurredAtSource,
} from "@/lib/caseFile/types";

export type PlaceDraft = CasePlace;

export type CaseDraft = {
  title: string;
  article: CaseFile["article"];
  eventType: CaseEventType;
  place: PlaceDraft | null;
  occurredAt: string | null;
  occurredAtSource: OccurredAtSource;
  category: string | null;
  claims: Claim[];
  extract: ExtractedArticle;
  notes: string[];
};

const MARITIME_RE =
  /\b(ship|vessel|tanker|freighter|bulk\s*carrier|ais|boarding|hijack|piracy)\b|\b선박\b|\b유조선\b|\b화물선\b|\b나포\b|\b피격\b.*\b해상\b|\b해상\b.*\b피격\b/i;

function inferEventType(text: string, category: string | null): CaseEventType {
  if (MARITIME_RE.test(text)) return "maritime";
  if (
    category === "airstrike" ||
    category === "missile" ||
    category === "drone" ||
    category === "explosion"
  ) {
    return "strike";
  }
  if (/\b(strike|bomb|fire|warehouse|port|missile|drone|공습|폭격|미사일|화재|창고)\b/i.test(text)) {
    return "strike";
  }
  return "other";
}

/** 본문에서 날짜·시각 힌트 찾기 */
export function findOccurredHint(text: string): string | null {
  if (!text) return null;
  const iso = text.match(
    /\b(20\d{2}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}(?::\d{2})?)(?:Z|[+-]\d{2}:?\d{2})?)?/,
  );
  if (iso) {
    return iso[2] ? `${iso[1]}T${iso[2]}` : iso[1];
  }
  const ko = text.match(
    /(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*(새벽|오전|오후|밤))?(?:\s*(\d{1,2})\s*시)?/,
  );
  if (ko) {
    const y = ko[1];
    const m = ko[2]!.padStart(2, "0");
    const d = ko[3]!.padStart(2, "0");
    let hour = ko[5] ? Number(ko[5]) : ko[4] === "새벽" ? 2 : 12;
    if (ko[4] === "오후" && hour < 12) hour += 12;
    return `${y}-${m}-${d}T${String(hour).padStart(2, "0")}:00:00`;
  }
  return null;
}

function resolvePlace(text: string): PlaceDraft | null {
  const impact = resolveImpactPlace(text);
  if (impact) {
    return {
      label: impact.label,
      lat: impact.lat,
      lng: impact.lng,
      precision: impact.precision,
      source: "impact",
    };
  }
  const gaz = matchGazetteer(text);
  if (gaz) {
    return {
      label: gaz.ko || gaz.en,
      lat: gaz.lat,
      lng: gaz.lng,
      precision: gaz.precision,
      source: "gazetteer",
    };
  }
  return null;
}

function fillClaimStatements(
  claims: Claim[],
  args: {
    place: PlaceDraft | null;
    occurredAt: string | null;
    occurredAtSource: CaseDraft["occurredAtSource"];
    category: string | null;
    text: string;
  },
): Claim[] {
  return claims.map((c) => {
    switch (c.kind) {
      case "place":
        return {
          ...c,
          statement: args.place
            ? `${args.place.label} (${args.place.precision}, ${args.place.source})`
            : "장소 미추출 — 지도에서 지정",
        };
      case "time":
        return {
          ...c,
          statement: args.occurredAt
            ? args.occurredAtSource === "article"
              ? `${args.occurredAt} (기사 발행 시각 기준)`
              : args.occurredAt
            : "시간 미추출",
        };
      case "occurrence":
        return {
          ...c,
          statement: args.category
            ? `사건 유형 후보: ${args.category}`
            : "사건 발생 — 본문에서 확인",
        };
      case "damage":
        return { ...c, statement: "피해 — 확인 필요" };
      case "means":
        return {
          ...c,
          statement: "수단 — 지도로 대체로 확인 불가 (당사자·집계만)",
        };
      case "actor":
        return {
          ...c,
          statement: "주체 — 지도로 확인 불가",
        };
      default:
        return c;
    }
  });
}

export function buildCaseDraftFromText(input: {
  text: string;
  url?: string;
  outlet?: string;
  publishedAt?: string | null;
  title?: string | null;
  extract?: ExtractedArticle;
}): CaseDraft {
  const text = input.text.trim();
  const notes: string[] = [];
  if (!text) notes.push("본문이 비어 있습니다. URL 추출 실패 시 붙여넣기가 필요합니다.");

  const place = text ? resolvePlace(text) : null;
  if (!place) notes.push("지명을 못 찾았습니다. 지도에서 핀을 옮기세요.");

  const bodyHint = findOccurredHint(text);
  const bodyMs = bodyHint ? parseOccurredAt(bodyHint) : null;
  const articleMs = input.publishedAt ? parseOccurredAt(input.publishedAt) : null;

  let occurredAt: string | null = null;
  let occurredAtSource: CaseDraft["occurredAtSource"] = "none";
  if (bodyMs != null) {
    occurredAt = new Date(bodyMs).toISOString();
    occurredAtSource = "body";
  } else if (articleMs != null) {
    occurredAt = new Date(articleMs).toISOString();
    occurredAtSource = "article";
    notes.push("본문 시각이 없어 기사 발행 시각을 썼습니다.");
  }

  const cat = text ? matchConflictCategory(text) : null;
  const eventType = inferEventType(text, cat?.category ?? null);
  const outlet = input.outlet?.trim() || undefined;
  const tier = classifyMediaTier(outlet || "", input.url || "") as MediaTier;

  const claims = fillClaimStatements(buildClaimTemplates(eventType), {
    place,
    occurredAt,
    occurredAtSource,
    category: cat?.category ?? null,
    text,
  });

  const title =
    input.title?.trim() ||
    text.slice(0, 80).replace(/\s+/g, " ") ||
    "제목 없는 사건";

  const extract: ExtractedArticle =
    input.extract ??
    {
      url: input.url,
      title: input.title ?? null,
      outlet: outlet ?? null,
      publishedAt: input.publishedAt ?? null,
      text,
    };

  return {
    title,
    article: {
      url: input.url,
      text,
      outlet,
      tier,
      publishedAt: input.publishedAt ?? undefined,
    },
    eventType,
    place,
    occurredAt,
    occurredAtSource,
    category: cat?.category ?? null,
    claims,
    extract,
    notes,
  };
}

export async function buildCaseDraft(input: {
  url?: string;
  text?: string;
  outlet?: string;
}): Promise<CaseDraft> {
  const pasted = (input.text ?? "").trim();
  let extract: ExtractedArticle | undefined;
  let text = pasted;
  let title: string | null = null;
  let outlet = input.outlet?.trim() || undefined;
  let publishedAt: string | null = null;
  let url = input.url?.trim() || undefined;

  if (url) {
    extract = await fetchAndExtractArticle(url);
    title = extract.title;
    outlet = outlet || extract.outlet || undefined;
    publishedAt = extract.publishedAt;
    if (!text && extract.text) text = extract.text;
  }

  return buildCaseDraftFromText({
    text,
    url,
    outlet,
    publishedAt,
    title,
    extract,
  });
}

/** 초안 → 저장용 CaseFile (id/rev는 createCaseFile이 채움) */
export function draftToCaseFileInput(draft: CaseDraft): Omit<
  CaseFile,
  "id" | "rev" | "verdict"
> &
  Partial<Pick<CaseFile, "verdict">> {
  const incident: CaseFile["incident"] = {
    place: draft.place
      ? {
          label: draft.place.label,
          lat: draft.place.lat,
          lng: draft.place.lng,
          precision: draft.place.precision,
          source: draft.place.source,
        }
      : null,
    occurredAt: draft.occurredAt,
    occurredAtSource: draft.occurredAtSource,
  };
  const refreshed = refreshCaseVerdicts({
    id: "draft",
    title: draft.title,
    article: draft.article,
    eventType: draft.eventType,
    incident,
    claims: draft.claims,
    verdict: "unconfirmed",
    rev: 0,
  });
  return {
    title: refreshed.title,
    article: refreshed.article,
    eventType: refreshed.eventType,
    incident: refreshed.incident,
    claims: refreshed.claims,
    verdict: refreshed.verdict,
  };
}
