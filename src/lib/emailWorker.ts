import { ingestWorkerBase } from "@/lib/d1LiveSnapshots";

export type EmailActionState = "confirmed" | "unsubscribed" | "invalid";

/** 워커에 확인·해지를 맡긴다. 토큰은 그대로 전달만 하고 로그에 남기지 않는다. */
export async function emailWorkerAction(
  path: "/email/confirm" | "/email/unsubscribe",
  token: string,
): Promise<EmailActionState> {
  if (!/^[a-f0-9]{64}$/.test(token)) return "invalid";
  const base = ingestWorkerBase();
  if (!base) return "invalid";
  const url = new URL(path, `${base}/`);
  url.searchParams.set("token", token);
  url.searchParams.set("format", "json");
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json().catch(() => null)) as { state?: string } | null;
    if (json?.state === "confirmed" || json?.state === "unsubscribed") return json.state;
  } catch {
    return "invalid";
  }
  return "invalid";
}
