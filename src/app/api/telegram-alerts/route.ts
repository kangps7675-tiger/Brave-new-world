import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  getTelegramAlertStore,
  hydrateTelegramAlerts,
  replaceTelegramAlerts,
} from "@/lib/telegramAlertStore";
import type { TelegramAlert, TelegramAlertsPayload } from "@/lib/telegramAlerts";
import { translateTelegramAlerts } from "@/lib/telegramTranslate";
import { isTelegramOsintEnabled } from "@/lib/serverEnv";
import { readTelegramAlertsFromD1 } from "@/lib/d1LiveSnapshots";
import {
  CDN_CACHE,
  NO_STORE_HEADERS,
  publicCacheHeaders,
} from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TG_CDN = publicCacheHeaders(CDN_CACHE.telegram);

const LIVE_FILE = path.join(process.cwd(), "public", "data", "live", "telegram-alerts.json");
const SEED_FILE = path.join(process.cwd(), "public", "data", "telegram-alerts-seed.json");

const DEFAULT_INGEST_URL = "https://conflict-view-ingest.kangps7675.workers.dev";

function telegramOsintEnabled(): boolean {
  return isTelegramOsintEnabled();
}

function seedAllowed(): boolean {
  return process.env.TELEGRAM_USE_SEED === "true";
}

/**
 * Cloudflare cron 워커의 공개 `/telegram` 엔드포인트에서 공유 속보를 읽는다.
 * Vercel 등 D1 바인딩이 없는 호스팅에서도 방문자 모두 같은 피드를 본다.
 */
async function readSharedAlerts(): Promise<TelegramAlert[] | null> {
  // 1) Cloudflare(OpenNext)면 D1 바인딩으로 직접 읽기
  const fromD1 = await readTelegramAlertsFromD1(200);
  if (fromD1 && fromD1.count > 0) return fromD1.alerts;

  // 2) 그 외(Vercel 등)는 워커 HTTP 엔드포인트로 폴백
  const base = (process.env.TELEGRAM_INGEST_URL || DEFAULT_INGEST_URL).trim().replace(/\/$/, "");
  if (!base) return null;
  try {
    const res = await fetch(`${base}/telegram?limit=200`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { alerts?: TelegramAlert[] };
    if (!Array.isArray(payload.alerts) || payload.alerts.length === 0) return null;
    return payload.alerts;
  } catch {
    return null;
  }
}

function readLivePayload(): TelegramAlertsPayload | null {
  if (!fs.existsSync(LIVE_FILE)) return null;
  try {
    const raw = fs.readFileSync(LIVE_FILE, "utf8");
    const payload = JSON.parse(raw) as TelegramAlertsPayload;
    if (!Array.isArray(payload.alerts) || payload.alerts.length === 0) return null;
    return {
      fetchedAt: payload.fetchedAt || new Date().toISOString(),
      live: true,
      alerts: payload.alerts,
    };
  } catch {
    return null;
  }
}

function readSeedPayload(): TelegramAlertsPayload {
  if (!fs.existsSync(SEED_FILE)) {
    return { fetchedAt: new Date().toISOString(), live: false, alerts: [], stub: true };
  }
  const raw = fs.readFileSync(SEED_FILE, "utf8");
  return JSON.parse(raw) as TelegramAlertsPayload;
}

export async function GET() {
  const livePayload = readLivePayload();
  if (livePayload) {
    replaceTelegramAlerts(livePayload.alerts, livePayload.fetchedAt);
  } else {
    const { alerts } = getTelegramAlertStore();
    if (alerts.length === 0) {
      hydrateTelegramAlerts(readLivePayload()?.alerts ?? []);
    }
  }

  const store = getTelegramAlertStore();
  if (store.alerts.length > 0) {
    const alerts = await translateTelegramAlerts(store.alerts);
    return NextResponse.json(
      {
        fetchedAt: store.lastIngestAt ?? new Date().toISOString(),
        live: true,
        alerts,
      } satisfies TelegramAlertsPayload,
      { headers: TG_CDN },
    );
  }

  // 공유 소스 (D1 / cron 워커) — 배포 환경에서 방문자 공통 피드
  const shared = await readSharedAlerts();
  if (shared && shared.length > 0) {
    replaceTelegramAlerts(shared);
    const alerts = await translateTelegramAlerts(shared);
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        live: true,
        alerts,
        source: "embed",
      } satisfies TelegramAlertsPayload,
      { headers: TG_CDN },
    );
  }

  if (telegramOsintEnabled() && !seedAllowed()) {
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        live: false,
        alerts: [],
        waiting: true,
      } satisfies TelegramAlertsPayload & { waiting?: boolean },
      { headers: NO_STORE_HEADERS },
    );
  }

  const seedPayload = readSeedPayload();
  const alerts = await translateTelegramAlerts(seedPayload.alerts);
  return NextResponse.json({ ...seedPayload, alerts }, { headers: TG_CDN });
}
