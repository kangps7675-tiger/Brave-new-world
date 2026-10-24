"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MatchStatus, ScoredCandidate } from "@/lib/strikeMatch/scoreCandidates";
import type { CandidateWeather } from "@/lib/strikeSnapshot";
import { useLandingLanguage } from "@/lib/landingLanguage";
import { seaStateEn } from "@/lib/marineWeather/gfsWave";
import { strikeLimitEn } from "@/lib/strikeMatch/limitCopy";
import {
  WAR_RISK_REGION_LABEL_EN,
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
  top: (ScoredCandidate & { weather?: CandidateWeather }) | null;
  candidates: Array<ScoredCandidate & { weather?: CandidateWeather }>;
  nearbyCount: number;
  limits: string[];
  /** 선명을 기사에서 가져와 AIS 위치로 검증한 경우의 출처 */
  nameSource?: {
    name: string;
    outlets: number;
    distKm: number | null;
    sources: Array<{ url: string; outlet: string | null; headline: string; publishedAt: string | null }>;
  };
  trackSource: string;
  warRiskRegion: WarRiskRegionId;
  /** 사건 시각 근처 해상 분석값(NOAA GFS-Wave) — 없으면 null */
  seaAtIncident?: {
    pointId: string;
    distKm: number;
    validTime: string;
    offsetMin: number;
    hsM: number | null;
    periodS: number | null;
    windKn: number | null;
    windDirDeg: number | null;
    beaufort: number | null;
    seaStateKo: string | null;
  } | null;
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

const STATUS: Record<MatchStatus, { ko: string; en: string; cls: string; hintKo: string; hintEn: string }> = {
  confirmed: {
    ko: "확인",
    en: "Confirmed",
    cls: "border-rose-400/40 bg-rose-500/15 text-rose-200",
    hintKo: "경보 선명과 AIS 선명이 같고, 그 시각 근처에 있었음",
    hintEn: "The name in the alert matches AIS, and the ship was nearby at that time",
  },
  likely: {
    ko: "유력",
    en: "Likely",
    cls: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    hintKo: "근처에서 사건 직후 멈춤·방향 전환·신호 끊김이 있던 배가 하나로 좁혀짐",
    hintEn: "One nearby ship stopped, turned, or went dark right after the event",
  },
  ambiguous: {
    ko: "못 좁힘",
    en: "Unclear",
    cls: "border-white/20 bg-white/5 text-white/60",
    hintKo: "근처에 배는 있었지만 어느 배인지 하나로 단정할 근거가 부족",
    hintEn: "Ships were nearby, but there is not enough to name one",
  },
  unknown: {
    ko: "항적 없음",
    en: "No track",
    cls: "border-white/10 bg-transparent text-white/40",
    hintKo: "사건 주변 AIS 기록이 없음 (수신 공백일 수 있음)",
    hintEn: "No AIS record around the incident (a reception gap is possible)",
  },
};

const VERDICT: Record<ScoredCandidate["verdict"], { ko: string; en: string }> = {
  confirmed: { ko: "확인", en: "Confirmed" },
  likely: { ko: "유력", en: "Likely" },
  possible: { ko: "근처", en: "Nearby" },
};

function fmtWhen(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function fmtRate(q: Quote): string {
  return q.rateHighPct !== null ? `${q.ratePct}–${q.rateHighPct}%` : `${q.ratePct}%`;
}

function weatherLine(w: CandidateWeather, en: boolean): string | null {
  const parts = [
    w.waveHeightM != null ? (en ? `Waves ${w.waveHeightM.toFixed(1)} m` : `파고 ${w.waveHeightM.toFixed(1)} m`) : null,
    w.windKn != null ? (en ? `Wind ${w.windKn} kn` : `바람 ${w.windKn} kn`) : null,
    w.visibilityKm != null
      ? en
        ? `Visibility ${w.visibilityKm >= 10 ? Math.round(w.visibilityKm) : w.visibilityKm.toFixed(1)} km`
        : `시정 ${w.visibilityKm >= 10 ? Math.round(w.visibilityKm) : w.visibilityKm.toFixed(1)} km`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function CandidateRow({
  c,
  first,
  en,
}: {
  c: ScoredCandidate & { weather?: CandidateWeather };
  first?: boolean;
  en: boolean;
}) {
  const wx = c.weather ? weatherLine(c.weather, en) : null;
  return (
    <div className={first ? "" : "border-t border-white/10 pt-3"}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium text-white">{c.name || (en ? "Name not received" : "선명 미수신")}</span>
        <span className="text-xs tabular-nums text-white/45">
          MMSI {c.mmsi}
          {c.imo ? ` · IMO ${c.imo}` : en ? " · IMO not received" : " · IMO 미수신"}
        </span>
        <span className="rounded border border-white/15 px-1.5 text-micro text-white/55">
          {en ? VERDICT[c.verdict].en : VERDICT[c.verdict].ko}
        </span>
      </div>
      <ul className="mt-1.5 space-y-0.5 text-sm text-white/60">
        {c.signals
          .filter((s) => s.weight !== 0)
          .map((s) => (
            <li key={s.key} className={s.weight < 0 ? "text-white/35" : ""}>
              {s.weight < 0 ? "− " : "+ "}
              {en ? s.en ?? s.ko : s.ko}
            </li>
          ))}
      </ul>
      {wx ? (
        <p className="mt-1.5 text-xs text-white/45">
          {en ? "Sea at this ship · " : "이 배 위치의 바다 · "}
          {wx}
          {c.weather?.at
            ? en
              ? ` (Datalastic, ${c.weather.at.slice(5, 16).replace("T", " ")} UTC — not the value at the moment of the incident)`
              : ` (Datalastic, ${c.weather.at.slice(5, 16).replace("T", " ")} UTC 조회값 — 사건 순간의 값이 아님)`
            : ""}
        </p>
      ) : null}
    </div>
  );
}

function StrikeCard({ s, latestQuote }: { s: Strike; latestQuote: Quote | null }) {
  const en = useLandingLanguage() === "en";
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
        <span title={en ? st.hintEn : st.hintKo} className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium ${st.cls}`}>
          {en ? st.en : st.ko}
        </span>
      </div>

      {view.incident.detail ? (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/55">{view.incident.detail}</p>
      ) : null}

      <section className="mt-4">
        <p className="text-xs uppercase tracking-wide text-white/40">
          {en
            ? `Hit candidate${view.nearbyCount > 0 ? ` · of ${view.nearbyCount} nearby` : ""}`
            : `맞은 배 후보 ${view.nearbyCount > 0 ? `· 근처 ${view.nearbyCount}척 중` : ""}`}
        </p>
        <div className="mt-2">
          {view.top && view.status !== "unknown" ? (
            <CandidateRow c={view.top} first en={en} />
          ) : (
            <p className="text-sm text-white/45">{en ? st.hintEn : st.hintKo}</p>
          )}
        </div>
        {view.nameSource && view.status === "confirmed" ? (
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            {en
              ? `Name source · ${view.nameSource.outlets} press reports, checked against AIS`
              : `선명 출처 · 기사 ${view.nameSource.outlets}곳 보도, AIS 위치로 검증`}
            {view.nameSource.sources.slice(0, 3).map((src) => (
              <span key={src.url}>
                {" · "}
                <a href={src.url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4 hover:text-white">
                  {src.outlet || (en ? "article" : "기사")}
                </a>
              </span>
            ))}
          </p>
        ) : null}
        {open && others.length ? (
          <div className="mt-3 space-y-3">
            {others.map((c) => (
              <CandidateRow key={c.mmsi} c={c} en={en} />
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {!open ? (
            <button type="button" onClick={loadDetail} className="text-white/55 underline underline-offset-4 hover:text-white">
              {others.length
                ? en
                  ? "Other candidates and evidence"
                  : "다른 후보·근거 자세히"
                : en
                  ? "More evidence"
                  : "근거 자세히"}
            </button>
          ) : loading ? (
            <span className="text-white/40">{en ? "Loading…" : "불러오는 중…"}</span>
          ) : null}
        </div>
      </section>

      <p className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm">
        <span className="text-white/45">{en ? "Sea at the incident · " : "사건 당시 바다 · "}</span>
        {view.seaAtIncident ? (
          <>
            <span className="font-medium text-white">
              {view.seaAtIncident.hsM != null
                ? en
                  ? `Waves ${view.seaAtIncident.hsM.toFixed(1)} m`
                  : `파고 ${view.seaAtIncident.hsM.toFixed(1)} m`
                : en
                  ? "No wave data"
                  : "파고 자료 없음"}
              {view.seaAtIncident.hsM != null
                ? ` (${en ? seaStateEn(view.seaAtIncident.hsM) ?? "" : view.seaAtIncident.seaStateKo ?? ""})`.replace(" ()", "")
                : ""}
              {view.seaAtIncident.windKn != null
                ? en
                  ? ` · Wind ${view.seaAtIncident.windKn} kn`
                  : ` · 바람 ${view.seaAtIncident.windKn} kn`
                : ""}
            </span>
            <span className="text-white/45">
              {" "}
              {en
                ? `(model value, representative point about ${view.seaAtIncident.distKm} km from the site · ${view.seaAtIncident.validTime.slice(5, 16).replace("T", " ")} UTC)`
                : `(모델 분석값, 사건 지점에서 약 ${view.seaAtIncident.distKm} km 떨어진 대표 지점 · ${view.seaAtIncident.validTime.slice(5, 16).replace("T", " ")} UTC)`}
            </span>
          </>
        ) : (
          <span className="text-white/45">
            {en ? "No data (that does not mean the sea was calm)" : "자료 없음 (없다는 뜻이지 잔잔했다는 뜻이 아닙니다)"}
          </span>
        )}
      </p>

      <section className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm">
        <span className="text-white/45">
          {en ? WAR_RISK_REGION_LABEL_EN[view.warRiskRegion] : WAR_RISK_REGION_LABEL_KO[view.warRiskRegion]}
          {en ? " war-risk · " : " 전쟁위험 보험료 · "}
        </span>
        {latestQuote ? (
          <>
            <span className="font-medium text-white">
              {en ? `${fmtRate(latestQuote)} of hull value, as reported` : `보도 기준 선가의 ${fmtRate(latestQuote)}`}
            </span>
            <span className="text-white/45">
              {" "}
              ({latestQuote.publishedAt?.slice(0, 10) ?? (en ? "undated" : "날짜 미상")}, {latestQuote.outlet ?? (en ? "press" : "기사")})
            </span>
          </>
        ) : (
          <span className="text-white/45">{en ? "No recent reported figure" : "최근 보도된 수치 없음"}</span>
        )}
        {regionPage ? (
          <Link href={regionPage} className="ml-2 text-xs text-white/50 underline underline-offset-4 hover:text-white">
            {en ? "See the trend" : "추이 보기"}
          </Link>
        ) : null}
      </section>

      {open && view.limits.length ? (
        <ul className="mt-3 space-y-0.5 text-xs text-white/40">
          {view.limits.map((l) => (
            <li key={l}>· {en ? strikeLimitEn(l) : l}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export default function StrikesClient() {
  const en = useLandingLanguage() === "en";
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

  if (strikes === null) return <p className="mt-10 text-sm text-white/40">{en ? "Loading…" : "불러오는 중…"}</p>;
  if (strikes.length === 0) {
    return (
      <p className="mt-10 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">
        {en ? "No public merchant-ship attack alerts in the last 60 days." : "최근 60일간 공개된 상선 피격 경보가 없습니다."}
      </p>
    );
  }

  return (
    <>
      <p className="mt-8 text-sm text-white/50">
        {en
          ? `${strikes.length} attack alerts in 60 days — confirmed ${counts.confirmed} · likely ${counts.likely} · unclear ${counts.ambiguous} · no track ${counts.unknown}`
          : `최근 60일 피격 경보 ${strikes.length}건 — 확인 ${counts.confirmed} · 유력 ${counts.likely} · 못 좁힘 ${counts.ambiguous} · 항적 없음 ${counts.unknown}`}
      </p>
      <div className="mt-4 space-y-4">
        {strikes.map((s) => (
          <StrikeCard key={s.incident.id} s={s} latestQuote={latestByRegion.get(s.warRiskRegion) ?? null} />
        ))}
      </div>
    </>
  );
}
