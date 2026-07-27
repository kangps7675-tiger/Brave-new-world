"use client";

import type { DisputeHotspotEntry } from "@/lib/disputeHotspots";
import type { LabelLanguage } from "@/lib/layerPrefs";

type DisputeHotspotPanelProps = {
  hotspots: DisputeHotspotEntry[];
  selectedId: string | null;
  lang?: LabelLanguage;
  onSelect: (hotspot: DisputeHotspotEntry) => void;
  onClose: () => void;
};

const TENSION_LABEL: Record<DisputeHotspotEntry["tension"], { ko: string; en: string; dot: string }> = {
  high: { ko: "고위험·실전투 근접", en: "High · combat-adjacent", dot: "bg-rose-400" },
  medium: { ko: "중긴장", en: "Medium tension", dot: "bg-amber-400" },
  low: { ko: "저긴장", en: "Low tension", dot: "bg-slate-400" },
};

/** 국경·영토 분쟁 (LSIB) 핫스팟 — disputes.json 실제 폴리곤 × 한국어 큐레이션 개요 매칭 35건 */
export function DisputeHotspotPanel({
  hotspots,
  selectedId,
  lang = "ko",
  onSelect,
  onClose,
}: DisputeHotspotPanelProps) {
  const en = lang === "en";

  return (
    <aside
      id="dispute-hotspot-panel"
      className="pointer-events-auto absolute right-3 top-20 z-40 flex max-h-[min(78vh,560px)] w-[min(94vw,340px)] flex-col overflow-hidden rounded-2xl border border-rose-300/25 bg-[#160d10]/92 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-2 border-b border-rose-200/10 px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-rose-200/60">
            {en ? "LSIB v11.4 · US Dept. of State" : "LSIB v11.4 · 미 국무부 경계 데이터"}
          </p>
          <h2 className="mt-0.5 text-sm font-medium text-rose-50">
            {en ? `Territorial disputes · ${hotspots.length} sites` : `국경·영토 분쟁 · ${hotspots.length}건`}
          </h2>
          <p className="mt-1 text-[10px] leading-4 text-rose-100/45">
            {en
              ? "Real dispute polygons matched with curated overviews — no invented coordinates."
              : "실제 분쟁 폴리곤과 큐레이션 개요를 매칭한 실데이터 — 지어낸 좌표 없음."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-rose-300/25 px-2 py-1 text-[10px] text-rose-100/70 transition hover:border-rose-200/40 hover:text-rose-50"
        >
          {en ? "Exit" : "나가기"}
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 py-2">
        {hotspots.length === 0 ? (
          <p className="px-2 py-4 text-xs text-rose-100/45">
            {en ? "Loading dispute data…" : "분쟁 데이터를 불러오는 중…"}
          </p>
        ) : (
          hotspots.map((hotspot) => {
            const active = selectedId === hotspot.id;
            const tensionMeta = TENSION_LABEL[hotspot.tension];
            return (
              <button
                key={hotspot.id}
                type="button"
                onClick={() => onSelect(hotspot)}
                className={`block w-full rounded-lg border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-rose-300/45 bg-rose-500/20"
                    : "border-rose-200/10 bg-rose-500/5 hover:bg-rose-500/10"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-medium text-rose-50">{hotspot.name}</p>
                  <span className="flex shrink-0 items-center gap-1 text-[9px] text-rose-200/55">
                    <span className={`h-1.5 w-1.5 rounded-full ${tensionMeta.dot}`} />
                    {en ? tensionMeta.en : tensionMeta.ko}
                  </span>
                </div>
                {hotspot.parties.length > 0 ? (
                  <p className="mt-0.5 text-[10px] text-amber-200/85">
                    {hotspot.parties.join(" vs ")}
                  </p>
                ) : null}
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-rose-100/55">
                  {hotspot.overviewKo}
                </p>
              </button>
            );
          })
        )}
      </div>

      <p className="border-t border-rose-200/10 px-3 py-2 text-[9px] leading-4 text-rose-100/40">
        {en
          ? "Points mark real dispute-area centers from public boundary/geodata sources. LSIB rank 1 = official boundary, rank 2/3 = disputed or unilateral claim lines."
          : "좌표는 공개 경계·지리 데이터의 실제 분쟁구역 중심점입니다. LSIB RANK 1=공식 국경, 2/3=분쟁·일방적 주장선."}
      </p>
    </aside>
  );
}
