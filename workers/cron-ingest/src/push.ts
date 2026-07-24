/**
 * Web Push — D1 구독 저장 + VAPID 발송 (Cloudflare Workers / Web Crypto)
 */
import {
  buildPushPayload,
  type PushMessage,
  type PushSubscription,
  type VapidKeys,
} from "@block65/webcrypto-web-push";
import type { IngestEnv } from "./env";

export type StoredPushSub = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  lang: string | null;
};

export async function upsertPushSubscription(
  db: D1Database,
  row: {
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
    lang: string | null;
  },
) {
  await db
    .prepare(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent, lang, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(endpoint) DO UPDATE SET
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         user_agent = excluded.user_agent,
         lang = excluded.lang,
         updated_at = datetime('now')`,
    )
    .bind(row.endpoint, row.p256dh, row.auth, row.userAgent, row.lang)
    .run();
}

export async function deletePushSubscription(db: D1Database, endpoint: string) {
  await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(endpoint).run();
}

export async function listPushSubscriptions(
  db: D1Database,
  limit = 500,
): Promise<StoredPushSub[]> {
  const res = await db
    .prepare(
      `SELECT endpoint, p256dh, auth, user_agent, lang
       FROM push_subscriptions
       ORDER BY updated_at DESC
       LIMIT ?`,
    )
    .bind(Math.min(Math.max(limit, 1), 2000))
    .all<StoredPushSub>();
  return res.results ?? [];
}

function vapidFromEnv(env: IngestEnv): VapidKeys | null {
  const privateKey = (env.VAPID_PRIVATE_KEY || "").trim();
  const publicKey = (env.VAPID_PUBLIC_KEY || "").trim();
  const subject = (env.VAPID_SUBJECT || "mailto:kangps7675@gmail.com").trim();
  if (!privateKey || !publicKey) return null;
  return { subject, publicKey, privateKey };
}

export type PushSendResult = {
  ok: boolean;
  attempted: number;
  sent: number;
  gone: number;
  failed: number;
  error?: string;
};

/** 저장된 구독 전체에 동일 알림 발송. 410/404는 구독 삭제. */
export async function broadcastPush(
  env: IngestEnv,
  message: { title: string; body?: string; url?: string; tag?: string },
): Promise<PushSendResult> {
  const vapid = vapidFromEnv(env);
  if (!vapid) {
    return {
      ok: false,
      attempted: 0,
      sent: 0,
      gone: 0,
      failed: 0,
      error: "VAPID keys not configured",
    };
  }

  const rows = await listPushSubscriptions(env.DB);
  const payloadJson = JSON.stringify({
    title: message.title,
    body: message.body || "",
    url: message.url || "/",
    tag: message.tag || "cv-push",
  });

  const pushMessage: PushMessage = {
    data: payloadJson,
    options: { ttl: 60 * 60 * 12, urgency: "normal" },
  };

  let sent = 0;
  let gone = 0;
  let failed = 0;

  for (const row of rows) {
    const subscription: PushSubscription = {
      endpoint: row.endpoint,
      expirationTime: null,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    try {
      const init = await buildPushPayload(pushMessage, subscription, vapid);
      const res = await fetch(row.endpoint, init);
      if (res.status === 201 || res.status === 200) {
        sent += 1;
      } else if (res.status === 404 || res.status === 410) {
        gone += 1;
        await deletePushSubscription(env.DB, row.endpoint);
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return {
    ok: failed === 0 || sent > 0,
    attempted: rows.length,
    sent,
    gone,
    failed,
  };
}
