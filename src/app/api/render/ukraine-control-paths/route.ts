import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { loadViinaRenderData } from "@/lib/viinaServerData";
import { VIINA_POLICY } from "@/lib/licensing/viinaPolicy";
import {
  assertViinaRenderAccess,
  isViinaCronAuthorized,
} from "@/lib/licensing/viinaRenderGate";
import {
  filterHatchPathsByView,
  precomputeUkraineHatchPaths,
  type UkraineHatchLod,
} from "@/lib/ukraineHatchPrecompute";
import {
  loadUkraineHatchCache,
  saveUkraineHatchCache,
} from "@/lib/ukraineHatchServerData";
import {
  readUkraineHatchFromD1,
  writeUkraineHatchToD1,
} from "@/lib/ukraineHatchD1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function parseLod(raw: string | null): UkraineHatchLod {
  return raw === "overview" ? "overview" : "detail";
}

function authorizeWarm(request: Request): boolean {
  const secret =
    process.env.INGEST_CRON_SECRET?.trim() || process.env.NEWS_WARM_SECRET?.trim();
  // 시크릿이 없으면 프로덕션에서 오픈 워밍 금지 — 로컬만 허용
  if (!secret) return process.env.NODE_ENV !== "production";
  return isViinaCronAuthorized(request);
}

function splitZones(features: NonNullable<ReturnType<typeof loadViinaRenderData>>["features"]) {
  const ru = features.filter((z) => z.controlStatus === "RU");
  const ua = features.filter((z) => z.controlStatus === "UA");
  const contested = features.filter((z) => z.controlStatus === "CONTESTED");
  return { ru, ua, contested };
}

async function ensureHatchPayload(lod: UkraineHatchLod) {
  // 클라우드 스냅샷 우선 (D1) — Workers/프로덕션에서 파일 캐시가 없을 때
  try {
    const db = await getDb();
    const fromD1 = await readUkraineHatchFromD1(db, lod);
    if (fromD1?.paths?.length) {
      return { payload: fromD1, source: "d1" as const };
    }
  } catch {
    // D1/proxy 미가용
  }

  const fileCache = loadUkraineHatchCache(lod);
  if (fileCache?.paths?.length) {
    try {
      const db = await getDb();
      await writeUkraineHatchToD1(db, fileCache);
    } catch {
      // best-effort sync
    }
    return { payload: fileCache, source: "file" as const };
  }

  const viina = loadViinaRenderData();
  if (!viina?.features?.length) {
    return null;
  }

  const zones =
    lod === "overview" && viina.overviewFeatures?.length
      ? viina.overviewFeatures
      : viina.features;
  const { ru, ua, contested } = splitZones(zones);
  const payload = precomputeUkraineHatchPaths(
    ru,
    ua,
    contested,
    lod,
    viina.controlDate || "",
  );
  saveUkraineHatchCache(payload);

  try {
    const db = await getDb();
    await writeUkraineHatchToD1(db, payload);
  } catch {
    // D1 동기화 실패해도 파일 캐시로 응답 가능
  }

  return { payload, source: "precompute" as const };
}

/**
 * 사전계산된 우크라 점령/주장 빗금·테두리.
 * 클라이언트는 geometry hatch 생성 없이 이 path만 그린다.
 */
export async function GET(request: Request) {
  if (!VIINA_POLICY.renderingOnly) {
    return NextResponse.json({ error: "viina-rendering-disabled" }, { status: 404 });
  }

  const gate = assertViinaRenderAccess(request);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const lod = parseLod(searchParams.get("lod"));
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Math.min(20, Math.max(2, Number(searchParams.get("radius") || 8)));
  // bulk 덤프 완화 — 뷰포트 없으면 상한 더 낮춤
  const hasView = Number.isFinite(lat) && Number.isFinite(lng);
  const max = Math.min(
    hasView ? 4000 : 1500,
    Math.max(200, Number(searchParams.get("max") || (hasView ? 4000 : 1500))),
  );

  try {
    const ensured = await ensureHatchPayload(lod);
    if (!ensured) {
      return NextResponse.json(
        {
          error: "ukraine-hatch-cache-missing",
          hint: "Run: npm run viina:build && npm run ukraine:hatch:build",
        },
        { status: 404 },
      );
    }

    let paths = ensured.payload.paths;
    if (hasView) {
      paths = filterHatchPathsByView(paths, { lat, lng }, radius, max);
    } else if (paths.length > max) {
      paths = paths.slice(0, max);
    }

    return NextResponse.json(
      {
        generatedAt: ensured.payload.generatedAt,
        controlDate: ensured.payload.controlDate,
        lodTier: lod,
        pathCount: paths.length,
        totalPathCount: ensured.payload.pathCount,
        source: ensured.source,
        paths,
        attribution: "VIINA (rendering-only produced work)",
        exportForbidden: true,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Viina-Policy": "rendering-only",
          "X-Hatch-Source": ensured.source,
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "ukraine-hatch-failed",
      },
      { status: 502 },
    );
  }
}

/** Cron / 강제 재빌드 — VIINA 캐시가 있는 환경에서만 성공 */
export async function POST(request: Request) {
  if (!authorizeWarm(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!VIINA_POLICY.renderingOnly) {
    return NextResponse.json({ error: "viina-rendering-disabled" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const lod = parseLod(searchParams.get("lod"));
  const viina = loadViinaRenderData();
  if (!viina?.features?.length) {
    return NextResponse.json({ error: "viina-render-cache-missing" }, { status: 404 });
  }

  const zones =
    lod === "overview" && viina.overviewFeatures?.length
      ? viina.overviewFeatures
      : viina.features;
  const { ru, ua, contested } = splitZones(zones);
  const payload = precomputeUkraineHatchPaths(
    ru,
    ua,
    contested,
    lod,
    viina.controlDate || "",
  );
  const filePath = saveUkraineHatchCache(payload);

  let d1: { written: number; total: number } | null = null;
  try {
    const db = await getDb();
    d1 = await writeUkraineHatchToD1(db, payload);
  } catch (error) {
    d1 = null;
    console.warn(
      "[ukraine-hatch] D1 sync skipped:",
      error instanceof Error ? error.message : error,
    );
  }

  return NextResponse.json({
    ok: true,
    lodTier: lod,
    pathCount: payload.pathCount,
    filePath,
    d1,
  });
}
