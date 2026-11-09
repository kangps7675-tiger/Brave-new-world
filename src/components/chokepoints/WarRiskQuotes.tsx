"use client";

import { useEffect, useState } from "react";
import { useLandingLanguage } from "@/lib/landingLanguage";

/**
 * 초크포인트 페이지 — "보도 기준" 전쟁위험 보험료.
 * 시세가 아니다: 기사에 실린 수치를 날짜순으로 보여줄 뿐이고, 실제 견적은 선박·선주·브로커마다 다르다.
 * 이 문구는 빼지 않는다 (시세처럼 보이면 오보).
 */

type Quote = {
  id: string;
  region: string;
  ratePct: number | null;
  rateHighPct: number | null;
  ratePrevPct: number | null;
  usdPerVoyage: number | null;
  direction: "up" | "down" | "flat" | null;
  confidence: "strong" | "medium" | "headline";
  quote: string;
  headline: string;
  url: string;
  outlet: string | null;
  publishedAt: string | null;
};

/** 초크포인트 slug → 보험 해역 */
export const WAR_RISK_REGION_BY_SLUG: Record<string, string> = {
  "strait-of-hormuz": "hormuz",
  "bab-el-mandeb": "red-sea",
  "suez-canal": "red-sea",
  "turkish-straits": "black-sea",
  "taiwan-strait": "taiwan-strait",
  "strait-of-malacca": "malacca",
};

const ARROW: Record<string, string> = { up: "▲", down: "▼", flat: "■" };

function fmtUsd(n: number): string {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M` : `$${Math.round(n / 1000)}k`;
}

function fmtRate(q: Pick<Quote, "ratePct" | "rateHighPct">): string {
  return q.rateHighPct !== null ? `${q.ratePct}–${q.rateHighPct}%` : `${q.ratePct}%`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default function WarRiskQuotes({ slug }: { slug: string }) {
  const en = useLandingLanguage() === "en";
  const region = WAR_RISK_REGION_BY_SLUG[slug];
  const [quotes, setQuotes] = useState<Quote[] | null>(null);

  useEffect(() => {
    if (!region) return;
    let alive = true;
    fetch(`/api/war-risk?region=${region}&days=180`)
      .then((r) => (r.ok ? (r.json() as Promise<{ quotes?: Quote[] }>) : { quotes: [] as Quote[] }))
      .then((d) => {
        if (alive) setQuotes(Array.isArray(d.quotes) ? d.quotes : []);
      })
      .catch(() => alive && setQuotes([]));
    return () => {
      alive = false;
    };
  }, [region]);

  if (!region) return null;

  const latest =
    quotes?.find((q) => q.ratePct !== null && q.confidence === "strong") ??
    quotes?.find((q) => q.ratePct !== null) ??
    null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-white">War-risk insurance, as reported</h2>
      <p className="mt-1 text-sm text-white/45">{en ? "War-risk premium, as reported" : "보도 기준 전쟁위험 보험료"}</p>

      {quotes === null ? (
        <p className="mt-4 text-sm text-white/40">Loading…</p>
      ) : quotes.length === 0 ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">
          No premium figure has been reported for this area in the last 180 days.
          {en ? null : (
            <span className="mt-1 block text-white/40">최근 180일간 이 해역의 보험료 수치가 보도된 기사가 없습니다.</span>
          )}
        </p>
      ) : (
        <>
          {latest ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-white/40">Latest reported rate</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {fmtRate(latest)} <span className="text-base font-normal text-white/60">of hull value</span>
                {latest.direction ? (
                  <span
                    className={`ml-2 text-base ${latest.direction === "up" ? "text-red-400" : latest.direction === "down" ? "text-emerald-400" : "text-white/50"}`}
                  >
                    {ARROW[latest.direction]}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {fmtDate(latest.publishedAt)} · {latest.outlet ?? "news"}
                {latest.ratePrevPct !== null ? ` · previously ${latest.ratePrevPct}%` : ""}
                {en
                  ? ` · ${fmtRate(latest)} of hull value — about ${fmtUsd(((latest.rateHighPct ?? latest.ratePct ?? 0) / 100) * 100_000_000)} per voyage on a $100 million ship`
                  : ` · 선가 대비 ${fmtRate(latest)} — 선가 1억 달러 배라면 항차당 약 ${fmtUsd(((latest.rateHighPct ?? latest.ratePct ?? 0) / 100) * 100_000_000)}`}
              </p>
            </div>
          ) : null}

          <ul className="mt-4 divide-y divide-white/10 rounded-lg border border-white/10">
            {quotes.slice(0, 10).map((q) => (
              <li key={q.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="tabular-nums text-white/40">{fmtDate(q.publishedAt)}</span>
                  {q.ratePct !== null ? (
                    <span className="font-medium text-white">
                      {q.ratePrevPct !== null ? `${q.ratePrevPct}% → ` : ""}
                      {fmtRate(q)}
                    </span>
                  ) : null}
                  {q.usdPerVoyage !== null ? (
                    <span className="font-medium text-white">{fmtUsd(q.usdPerVoyage)}/voyage</span>
                  ) : null}
                  {q.direction ? <span className="text-white/50">{ARROW[q.direction]}</span> : null}
                  {q.confidence === "medium" ? (
                    <span className="rounded border border-white/15 px-1.5 text-micro uppercase text-white/40">
                      unclear basis
                    </span>
                  ) : null}
                  {q.confidence === "headline" ? (
                    <span className="rounded border border-white/15 px-1.5 text-micro uppercase text-white/40">
                      no figure
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-white/60">“{q.quote}”</p>
                <a
                  href={q.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-white/40 underline underline-offset-4 hover:text-white/70"
                >
                  {q.outlet ?? "Source"} — {q.headline}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-3 text-xs leading-relaxed text-white/35">
        These are figures quoted in news reports, not a live market price. Actual war-risk quotes vary by
        vessel, owner, flag and broker, and are usually set per voyage.
        {en ? null : (
          <span className="block">
            시세가 아니라 기사에 실린 수치입니다. 실제 견적은 선박·선주·국적·브로커마다 다르고 보통 항차별로 정해집니다.
          </span>
        )}
      </p>
    </section>
  );
}
