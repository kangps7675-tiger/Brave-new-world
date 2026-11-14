import { NextResponse } from "next/server";
import { SIPRI_ARMS_LENS_ENABLED, SIPRI_ARMS_EVIDENCE_ENABLED } from "@/lib/licensing/sipriPolicy";
import { sipriRecordsForHub, sipriRecordsForPair } from "@/lib/sipri/armsRecords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ISO3 = /^[A-Za-z]{3}$/;

/**
 * SIPRI 무기이전 기록 — 허브 하나(`?hub=RUS`) 또는 나라 쌍(`?a=PRK&b=RUS`) 단위로만 준다.
 * 전체 목록·파일 내려받기는 없다(SIPRI 승인 조건 ii). 응답은 캐시하지 않는다.
 */
export async function GET(request: Request) {
  if (!SIPRI_ARMS_LENS_ENABLED && !SIPRI_ARMS_EVIDENCE_ENABLED) {
    return NextResponse.json({ error: "disabled" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const q = new URL(request.url).searchParams;
  const hub = q.get("hub");
  const a = q.get("a");
  const b = q.get("b");

  let body;
  if (hub && ISO3.test(hub)) body = sipriRecordsForHub(hub);
  else if (a && b && ISO3.test(a) && ISO3.test(b)) body = sipriRecordsForPair(a, b);
  else return NextResponse.json({ error: "hub 또는 a·b가 필요합니다" }, { status: 400, headers: { "Cache-Control": "no-store" } });

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
