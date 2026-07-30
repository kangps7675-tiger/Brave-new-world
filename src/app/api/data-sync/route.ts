import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { apiStubResponse } from "@/lib/apiStub";
import { authorizeCronRequest } from "@/lib/auth/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const STATUS_PATH = path.join(ROOT, "public", "data", "sync-status.json");
const LOCK_PATH = path.join(ROOT, "public", "data", ".sync.lock");

const STALE_MS = Number(process.env.SYNC_STALE_MS || 6 * 60 * 60 * 1000);
const MIN_INTERVAL_MS = Number(process.env.SYNC_MIN_INTERVAL_MS || 15 * 60 * 1000);

function readStatus() {
  try {
    if (!fs.existsSync(STATUS_PATH)) {
      return {
        running: false,
        lastSuccessAt: null,
        staleMs: STALE_MS,
        source: "never-synced",
      };
    }
    return JSON.parse(fs.readFileSync(STATUS_PATH, "utf8")) as Record<string, unknown>;
  } catch {
    return { running: false, lastSuccessAt: null, error: "status-parse-failed" };
  }
}

function isLockActive() {
  if (!fs.existsSync(LOCK_PATH)) return false;
  const age = Date.now() - fs.statSync(LOCK_PATH).mtimeMs;
  return age < 20 * 60 * 1000;
}

function isStale(status: Record<string, unknown>) {
  const last = status.lastSuccessAt;
  if (typeof last !== "string" || !last) return true;
  const age = Date.now() - new Date(last).getTime();
  return !Number.isFinite(age) || age >= STALE_MS;
}

function tooSoon(status: Record<string, unknown>) {
  const lastStart = status.lastStartAt || status.lastSuccessAt;
  if (typeof lastStart !== "string" || !lastStart) return false;
  const age = Date.now() - new Date(lastStart).getTime();
  return Number.isFinite(age) && age < MIN_INTERVAL_MS;
}

export async function GET() {
  const stub = apiStubResponse("data-sync-get");
  if (stub) return stub;

  const status = readStatus();
  const stale = isStale(status);
  const lock = isLockActive() || status.running === true;
  return NextResponse.json({
    ok: true,
    stale,
    running: lock,
    staleMs: STALE_MS,
    minIntervalMs: MIN_INTERVAL_MS,
    status,
    sources: {
      tensions: "curated regional seeds (re-merged on sync)",
      liveApis: ["GDELT", "ADS-B", "AIS"],
    },
    fetchedAt: new Date().toISOString(),
  });
}

/**
 * Trigger sync pipeline.
 * Query/body:
 *  - force=1
 *  - mode=quick|default|full
 *  - dry=1  → status only, no exec
 */
export async function POST(request: Request) {
  const stub = apiStubResponse("data-sync-post", request);
  if (stub) return stub;

  // 이 라우트는 최대 15분짜리 Node 자식 프로세스를 기동하고 유료 외부 API 쿼터를
  // 소모한다. force=1 은 스테일·최소간격 검사를 모두 우회하므로 무인증 노출 시
  // 자원 고갈 벡터가 된다 → cron 시크릿 게이트 필수 (fail-closed).
  if (!authorizeCronRequest(request, ["INGEST_CRON_SECRET", "DATA_SYNC_SECRET"])) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(request.url);
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const force =
    url.searchParams.get("force") === "1" ||
    body.force === true ||
    body.force === "1";
  const dry = url.searchParams.get("dry") === "1" || body.dry === true;
  const mode =
    (url.searchParams.get("mode") as string) ||
    (typeof body.mode === "string" ? body.mode : "default");

  const status = readStatus();
  const lock = isLockActive() || status.running === true;

  if (lock) {
    return NextResponse.json(
      { ok: false, skipped: true, reason: "already-running", status },
      { status: 409 },
    );
  }

  if (!force && !isStale(status)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "fresh",
      status,
    });
  }

  if (!force && tooSoon(status)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "rate-limited",
      minIntervalMs: MIN_INTERVAL_MS,
      status,
    });
  }

  if (dry) {
    return NextResponse.json({ ok: true, dry: true, wouldRun: true, mode, status });
  }

  // Mark running before spawn so GET/poll clients don't race.
  try {
    fs.mkdirSync(path.dirname(STATUS_PATH), { recursive: true });
    fs.writeFileSync(LOCK_PATH, String(process.pid));
    const started = {
      ...status,
      running: true,
      lastStartAt: new Date().toISOString(),
      mode,
    };
    fs.writeFileSync(STATUS_PATH, JSON.stringify(started, null, 2));
  } catch {
    // ignore pre-write failures; script still writes its own status
  }

  const args = ["scripts/sync-live-data.js"];
  if (force) args.push("--force");
  if (mode === "quick") args.push("--quick");
  if (mode === "full") {
    args.push("--with-gdelt");
  }

  // Fire and forget so HTTP doesn't sit for minutes; client polls GET.
  void execFileAsync(process.execPath, args, {
    cwd: ROOT,
    timeout: 15 * 60 * 1000,
    env: { ...process.env, SYNC_FORCE: force ? "1" : process.env.SYNC_FORCE },
  }).catch((error: Error) => {
    try {
      const prev = readStatus();
      fs.writeFileSync(
        STATUS_PATH,
        JSON.stringify(
          {
            ...prev,
            running: false,
            lastError: error.message,
            lastFailAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
      if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);
    } catch {
      // ignore
    }
  });

  return NextResponse.json({
    ok: true,
    started: true,
    mode,
    message: "sync started — poll GET /api/data-sync",
    status: { ...status, running: true, lastStartAt: new Date().toISOString() },
  });
}
