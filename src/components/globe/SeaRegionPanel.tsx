"use client";

import { useState } from "react";
import { useSeaBrief } from "@/hooks/useSeaBrief";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { SEA_REGIONS, SEA_REGION_VIEW, type SeaRegion, type SeaStance, type SeaTrend } from "@/lib/seaBrief";
import { zc } from "@/lib/uiStack";
import { WAR_RISK_REGION_LABEL_KO } from "@/lib/warRisk/regionGeo";

const LABEL_EN: Record<SeaRegion, string> = {
  "red-sea": "Red Sea · Gulf of Aden",
  hormuz: "Hormuz · Gulf",
  "black-sea": "Black Sea",
  "taiwan-strait": "Taiwan Strait",
  malacca: "Malacca",
};

const STANCE: Record<SeaStance, { ko: string; en: string; cls: string }> = {
  avoid: { ko: "우회 검토", en: "Consider rerouting", cls: "bg-rose-600 text-white" },
  caution: { ko: "주의하며 통항", en: "Transit with caution", cls: "bg-amber-500 text-black" },
  normal: { ko: "특이 신호 없음", en: "No notable signal", cls: "bg-emerald-600 text-white" },
  nodata: { ko: "자료 없음", en: "No data", cls: "bg-slate-600 text-white" },
};

const TREND: Record<SeaTrend, { ko: string; en: string }> = {
  rising: { ko: "위험 커지는 중", en: "Rising" },
  easing: { ko: "잦아드는 중", en: "Easing" },
  flat: { ko: "비슷한 수준", en: "Flat" },
  quiet: { ko: "조용함", en: "Quiet" },
};

type Props = {
  lang: LabelLanguage;
  onGoToLocation: (lat: number, lng: number) => void;
};

/** 해역을 고르면 최근 피격·보험료·파고를 묶어 「지나가도 되나」를 한 장으로 답한다. */
export function SeaRegionPanel({ lang, onGoToLocation }: Props) {
  const en = lang === "en";
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<SeaRegion>("red-sea");
  const { loading, brief } = useSeaBrief(region, open);

  const pick = (r: SeaRegion) => {
    setRegion(r);
    const v = SEA_REGION_VIEW[r];
    onGoToLocation(v.lat, v.lng);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-sea-region-open
        className={`pointer-events-auto fixed bottom-16 left-3 rounded-md border border-sky-300/40 bg-[#0c1a30]/90 px-3 py-2 text-caption font-semibold text-sky-50 shadow-lg backdrop-blur hover:bg-[#12274a] ${zc("panel")}`}
      >
        {en ? "Sea check" : "해역 판단"}
      </button>
    );
  }

  const st = brief ? STANCE[brief.stance] : null;
  return (
    <aside
      className={`pointer-events-auto fixed bottom-16 left-3 flex max-h-[70vh] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-sky-300/25 bg-[#071422]/95 text-sky-50 shadow-2xl backdrop-blur ${zc("panel")}`}
      aria-label={en ? "Sea region check" : "해역 판단"}
      data-sea-region-panel
    >
      <header className="flex items-center justify-between border-b border-sky-300/15 px-3 py-2">
        <span className="text-caption font-semibold">{en ? "Is this sea passable now?" : "이 바다, 지금 지나다닐 만한가"}</span>
        <button type="button" onClick={() => setOpen(false)} aria-label={en ? "Close" : "닫기"} className="rounded px-2 text-sky-100/80 hover:bg-sky-500/20">
          ×
        </button>
      </header>
      <nav className="flex flex-wrap gap-1 border-b border-sky-300/15 px-2 py-1.5">
        {SEA_REGIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => pick(r)}
            aria-current={r === region}
            className={`rounded-sm px-2 py-1 text-micro ${r === region ? "bg-sky-500/35 font-semibold" : "bg-sky-950/40 hover:bg-sky-500/15"}`}
          >
            {en ? LABEL_EN[r] : WAR_RISK_REGION_LABEL_KO[r]}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {loading && !brief ? <p className="text-meta text-sky-100/70">{en ? "Loading…" : "불러오는 중…"}</p> : null}
        {brief && st ? (
          <>
            <div className="flex items-center gap-2">
              <span className={`rounded-sm px-2 py-1 text-caption font-bold ${st.cls}`}>{en ? st.en : st.ko}</span>
              <span className="text-meta text-sky-100/80">{en ? TREND[brief.trend].en : TREND[brief.trend].ko}</span>
            </div>
            <ul className="list-disc space-y-1 pl-4 text-meta leading-snug text-sky-50/95">
              {brief.reasons.map((x) => (
                <li key={x}>{x}</li>
              ))}
              {brief.premium?.url ? (
                <li>
                  <a href={brief.premium.url} target="_blank" rel="noreferrer" className="underline decoration-sky-300/50">
                    {en ? "Premium source" : "보험료 출처 보기"}
                  </a>
                </li>
              ) : null}
            </ul>
            <div>
              <p className="mb-1 text-micro font-semibold text-sky-200/80">{en ? "What this cannot tell you" : "이 판단이 말해 주지 못하는 것"}</p>
              <ul className="list-disc space-y-0.5 pl-4 text-micro leading-snug text-sky-100/65">
                {brief.limits.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}
