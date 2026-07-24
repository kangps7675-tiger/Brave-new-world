"use client";

import { useCallback, useEffect, useState } from "react";
import type { DailyPrompt } from "@/lib/dailyPrompt";
import {
  applyLocalSettle,
  cacheLocalPick,
  localAnalystTierLabel,
  nextUtcRankDate,
  prevUtcRankDate,
  readDailyPredictPrefs,
  type DailyPredictPrefs,
} from "@/lib/dailyPredictPrefs";
import { getOrCreatePredictionDeviceId } from "@/lib/predictionDeviceId";
import { trackEvent } from "@/lib/trackClient";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { WTI } from "@/lib/wti";

type DailyPredictPanelProps = {
  lang: LabelLanguage;
  yesterdayCorrectPct?: number | null;
};

/**
 * 사이드 패널용 UP/DOWN — 모달과 같은 tension-dir 문제.
 */
export function DailyPredictPanel({
  lang,
  yesterdayCorrectPct,
}: DailyPredictPanelProps) {
  const ko = lang !== "en";
  const targetDate = nextUtcRankDate();
  const [prompt, setPrompt] = useState<DailyPrompt | null>(null);
  const [pick, setPick] = useState<"up" | "down" | null>(null);
  const [prefs, setPrefs] = useState<DailyPredictPrefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  /** 어제 정산 결과 — 1:1 맞대결 표시용 */
  const [yesterdayWinner, setYesterdayWinner] = useState<string | null>(null);
  const [opponentPick, setOpponentPick] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const local = readDailyPredictPrefs();
    setPrefs(local);
    const cached = local.picks[targetDate];
    if (cached === "up" || cached === "down") setPick(cached);

    let cancelled = false;
    void (async () => {
      try {
        const deviceId = getOrCreatePredictionDeviceId();
        const [promptRes, statsRes, opponentRes] = await Promise.all([
          fetch(`/api/daily-prompt?date=${encodeURIComponent(targetDate)}`, {
            cache: "no-store",
          }),
          fetch(
            `/api/daily-predict/stats?date=${encodeURIComponent(prevUtcRankDate())}&kind=tension-dir`,
            { cache: "no-store" },
          ),
          // 1:1 맞대결 — 어제 픽 풀에서 나를 뺀 임의의 다른 요원 하나
          deviceId
            ? fetch(
                `/api/daily-predict/opponent?date=${encodeURIComponent(prevUtcRankDate())}&kind=tension-dir&deviceId=${encodeURIComponent(deviceId)}`,
                { cache: "no-store" },
              )
            : null,
        ]);
        if (promptRes.ok && !cancelled) {
          const data = (await promptRes.json()) as { prompt?: DailyPrompt | null };
          if (data.prompt) setPrompt(data.prompt);
        }
        if (statsRes.ok && !cancelled) {
          const data = (await statsRes.json()) as {
            stats?: { winnerEntityId?: string | null; total?: number } | null;
          };
          if (data.stats?.winnerEntityId && (data.stats.total ?? 0) > 0) {
            setYesterdayWinner(data.stats.winnerEntityId);
            const next = applyLocalSettle({
              targetDate: prevUtcRankDate(),
              winnerEntityId: data.stats.winnerEntityId,
            });
            setPrefs(next);
          }
        }
        if (opponentRes?.ok && !cancelled) {
          const data = (await opponentRes.json()) as { opponentPick?: string | null };
          if (data.opponentPick === "up" || data.opponentPick === "down") {
            setOpponentPick(data.opponentPick);
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetDate]);

  const submit = useCallback(
    async (dir: "up" | "down") => {
      if (busy) return;
      const prev = pick;
      setPick(dir);
      setBusy(true);
      setStatus("idle");
      try {
        const deviceId = getOrCreatePredictionDeviceId();
        const res = await fetch("/api/daily-predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetDate,
            kind: "tension-dir",
            pickEntityId: dir,
            deviceId,
          }),
        });
        if (!res.ok) {
          setPick(prev);
          setStatus("err");
          return;
        }
        cacheLocalPick(targetDate, dir);
        setPrefs(readDailyPredictPrefs());
        setStatus("ok");
        trackEvent(
          prev ? "daily_predict_change" : "daily_predict_submit",
          { targetDate, kind: "tension-dir", pick: dir },
          { lang },
        );
      } catch {
        setPick(prev);
        setStatus("err");
      } finally {
        setBusy(false);
      }
    },
    [busy, pick, targetDate, lang],
  );

  if (!prompt) return null;

  const pctLabel =
    yesterdayCorrectPct != null && Number.isFinite(yesterdayCorrectPct)
      ? ko
        ? `어제 맞춘 사람 ${yesterdayCorrectPct}%`
        : `Yesterday ${yesterdayCorrectPct}% correct`
      : ko
        ? "어제 맞춘 % · 집계 중"
        : "Yesterday’s hit rate · tallying";

  const streak = prefs?.streak ?? 0;
  const question = ko ? prompt.questionKo : prompt.questionEn;
  const tierLabel = localAnalystTierLabel(ko ? "ko" : "en", prefs ?? undefined);
  const hits = prefs?.hits ?? 0;
  const attempts = prefs?.attempts ?? 0;
  const hitRate = attempts > 0 ? Math.round((100 * hits) / attempts) : null;

  // 1:1 맞대결 — 어제 내 픽 vs 랜덤 상대 픽, 정답(yesterdayWinner)로 승패 판정
  const yesterdayPickRaw = prefs?.picks[prevUtcRankDate()];
  const myYesterdayPick =
    yesterdayPickRaw === "up" || yesterdayPickRaw === "down" ? yesterdayPickRaw : null;
  const duelReady = Boolean(myYesterdayPick && opponentPick && yesterdayWinner);
  const duelResult = duelReady
    ? (() => {
        const myHit = myYesterdayPick === yesterdayWinner;
        const oppHit = opponentPick === yesterdayWinner;
        if (myHit === oppHit) return "draw" as const;
        return myHit ? ("win" as const) : ("lose" as const);
      })()
    : null;

  return (
    <div className="rounded-lg border border-amber-500/25 bg-slate-950/50 p-3 sm:col-span-2">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300/90">
          {ko ? `${WTI.ticker} · 내일의 긴장도` : `${WTI.ticker} · Tomorrow’s tension`}
        </h3>
        <p className="text-[11px] tabular-nums text-slate-400">{pctLabel}</p>
      </div>
      <p className="mb-1 text-lg font-semibold leading-snug text-amber-50">
        {hitRate != null
          ? ko
            ? `적중률 ${hitRate}% · ${tierLabel}`
            : `${hitRate}% hit · ${tierLabel}`
          : tierLabel}
      </p>
      <p className="mb-3 text-[11px] text-slate-500">
        {ko ? `연속 ${streak}일` : `streak ${streak}d`}
        {status === "ok"
          ? ko
            ? " · 저장됨"
            : " · saved"
          : status === "err"
            ? ko
              ? " · 저장 실패"
              : " · save failed"
            : ""}
      </p>
      {duelReady && myYesterdayPick && duelResult ? (
        <p className="mb-3 text-[11px] leading-snug text-slate-400">
          {ko ? "어제 맞대결 · " : "Yesterday’s duel · "}
          <span className={myYesterdayPick === "up" ? "text-emerald-300" : "text-rose-300"}>
            {ko ? "나 " : "You "}
            {myYesterdayPick === "up" ? "UP" : "DOWN"}
          </span>
          {" vs "}
          <span className={opponentPick === "up" ? "text-emerald-300" : "text-rose-300"}>
            {ko ? "상대 " : "Opp "}
            {opponentPick === "up" ? "UP" : "DOWN"}
          </span>
          {" — "}
          <span
            className={
              duelResult === "win"
                ? "font-semibold text-amber-300"
                : duelResult === "lose"
                  ? "font-semibold text-slate-500"
                  : "font-semibold text-slate-400"
            }
          >
            {duelResult === "win"
              ? ko
                ? "승리"
                : "You won"
              : duelResult === "lose"
                ? ko
                  ? "패배"
                  : "You lost"
                : ko
                  ? "무승부"
                  : "Draw"}
          </span>
        </p>
      ) : null}
      <p className="mb-3 text-[12px] leading-snug text-slate-300">{question}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit("up")}
          className={
            pick === "up"
              ? "rounded border border-emerald-500/70 bg-emerald-950/40 py-2.5 text-sm font-semibold text-emerald-100"
              : "rounded border border-slate-700/80 py-2.5 text-sm font-semibold text-slate-300 hover:border-emerald-500/40 disabled:opacity-40"
          }
        >
          UP ↑
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit("down")}
          className={
            pick === "down"
              ? "rounded border border-rose-500/70 bg-rose-950/40 py-2.5 text-sm font-semibold text-rose-100"
              : "rounded border border-slate-700/80 py-2.5 text-sm font-semibold text-slate-300 hover:border-rose-500/40 disabled:opacity-40"
          }
        >
          DOWN ↓
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
        <span className="tabular-nums text-slate-600">UTC {targetDate}</span>
      </div>
      <p className="mt-2 text-[10px] leading-snug text-slate-600">
        {ko ? WTI.ethicsKo : WTI.ethicsEn}
      </p>
    </div>
  );
}
