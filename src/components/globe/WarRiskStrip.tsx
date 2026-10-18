"use client";

import { useEffect, useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { formatUtcFull, parseTime } from "@/lib/provenance";

/**
 * 선박 사건 옆 한 칸 — "보도 기준" 전쟁위험 보험료, 해역별 최신 한 건.
 * 시세가 아니다: 기사에 실린 수치이고 실제 견적은 선박·선주·브로커마다 다르다.
 * 이 안내 문구는 빼지 않는다 (시세처럼 보이면 오보).
 */

type Quote = {
  id: string;
  region: string;
  ratePct: number | null;
  rateHighPct: number | null;
  ratePrevPct: number | null;
  usdPerVoyage: number | null;
  direction: "up" | "down" | "flat" | null;
  confidence: "strong" | "medium";
  headline: string;
  url: string;
  outlet: string | null;
  publishedAt: string | null;
};

const REGION_LABEL: Record<string, { ko: string; en: string }> = {
  hormuz: { ko: "호르무즈", en: "Hormuz" },
  "red-sea": { ko: "홍해·아덴만", en: "Red Sea / Aden" },
  "black-sea": { ko: "흑해", en: "Black Sea" },
  "taiwan-strait": { ko: "대만해협", en: "Taiwan Strait" },
  malacca: { ko: "말라카", en: "Malacca" },
};

const ARROW: Record<string, string> = { up: "▲", down: "▼", flat: "■" };
const ARROW_CLASS: Record<string, string> = {
  up: "text-rose-300",
  down: "text-emerald-300",
  flat: "text-slate-300",
};

/** 해역별로 수치가 있는 가장 최근 기사 한 건 (강한 근거 우선, 같은 날이면 강한 쪽). */
export function latestPerRegion(quotes: Quote[]): Quote[] {
  const by = new Map<string, Quote>();
  for (const q of quotes) {
    if (q.ratePct === null || !REGION_LABEL[q.region]) continue;
    const cur = by.get(q.region);
    if (!cur) {
      by.set(q.region, q);
      continue;
    }
    const tq = parseTime(q.publishedAt) ?? 0;
    const tc = parseTime(cur.publishedAt) ?? 0;
    const betterConf = q.confidence === "strong" && cur.confidence !== "strong";
    if (tq > tc || (tq === tc && betterConf)) by.set(q.region, q);
  }
  return [...by.values()].sort(
    (a, b) => (parseTime(b.publishedAt) ?? 0) - (parseTime(a.publishedAt) ?? 0),
  );
}

function fmtRate(q: Pick<Quote, "ratePct" | "rateHighPct">): string {
  return q.rateHighPct !== null ? `${q.ratePct}–${q.rateHighPct}%` : `${q.ratePct}%`;
}

export function WarRiskStrip({ lang, compact = false }: { lang: LabelLanguage; compact?: boolean }) {
  const en = lang === "en";
  const [quotes, setQuotes] = useState<Quote[] | null>(null);

  useEffect(() => {
    let alive = true;
    const pull = () =>
      fetch("/api/war-risk?days=120")
        .then((r) => (r.ok ? (r.json() as Promise<{ quotes?: Quote[] }>) : { quotes: [] as Quote[] }))
        .then((d) => {
          if (alive) setQuotes(Array.isArray(d.quotes) ? d.quotes : []);
        })
        .catch(() => alive && setQuotes((prev) => prev ?? []));
    void pull();
    const timer = window.setInterval(pull, 30 * 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const rows = useMemo(() => latestPerRegion(quotes ?? []), [quotes]);

  return (
    <section
      aria-label={en ? "War-risk insurance as reported" : "보도 기준 전쟁위험 보험료"}
      className={`pointer-events-auto rounded-md border border-amber-600/35 bg-[#120e08]/92 ${compact ? "text-micro" : ""}`}
    >
      <header className="flex items-baseline justify-between gap-2 border-b border-amber-600/25 px-2.5 py-1.5">
        <h3 className="text-meta font-semibold tracking-tight text-amber-100">
          {en ? "War-risk premium (as reported)" : "전쟁위험 보험료 (보도 기준)"}
        </h3>
        <span className="text-micro text-amber-200/50">{en ? "% of hull value" : "선가 대비"}</span>
      </header>
      {quotes === null ? (
        <p className="px-2.5 py-2 text-micro text-amber-200/50">{en ? "Loading…" : "불러오는 중…"}</p>
      ) : rows.length === 0 ? (
        <p className="px-2.5 py-2 text-micro text-amber-200/55">
          {en
            ? "No premium figure reported in the last 120 days."
            : "최근 120일간 보험료 수치가 보도된 해역이 없습니다."}
        </p>
      ) : (
        <ul className="divide-y divide-amber-600/15">
          {rows.slice(0, 4).map((q) => {
            const at = parseTime(q.publishedAt);
            return (
              <li key={q.id} className="px-2.5 py-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-micro text-amber-200/70">
                    {en ? REGION_LABEL[q.region]!.en : REGION_LABEL[q.region]!.ko}
                  </span>
                  <span className="tabular-nums text-meta font-semibold text-amber-50">
                    {q.ratePrevPct !== null ? `${q.ratePrevPct}% → ` : ""}
                    {fmtRate(q)}
                  </span>
                  {q.direction ? (
                    <span className={`text-micro ${ARROW_CLASS[q.direction] ?? ""}`}>{ARROW[q.direction]}</span>
                  ) : null}
                  {q.confidence === "medium" ? (
                    <span className="rounded-sm border border-amber-200/25 px-1 text-micro text-amber-200/55">
                      {en ? "unclear basis" : "근거 불확실"}
                    </span>
                  ) : null}
                </div>
                <a
                  href={q.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate text-micro text-amber-200/60 underline underline-offset-2 hover:text-amber-50"
                  title={q.headline}
                >
                  {q.outlet ?? "news"} · {at != null ? formatUtcFull(at, lang) : "—"}
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <p className="border-t border-amber-600/15 px-2.5 py-1.5 text-micro leading-snug text-amber-200/45">
        {en
          ? "Figures quoted in news reports, not a live market price. Actual quotes vary by vessel, owner, flag and broker."
          : "시세가 아니라 기사에 실린 수치입니다. 실제 견적은 선박·선주·국적·브로커마다 다릅니다."}
      </p>
    </section>
  );
}
