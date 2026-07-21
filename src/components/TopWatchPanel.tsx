"use client";

import { useEffect, useState } from "react";
import { EvidenceTierBadge } from "@/components/EvidenceTierBadge";
import type { LabelLanguage } from "@/lib/layerPrefs";

/**
 * TOP WATCH — 지금 가장 빠르게 악화 중인 전장 순위.
 * 지도를 돌려가며 찾는 대신, "분석관이 지금 뭘 걱정하는지"를 바로 보여준다.
 * 초크포인트는 제외 — 그 스코어링은 베이스라인 정규화가 없어(상시 붐비는 곳이
 * 항상 높게 나옴) 여기 순위에 섞으면 왜곡된다. theater만 사용.
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
  const [collapsed, setCollapsed] = useState(false);
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
        className="flex w-full items-center justify-between gap-2 px-3 py-2"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/85">
            {en ? "Top watch" : "TOP WATCH"}
          </span>
          <EvidenceTierBadge tier="model" lang={lang} />
        </span>
        <span className="text-[10px] text-amber-200/50">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed ? (
        status === "loading" || top.length === 0 ? (
          <p className="px-3 pb-2.5 text-[11px] text-amber-100/50">
            {status === "loading" ? (en ? "Loading…" : "불러오는 중…") : en ? "No data" : "데이터 없음"}
          </p>
        ) : (
          <ol className="divide-y divide-amber-400/10 border-t border-amber-400/10">
            {top.map((entry, i) => {
              const delta = entry.deltaScore ?? 0;
              const rising = delta > 0.05;
              return (
                <li key={entry.entityId} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="w-3.5 shrink-0 text-[10px] tabular-nums text-amber-200/40">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-amber-50/90">
                    {en ? entry.labelEn : entry.labelKo}
                  </span>
                  <span
                    className={`shrink-0 text-[10px] font-medium tabular-nums ${
                      rising ? "text-red-300" : delta < -0.05 ? "text-emerald-300" : "text-amber-200/50"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}
                    {Math.round(delta * 10) / 10}
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
