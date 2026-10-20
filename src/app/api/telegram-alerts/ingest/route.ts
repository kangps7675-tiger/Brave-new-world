import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getTelegramAlertStore, pushTelegramAlert } from "@/lib/telegramAlertStore";
import { regionForChannel, type TelegramAlert } from "@/lib/telegramAlerts";
import { bearerToken, safeEqual } from "@/lib/auth/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIVE_FILE = path.join(process.cwd(), "public", "data", "live", "telegram-alerts.json");

function persistToFile(alerts: TelegramAlert[]) {
  try {
    fs.mkdirSync(path.dirname(LIVE_FILE), { recursive: true });
    fs.writeFileSync(
      LIVE_FILE,
      JSON.stringify(
        { fetchedAt: new Date().toISOString(), live: true, alerts: alerts.slice(0, 120) },
        null,
        2,
      ),
      "utf8",
    );
  } catch {
    // collector가 동시에 같은 파일을 쓸 수 있음 — 메모리 ingest는 성공으로 처리
  }
}

/**
 * 시크릿 미설정 시 거부(원래부터 fail-closed).
 * `?secret=` 쿼리 폴백은 액세스 로그·Referer 유출 때문에 제거했다 — Bearer 헤더만 허용.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.TELEGRAM_INGEST_SECRET?.trim();
  if (!secret) return false;
  return safeEqual(bearerToken(request), secret);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<TelegramAlert>;
    const username = String(body.channelUsername || "").replace(/^@/, "");
    const text = String(body.text || "").trim();
    if (!username || !text) {
      return NextResponse.json({ error: "channelUsername and text required" }, { status: 400 });
    }

    const alert: TelegramAlert = {
      id: String(body.id || `${username}-${Date.now()}`),
      channelUsername: username,
      channelTitle: String(body.channelTitle || username),
      region: body.region ?? regionForChannel(username),
      text,
      receivedAt: body.receivedAt || new Date().toISOString(),
      messageUrl: body.messageUrl ?? `https://t.me/${username}`,
    };

    pushTelegramAlert(alert);
    persistToFile(getTelegramAlertStore().alerts);
    return NextResponse.json({ ok: true, id: alert.id });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "ingest failed") },
      { status: 500 },
    );
  }
}
