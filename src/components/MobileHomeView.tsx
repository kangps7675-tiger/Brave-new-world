"use client";

import { useEffect, useMemo, useState } from "react";
import { useNewsStreamContext } from "@/components/BottomIntelStack";
import { EventMarketReactionCard } from "@/components/EventMarketReactionCard";
import { FinintTicker } from "@/components/FinintTicker";
import { GscpiGaugeFromData } from "@/components/GscpiGaugeFromData";
import { useLocale } from "@/contexts/LocaleContext";
import { brandName } from "@/lib/brand";
import { theaterLabel } from "@/lib/uiStrings";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsStreamItem, NewsTheater } from "@/lib/news/types";
import type { ViewerMode } from "@/lib/viewPackages";
import { viewerModeFromPackages } from "@/lib/viewPackages";

type MobileHomeViewProps = {
  viewerMode: ViewerMode;
  onViewerModeChange: (mode: ViewerMode) => void;
  labelLanguage: LabelLanguage;
  onLabelLanguageChange: (lang: LabelLanguage) => void;
};

/** 한 화면에 당겨올 최근 기사 상한 */
const MAX_ITEMS = 40;
/** 전장 그룹당 표시 기사 */
const MAX_PER_THEATER = 5;
/** "지금 터진" 판정 — 이보다 어리면 LIVE 강조 */
const LIVE_AGE_MIN = 20;
/** 초크포인트 통과량이 이만큼(%) 이상 줄면 눈에 띄게 */
const STRESS_DROP_PCT = 12;

/** 9개 초크포인트 라벨 (portwatch route와 동일한 app id 사용) */
const CHOKE_LABELS: Record<string, { ko: string; en: string }> = {
  "choke-hormuz": { ko: "호르무즈 해협", en: "Strait of Hormuz" },
  "choke-suez": { ko: "수에즈 운하", en: "Suez Canal" },
  "choke-bab-el-mandeb": { ko: "바브엘만데브 해협", en: "Bab el-Mandeb" },
  "choke-malacca": { ko: "믈라카 해협", en: "Malacca Strait" },
  "choke-taiwan": { ko: "대만 해협", en: "Taiwan Strait" },
  "choke-panama": { ko: "파나마 운하", en: "Panama Canal" },
  "choke-bosporus": { ko: "보스포루스 해협", en: "Bosporus" },
  "choke-gibraltar": { ko: "지브롤터 해협", en: "Gibraltar" },
  "choke-good-hope": { ko: "희망봉", en: "Cape of Good Hope" },
};

type ChokeTransit = {
  changePct: number | null;
  latestDate?: string | null;
};
type PortWatchResp = {
  transits?: Record<string, ChokeTransit>;
};

function ageMinutesOf(item: NewsStreamItem): number {
  const ts = new Date(item.pubDate).getTime();
  if (!Number.isFinite(ts)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - ts) / 60_000);
}

function agoLabel(minutes: number, lang: LabelLanguage): string {
  if (!Number.isFinite(minutes)) return lang === "en" ? "—" : "—";
  if (minutes < 1) return lang === "en" ? "just now" : "방금";
  if (minutes < 60) {
    const m = Math.round(minutes);
    return lang === "en" ? `${m} min ago` : `${m}분 전`;
  }
  const h = Math.floor(minutes / 60);
  if (h < 24) return lang === "en" ? `${h} h ago` : `${h}시간 전`;
  const d = Math.floor(h / 24);
  return lang === "en" ? `${d} d ago` : `${d}일 전`;
}

/**
 * 모바일 홈 — 3D 지구본을 아예 렌더하지 않고 "지금 세계 상황"을 텍스트/알림으로 보여준다.
 * 위→아래: 세그먼트 탭 → 상태 한 줄 → (지경학이면 지표) → 다관점 뉴스 피드.
 * 데이터는 이미 떠 있는 NewsStreamContext + /api/portwatch + gscpi.json 을 그대로 읽어
 * 추가 폴링 부담이 없다.
 */
