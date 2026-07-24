"use client";

import { useCallback, useEffect, useState } from "react";
import { renderDailyRankCard } from "@/lib/dailyRankCard";
import { DailyPredictPanel } from "@/components/DailyPredictPanel";
import {
  dailyRankLabel,
  displayTensionScore,
  formatRankDelta,
  formatWorldTensionDelta,
  type DailyRankEntry,
  type DailyRankKind,
  type DailyRanksPayload,
  type WorldTensionSnapshot,
} from "@/lib/dailyRanks";
import { shareOrDownloadImageBlob } from "@/lib/captureShareImage";
import { trackEvent } from "@/lib/trackClient";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  formatWtiTitle,
  wtiBand,
  wtiBandLabel,
} from "@/lib/wti";
import { BunkerSentimentVote } from "@/components/BunkerSentimentVote";

type DailyRankSharePanelProps = {
  lang: LabelLanguage;
  compact?: boolean;
};

function WorldTensionHero({
  tension,
  lang,
}: {
  tension: WorldTensionSnapshot;
  lang: LabelLanguage;
}) {
  const ko = lang !== "en";
  const delta = formatWorldTensionDelta(tension.deltaScore, ko ? "ko" : "en");
  const deltaClass =
    tension.deltaScore == null || Math.abs(tension.deltaScore) < 0.05
      ? "text-slate-500"
      : tension.deltaScore > 0
        ? "text-rose-400"
        : "text-emerald-400";
  const score = Math.round(tension.score);
  const fill = Math.max(0, Math.min(100, tension.score));
  const band = wtiBandLabel(wtiBand(tension.score), ko);

  return (
    <div className="rounded-lg border border-rose-500/25 bg-gradient-to-br from-rose-950/40 via-slate-950/60 to-slate-950/80 p-3 sm:col-span-2">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300/80">
            {formatWtiTitle(ko)}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">
            {ko
              ? `서비스 단일 기축 · ${band}`
              : `Product spine · ${band}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black tabular-nums tracking-tight text-rose-100">
            {score}
          </p>
          <p className={`text-[11px] tabular-nums ${deltaClass}`}>{delta}</p>
        </div>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900/80"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label={formatWtiTitle(ko)}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500/80 via-rose-500 to-rose-300"
          style={{ width: `${fill}%` }}
        />
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        {ko
          ? "서비스의 단일 기축. 전장별 GDELT·FIRMS·텔레그램을 7일 평균 대비 z-score로 정규화한 뒤 가중합. VIX·GPR처럼 이 숫자가 사운드·브리핑·예측을 구동합니다."
          : "Product spine index. Theater GDELT / FIRMS / Telegram z-scored vs 7-day baseline, then blended. Like VIX or GPR — this number drives sound, briefing, and the daily puzzle."}
      </p>
      <BunkerSentimentVote lang={lang} />
    </div>
  );
}

function RankList({
  title,
  accentClass,
  entries,
  lang,
  onShare,
  busy,
}: {
  title: string;
  accentClass: string;
  entries: DailyRankEntry[];
  lang: LabelLanguage;
  onShare: () => void;
  busy: boolean;
}) {
  const ko = lang !== "en";
  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${accentClass}`}>
          {title}
        </h3>
        <button
          type="button"
          disabled={busy || entries.length === 0}
          onClick={onShare}
          className="rounded border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-300 hover:border-slate-500 hover:text-slate-100 disabled:opacity-40"
        >
          {busy ? (ko ? "만드는 중…" : "Rendering…") : ko ? "카드 공유" : "Share card"}
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-[11px] text-slate-500">
          {ko ? "오늘 집계가 아직 없습니다." : "No ranking snapshot yet."}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {entries.map((entry) => {
            const delta = formatRankDelta(entry.deltaRank, ko ? "ko" : "en");
            const deltaClass =
              entry.deltaRank == null || entry.deltaRank === 0
                ? "text-slate-500"
                : entry.deltaRank > 0
                  ? "text-emerald-400"
                  : "text-rose-400";
            const score = displayTensionScore(entry);
            return (
              <li
                key={`${entry.kind}-${entry.entityId}`}
                className="flex items-baseline justify-between gap-2 text-[12px] text-slate-200"
              >
                <span className="min-w-0 truncate">
                  <span className="mr-1.5 font-semibold text-slate-400">{entry.rank}.</span>
                  {dailyRankLabel(entry, ko ? "ko" : "en")}
                  <span className="ml-1.5 tabular-nums text-slate-600">{score}</span>
                </span>
                <span className={`shrink-0 tabular-nums ${deltaClass}`}>{delta}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function DailyRankSharePanel({ lang, compact = false }: DailyRankSharePanelProps) {
  const ko = lang !== "en";
  const [payload, setPayload] = useState<DailyRanksPayload | null>(null);
  const [busyKind, setBusyKind] = useState<DailyRankKind | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/daily-ranks?limit=5", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as DailyRanksPayload;
        if (!cancelled) setPayload(data);
      } catch {
        if (!cancelled) setPayload(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const share = useCallback(
    async (kind: DailyRankKind) => {
      if (!payload) return;
      const entries = kind === "theater" ? payload.theater : payload.chokepoint;
      trackEvent(
        "daily_rank_card_share_click",
        { kind, date: payload.date },
        { lang },
      );
      setBusyKind(kind);
      try {
        const blob = await renderDailyRankCard(kind, entries, {
          lang,
          date: payload.date,
        });
        if (!blob) return;
        const title =
          kind === "theater"
            ? ko
              ? "오늘의 세계 위험 순위"
              : "World risk ranking"
            : ko
              ? "오늘의 공급망 스트레스"
              : "Supply-chain stress";
        await shareOrDownloadImageBlob(
          blob,
          `daily-${kind}-${payload.date}.png`,
          title,
          `${title} · ${payload.date}`,
        );
        trackEvent(
          "daily_rank_card_share_success",
          { kind, date: payload.date },
          { lang },
        );
      } finally {
        setBusyKind(null);
      }
    },
    [payload, lang, ko],
  );

  if (!payload) return null;
  if (
    payload.source === "empty" &&
    payload.theater.length === 0 &&
    payload.chokepoint.length === 0 &&
    !payload.worldTension
  ) {
    return null;
  }

  return (
    <section
      className={
        compact
          ? "space-y-2"
          : "grid gap-2 sm:grid-cols-2"
      }
      aria-label={ko ? "일일 랭킹" : "Daily rankings"}
    >
      {payload.worldTension ? (
        <WorldTensionHero tension={payload.worldTension} lang={lang} />
      ) : null}
      <RankList
        title={ko ? "위험 지역 TOP 5" : "Risk theaters TOP 5"}
        accentClass="text-rose-300/90"
        entries={payload.theater}
        lang={lang}
        busy={busyKind === "theater"}
        onShare={() => void share("theater")}
      />
      <RankList
        title={ko ? "공급망 TOP 5" : "Supply chain TOP 5"}
        accentClass="text-sky-300/90"
        entries={payload.chokepoint}
        lang={lang}
        busy={busyKind === "chokepoint"}
        onShare={() => void share("chokepoint")}
      />
      <DailyPredictPanel
        lang={lang}
        yesterdayCorrectPct={payload.yesterdayCorrectPct}
      />
    </section>
  );
}
