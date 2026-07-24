import { NextResponse } from "next/server";
import { apiStubResponse } from "@/lib/apiStub";
import { loadDailyPrompt, type DailyPrompt } from "@/lib/dailyPrompt";
import {
  displayTensionScore,
  loadDailyRanks,
  nextUtcRankDate,
  utcRankDate,
} from "@/lib/dailyRanks";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROMPT_CDN = publicCacheHeaders(CDN_CACHE.dailyPrompt);

async function syntheticPrompt(targetDate: string): Promise<DailyPrompt | null> {
  const payload = await loadDailyRanks({ date: utcRankDate(), limit: 5 });
  // 메인 = WTI. 랭킹 행이 없으면 전장/초크 폴백.
  if (payload.worldTension) {
    const score = Math.round(payload.worldTension.score * 10) / 10;
    return {
      targetDate,
      subjectKind: "world",
      subjectId: "global",
      labelKo: "세계 긴장도 지수 (WTI)",
      labelEn: "World Tension Index (WTI)",
      baselineScore: score,
      questionKo: "내일 이 시간, 세계 긴장도 지수(WTI)는 오를까 내릴까?",
      questionEn:
        "By this time tomorrow, will the World Tension Index (WTI) go UP or DOWN?",
      createdAt: new Date().toISOString(),
    };
  }
  const entry = payload.chokepoint[0] || payload.theater[0];
  if (!entry) return null;
  const score = displayTensionScore(entry);
  return {
    targetDate,
    subjectKind: entry.kind,
    subjectId: entry.entityId,
    labelKo: entry.labelKo,
    labelEn: entry.labelEn,
    baselineScore: score,
    questionKo: `내일 이 시간, 「${entry.labelKo}」 긴장도 지수는 오를까 내릴까? (보너스)`,
    questionEn: `By this time tomorrow, will the 「${entry.labelEn}」 tension index go UP or DOWN? (bonus)`,
    createdAt: new Date().toISOString(),
  };
}

/** GET /api/daily-prompt?date=YYYY-MM-DD — 내일(기본) UP/DOWN 문제 */
export async function GET(request: Request) {
  const stub = apiStubResponse("daily-prompt", request);
  if (stub) return stub;

  const url = new URL(request.url);
  const dateParam = (url.searchParams.get("date") || "").trim();
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : nextUtcRankDate();

  let prompt = await loadDailyPrompt({ targetDate });
  if (!prompt) {
    prompt = await syntheticPrompt(targetDate);
  }
  return NextResponse.json(
    {
      ok: true,
      prompt,
      targetDate,
    },
    { headers: PROMPT_CDN },
  );
}
