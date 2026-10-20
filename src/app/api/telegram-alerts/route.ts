import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  getTelegramAlertStore,
  hydrateTelegramAlerts,
  replaceTelegramAlerts,
} from "@/lib/telegramAlertStore";
import type { TelegramAlert, TelegramAlertsPayload } from "@/lib/telegramAlerts";
import { toPublicTelegramAlerts } from "@/lib/telegramPublicAlert";
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

/** 워커 /telegram 은 cold start·D1 read 로 8s 를 넘기는 경우가 많다 */
const TELEGRAM_INGEST_FETCH_MS = 45_000;

function telegramOsintEnabled(): boolean {
  return isTelegramOsintEnabled();
}

function seedAllowed(): boolean {
  return process.env.TELEGRAM_USE_SEED === "true";
}

function publicPayload(
  alerts: TelegramAlert[],
  extra: Partial<TelegramAlertsPayload> = {},
): TelegramAlertsPayload {
  return {
    fetchedAt: new Date().toISOString(),
    live: false,
    ...extra,
    alerts: toPublicTelegramAlerts(alerts),
  };
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
      signal: AbortSignal.timeout(TELEGRAM_INGEST_FETCH_MS),
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

/** 로컬 live JSON이 오래되면 cron/D1 공유 피드를 막지 않도록 */
const LOCAL_LIVE_STALE_MS = 2 * 60 * 60 * 1000;

function isFetchedAtStale(fetchedAt: string | null | undefined): boolean {
  if (!fetchedAt) return true;
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > LOCAL_LIVE_STALE_MS;
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
  const localFresh = store.alerts.length > 0 && !isFetchedAtStale(store.lastIngestAt);

  // 신선한 로컬 캐시만 즉시 반환. 오래된 public/data/live 스냅샷은 cron 피드를 가리지 않는다.
  if (localFresh) {
    return NextResponse.json(
      publicPayload(store.alerts, {
        fetchedAt: store.lastIngestAt ?? new Date().toISOString(),
        live: true,
      }),
      { headers: TG_CDN },
    );
  }

  // 공유 소스 (D1 / cron 워커) — 배포·로컬 모두 최신 공통 피드
  const shared = await readSharedAlerts();
  if (shared && shared.length > 0) {
    // 워커가 이미 text="" 일 수 있음 — D1 직접 읽기면 전문 있음 → 공개 시 제거
    replaceTelegramAlerts(shared);
    return NextResponse.json(
      publicPayload(shared, {
        live: true,
        source: "embed",
      }),
      { headers: TG_CDN },
    );
  }

  // 공유 실패 시에만 stale 로컬로 폴백 (빈 화면·영구 대기 방지)
  if (store.alerts.length > 0) {
    return NextResponse.json(
      publicPayload(store.alerts, {
        fetchedAt: store.lastIngestAt ?? new Date().toISOString(),
        live: true,
        source: "stale-local",
      }),
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
  return NextResponse.json(
    publicPayload(seedPayload.alerts, {
      fetchedAt: seedPayload.fetchedAt,
      live: seedPayload.live,
      stub: seedPayload.stub,
    }),
    { headers: TG_CDN },
  );
}
