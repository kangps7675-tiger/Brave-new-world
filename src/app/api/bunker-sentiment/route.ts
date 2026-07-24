import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStubResponse } from "@/lib/apiStub";
import { parseSearchParams } from "@/lib/apiQuerySchemas";
import {
  readBunkerSentiment,
  upsertBunkerSentiment,
  type BunkerPick,
} from "@/lib/bunkerSentiment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  deviceId: z.string().min(8).max(80).optional(),
});

const bodySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  deviceId: z.string().min(8).max(80),
  pick: z.enum(["stable", "bunker"]),
});

/** GET — 오늘 패닉 지수 집계 (+ optional myPick) */
export async function GET(request: Request) {
  const stub = apiStubResponse("bunker-sentiment", request);
  if (stub) return stub;

  const { searchParams } = new URL(request.url);
  const parsed = parseSearchParams(searchParams, querySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues },
      { status: 400 },
    );
  }

  const snap = await readBunkerSentiment({
    date: parsed.data.date,
    deviceId: parsed.data.deviceId,
  });
  return NextResponse.json(snap, {
    headers: { "Cache-Control": "no-store" },
  });
}

/** POST — STABLE | BUNKER upsert */
export async function POST(request: Request) {
  const stub = apiStubResponse("bunker-sentiment", request);
  if (stub) return stub;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const snap = await upsertBunkerSentiment({
    date: parsed.data.date,
    deviceId: parsed.data.deviceId,
    pick: parsed.data.pick as BunkerPick,
  });
  return NextResponse.json({ ok: true, ...snap }, {
    headers: { "Cache-Control": "no-store" },
  });
}
