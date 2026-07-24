/**
 * 브라우저 Web Push 구독 — VAPID public + SW PushManager.
 * 권한 요청은 호출 측에서 보수적으로 (설치 후·standalone·이미 granted).
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function vapidPublicKey(): string | null {
  const key = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
  return key || null;
}

export type PushSubscribeResult =
  | { ok: true; endpoint: string }
  | { ok: false; reason: "unsupported" | "no-key" | "denied" | "sw" | "network" };

/** Notification 권한 확보 후 PushSubscription을 서버에 저장 */
export async function ensurePushSubscription(options?: {
  lang?: string;
  /** true면 permission이 default일 때 requestPermission 호출 */
  requestIfNeeded?: boolean;
}): Promise<PushSubscribeResult> {
  if (typeof window === "undefined") return { ok: false, reason: "unsupported" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { ok: false, reason: "unsupported" };
  }

  const publicKey = vapidPublicKey();
  if (!publicKey) return { ok: false, reason: "no-key" };

  let permission = Notification.permission;
  if (permission === "default" && options?.requestIfNeeded) {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return { ok: false, reason: "denied" };

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: "sw" };
    }

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        lang: options?.lang,
      }),
    });
    if (!res.ok) return { ok: false, reason: "network" };
    return { ok: true, endpoint: json.endpoint };
  } catch {
    return { ok: false, reason: "sw" };
  }
}
