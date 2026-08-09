import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getTelegramAlertStore } from "@/lib/telegramAlertStore";
import { TELEGRAM_CHANNEL_COUNT, TELEGRAM_CATALOG_NOTE } from "@/lib/telegramAlerts";
import { isTelegramEmbedEnabled } from "@/lib/telegramEmbedScrape";
import { readTelegramAlertsFromD1 } from "@/lib/d1LiveSnapshots";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_FILE = path.join(
  process.cwd(),
  "scripts",
  "telegram-osint",
  ".session",
  "osint_command_center.session",
);
const LIVE_FILE = path.join(process.cwd(), "public", "data", "live", "telegram-alerts.json");

export async function GET() {
  const embedMode = isTelegramEmbedEnabled();
  const sessionExists = fs.existsSync(SESSION_FILE);
  let alertCount = getTelegramAlertStore().alerts.length;

  if (alertCount === 0 && fs.existsSync(LIVE_FILE)) {
    try {
      const payload = JSON.parse(fs.readFileSync(LIVE_FILE, "utf8")) as { alerts?: unknown[] };
      alertCount = payload.alerts?.length ?? 0;
    } catch {
      alertCount = 0;
    }
  }

  // 배포 환경: 로컬 파일이 없으면 공유 D1 속보 수를 반영
  if (alertCount === 0) {
    const fromD1 = await readTelegramAlertsFromD1(200);
    if (fromD1) alertCount = fromD1.count;
  }

  return NextResponse.json({
    embedMode,
    sessionExists,
    alertCount,
    channelCount: TELEGRAM_CHANNEL_COUNT,
    catalogNote: TELEGRAM_CATALOG_NOTE,
    needsAuth: embedMode ? false : !sessionExists,
    collectorHint: embedMode
      ? "POST /api/telegram-alerts/sync (public embed, no login)"
      : sessionExists
        ? "python scripts/telegram-osint/collector.py"
        : "python scripts/telegram-osint/auth.py",
  }, { headers: NO_STORE_HEADERS });
}
