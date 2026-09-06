import { NextResponse } from "next/server";
import { mapPool, translateText } from "@/lib/koreanTranslate";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  texts?: unknown;
  lang?: unknown;
};

/**
 * 브라우저용 번역 프록시 — Google gtx를 서버에서만 호출 (CORS·약관 노출 최소화).
 * 클라이언트는 이 엔드포인트만 호출한다.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const lang: LabelLanguage = body.lang === "en" ? "en" : "ko";
    const texts = Array.isArray(body.texts)
      ? body.texts.map((t) => (typeof t === "string" ? t : "")).slice(0, 40)
      : [];
    if (texts.length === 0) {
      return NextResponse.json({ translations: [] }, { headers: NO_STORE_HEADERS });
    }
    const translations = await mapPool(
      texts,
      (text) => translateText(text, lang),
      6,
    );
    return NextResponse.json({ translations }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "translate failed";
    return NextResponse.json(
      { translations: [], error: message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
