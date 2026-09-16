/**
 * Next.js(Node)에서 로컬/원격 D1에 붙을 때 사용.
 * - Cloudflare(OpenNext): getCloudflareContext → env.DB
 * - Vercel 등 Workers 바인딩이 없는 런타임: D1 REST API (CLOUDFLARE_ACCOUNT_ID /
 *   CLOUDFLARE_D1_DATABASE_ID / CLOUDFLARE_D1_API_TOKEN 세 개가 전부 있을 때만)
 * - 로컬 next dev: wrangler getPlatformProxy → env.DB
 *
 * wrangler CLI는 production OpenNext 번들에 넣으면 deploy가 깨지므로
 * NODE_ENV=production에서는 wranglerProxy 모듈을 로드하지 않는다.
 *
 * API 라우트 예:
 *   const db = await getDb();
 *   await db.select().from(firmsFires).limit(50);
 */
import { createDb, type AppDb } from "@/db/client";
import { createD1HttpClient } from "@/db/d1Http";

let cached: { db: AppDb; dispose: () => void } | null = null;

type D1Like = import("@cloudflare/workers-types").D1Database;

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
 * Vercel 같은 비-Workers 런타임용 폴백. 세 env var가 전부 있어야만 켜진다 —
 * 하나라도 없으면 조용히 null을 리턴해서 기존 경로(로컬 wrangler proxy 등)로
 * 넘어가게 한다.
 */
function tryHttpD1(): D1Like | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN?.trim();
  if (!accountId || !databaseId || !apiToken) return null;
  return createD1HttpClient({ accountId, databaseId, apiToken }) as unknown as D1Like;
}

export async function getDb(options?: { persist?: boolean }): Promise<AppDb> {
  if (cached?.db) return cached.db;

  const openNextD1 = await tryOpenNextD1();
  if (openNextD1) {
    const db = createDb(openNextD1);
    cached = {
      db,
      dispose: () => {
        cached = null;
      },
    };
    return db;
  }

  const httpD1 = tryHttpD1();
  if (httpD1) {
    const db = createDb(httpD1);
    cached = {
      db,
      dispose: () => {
        cached = null;
      },
    };
    return db;
  }

  // OpenNext esbuild defines NODE_ENV=production → this branch is dropped from Workers bundles.
  if (process.env.NODE_ENV !== "production") {
    const { tryWranglerProxyD1 } = await import("./wranglerProxy");
    const proxy = await tryWranglerProxyD1(options?.persist ?? true);
    if (proxy) {
      const db = createDb(proxy.d1);
      cached = {
        db,
        dispose: () => {
          proxy.dispose();
          cached = null;
        },
      };
      return db;
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