export function MobileHomeView({
  viewerMode,
  onViewerModeChange,
  labelLanguage,
  onLabelLanguageChange,
}: MobileHomeViewProps) {
  const { payload, viewPackages, preferEconomyNews } = useNewsStreamContext();
  const { lang: locale } = useLocale();
  const lang = labelLanguage;
  const en = lang === "en";

  const resolvedMode: ViewerMode =
    viewerMode ?? (preferEconomyNews ? "economy" : viewerModeFromPackages(viewPackages));
  const isEconomy = resolvedMode === "economy";

  // 지경학 지표 — 초크포인트 통과량 스트레스
  const [transits, setTransits] = useState<Record<string, ChokeTransit>>({});
  useEffect(() => {
    if (!isEconomy) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portwatch", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as PortWatchResp;
        if (!cancelled && data.transits) setTransits(data.transits);
      } catch {
        /* 실패해도 GSCPI 게이지는 뜬다 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEconomy]);

  const items = useMemo(() => {
    return (payload?.verified ?? [])
      .slice()
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, MAX_ITEMS);
  }, [payload]);

  const groups = useMemo(() => {
    const byTheater = new Map<NewsTheater, NewsStreamItem[]>();
    for (const item of items) {
      const list = byTheater.get(item.theater) ?? [];
      list.push(item);
      byTheater.set(item.theater, list);
    }
    return Array.from(byTheater.entries())
      .map(([theater, list]) => ({
        theater,
        items: list,
        ageMinutes: ageMinutesOf(list[0]),
      }))
      .sort((a, b) => a.ageMinutes - b.ageMinutes);
  }, [items]);

  // 상태 한 줄 — 지정학: 활성 전장·최신 속보 신선도 / 지경학은 아래 지표 카드가 담당
  const freshest = groups[0]?.ageMinutes ?? Number.POSITIVE_INFINITY;
  const liveCount = items.filter((i) => ageMinutesOf(i) <= LIVE_AGE_MIN).length;
  const isLive = freshest <= LIVE_AGE_MIN;

  const stressedChokes = useMemo(() => {
    return Object.entries(transits)
      .map(([id, t]) => ({ id, changePct: t.changePct }))
      .filter((c) => c.changePct != null && c.changePct <= -STRESS_DROP_PCT)
      .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0));
  }, [transits]);

  return (
    <div
      className="fixed inset-0 z-[9000] flex flex-col bg-[#04070f] text-slate-100"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* 상단 고정 — 브랜드 + 언어 + 세그먼트 탭 */}
      <header className="shrink-0 border-b border-white/10 bg-[#04070f]/95 px-3 pb-2 pt-2.5 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold tracking-wide text-sky-200/90">
            {brandName(locale)}
          </span>
          <button
            type="button"
            onClick={() => onLabelLanguageChange(en ? "ko" : "en")}
            className="tap-target rounded-md border border-white/15 px-2 py-1 text-[11px] font-medium text-slate-300"
            aria-label={en ? "한국어로 전환" : "Switch to English"}
          >
            {en ? "한국어" : "EN"}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl bg-white/5 p-1">
          <button
            type="button"
            onClick={() => onViewerModeChange("conflict")}
            className={`rounded-lg py-2 text-[13px] font-semibold transition ${
              !isEconomy ? "bg-orange-500/20 text-orange-100" : "text-slate-400"
            }`}
          >
            {en ? "Geopolitics" : "지정학"}
          </button>
          <button
            type="button"
            onClick={() => onViewerModeChange("economy")}
            className={`rounded-lg py-2 text-[13px] font-semibold transition ${
              isEconomy ? "bg-emerald-500/20 text-emerald-100" : "text-slate-400"
            }`}
          >
            {en ? "Geo-economics" : "지경학"}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
        {/* 상태 한 줄 */}
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
            isLive
              ? "border-rose-400/40 bg-rose-500/10"
              : "border-white/10 bg-white/[0.04]"
          }`}
        >
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${
              isLive ? "animate-pulse bg-rose-400" : "bg-slate-500"
            }`}
            aria-hidden
          />
          <p className="text-[12.5px] leading-snug text-slate-200">
            {groups.length === 0
              ? en
                ? "No recent alerts."
                : "최근 속보 없음."
              : isLive
                ? en
                  ? `Live — ${liveCount} update${liveCount === 1 ? "" : "s"} in the last ${LIVE_AGE_MIN} min, across ${groups.length} ${groups.length === 1 ? "theater" : "theaters"}.`
                  : `실시간 — 최근 ${LIVE_AGE_MIN}분 내 속보 ${liveCount}건, ${groups.length}개 전장.`
                : en
                  ? `${groups.length} active ${groups.length === 1 ? "theater" : "theaters"} · latest ${agoLabel(freshest, lang)}.`
                  : `활성 전장 ${groups.length}곳 · 최신 ${agoLabel(freshest, lang)}.`}
          </p>
        </div>

        {/* 지경학 지표 */}
        {isEconomy ? (
          <div className="mt-3 space-y-2.5">
            <GscpiGaugeFromData lang={lang} />
            <FinintTicker />
            {stressedChokes.length > 0 ? (
              <div className="rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">
                  {en ? "Chokepoint transits down" : "초크포인트 통과량 감소"}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {stressedChokes.slice(0, 4).map((c) => (
                    <li key={c.id} className="flex items-center justify-between text-[12.5px]">
                      <span className="text-slate-200">
                        {CHOKE_LABELS[c.id]?.[en ? "en" : "ko"] ?? c.id}
                      </span>
                      <span className="font-semibold tabular-nums text-amber-300">
                        {Math.round(c.changePct ?? 0)}%
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[9.5px] leading-4 text-slate-500">
                  {en
                    ? "Recent 7-day vs 30-day baseline · IMF PortWatch"
                    : "최근 7일 vs 30일 기준선 · IMF PortWatch"}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 다관점 뉴스 피드 */}
        <div className="mt-4 space-y-3">
          {groups.map((group, index) => (
            <section
              key={group.theater}
              className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
            >
              <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
                <span className="text-[12px] font-semibold text-sky-100/90">
                  {theaterLabel(group.theater, lang)}
                </span>
                <span
                  className={`text-[10.5px] tabular-nums ${
                    group.ageMinutes <= LIVE_AGE_MIN ? "text-rose-300" : "text-slate-500"
                  }`}
                >
                  {agoLabel(group.ageMinutes, lang)}
                </span>
              </div>

              {isEconomy ? null : (
                <EventMarketReactionCard
                  theater={group.theater}
                  ageMinutes={group.ageMinutes}
                  prominent={index === 0}
                />
              )}

              <ul className="divide-y divide-white/5">
                {group.items.slice(0, MAX_PER_THEATER).map((item) => {
                  const age = ageMinutesOf(item);
                  return (
                    <li key={item.id}>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-3 py-2.5 transition active:bg-white/5"
                      >
                        <p className="text-[13px] leading-snug text-slate-100">{item.title}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-slate-500">
                          <span className="truncate">{item.publisher ?? item.source}</span>
                          <span aria-hidden>·</span>
                          <span className="shrink-0 tabular-nums">{agoLabel(age, lang)}</span>
                        </p>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {groups.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] text-slate-500">
              {en ? "Loading latest reports…" : "최신 속보 불러오는 중…"}
            </p>
          ) : null}
        </div>

        <p className="mt-5 text-center text-[10px] leading-4 text-slate-600">
          {en
            ? "Times are per source publish time. Open on desktop for the 3D map view."
            : "시각은 각 출처 게시 기준. 3D 지도는 데스크톱에서 볼 수 있어요."}
        </p>
      </div>
    </div>
  );
}
