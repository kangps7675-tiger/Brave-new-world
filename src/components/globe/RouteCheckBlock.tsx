"use client";

import { useState } from "react";
import { useRouteCheck } from "@/hooks/useRouteCheck";
import { ACTOR_LABEL, type Actor } from "@/lib/attackActor";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { PORTS } from "@/lib/routeCheck";
import type { SeaStance } from "@/lib/seaBrief";

const STANCE: Record<SeaStance, { ko: string; en: string; cls: string }> = {
  avoid: { ko: "우회 검토", en: "Consider rerouting", cls: "bg-rose-600 text-white" },
  caution: { ko: "주의하며 통항", en: "Transit with caution", cls: "bg-amber-500 text-black" },
  normal: { ko: "특이 신호 없음", en: "No notable signal", cls: "bg-emerald-600 text-white" },
  nodata: { ko: "자료 없음", en: "No data", cls: "bg-slate-600 text-white" },
};

const selectCls = "min-w-0 flex-1 rounded-sm border border-sky-300/25 bg-black/40 px-1 py-1 text-micro text-sky-50";

type Props = { lang: LabelLanguage; onShowRoute?: (lat: number, lng: number) => void };

/** 출발·도착 항구를 고르면 그 항로 위(40해리)의 최근 사건과 항행경보를 모아 준다. */
export function RouteCheckBlock({ lang, onShowRoute }: Props) {
  const en = lang === "en";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { loading, brief } = useRouteCheck(from, to);
  const name = (p: { ko: string; en: string }) => (en ? p.en : p.ko);
  const opts = PORTS.map((p) => (
    <option key={p.id} value={p.id}>
      {name(p)}
    </option>
  ));
  const st = brief ? STANCE[brief.stance] : null;
  const actorParts = brief
    ? (Object.keys(brief.actors) as Actor[]).filter((a) => brief.actors[a] > 0).map((a) => `${en ? ACTOR_LABEL[a].en : ACTOR_LABEL[a].ko} ${brief.actors[a]}`)
    : [];

  return (
    <div className="border-t border-sky-300/15 pt-3" data-route-check>
      <p className="mb-1 text-micro font-semibold text-sky-200/80">{en ? "Route check" : "항로 확인"}</p>
      <div className="flex items-center gap-1">
        <select value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls} aria-label={en ? "From" : "출발"}>
          <option value="">{en ? "From…" : "출발 항구"}</option>
          {opts}
        </select>
        <span className="text-micro text-sky-100/60">→</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} className={selectCls} aria-label={en ? "To" : "도착"}>
          <option value="">{en ? "To…" : "도착 항구"}</option>
          {opts}
        </select>
      </div>
      {from && to && from === to ? <p className="mt-1 text-micro text-sky-100/60">{en ? "Pick two different ports." : "서로 다른 항구를 고르세요."}</p> : null}
      {loading ? <p className="mt-1 text-micro text-sky-100/60">{en ? "Checking…" : "확인 중…"}</p> : null}
      {brief && st ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className={`rounded-sm px-2 py-1 text-caption font-bold ${st.cls}`}>{en ? st.en : st.ko}</span>
            <span className="text-micro text-sky-100/70">
              {en ? `~${brief.lengthNm} nm · within ${brief.bufferNm} nm of the lane` : `약 ${brief.lengthNm}해리 · 항로 ${brief.bufferNm}해리 안`}
            </span>
          </div>
          <p className="text-meta text-sky-50/95">
            {en
              ? `Last 30 days: ${brief.strikes30d} attack/boarding/hijack (prev 30 days: ${brief.strikesPrev30d})`
              : `최근 30일 피격·나포·승선 ${brief.strikes30d}건 (직전 30일 ${brief.strikesPrev30d}건)`}
            {actorParts.length ? ` — ${en ? "actors" : "주체"}: ${actorParts.join(" · ")}` : ""}
          </p>
          {brief.recent.length > 0 ? (
            <ul className="space-y-1">
              {brief.recent.map((r) => (
                <li key={r.id} className="rounded-sm bg-sky-950/50 px-2 py-1 text-micro text-sky-100/90" title={r.evidence}>
                  {(r.at ?? "").slice(5, 10)} · {r.type}
                  {r.vesselType ? ` · ${r.vesselType}` : ""} · {en ? `${r.distanceNm} nm off lane` : `항로에서 ${r.distanceNm}해리`} ·{" "}
                  <span className="font-semibold">{en ? ACTOR_LABEL[r.actor].en : ACTOR_LABEL[r.actor].ko}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-micro text-sky-100/70">{en ? "No incidents within the lane buffer in the data." : "항로 근처에 자료상 사건이 없습니다."}</p>
          )}
          {brief.warnings.length > 0 ? (
            <div>
              <p className="text-micro font-semibold text-sky-200/80">{en ? "Navigation warnings nearby" : "근처 항행경보"}</p>
              <ul className="list-disc space-y-0.5 pl-4 text-micro text-sky-100/80">
                {brief.warnings.map((w) => (
                  <li key={w.id}>
                    {w.areaHint ? `${w.areaHint} — ` : ""}
                    {w.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            type="button"
            className="rounded-sm bg-sky-500/25 px-2 py-1 text-micro"
            onClick={() => onShowRoute?.((brief.from.lat + brief.to.lat) / 2, (brief.from.lng + brief.to.lng) / 2)}
          >
            {en ? "Center map on lane" : "지도를 항로 가운데로"}
          </button>
          <ul className="list-disc space-y-0.5 pl-4 text-micro leading-snug text-sky-100/55">
            {brief.limits.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
