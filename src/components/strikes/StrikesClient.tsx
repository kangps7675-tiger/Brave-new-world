"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MatchStatus, ScoredCandidate } from "@/lib/strikeMatch/scoreCandidates";
import {
  WAR_RISK_REGION_LABEL_KO,
  WAR_RISK_REGION_PAGE,
} from "@/lib/warRisk/regionGeo";
import type { WarRiskRegionId } from "@/lib/warRisk/extractPremium";

type Strike = {
  incident: {
    id: string;
    typeName: string;
    occurredAt: string;
    lat: number;
    lng: number;
    place: string | null;
    region: string | null;
    reportedVesselName: string | null;
    reportedVesselType: string | null;
    detail: string | null;
  };
  status: MatchStatus;
  top: ScoredCandidate | null;
  candidates: ScoredCandidate[];
  nearbyCount: number;
  limits: string[];
  trackSource: string;
  warRiskRegion: WarRiskRegionId;
};

type Quote = {
  region: string;
  ratePct: number | null;
  rateHighPct: number | null;
  confidence: string;
  outlet: string | null;
  url: string;
  publishedAt: string | null;
};

const STATUS: Record<MatchStatus, { ko: string; cls: string; hint: string }> = {
  confirmed: {
    ko: "확인",
    cls: "border-rose-400/40 bg-rose-500/15 text-rose-200",
    hint: "경보 선명과 AIS 선명이 같고, 그 시각 근처에 있었음",
  },
  likely: {
    ko: "유력",
    cls: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    hint: "근처에서 사건 직후 멈춤·방향 전환·신호 끊김이 있던 배가 하나로 좁혀짐",
  },
  ambiguous: {
    ko: "못 좁힘",
    cls: "border-white/20 bg-white/5 text-white/60",
    hint: "근처에 배는 있었지만 어느 배인지 하나로 단정할 근거가 부족",
  },
  unknown: {
    ko: "항적 없음",
    cls: "border-white/10 bg-transparent text-white/40",
    hint: "사건 주변 AIS 기록이 없음 (수신 공백일 수 있음)",
  },
};

const VERDICT_KO: Record<ScoredCandidate["verdict"], string> = {
  confirmed: "확인",
  likely: "유력",
  possible: "근처",
};

