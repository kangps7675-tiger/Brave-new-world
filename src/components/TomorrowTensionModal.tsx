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
} from "@/lib/dailyPredictPrefs";
import { getOrCreatePredictionDeviceId } from "@/lib/predictionDeviceId";
import { shareOrDownloadImageBlob } from "@/lib/captureShareImage";
import { renderTensionStreakCard } from "@/lib/tensionStreakCard";
import { trackEvent } from "@/lib/trackClient";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { WTI } from "@/lib/wti";

type Props = {
  lang: LabelLanguage;
  prompt: DailyPrompt;
  onDismiss: () => void;
};

/**
 * 하루 한 번 — 전 세계 동일 UP/DOWN 문제 (긴장도 지표만).
 */
export function TomorrowTensionModal({ lang, prompt, onDismiss }: Props) {
  const ko = lang !== "en";
  const targetDate = prompt.targetDate || nextUtcRankDate();
  const [pick, setPick] = useState<"up" | "down" | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [yesterdayPct, setYesterdayPct] = useState<number | null>(null);
  const [lastHit, setLastHit] = useState<boolean | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  useEffect(() => {
    const prefs = readDailyPredictPrefs();
    setStreak(prefs.streak);
    setLastHit(prefs.lastHit);
    const cached = prefs.picks[targetDate];
    if (cached === "up" || cached === "down") {
      setPick(cached);
      setDone(true);
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/daily-predict/stats?date=${encodeURIComponent(prevUtcRankDate())}&kind=tension-dir`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          stats?: {
            winnerEntityId?: string | null;
            total?: number;
            correctPct?: number;
          } | null;
        };
        if (data.stats?.correctPct != null) {
          setYesterdayPct(data.stats.correctPct);
        }
        if (data.stats?.winnerEntityId && (data.stats.total ?? 0) > 0) {
          const next = applyLocalSettle({
            targetDate: prevUtcRankDate(),
            winnerEntityId: data.stats.winnerEntityId,
          });
          if (!cancelled) {
            setStreak(next.streak);
            setLastHit(next.lastHit);
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
      if (busy || done) return;
      setBusy(true);
      setPick(dir);
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
          setPick(null);
          return;
        }
        cacheLocalPick(targetDate, dir);
        setDone(true);
        trackEvent(
          "daily_predict_submit",
          { targetDate, kind: "tension-dir", pick: dir },
          { lang },
        );
      } catch {
        setPick(null);
      } finally {
        setBusy(false);
      }
    },
    [busy, done, targetDate, lang],
  );

  const share = useCallback(async () => {
    setShareBusy(true);
    try {
      const prefs = readDailyPredictPrefs();
      const tierLabel = localAnalystTierLabel(ko ? "ko" : "en", prefs);
      const rate =
        prefs.attempts > 0
          ? Math.round((100 * prefs.hits) / prefs.attempts)
          : null;
      const blob = await renderTensionStreakCard({
        lang: ko ? "ko" : "en",
        streak,
        lastHit,
        label: ko ? prompt.labelKo : prompt.labelEn,
        pick,
        date: targetDate,
        tierLabel,
        hits: prefs.hits,
        attempts: prefs.attempts,
      });
      if (!blob) return;
      await shareOrDownloadImageBlob(
        blob,
        `analyst-tier-${targetDate}.png`,
        ko ? `${WTI.ticker} 애널리스트` : `${WTI.ticker} analyst`,
        ko
          ? rate != null
            ? `적중률 ${rate}% · ${tierLabel} · ${WTI.ticker}`
            : `${tierLabel} · ${WTI.ticker}`
          : rate != null
            ? `${rate}% hit · ${tierLabel} · ${WTI.ticker}`
            : `${tierLabel} · ${WTI.ticker}`,
      );
      trackEvent(
        "analyst_tier_share_success",
        {
          streak,
          targetDate,
          spine: "WTI",
          hits: prefs.hits,
          attempts: prefs.attempts,
          tier: tierLabel,
        },
        { lang },
      );
    } finally {
      setShareBusy(false);
    }
  }, [ko, streak, lastHit, prompt, pick, targetDate, lang]);

  const question = ko ? prompt.questionKo : prompt.questionEn;
  const prefsSnap = readDailyPredictPrefs();
  const tierLabel = localAnalystTierLabel(ko ? "ko" : "en", prefsSnap);
  const hitRate =
    prefsSnap.attempts > 0
      ? Math.round((100 * prefsSnap.hits) / prefsSnap.attempts)
      : null;

  return (
    <div
      className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tomorrow-tension-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-amber-500/30 bg-[#0b1220] shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/90">
            {ko ? `${WTI.ticker} · 내일의 세계 긴장도` : `${WTI.ticker} · Tomorrow’s tension`}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-tight text-amber-50">
            {hitRate != null
              ? ko
                ? `적중률 ${hitRate}% · ${tierLabel}`
                : `${hitRate}% hit · ${tierLabel}`
              : tierLabel}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {ko ? `연속 ${streak}일` : `streak ${streak}d`}
            {yesterdayPct != null
              ? ko
                ? ` · 어제 전체 ${yesterdayPct}% 적중`
                : ` · yesterday crowd ${yesterdayPct}%`
              : ""}
          </p>
          <h2
            id="tomorrow-tension-title"
            className="mt-3 text-base font-medium leading-snug text-slate-200"
          >
            {question}
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
            {ko
              ? `${WTI.hookKo} ${WTI.ethicsKo} 하루 한 번, 전 세계 같은 문제.`
              : `${WTI.hookEn} ${WTI.ethicsEn} One shared puzzle per day.`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 py-5">
          <button
            type="button"
            disabled={busy || done}
            onClick={() => void submit("up")}
            className={
              pick === "up"
                ? "rounded-lg border border-emerald-400/70 bg-emerald-950/50 py-6 text-xl font-bold text-emerald-200"
                : "rounded-lg border border-slate-700 bg-slate-900/80 py-6 text-xl font-bold text-slate-200 hover:border-emerald-500/50 disabled:opacity-50"
            }
          >
            UP ↑
          </button>
          <button
            type="button"
            disabled={busy || done}
            onClick={() => void submit("down")}
            className={
              pick === "down"
                ? "rounded-lg border border-rose-400/70 bg-rose-950/50 py-6 text-xl font-bold text-rose-200"
                : "rounded-lg border border-slate-700 bg-slate-900/80 py-6 text-xl font-bold text-slate-200 hover:border-rose-500/50 disabled:opacity-50"
            }
          >
            DOWN ↓
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-5 py-3 text-[11px] text-slate-500">
          <span className="tabular-nums">UTC {targetDate}</span>
        </div>

        <div className="flex gap-2 border-t border-white/10 px-5 py-4">
          {done ? (
            <button
              type="button"
              disabled={shareBusy}
              onClick={() => {
                trackEvent("analyst_tier_share_click", { targetDate }, { lang });
                void share();
              }}
              className="flex-1 rounded-lg border border-amber-500/40 bg-amber-950/40 py-2.5 text-sm text-amber-100 hover:bg-amber-900/40 disabled:opacity-50"
            >
              {shareBusy
                ? ko
                  ? "카드 만드는 중…"
                  : "Rendering…"
                : ko
                  ? "등급 카드 공유"
                  : "Share tier card"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-300 hover:border-slate-500"
          >
            {done
              ? ko
                ? "지구본으로"
                : "To the globe"
              : ko
                ? "나중에"
                : "Later"}
          </button>
        </div>
      </div>
    </div>
  );
}
