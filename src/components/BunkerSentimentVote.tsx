"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { getOrCreatePredictionDeviceId } from "@/lib/predictionDeviceId";
import type { BunkerPick, BunkerSentimentSnapshot } from "@/lib/bunkerSentiment";
import { trackEvent } from "@/lib/trackClient";
import { visibleInterval } from "@/lib/visibleInterval";
import { GTI } from "@/lib/gti";

type Props = {
  lang: LabelLanguage;
};

/**
 * 내일 전망 — 안정 vs 긴장 고조 이진 투표.
 * 자유텍스트 없음. 긴장 고조 전망 비율만 집계.
 */
export function BunkerSentimentVote({ lang }: Props) {
  const ko = lang !== "en";
  const [snap, setSnap] = useState<BunkerSentimentSnapshot | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const deviceId = getOrCreatePredictionDeviceId();
    try {
      const qs = deviceId
        ? `?deviceId=${encodeURIComponent(deviceId)}`
        : "";
      const res = await fetch(`/api/bunker-sentiment${qs}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as BunkerSentimentSnapshot;
      setSnap(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    return visibleInterval(() => void load(), 60_000);
  }, [load]);

  async function vote(pick: BunkerPick) {
    if (busy) return;
    setBusy(true);
    trackEvent("bunker_sentiment_vote", { pick }, { lang: ko ? "ko" : "en" });
    try {
      const deviceId = getOrCreatePredictionDeviceId();
      const res = await fetch("/api/bunker-sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, pick }),
      });
      if (res.ok) {
        const data = (await res.json()) as BunkerSentimentSnapshot & { ok?: boolean };
        setSnap(data);
      }
    } finally {
      setBusy(false);
    }
  }

  const panic = snap?.panicPct;
  const my = snap?.myPick ?? null;

  return (
    <div className="mt-3 min-w-0 border-t border-white/10 pt-3">
      <div className="mb-2 flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <p className="text-micro font-semibold uppercase tracking-[0.14em] text-slate-400">
          {ko ? "내일 전망" : "Outlook"}
        </p>
        {panic != null && snap && snap.total > 0 ? (
          <p className="text-meta tabular-nums text-amber-200/90">
            {ko
              ? `긴장 고조 ${panic}% · ${snap.total}표`
              : `Rising ${panic}% · ${snap.total} votes`}
          </p>
        ) : (
          <p className="text-micro text-slate-500">
            {ko ? "첫 표가 집계를 엽니다" : "Cast the first vote"}
          </p>
        )}
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => void vote("stable")}
          className={
            my === "stable"
              ? "min-w-0 rounded-lg border border-emerald-400/60 bg-emerald-950/50 px-1 py-2 text-micro font-bold leading-tight tracking-wide text-emerald-200 sm:text-meta"
              : "min-w-0 rounded-lg border border-slate-700/80 bg-slate-950/60 px-1 py-2 text-micro font-semibold leading-tight tracking-wide text-slate-300 hover:border-emerald-500/40 disabled:opacity-50 sm:text-meta"
          }
        >
          {ko ? "안정" : "Steady"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void vote("bunker")}
          className={
            my === "bunker"
              ? "min-w-0 rounded-lg border border-rose-400/60 bg-rose-950/50 px-1 py-2 text-micro font-bold leading-tight tracking-wide text-rose-200 sm:text-meta"
              : "min-w-0 rounded-lg border border-slate-700/80 bg-slate-950/60 px-1 py-2 text-micro font-semibold leading-tight tracking-wide text-slate-300 hover:border-rose-500/40 disabled:opacity-50 sm:text-meta"
          }
        >
          <span className="block truncate">{ko ? "긴장 고조" : "Rising tension"}</span>
        </button>
      </div>
      <p className="mt-2 text-micro leading-snug text-slate-600">
        {ko ? GTI.ethicsKo : GTI.ethicsEn}
      </p>
    </div>
  );
}
