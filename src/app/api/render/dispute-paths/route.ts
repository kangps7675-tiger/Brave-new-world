import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { authorizeCronRequest } from "@/lib/auth/cronAuth";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  precomputeDisputeHatchPaths,
  type DisputeHatchLod,
} from "@/lib/disputeHatchPrecompute";
import {
  readDisputeHatchFromD1,
  writeDisputeHatchToD1,
} from "@/lib/disputeHatchD1";
import {
  loadDisputeHatchCache,
  saveDisputeHatchCache,
} from "@/lib/disputeHatchServerData";
import { loadServerDisputes } from "@/lib/serverDisputes";
import { filterHatchPathsByView } from "@/lib/ukraineHatchPrecompute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseLod(raw: string | null): DisputeHatchLod {
  return raw === "overview" ? "overview" : "detail";
}

function authorizeWarm(request: Request): boolean {
  return authorizeCronRequest(request, ["INGEST_CRON_SECRET", "NEWS_WARM_SECRET"]);
}

/**
 * 클라우드 스냅샷 우선: D1 → 로컬 파일 → (빌드 가능 시) precompute.
 * 이란/중동 IRONSIGHT 시드는 disputes.json 머지에 포함됨.
 */
async function ensurePayload(lod: DisputeHatchLod) {
  try {
    const db = await getDb();
    const fromD1 = await readDisputeHatchFromD1(db, lod);
    if (fromD1?.paths?.length) {
      return { payload: fromD1, source: "d1" as const };
    }
  } catch {
    // D1 미가용
  }

  const cached = loadDisputeHatchCache(lod);
  if (cached?.paths?.length) {
    try {
      const db = await getDb();
      await writeDisputeHatchToD1(db, cached);
    } catch {
      // sync best-effort
    }
    return { payload: cached, source: "file" as const };
  }

  const disputes = await loadServerDisputes();
  if (!disputes.length) return null;

  const payload = precomputeDisputeHatchPaths(disputes, lod);
  saveDisputeHatchCache(payload);
  try {
    const db = await getDb();
    await writeDisputeHatchToD1(db, payload);
  } catch {
    // ok
  }
  return { payload, source: "precompute" as const };
}

/**
 * 분쟁·중동전선 빗금 클라우드 스냅샷.
 * 토글 시 클라가 이 path만 뷰포트 필터한다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lod = parseLod(searchParams.get("lod"));
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Math.min(40, Math.max(2, Number(searchParams.get("radius") || 12)));
  const max = Math.min(6000, Math.max(100, Number(searchParams.get("max") || 2500)));

  try {
    const ensured = await ensurePayload(lod);
    if (!ensured) {
      return NextResponse.json(
        {
          error: "dispute-hatch-empty",
          hint: "Run: npm run dispute:hatch:build",
          paths: [],
          pathCount: 0,
        },
        { status: 404 },
      );
    }

    let paths = ensured.payload.paths;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      paths = filterHatchPathsByView(paths, { lat, lng }, radius, max);
    } else if (paths.length > max) {
      paths = paths.slice(0, max);
    }

    return NextResponse.json(
      {
        generatedAt: ensured.payload.generatedAt,
        lodTier: lod,
        pathCount: paths.length,
        totalPathCount: ensured.payload.pathCount,
        pathDisputeIds: ensured.payload.pathDisputeIds,
        source: ensured.source,
        paths,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=600",
          "X-Hatch-Source": ensured.source,
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: publicErrorMessage(error, "dispute-hatch-failed"),
        paths: [],
      },
      { status: 502 },
    );
  }
}

/** Cron / 수동 재빌드 → 파일 + D1 클라우드 스냅샷 */
export async function POST(request: Request) {
  if (!authorizeWarm(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lod = parseLod(searchParams.get("lod"));
  const disputes = await loadServerDisputes();
  if (!disputes.length) {
    return NextResponse.json({ error: "disputes-missing" }, { status: 404 });
  }
  const payload = precomputeDisputeHatchPaths(disputes, lod);
  const filePath = saveDisputeHatchCache(payload);

  let d1: { written: number; total: number } | null = null;
  try {
    const db = await getDb();
    d1 = await writeDisputeHatchToD1(db, payload);
  } catch (error) {
    console.warn(
      "[dispute-hatch] D1 sync skipped:",
      error instanceof Error ? error.message : error,
    );
  }

  return NextResponse.json({
    ok: true,
    lodTier: lod,
    pathCount: payload.pathCount,
    filePath,
    d1,
    source: "warm",
  });
}
