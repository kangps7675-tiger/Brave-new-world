import { NextResponse } from "next/server";
import { emailWorkerAction } from "@/lib/emailWorker";

export const dynamic = "force-dynamic";

/** 확인 링크. 토큰이 있는 주소에 페이지를 그리지 않고, 결과만 남긴 주소로 보낸다. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const state = await emailWorkerAction("/email/confirm", token);
  const dest = new URL("/email/done", request.url);
  dest.searchParams.set("result", state === "confirmed" ? "confirmed" : "invalid");
  const res = NextResponse.redirect(dest);
  res.headers.set("referrer-policy", "no-referrer");
  res.headers.set("cache-control", "no-store");
  return res;
}
