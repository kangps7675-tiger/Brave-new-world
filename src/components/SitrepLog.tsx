"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

/**
 * 상황 변화 로그 — 뉴스 원문이 아니라, 우리 긴장 판단이 바뀐 순간만 짧게 남김.
 */

type SitrepEvent = {
  id: number;
  entityId: string;
  labelKo?: string | null;
  labelEn?: string | null;
  eventType: string;
  messageKo: string;
  messageEn: string;
  deltaScore?: number | null;
  prevVerification?: string | null;
  nextVerification?: string | null;
  createdAt: string;
};

/** 검증등급 코드 → 쉬운 말 */
function verificationPlain(raw: string | null | undefined, en: boolean): string {
  if (!raw) return en ? "unknown" : "미상";
  const key = raw.trim().toLowerCase();
  const map: Record<string, { ko: string; en: string }> = {
    confirmed: { ko: "확인됨", en: "confirmed" },
    verified: { ko: "확인됨", en: "confirmed" },
    likely: { ko: "가능성 높음", en: "likely" },
    possible: { ko: "가능", en: "possible" },
    suspected: { ko: "의심", en: "suspected" },
    rumored: { ko: "소문", en: "rumored" },
    unverified: { ko: "미확인", en: "unverified" },
    contested: { ko: "이견", en: "contested" },
  };
  return (en ? map[key]?.en : map[key]?.ko) ?? raw;
}

function formatClock(iso: string, en: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return en ? `${hh}:${mm} UTC` : `${hh}:${mm}`;
}

function eventLine(ev: SitrepEvent, en: boolean): string {
  const place = en ? ev.labelEn || ev.entityId : ev.labelKo || ev.entityId;
  if (ev.eventType === "verification-change") {
    const from = verificationPlain(ev.prevVerification, en);
    const to = verificationPlain(ev.nextVerification, en);
    return en
      ? `${place} — confidence ${from} → ${to}`
      : `${place} — 확신도 ${from} → ${to}`;
  }
  if (ev.eventType === "score-delta" && ev.deltaScore != null) {
    const d = Math.round(ev.deltaScore * 10) / 10;
    const abs = Math.abs(d);
    if (en) {
      return d > 0
        ? `${place} — tension up ${abs}`
        : `${place} — tension down ${abs}`;
    }
    return d > 0 ? `${place} — 긴장 상승 ${abs}` : `${place} — 긴장 완화 ${abs}`;
  }
  // 예전 메시지에 영문 코드가 남아 있으면 그대로 두되, 새 포맷 우선
  return en ? ev.messageEn : ev.messageKo;
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
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        title={
          en
            ? "When our tension reading changed a lot"
            : "긴장 판단이 크게 바뀐 순간"
        }
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold tracking-tight text-amber-100/95">
            {en ? "What changed" : "상황 변화"}
            {events.length > 0 ? ` · ${events.length}` : ""}
          </span>
          <span className="block text-[9px] text-amber-200/45">
            {en ? "big shifts only" : "큰 변화만"}
          </span>
        </span>
        <span className="shrink-0 text-[10px] text-amber-200/50">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed ? (
        <div className="max-h-40 overflow-y-auto border-t border-amber-400/10 px-3 py-2">
          {status === "loading" ? (
            <p className="text-[10px] text-amber-100/40">{en ? "Loading…" : "불러오는 중…"}</p>
          ) : events.length === 0 ? (
            <p className="text-[10px] leading-4 text-amber-100/40">
              {en
                ? "No big changes yet. Quiet days are normal."
                : "아직 큰 변화가 없습니다. 조용한 날이 보통입니다."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {events.map((ev) => (
                <li key={ev.id} className="flex gap-2 text-[10px] leading-4">
                  <span className="shrink-0 tabular-nums text-amber-300/60">
                    {formatClock(ev.createdAt, en)}
                  </span>
                  <span className="min-w-0 text-amber-50/85">{eventLine(ev, en)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
