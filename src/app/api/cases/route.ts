import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { authorizeCaseEditor, unauthorizedResponse } from "@/lib/caseFile/auth";
import { draftToCaseFileInput } from "@/lib/caseFile/buildDraft";
import { createCaseFile } from "@/lib/caseFile/store";
import type {
  CaseEventType,
  CaseFile,
  CaseIncident,
  Claim,
} from "@/lib/caseFile/types";
import { emptyIncident } from "@/lib/caseFile/types";
import { refreshCaseVerdicts } from "@/lib/caseFile/verdict";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseIncident(raw: unknown): CaseIncident {
  if (!raw || typeof raw !== "object") return emptyIncident();
  const o = raw as Record<string, unknown>;
  const placeRaw = o.place;
  let place: CaseIncident["place"] = null;
  if (placeRaw && typeof placeRaw === "object") {
    const p = placeRaw as Record<string, unknown>;
    if (
      typeof p.lat === "number" &&
      Number.isFinite(p.lat) &&
      typeof p.lng === "number" &&
      Number.isFinite(p.lng)
    ) {
      const source =
        p.source === "impact" ||
        p.source === "gazetteer" ||
        p.source === "editor" ||
        p.source === "none"
          ? p.source
          : "editor";
      place = {
        label: typeof p.label === "string" ? p.label : "지정 좌표",
        lat: p.lat,
        lng: p.lng,
        precision: typeof p.precision === "string" ? p.precision : "point",
        source,
      };
    }
  }
  const occurredAt =
    typeof o.occurredAt === "string" && o.occurredAt.trim()
      ? o.occurredAt.trim()
      : null;
  const occurredAtSource =
    o.occurredAtSource === "body" ||
    o.occurredAtSource === "article" ||
    o.occurredAtSource === "editor" ||
    o.occurredAtSource === "none"
      ? o.occurredAtSource
      : occurredAt
        ? "editor"
        : "none";
  return { place, occurredAt, occurredAtSource };
}

type CreateBody = {
  draft?: {
    title?: string;
    article?: CaseFile["article"];
    eventType?: CaseEventType;
    claims?: Claim[];
    place?: CaseIncident["place"];
    occurredAt?: string | null;
    occurredAtSource?: CaseIncident["occurredAtSource"];
    incident?: CaseIncident;
  };
  caseFile?: Partial<CaseFile> & {
    article: CaseFile["article"];
    eventType: CaseEventType;
    claims: Claim[];
  };
};

/**
 * POST /api/cases — 초안/사건 스냅샷을 rev=1로 저장.
 * Authorization: Bearer CASE_EDITOR_SECRET
 */
export async function POST(request: Request) {
  if (!authorizeCaseEditor(request)) {
    return unauthorizedResponse();
  }

  let body: CreateBody = {};
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json(
      { error: "invalid JSON" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  let input: Omit<CaseFile, "id" | "rev" | "verdict"> &
    Partial<Pick<CaseFile, "id" | "verdict" | "title">>;

  if (body.caseFile?.article && body.caseFile.eventType && body.caseFile.claims) {
    input = refreshCaseVerdicts({
      id: body.caseFile.id ?? "pending",
      title: body.caseFile.title,
      article: body.caseFile.article,
      eventType: body.caseFile.eventType,
      incident: parseIncident(body.caseFile.incident),
      claims: body.caseFile.claims,
      verdict: "unconfirmed",
      rev: 0,
    });
  } else if (body.draft?.article && body.draft.eventType && body.draft.claims) {
    const incident =
      body.draft.incident != null
        ? parseIncident(body.draft.incident)
        : {
            place: body.draft.place ?? null,
            occurredAt: body.draft.occurredAt ?? null,
            occurredAtSource: body.draft.occurredAtSource ?? "none",
          };
    input = draftToCaseFileInput({
      title: body.draft.title || "제목 없는 사건",
      article: body.draft.article,
      eventType: body.draft.eventType,
      place: incident.place,
      occurredAt: incident.occurredAt,
      occurredAtSource: incident.occurredAtSource,
      category: null,
      claims: body.draft.claims,
      extract: {
        text: body.draft.article.text,
        title: body.draft.title ?? null,
        outlet: body.draft.article.outlet ?? null,
        publishedAt: body.draft.article.publishedAt ?? null,
        url: body.draft.article.url,
      },
      notes: [],
    });
  } else {
    return NextResponse.json(
      { error: "draft 또는 caseFile(article, eventType, claims)이 필요합니다" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const db = await getDb();
    const { caseFile, sanitizeNotes } = await createCaseFile(db, input);
    return NextResponse.json(
      { caseFile, sanitizeNotes, fetchedAt: new Date().toISOString() },
      { status: 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "create failed";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
