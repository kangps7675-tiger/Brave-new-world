"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { getOrCreatePredictionDeviceId } from "@/lib/predictionDeviceId";
import type { BunkerPick, BunkerSentimentSnapshot } from "@/lib/bunkerSentiment";
import { trackEvent } from "@/lib/trackClient";
import { visibleInterval } from "@/lib/visibleInterval";

type Props = {
  lang: LabelLanguage;
};

/**
 * GTI 옆 — STABLE vs HEAD TO BUNKER.
 * 자유텍스트 없음. 패닉 %만 집계.
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
          {ko ? "벙커 감성지수" : "Bunker sentiment"}
        </p>
        {panic != null && snap && snap.total > 0 ? (
          <p className="text-meta tabular-nums text-amber-200/90">
            {ko
              ? `요원 패닉 ${panic}% · ${snap.total}표`
              : `Agent panic ${panic}% · ${snap.total} votes`}
          </p>
        ) : (
          <p className="text-micro text-slate-500">
            {ko ? "첫 표가 지수를 엽니다" : "Cast the first vote"}
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
              ? "min-w-0 rounded-lg border border-emerald-400/60 bg-emerald-950/50 px-1 py-2 text-[10px] font-bold leading-tight tracking-wide text-emerald-200 sm:text-meta"
              : "min-w-0 rounded-lg border border-slate-700/80 bg-slate-950/60 px-1 py-2 text-[10px] font-semibold leading-tight tracking-wide text-slate-300 hover:border-emerald-500/40 disabled:opacity-50 sm:text-meta"
          }
        >
          STABLE
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void vote("bunker")}
          className={
            my === "bunker"
              ? "min-w-0 rounded-lg border border-rose-400/60 bg-rose-950/50 px-1 py-2 text-[10px] font-bold leading-tight tracking-wide text-rose-200 sm:text-meta"
              : "min-w-0 rounded-lg border border-slate-700/80 bg-slate-950/60 px-1 py-2 text-[10px] font-semibold leading-tight tracking-wide text-slate-300 hover:border-rose-500/40 disabled:opacity-50 sm:text-meta"
          }
        >
          <span className="block truncate">HEAD TO BUNKER</span>
        </button>
      </div>
    </div>
  );
}
