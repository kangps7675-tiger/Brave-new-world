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
import { GTS, gtiPredictQuestion } from "@/lib/gti";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROMPT_CDN = publicCacheHeaders(CDN_CACHE.dailyPrompt);

async function syntheticPrompt(targetDate: string): Promise<DailyPrompt | null> {
  const payload = await loadDailyRanks({ date: utcRankDate(), limit: 5 });
  // 메인 = GTS. 랭킹 행이 없으면 전장/초크 폴백.
  if (payload.worldTension) {
    const score = Math.round(payload.worldTension.score * 10) / 10;
    const q = gtiPredictQuestion();
    return {
      targetDate,
      subjectKind: "world",
      subjectId: "global",
      labelKo: `${GTS.fullKo} (${GTS.ticker})`,
      labelEn: `${GTS.fullEn} (${GTS.ticker})`,
      baselineScore: score,
      questionKo: q.ko,
      questionEn: q.en,
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
    questionKo: `내일 이 시간, 「${entry.labelKo}」 긴장도는 어제보다 올라갈까요, 내려갈까요? (보너스)`,
    questionEn: `By this time tomorrow, will 「${entry.labelEn}」 tension be UP or DOWN vs today? (bonus)`,
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
