import { NextResponse } from "next/server";
import { emailWorkerAction } from "@/lib/emailWorker";

export const dynamic = "force-dynamic";

async function clear(request: Request): Promise<"unsubscribed" | "invalid"> {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const state = await emailWorkerAction("/email/unsubscribe", token);
  return state === "unsubscribed" ? "unsubscribed" : "invalid";
}

/** 메일 본문의 수신 해지 링크. */
export async function GET(request: Request) {
  const state = await clear(request);
  const dest = new URL("/email/done", request.url);
  dest.searchParams.set("result", state);
  const res = NextResponse.redirect(dest);
  res.headers.set("referrer-policy", "no-referrer");
  res.headers.set("cache-control", "no-store");
  return res;
}

/** 메일 앱의 원클릭 해지 (List-Unsubscribe-Post). */
export async function POST(request: Request) {
  await clear(request);
  return new NextResponse(null, {
    status: 200,
    headers: { "referrer-policy": "no-referrer", "cache-control": "no-store" },
  });
}
