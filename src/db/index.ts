/**
 * Next.js(Node)에서 로컬/원격 D1에 붙을 때 사용.
 * - Cloudflare Workers(OpenNext production): getCloudflareContext → env.DB
 * - next dev / Vercel 등: D1 REST API (CLOUDFLARE_ACCOUNT_ID /
 *   CLOUDFLARE_D1_DATABASE_ID / CLOUDFLARE_D1_API_TOKEN 세 개가 전부 있을 때)
 * - 로컬 전용 폴백: wrangler getPlatformProxy → env.DB (+ occupied 테이블 ensure)
 *
 * 중요: next dev에서 OpenNext/로컬 바인딩이 먼저 잡히면 마이그레이션이 빠진
 * 빈 D1을 캐시해 LiveUA 통제면 쿼리가 `no such table`로 실패한다.
 * 개발·비-Workers에서는 HTTP D1 자격 증명이 있으면 그걸 우선한다.
 *
 * wrangler CLI는 production OpenNext 번들에 넣으면 deploy가 깨지므로
 * NODE_ENV=production에서는 wranglerProxy 모듈을 로드하지 않는다.
 */
import { createDb, type AppDb } from "@/db/client";
import { createD1HttpClient } from "@/db/d1Http";

let cached: { db: AppDb; dispose: () => void } | null = null;

type D1Like = import("@cloudflare/workers-types").D1Database;

const OCCUPIED_SNAPSHOTS_DDL = `CREATE TABLE IF NOT EXISTS deepstate_occupied_snapshots (
  cache_key text PRIMARY KEY NOT NULL,
  payload_json text NOT NULL,
  feature_count integer DEFAULT 0 NOT NULL,
  fetched_at text NOT NULL,
  source text,
  deepstate_id integer,
  ingested_at text DEFAULT (datetime('now')) NOT NULL
)`;

async function ensureOccupiedSnapshotsTable(d1: D1Like): Promise<void> {
  try {
    await d1.prepare(OCCUPIED_SNAPSHOTS_DDL).run();
  } catch {
    // HTTP/권한/구버전 바인딩 — 호출측이 쿼리 실패를 처리
  }
}

function cacheDb(db: AppDb, dispose: () => void = () => { cached = null; }): AppDb {
  cached = {
    db,
    dispose: () => {
      dispose();
      cached = null;
    },
  };
  return db;
}

async function tryOpenNextD1(): Promise<D1Like | null> {
  try {
    const specifier = "@opennextjs/cloudflare";
    const mod = (await import(/* webpackIgnore: true */ specifier)) as {
      getCloudflareContext?: () => Promise<{ env?: { DB?: D1Like } }>;
    };
    const ctx = await mod.getCloudflareContext?.();
    return ctx?.env?.DB ?? null;
  } catch {
    return null;
  }
}

/**
 * Vercel·next dev용 HTTP 폴백. 세 env var가 전부 있어야만 켜진다.
 */
function tryHttpD1(): D1Like | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN?.trim();
  if (!accountId || !databaseId || !apiToken) return null;
  return createD1HttpClient({ accountId, databaseId, apiToken }) as unknown as D1Like;
}

function preferHttpD1First(): boolean {
  // Workers 프로덕션은 바인딩이 맞고 빠르다. 그 외(next dev 포함)는
  // 마이그레이션된 원격 D1을 HTTP로 우선한다.
  if (process.env.D1_PREFER_HTTP === "1") return true;
  if (process.env.D1_PREFER_HTTP === "0") return false;
  return process.env.NODE_ENV !== "production";
}

export async function getDb(options?: { persist?: boolean }): Promise<AppDb> {
  if (cached?.db) return cached.db;

  const httpFirst = preferHttpD1First();

  if (httpFirst) {
    const httpD1 = tryHttpD1();
    if (httpD1) {
      await ensureOccupiedSnapshotsTable(httpD1);
      return cacheDb(createDb(httpD1));
    }
  }

  const openNextD1 = await tryOpenNextD1();
  if (openNextD1) {
    await ensureOccupiedSnapshotsTable(openNextD1);
    return cacheDb(createDb(openNextD1));
  }

  if (!httpFirst) {
    const httpD1 = tryHttpD1();
    if (httpD1) {
      await ensureOccupiedSnapshotsTable(httpD1);
      return cacheDb(createDb(httpD1));
    }
  }

  // OpenNext esbuild defines NODE_ENV=production → this branch is dropped from Workers bundles.
  if (process.env.NODE_ENV !== "production") {
    const { tryWranglerProxyD1 } = await import("./wranglerProxy");
    const proxy = await tryWranglerProxyD1(options?.persist ?? true);
    if (proxy) {
      await ensureOccupiedSnapshotsTable(proxy.d1);
      return cacheDb(createDb(proxy.d1), () => {
        proxy.dispose();
      });
    }
  }

  throw new Error(
    'D1 binding DB not found. Check wrangler.ingest.toml [[d1_databases]] binding = "DB", deploy with OpenNext Cloudflare, or set CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_DATABASE_ID / CLOUDFLARE_D1_API_TOKEN for the HTTP fallback.',
  );
}

export async function disposeDb() {
  if (cached) {
    cached.dispose();
    cached = null;
  }
}
