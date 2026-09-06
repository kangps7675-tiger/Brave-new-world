import { authorizeCronRequest } from "@/lib/auth/cronAuth";
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";
import { refreshCarriersFromUsniNews } from "@/lib/usCarriers/refreshFromNews";
import { loadUsCarrierSnapshot } from "@/lib/usCarriers/snapshotStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const DEFAULT_MIN_INTERVAL_MIN = 360;

function authorize(request: Request): boolean {
  return authorizeCronRequest(request, [
    "INGEST_CRON_SECRET",
    "US_CARRIERS_WARM_SECRET",
    "SHIP_MOVEMENT_WARM_SECRET",
  ]);
}

async function shouldSkipByThrottle(): Promise<boolean> {
  const minMin = Number(
    process.env.US_CARRIERS_POLL_MIN_INTERVAL_MINUTES || DEFAULT_MIN_INTERVAL_MIN,
  );
  if (!Number.isFinite(minMin) || minMin <= 0) return false;
  try {
    const snap = await loadUsCarrierSnapshot();
    if (!snap?.updatedAt) return false;
    const ageMs = Date.now() - Date.parse(snap.updatedAt);
    return Number.isFinite(ageMs) && ageMs < minMin * 60_000;
  } catch {
    return false;
  }
}

/** Cron / 수동 — USNI Fleet Tracker로 미 항모 좌표 스냅샷 갱신 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  const startedAt = new Date().toISOString();

  if (!force && (await shouldSkipByThrottle())) {
    const snap = await loadUsCarrierSnapshot();
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        updatedIds: snap?.updatedIds ?? [],
        carrierCount: snap?.carriers.length ?? 0,
        source: snap?.source ?? null,
        startedAt,
        finishedAt: new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  const result = await refreshCarriersFromUsniNews();
  return NextResponse.json(
    {
      ...result,
      skipped: false,
      startedAt,
      finishedAt: new Date().toISOString(),
    },
    { status: result.ok ? 200 : 500, headers: NO_STORE_HEADERS },
  );
}

export async function GET(request: Request) {
  return POST(request);
}
