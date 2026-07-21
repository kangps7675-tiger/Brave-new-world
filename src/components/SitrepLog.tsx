"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

/**
 * SITREP 로그 — 뉴스 사건이 아니라 "우리 시스템 판단이 언제 바뀌었나"의 기록.
 * cron-ingest가 daily_entity_ranks 전일 대비 diff에서 검증등급 전환·큰 점수 변화를
 * 감지할 때만 한 줄씩 쌓인다. 조용하면 텅 비어있는 게 정상 — 매일 뭐라도 나오는 게 아니다.
 */

type SitrepEvent = {
  id: number;
  entityId: string;
  eventType: string;
  messageKo: string;
  messageEn: string;
  createdAt: string;
};

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}${mm}Z`;
}

export function SitrepLog({ lang }: { lang: LabelLanguage }) {
  const [events, setEvents] = useState<SitrepEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [collapsed, setCollapsed] = useState(true);
  const en = lang === "en";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/sitrep", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { events?: SitrepEvent[] };
        if (!cancelled) {
          setEvents(data.events ?? []);
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

  return (
    <div className="pointer-events-auto w-[min(88vw,17rem)] overflow-hidden rounded-xl border border-amber-400/25 bg-[#0d0a06]/90 shadow-xl backdrop-blur-md">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/85">
          SITREP{events.length > 0 ? ` · ${events.length}` : ""}
        </span>
        <span className="text-[10px] text-amber-200/50">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed ? (
        <div className="max-h-40 overflow-y-auto border-t border-amber-400/10 px-3 py-2">
          {status === "loading" ? (
            <p className="text-[10px] text-amber-100/40">{en ? "Loading…" : "불러오는 중…"}</p>
          ) : events.length === 0 ? (
            <p className="text-[10px] leading-4 text-amber-100/40">
              {en
                ? "No status changes logged yet. Quiet is normal."
                : "아직 기록된 상태 변화가 없습니다. 조용한 게 정상입니다."}
            </p>
          ) : (
            <ul className="space-y-1.5 font-data-mono">
              {events.map((ev) => (
                <li key={ev.id} className="flex gap-2 text-[10px] leading-4">
                  <span className="shrink-0 tabular-nums text-amber-300/60">
                    {formatClock(ev.createdAt)}
                  </span>
                  <span className="min-w-0 text-amber-50/85">
                    {en ? ev.messageEn : ev.messageKo}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
