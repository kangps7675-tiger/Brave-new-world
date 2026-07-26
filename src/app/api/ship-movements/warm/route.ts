import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { shipMovementReports } from "@/db/schema";
import { upsertShipMovementsFromSources } from "@/lib/shipMovements/persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_MIN_INTERVAL_MIN = 360;

function authorize(request: Request): boolean {
  const secret =
    process.env.INGEST_CRON_SECRET?.trim() ||
    process.env.SHIP_MOVEMENT_WARM_SECRET?.trim();
  if (!secret) return true;
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = new URL(request.url).searchParams.get("secret") || "";
  return bearer === secret || query === secret;
}

async function shouldSkipByThrottle(): Promise<boolean> {
  const minMin = Number(
    process.env.SHIP_MOVEMENT_POLL_MIN_INTERVAL_MINUTES || DEFAULT_MIN_INTERVAL_MIN,
  );
  if (!Number.isFinite(minMin) || minMin <= 0) return false;
  try {
    const db = await getDb();
    const rows = await db
      .select({ ingestedAt: shipMovementReports.ingestedAt })
      .from(shipMovementReports)
      .orderBy(desc(shipMovementReports.ingestedAt))
      .limit(1);
    const last = rows[0]?.ingestedAt;
    if (!last) return false;
    const ageMs = Date.now() - Date.parse(last);
    return Number.isFinite(ageMs) && ageMs < minMin * 60_000;
  } catch {
    return false;
  }
}

/** Cron / 수동 — USNI·JSO 수집 후 D1 pending upsert */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  const startedAt = new Date().toISOString();

  if (!force && (await shouldSkipByThrottle())) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reports: 0,
      observations: 0,
      startedAt,
      finishedAt: new Date().toISOString(),
    });
  }

  const result = await upsertShipMovementsFromSources();
  return NextResponse.json(
    {
      ...result,
      skipped: false,
      startedAt,
      finishedAt: new Date().toISOString(),
    },
    { status: result.ok ? 200 : 500 },
  );
}

export async function GET(request: Request) {
  return POST(request);
}
