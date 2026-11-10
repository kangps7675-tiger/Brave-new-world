import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceIpRateLimit, RATE_PRESETS } from "@/lib/apiRateLimit";
import {
  isNewsReaction,
  readNewsReactions,
  toggleNewsReaction,
  NEWS_REACTIONS,
} from "@/lib/newsArticleReactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  ids: z.string().min(4).max(4000),
  deviceId: z.string().min(8).max(80).optional(),
});

const bodySchema = z.object({
  articleId: z.string().min(4).max(80),
  deviceId: z.string().min(8).max(80),
  reaction: z.enum(NEWS_REACTIONS),
});

export async function GET(request: Request) {
  const limited = enforceIpRateLimit(request, RATE_PRESETS.newsReaction);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    ids: searchParams.get("ids") ?? "",
    deviceId: searchParams.get("deviceId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }
  const snap = await readNewsReactions({
    articleIds: parsed.data.ids.split(","),
    deviceId: parsed.data.deviceId,
  });
  return NextResponse.json(snap, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const limited = enforceIpRateLimit(request, RATE_PRESETS.newsReaction);
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success || !isNewsReaction(parsed.data.reaction)) {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  try {
    const snap = await toggleNewsReaction(parsed.data);
    if (!snap) return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
    return NextResponse.json({ ok: true, ...snap }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
