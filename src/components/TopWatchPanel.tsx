"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

/**
 * 긴장 상승 순위 — 어제보다 점수가 빠르게 오른 전장.
 * (내부 랭킹 API 기반. 초크포인트는 제외.)
 */

type RankEntry = {
  entityId: string;
  labelKo: string;
  labelEn: string;
  score: number;
  deltaScore: number | null;
  updatedAt: string;
};

type Payload = {
  theater: RankEntry[];
  fetchedAt: string;
};

export function TopWatchPanel({ lang }: { lang: LabelLanguage }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [collapsed, setCollapsed] = useState(true);
  const en = lang === "en";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/daily-ranks?limit=10", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Payload;
        if (!cancelled) {
          setPayload(data);
          setStatus("ok");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    void load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (status === "error") return null;

  const top = [...(payload?.theater ?? [])]
    .filter((e) => e.deltaScore != null)
    .sort((a, b) => (b.deltaScore ?? 0) - (a.deltaScore ?? 0))
    .slice(0, 5);

  return (
    <div className="pointer-events-auto w-[min(84vw,15rem)] overflow-hidden rounded-xl border border-amber-400/25 bg-[#140f0a]/88 shadow-xl backdrop-blur-md">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        title={
          en
            ? "Regions where tension rose the most vs yesterday"
            : "어제보다 긴장이 많이 오른 지역"
        }
      >
        <span className="min-w-0">
          <span className="block text-meta font-semibold tracking-tight text-amber-100/95">
            {en ? "Rising tension" : "긴장 상승"}
          </span>
          <span className="block text-micro text-amber-200/45">
            {en ? "vs yesterday · estimate" : "어제 대비 · 추정"}
          </span>
        </span>
        <span className="shrink-0 text-micro text-amber-200/50">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed ? (
        status === "loading" || top.length === 0 ? (
          <p className="px-3 pb-2.5 text-meta text-amber-100/50">
            {status === "loading"
              ? en
                ? "Loading…"
                : "불러오는 중…"
              : en
                ? "Nothing rising much right now."
                : "지금은 크게 오른 곳이 없습니다."}
          </p>
        ) : (
          <ol className="divide-y divide-amber-400/10 border-t border-amber-400/10">
            {top.map((entry, i) => {
              const delta = entry.deltaScore ?? 0;
              const rising = delta > 0.05;
              const easing = delta < -0.05;
              const deltaLabel = en
                ? rising
                  ? "up"
                  : easing
                    ? "down"
                    : "flat"
                : rising
                  ? "상승"
                  : easing
                    ? "완화"
                    : "보합";
              return (
                <li key={entry.entityId} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="w-3.5 shrink-0 text-micro tabular-nums text-amber-200/40">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-meta text-amber-50/90">
                    {en ? entry.labelEn : entry.labelKo}
                  </span>
                  <span
                    className={`shrink-0 text-micro font-medium tabular-nums ${
                      rising ? "text-red-300" : easing ? "text-emerald-300" : "text-amber-200/50"
                    }`}
                    title={deltaLabel}
                  >
                    {rising ? "↑" : easing ? "↓" : "·"}{" "}
                    {Math.abs(Math.round(delta * 10) / 10)}
                  </span>
                </li>
              );
            })}
          </ol>
        )
      ) : null}
    </div>
  );
}
