import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { shipMovementObservations } from "@/db/schema";
import {
  shipMovementAdminSecret,
  signAdminToken,
  verifyAdminToken,
} from "@/lib/shipMovements/adminAuth";
import { listReviewQueue } from "@/lib/shipMovements/queries";
import type { ReviewStatus } from "@/lib/shipMovements/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cv_ship_move_admin";
const TTL_MS = 12 * 60 * 60 * 1000;

function readCookie(request: Request): string | undefined {
  const raw = request.headers.get("cookie") || "";
  const hit = raw
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE}=`));
  return hit ? decodeURIComponent(hit.slice(COOKIE.length + 1)) : undefined;
}

function isAuthed(request: Request): boolean {
  const secret = shipMovementAdminSecret();
  if (!secret) return false;
  return verifyAdminToken(readCookie(request), secret);
}

export async function POST(request: Request) {
  const secret = shipMovementAdminSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "SHIP_MOVEMENT_ADMIN_SECRET not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    secret?: string;
    action?: string;
    id?: string;
    reviewStatus?: ReviewStatus;
    reviewNote?: string;
    lat?: number | null;
    lng?: number | null;
    mapEligible?: boolean;
    titleKo?: string;
    titleEn?: string;
    locationLabelKo?: string;
    locationLabelEn?: string;
  } | null;

  if (body?.action === "login") {
    if (!body.secret || body.secret !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const token = signAdminToken(secret, TTL_MS);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(TTL_MS / 1000),
    });
    return res;
  }

  if (!isAuthed(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (body?.action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }

  if (body?.action === "review" && body.id && body.reviewStatus) {
    if (
      body.reviewStatus === "approved" &&
      (!(body.titleKo || "").trim() || !(body.titleEn || "").trim())
    ) {
      return NextResponse.json(
        { error: "titleKo and titleEn required for approval" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const now = new Date().toISOString();
    await db
      .update(shipMovementObservations)
      .set({
        reviewStatus: body.reviewStatus,
        reviewNote: body.reviewNote ?? null,
        reviewedAt: now,
        updatedAt: now,
        ...(body.lat != null ? { lat: body.lat } : {}),
        ...(body.lng != null ? { lng: body.lng } : {}),
        ...(typeof body.mapEligible === "boolean"
          ? { mapEligible: body.mapEligible ? 1 : 0 }
          : {}),
        ...(body.titleKo ? { titleKo: body.titleKo } : {}),
        ...(body.titleEn ? { titleEn: body.titleEn } : {}),
        ...(body.locationLabelKo != null
          ? { locationLabelKo: body.locationLabelKo }
          : {}),
        ...(body.locationLabelEn != null
          ? { locationLabelEn: body.locationLabelEn }
          : {}),
      })
      .where(eq(shipMovementObservations.id, body.id));

    return NextResponse.json({ ok: true, id: body.id, reviewStatus: body.reviewStatus });
  }

  return NextResponse.json({ error: "bad request" }, { status: 400 });
}

export async function GET(request: Request) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: "unauthorized", authed: false }, { status: 401 });
  }

  const status = (new URL(request.url).searchParams.get("status") ||
    "pending") as ReviewStatus;
  try {
    const db = await getDb();
    const items = await listReviewQueue(db, { status, limit: 150 });
    return NextResponse.json({
      ok: true,
      authed: true,
      items,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        authed: true,
        items: [],
        error: error instanceof Error ? error.message : "query failed",
      },
      { status: 500 },
    );
  }
}