function fmtWhen(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function fmtRate(q: Quote): string {
  return q.rateHighPct !== null ? `${q.ratePct}–${q.rateHighPct}%` : `${q.ratePct}%`;
}

function CandidateRow({ c, first }: { c: ScoredCandidate; first?: boolean }) {
  return (
    <div className={first ? "" : "border-t border-white/10 pt-3"}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium text-white">{c.name || "선명 미수신"}</span>
        <span className="text-xs tabular-nums text-white/45">
          MMSI {c.mmsi}
          {c.imo ? ` · IMO ${c.imo}` : " · IMO 미수신"}
        </span>
        <span className="rounded border border-white/15 px-1.5 text-micro text-white/55">{VERDICT_KO[c.verdict]}</span>
      </div>
      <ul className="mt-1.5 space-y-0.5 text-sm text-white/60">
        {c.signals
          .filter((s) => s.weight !== 0)
          .map((s) => (
            <li key={s.key} className={s.weight < 0 ? "text-white/35" : ""}>
              {s.weight < 0 ? "− " : "+ "}
              {s.ko}
            </li>
          ))}
      </ul>
    </div>
  );
}

function StrikeCard({ s, latestQuote }: { s: Strike; latestQuote: Quote | null }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Strike | null>(null);
  const [loading, setLoading] = useState(false);
  const view = detail ?? s;
  const st = STATUS[view.status];
  const others = view.candidates.slice(1);
  const regionPage = WAR_RISK_REGION_PAGE[view.warRiskRegion];

  const loadDetail = () => {
    setOpen(true);
    if (detail || loading) return;
    setLoading(true);
    fetch(`/api/strikes/${encodeURIComponent(s.incident.id)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ strike?: Strike }>) : { strike: undefined }))
      .then((d) => d.strike && setDetail(d.strike))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tabular-nums text-white/45">
            {fmtWhen(view.incident.occurredAt)} · {view.incident.typeName}
            {view.incident.reportedVesselType ? ` · ${view.incident.reportedVesselType}` : ""}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {view.incident.place || view.incident.region || `${view.incident.lat.toFixed(2)}, ${view.incident.lng.toFixed(2)}`}
          </h2>
        </div>
        <span title={st.hint} className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium ${st.cls}`}>
          {st.ko}
        </span>
      </div>

      {view.incident.detail ? (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/55">{view.incident.detail}</p>
      ) : null}

      <section className="mt-4">
        <p className="text-xs uppercase tracking-wide text-white/40">
          맞은 배 후보 {view.nearbyCount > 0 ? `· 근처 ${view.nearbyCount}척 중` : ""}
        </p>
        <div className="mt-2">
          {view.top && view.status !== "unknown" ? (
            <CandidateRow c={view.top} first />
          ) : (
            <p className="text-sm text-white/45">{st.hint}</p>
          )}
        </div>
        {open && others.length ? (
          <div className="mt-3 space-y-3">
            {others.map((c) => (
              <CandidateRow key={c.mmsi} c={c} />
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {!open ? (
            <button type="button" onClick={loadDetail} className="text-white/55 underline underline-offset-4 hover:text-white">
              {others.length ? `다른 후보·근거 자세히` : "근거 자세히"}
            </button>
          ) : loading ? (
            <span className="text-white/40">불러오는 중…</span>
          ) : null}
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm">
        <span className="text-white/45">{WAR_RISK_REGION_LABEL_KO[view.warRiskRegion]} 전쟁위험 보험료 · </span>
        {latestQuote ? (
          <>
            <span className="font-medium text-white">보도 기준 선가의 {fmtRate(latestQuote)}</span>
            <span className="text-white/45">
              {" "}
              ({latestQuote.publishedAt?.slice(0, 10) ?? "날짜 미상"}, {latestQuote.outlet ?? "기사"})
            </span>
          </>
        ) : (
          <span className="text-white/45">최근 보도된 수치 없음</span>
        )}
        {regionPage ? (
          <Link href={regionPage} className="ml-2 text-xs text-white/50 underline underline-offset-4 hover:text-white">
            추이 보기
          </Link>
        ) : null}
      </section>

      {open && view.limits.length ? (
        <ul className="mt-3 space-y-0.5 text-xs text-white/40">
          {view.limits.map((l) => (
            <li key={l}>· {l}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export default function StrikesClient() {
  const [strikes, setStrikes] = useState<Strike[] | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/strikes?days=60&limit=15")
      .then((r) => (r.ok ? (r.json() as Promise<{ strikes?: Strike[] }>) : { strikes: [] as Strike[] }))
      .then((d) => alive && setStrikes(Array.isArray(d.strikes) ? d.strikes : []))
      .catch(() => alive && setStrikes([]));
    fetch("/api/war-risk?days=180")
      .then((r) => (r.ok ? (r.json() as Promise<{ quotes?: Quote[] }>) : { quotes: [] as Quote[] }))
      .then((d) => alive && setQuotes(Array.isArray(d.quotes) ? d.quotes : []))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  /** 해역별 최신 보도 요율 — hull value 가 명시된(strong) 것 우선 */
  const latestByRegion = useMemo(() => {
    const m = new Map<string, Quote>();
    const sorted = [...quotes]
      .filter((q) => q.ratePct !== null)
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    for (const q of sorted) {
      const prev = m.get(q.region);
      // 최신순으로 훑으며, 처음 본 것을 두되 이후 strong 이 나오면 한 번만 교체
      if (!prev || (prev.confidence !== "strong" && q.confidence === "strong")) m.set(q.region, q);
    }
    return m;
  }, [quotes]);

  const counts = useMemo(() => {
    const c: Record<MatchStatus, number> = { confirmed: 0, likely: 0, ambiguous: 0, unknown: 0 };
    for (const s of strikes ?? []) c[s.status] += 1;
    return c;
  }, [strikes]);

  if (strikes === null) return <p className="mt-10 text-sm text-white/40">불러오는 중…</p>;
  if (strikes.length === 0) {
    return (
      <p className="mt-10 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">
        최근 60일간 공개된 상선 피격 경보가 없습니다.
      </p>
    );
  }

  return (
    <>
      <p className="mt-8 text-sm text-white/50">
        최근 60일 피격 경보 {strikes.length}건 — 확인 {counts.confirmed} · 유력 {counts.likely} · 못 좁힘{" "}
        {counts.ambiguous} · 항적 없음 {counts.unknown}
      </p>
      <div className="mt-4 space-y-4">
        {strikes.map((s) => (
          <StrikeCard key={s.incident.id} s={s} latestQuote={latestByRegion.get(s.warRiskRegion) ?? null} />
        ))}
      </div>
    </>
  );
}
