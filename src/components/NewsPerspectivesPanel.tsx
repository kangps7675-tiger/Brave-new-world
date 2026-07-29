"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import { EventMarketReactionCard } from "@/components/EventMarketReactionCard";
import type { TheaterMarketFilter } from "@/lib/theaterAssets";

export type NewsPerspectiveView = {
  title: string;
  link: string;
  source: string;
  trustTier: number;
};

type NewsPerspectivesPanelProps = {
  /** 사건 대표 제목 */
  headline: string;
  /** 위치 라벨 (예: "Damascus") */
  placeLabel?: string;
  kind: "war" | "tension" | "diplomatic";
  perspectives: NewsPerspectiveView[];
  /** 전장 — 관련 시장 반응 조회용 (전쟁과 이익을 한 화면에) */
  theater?: TheaterMarketFilter;
  /** 사건 경과 시간(분). 시장 반응 판정 기준 */
  ageMinutes?: number;
  /** 지경학이면 사건↔시장 라벨 */
  viewerMode?: "conflict" | "economy";
  lang: LabelLanguage;
  onClose: () => void;
};

const KIND_LABEL: Record<string, { ko: string; en: string; color: string }> = {
  war: { ko: "전쟁·전선", en: "War / front", color: "#f87171" },
  tension: { ko: "긴장", en: "Tension", color: "#fbbf24" },
  diplomatic: { ko: "외교", en: "Diplomatic", color: "#60a5fa" },
};

function tierBadge(tier: number, lang: LabelLanguage): { label: string; color: string } {
  const en = lang === "en";
  if (tier === 1) return { label: en ? "Wire/Tier-1" : "통신·1급", color: "#34d399" };
  if (tier === 2) return { label: en ? "Established" : "주요매체", color: "#93c5fd" };
  return { label: en ? "State/Unverified" : "국영·미검증", color: "#fca5a5" };
}

/** 한 사건을 여러 매체가 어떻게 보도했는지 — 관점 조합 패널 */
export function NewsPerspectivesPanel({
  headline,
  placeLabel,
  kind,
  perspectives,
  theater,
  ageMinutes,
  viewerMode = "conflict",
  lang,
  onClose,
}: NewsPerspectivesPanelProps) {
  const en = lang === "en";
  const k = KIND_LABEL[kind] ?? KIND_LABEL.tension;

  return (
    <aside
      className="pointer-events-auto absolute right-3 top-[5.75rem] z-[120] flex max-h-[min(72vh,560px)] w-[min(94vw,380px)] flex-col overflow-hidden rounded-2xl border border-slate-500/25 bg-[#0b1020]/95 shadow-2xl backdrop-blur-xl"
      role="dialog"
      aria-modal="false"
      aria-label={en ? "News perspectives" : "사건 관점 모음"}
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-500/15 px-3.5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ color: k.color, border: `1px solid ${k.color}55` }}
            >
              {en ? k.en : k.ko}
            </span>
            {placeLabel ? (
              <span className="text-[11px] text-slate-400">📍 {placeLabel}</span>
            ) : null}
            <span className="text-[11px] text-slate-500">
              · {en ? `${perspectives.length} sources` : `${perspectives.length}개 매체`}
            </span>
          </div>
          <h2 className="mt-1.5 text-[13px] font-semibold leading-snug text-slate-50">
            {headline}
          </h2>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            {en
              ? "How different outlets are reporting the same event."
              : "같은 사건을 매체별로 어떻게 보도하는지 비교합니다."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={en ? "Close" : "닫기"}
          className="shrink-0 rounded-lg border border-slate-500/30 px-2 py-1 text-[11px] text-slate-300 transition hover:border-slate-300/50 hover:text-slate-100"
        >
          {en ? "Close" : "닫기"}
        </button>
      </div>

      <div className="intel-scroll-y min-h-0 flex-1 space-y-1.5 px-2.5 py-2.5">
        {perspectives.map((p, i) => {
          const badge = tierBadge(p.trustTier, lang);
          return (
            <a
              key={`${p.link}-${i}`}
              href={p.link}
              target="_blank"
              rel="noreferrer noopener"
              className="block rounded-xl border border-slate-500/15 bg-slate-500/5 px-3 py-2.5 transition hover:border-slate-300/30 hover:bg-slate-500/10"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-medium text-slate-300">
                  {p.source || (en ? "Unknown source" : "출처 미상")}
                </span>
                <span
                  className="shrink-0 rounded px-1.5 py-[1px] text-[9px] font-semibold"
                  style={{ color: badge.color, border: `1px solid ${badge.color}55` }}
                >
                  {badge.label}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] leading-snug text-slate-100">{p.title}</p>
            </a>
          );
        })}
      </div>

      {/* 전쟁 → 이익: 이 사건이 관련 시장을 움직였는지 (지정학 ↔ 지경학 연결) */}
      {theater ? (
        <div className="border-t border-slate-500/15">
          <p className="px-3.5 pt-2 text-[10px] font-semibold tracking-wide text-slate-400">
            {en ? "Market reaction" : "시장 반응"}
          </p>
          <EventMarketReactionCard
            theater={theater}
            ageMinutes={ageMinutes ?? 60}
            prominent
            viewerMode={viewerMode}
          />
        </div>
      ) : null}

      <p className="border-t border-slate-500/15 px-3.5 py-2 text-[9px] leading-4 text-slate-500">
        {en
          ? "Grouped by location & event type. Outlet framing may differ; compare sources."
          : "위치·사건 성격 기준 묶음. 매체마다 관점이 다를 수 있으니 비교해서 보세요."}
      </p>
    </aside>
  );
}
