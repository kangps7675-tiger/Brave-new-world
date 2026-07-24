import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { uiEvents } from "@/db/schema";
import { ingestWorkerBase } from "@/lib/d1LiveSnapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 허용 이벤트 화이트리스트 — 임의 문자열 적재 방지 */
const ALLOWED_EVENTS = new Set([
  "share_view_click",
  "share_view_success",
  "friction_card_share_click",
  "friction_card_share_success",
  "daily_rank_card_share_click",
  "daily_rank_card_share_success",
  "daily_predict_submit",
  "daily_predict_change",
  "mobile_home_view_toggle",
  "pwa_prompt_shown",
  "pwa_prompt_accept",
  "pwa_prompt_dismiss",
  "pwa_installed",
  "push_subscribed",
  "push_subscribe_denied",
]);

const trackBodySchema = z.object({
  event: z.string().min(1).max(64),
  meta: z.record(z.string(), z.unknown()).optional(),
  viewerMode: z.string().max(32).optional(),
  lang: z.string().max(8).optional(),
});

type TrackPayload = {
  event: string;
  meta?: Record<string, unknown>;
  viewerMode?: string;
  lang?: string;
};

/** Cloudflare Pages 등 D1 바인딩이 실제로 있는 호스팅에서만 성공 — 이 배포(Vercel)는 항상 실패 후 폴백 */
async function insertViaD1Binding(payload: TrackPayload): Promise<boolean> {
  try {
    const db = await getDb();
    await db.insert(uiEvents).values({
      event: payload.event,
      metaJson: payload.meta ? JSON.stringify(payload.meta) : null,
      viewerMode: payload.viewerMode ?? null,
      lang: payload.lang ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

/** Vercel(D1 바인딩 없음) — cron 워커의 POST /track 으로 전달해 D1에 적재 */
async function insertViaIngestWorker(payload: TrackPayload): Promise<boolean> {
  const base = ingestWorkerBase();
  if (!base) return false;
  try {
    const secret = process.env.INGEST_CRON_SECRET?.trim();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers.Authorization = `Bearer ${secret}`;
    const res = await fetch(`${base}/track`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 경량 UI 이벤트 로거 — 공유 버튼 등 바이럴 기능의 실제 채택률 확인용.
 * 개인식별 정보(세션/유저 id, IP 등) 저장하지 않음. 실패해도 클라이언트에 절대 영향 없음.
 *
 * 이 앱은 Vercel에 배포되고 D1은 Cloudflare(별도 cron 워커)가 붙잡고 있어 네이티브 D1
 * 바인딩이 없다 — 그래서 D1 직접 쓰기를 먼저 시도(로컬 wrangler·향후 CF 배포 대비)하고,
 * 실패하면 cron 워커의 POST /track으로 전달해 그쪽 바인딩으로 대신 적재한다.
 *
 * API_STUB_MODE(외부 라이브 API 차단용 플래그)와는 무관하게 동작한다 — 외부 API 호출이
 * 없는 순수 내부 카운팅이라, 유료 증시 API 없이 스텁 모드로 운영하는 동안에도 채택률
 * 데이터는 계속 쌓여야 하기 때문. 로컬 개발 노이즈만 차단한다.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ok: true, dev: true });
  }

  try {
    const raw = await request.json();
    const parsed = trackBodySchema.safeParse(raw);
    if (!parsed.success || !ALLOWED_EVENTS.has(parsed.data.event)) {
      // 잘못된 페이로드도 클라이언트에는 조용히 200 — 트래킹 실패로 UX를 건드리지 않음
      return NextResponse.json({ ok: false });
    }

    const payload: TrackPayload = parsed.data;
    const ok = (await insertViaD1Binding(payload)) || (await insertViaIngestWorker(payload));

    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
