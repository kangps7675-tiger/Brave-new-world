import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 사건 시각·위치 근처의 미국 지질조사국 지진.
 * 흔들림이 있었다는 기록이지, 폭발이었다는 기록은 아니다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const at = Date.parse(url.searchParams.get("at") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(at)) {
    return NextResponse.json({ hit: null }, { status: 400 });
  }

  const q = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
  q.searchParams.set("format", "geojson");
  q.searchParams.set("latitude", String(lat));
  q.searchParams.set("longitude", String(lng));
  q.searchParams.set("maxradiuskm", "80");
  q.searchParams.set("starttime", new Date(at - 3 * 3_600_000).toISOString());
  q.searchParams.set("endtime", new Date(at + 3 * 3_600_000).toISOString());
  q.searchParams.set("minmagnitude", "3");
  q.searchParams.set("limit", "1");
  q.searchParams.set("orderby", "time");

  try {
    const res = await fetch(q, {
      headers: {
        Accept: "application/geo+json, application/json",
        "User-Agent": "StraitDesk/1.0 (+https://straitdesk.app; earthquake cross-check)",
      },
    });
    if (!res.ok) return NextResponse.json({ hit: null });
    const data = (await res.json()) as {
      features?: { properties?: { mag?: number; place?: string; url?: string; time?: number } }[];
    };
    const props = data.features?.[0]?.properties;
    if (!props || typeof props.mag !== "number") return NextResponse.json({ hit: null });
    return NextResponse.json({
      hit: { mag: props.mag, place: props.place ?? null, url: props.url ?? null, time: props.time ?? null },
    });
  } catch {
    return NextResponse.json({ hit: null });
  }
}
