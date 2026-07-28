"use client";

import { useEffect, useMemo, useState } from "react";
import { useNewsStreamContext } from "@/components/BottomIntelStack";
import { EventMarketReactionCard } from "@/components/EventMarketReactionCard";
import { FinintTicker } from "@/components/FinintTicker";
import { GscpiGaugeFromData } from "@/components/GscpiGaugeFromData";
import { useLocale } from "@/contexts/LocaleContext";
import { brandName } from "@/lib/brand";
import type { DailyRanksPayload } from "@/lib/dailyRanks";
import type { HapiConflictCasualtiesPayload } from "@/lib/hapiConflictCasualties";
import { liveTickerPollMs } from "@/lib/liveRenderGuard";
import type { NeptunPayload } from "@/lib/neptun";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsStreamItem, NewsTheater } from "@/lib/news/types";
import {
  formatTickerChangePercent,
  formatTickerPrice,
  pickRelatedTickers,
  tickerChangeTone,
  tickerDisplayName,
  type StockTickerItem,
} from "@/lib/stockTickers";
import type { TzevaAdomPayload } from "@/lib/tzevaAdom";
import { theaterLabel } from "@/lib/uiStrings";
import type { ViewerMode } from "@/lib/viewPackages";
import { gtiBand, gtiBandLabel } from "@/lib/gti";

type MobileHomeViewProps = {
  viewerMode: ViewerMode;
  onViewerModeChange: (mode: ViewerMode) => void;
  labelLanguage: LabelLanguage;
  onLabelLanguageChange: (lang: LabelLanguage) => void;
};

/** 모바일 홈 3탭 */
type MobileTab = "conflict" | "markets" | "economy";

/** 한 화면에 당겨올 최근 기사 상한 (기존 40 → 3배) */
const MAX_ITEMS = 120;
/** 전장 그룹당 표시 기사 (기존 5 → 3배) */
const MAX_PER_THEATER = 15;
/** "지금 터진" 판정 — 이보다 어리면 LIVE 강조 */
const LIVE_AGE_MIN = 20;
/** 초크포인트 통과량이 이만큼(%) 이상 줄면 눈에 띄게 */
const STRESS_DROP_PCT = 12;

const INDEX_SYMBOLS = [
  "^GSPC",
  "^IXIC",
  "^DJI",
  "^N225",
  "^KS11",
  "^HSI",
  "000001.SS",
  "^FTSE",
  "^GDAXI",
  "^FCHI",
  "^VIX",
] as const;

const THEATER_FILTERS: Array<NewsTheater | "all"> = [
  "all",
  "middle-east",
  "russia-ukraine",
  "china-taiwan",
  "korea",
  "japan",
  "south-asia",
  "southeast-asia",
  "africa",
  "south-america",
  "arctic",
  "atlantic",
  "global",
];

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

type AirRaidHit = {
  id: string;
  place: string;
  detail: string;
  when: string;
  source: "ukraine" | "israel";
};

const TONE_CLASS = {
  up: "text-emerald-400",
  down: "text-rose-400",
  flat: "text-slate-400",
} as const;

function ageMinutesOf(item: NewsStreamItem): number {
  const ts = new Date(item.pubDate).getTime();
  if (!Number.isFinite(ts)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - ts) / 60_000);
}

function agoLabel(minutes: number, lang: LabelLanguage): string {
  if (!Number.isFinite(minutes)) return "—";
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

function tabFromViewer(mode: ViewerMode): MobileTab {
  return mode === "economy" ? "economy" : "conflict";
}

function formatKilled(n: number, lang: LabelLanguage): string {
  if (n >= 1000) {
    return lang === "en"
      ? `${(n / 1000).toFixed(1)}k`
      : `${(n / 1000).toFixed(1)}천`;
  }
  return n.toLocaleString(lang === "en" ? "en-US" : "ko-KR");
}

/**
 * 모바일 홈 — 3D 지구본 없이 지정학 / 증시 / 지경학 텍스트 뷰.
 */
export function MobileHomeView({
  viewerMode,
  onViewerModeChange,
  labelLanguage,
  onLabelLanguageChange,
}: MobileHomeViewProps) {
  const { payload } = useNewsStreamContext();
  const { lang: locale } = useLocale();
  const lang = labelLanguage;
  const en = lang === "en";

  const [tab, setTab] = useState<MobileTab>(() => tabFromViewer(viewerMode));
  const [theaterFilter, setTheaterFilter] = useState<NewsTheater | "all">("all");
  const [transits, setTransits] = useState<Record<string, ChokeTransit>>({});
  const [wti, setWti] = useState<{ score: number; delta: number | null; asOf: string | null } | null>(
    null,
  );
  const [casualties, setCasualties] = useState<HapiConflictCasualtiesPayload | null>(null);
  const [airRaids, setAirRaids] = useState<AirRaidHit[]>([]);
  const [tickers, setTickers] = useState<StockTickerItem[]>([]);

  useEffect(() => {
    setTab(tabFromViewer(viewerMode));
  }, [viewerMode]);

  const selectTab = (next: MobileTab) => {
    setTab(next);
    if (next === "conflict") onViewerModeChange("conflict");
    if (next === "economy") onViewerModeChange("economy");
  };

  // 초크포인트 — 지경학
  useEffect(() => {
    if (tab !== "economy") return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portwatch", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as PortWatchResp;
        if (!cancelled && data.transits) setTransits(data.transits);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  // 세계 긴장도 + 사상자 + 공습 — 지정학
  useEffect(() => {
    if (tab !== "conflict") return;
    let cancelled = false;
    void (async () => {
      try {
        const [ranksRes, hapiRes, neptunRes, tzevaRes] = await Promise.all([
          fetch("/api/daily-ranks?limit=1", { cache: "no-store" }),
          fetch("/api/hapi-conflict-casualties", { cache: "no-store" }),
          fetch("/api/neptun", { cache: "no-store" }),
          fetch("/api/tzeva-adom", { cache: "no-store" }),
        ]);

        if (!cancelled && ranksRes.ok) {
          const ranks = (await ranksRes.json()) as DailyRanksPayload;
          const score = ranks.worldTension?.score;
          if (typeof score === "number" && Number.isFinite(score)) {
            setWti({
              score,
              delta: ranks.worldTension?.deltaScore ?? null,
              asOf: ranks.fetchedAt ?? null,
            });
          }
        }

        if (!cancelled && hapiRes.ok) {
          setCasualties((await hapiRes.json()) as HapiConflictCasualtiesPayload);
        }

        const hits: AirRaidHit[] = [];
        if (neptunRes.ok) {
          const neptun = (await neptunRes.json()) as NeptunPayload;
          for (const r of neptun.alerts?.raions ?? []) {
            hits.push({
              id: `ua-raion-${r.key}`,
              place: r.name,
              detail: r.oblast,
              when: r.since,
              source: "ukraine",
            });
          }
          for (const o of neptun.alerts?.oblasts ?? []) {
            hits.push({
              id: `ua-oblast-${o.key}`,
              place: o.name,
              detail: en ? "Ukraine air alert" : "우크라이나 공습경보",
              when: o.since,
              source: "ukraine",
            });
          }
        }
        if (tzevaRes.ok) {
          const tzeva = (await tzevaRes.json()) as TzevaAdomPayload;
          for (const a of tzeva.active ?? []) {
            hits.push({
              id: `il-${a.id}`,
              place: a.region || a.title,
              detail: a.title || (en ? "Israel air raid" : "이스라엘 공습경보"),
              when: a.alertDate,
              source: "israel",
            });
          }
        }
        if (!cancelled) {
          setAirRaids(
            hits
              .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
              .slice(0, 12),
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, en]);

  // 증시 티커 — 증시·지경학(연관) 공통
  useEffect(() => {
    if (tab !== "markets" && tab !== "economy" && tab !== "conflict") return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/stock-tickers", { cache: "no-store" });
        const data = (await res.json()) as { tickers?: StockTickerItem[] };
        if (!cancelled && Array.isArray(data.tickers)) setTickers(data.tickers);
      } catch {
        /* keep last */
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), liveTickerPollMs());
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [tab]);

  const items = useMemo(() => {
    const pool = [...(payload?.verified ?? []), ...(payload?.stateMedia ?? [])];
    return pool
      .slice()
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .filter((item) => {
        if (theaterFilter !== "all" && item.theater !== theaterFilter) return false;
        if (tab === "economy") return item.feedTopic === "economy" || !item.feedTopic;
        if (tab === "conflict") return item.feedTopic !== "economy";
        return true;
      })
      .slice(0, MAX_ITEMS);
  }, [payload, theaterFilter, tab]);

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

  const freshest = groups[0]?.ageMinutes ?? Number.POSITIVE_INFINITY;
  const liveCount = items.filter((i) => ageMinutesOf(i) <= LIVE_AGE_MIN).length;
  const isLive = freshest <= LIVE_AGE_MIN;

  const stressedChokes = useMemo(() => {
    return Object.entries(transits)
      .map(([id, t]) => ({ id, changePct: t.changePct }))
      .filter((c) => c.changePct != null && c.changePct <= -STRESS_DROP_PCT)
      .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0));
  }, [transits]);

  const indexTickers = useMemo(() => {
    const bySymbol = new Map(tickers.map((t) => [t.symbol, t]));
    return INDEX_SYMBOLS.map((symbol) => bySymbol.get(symbol)).filter(
      (t): t is StockTickerItem => t != null,
    );
  }, [tickers]);

  const economyRelated = useMemo(
    () => pickRelatedTickers(tickers, theaterFilter === "all" ? "all" : theaterFilter),
    [tickers, theaterFilter],
  );

  /** 전장별 사상자 합계 — 해운 탭처럼 '전선 단위 전체 숫자' */
  const frontTotals = useMemo(() => {
    if (!casualties?.fronts?.length) return [];
    const map = new Map<string, { theaterId: NewsTheater; killed: number }>();
    for (const front of casualties.fronts) {
      const id = front.theaterId as NewsTheater;
      const prev = map.get(id);
      if (prev) prev.killed += front.killed;
      else map.set(id, { theaterId: id, killed: front.killed });
    }
    return Array.from(map.values())
      .filter((row) => row.killed > 0)
      .sort((a, b) => b.killed - a.killed);
  }, [casualties]);

  const tabLabel =
    tab === "conflict"
      ? en
        ? "Geopolitics"
        : "지정학"
      : tab === "markets"
        ? en
          ? "Markets"
          : "증시"
        : en
          ? "Geo-economics"
          : "지경학";

  const band = wti ? gtiBand(wti.score) : null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex flex-col bg-[#04070f] text-slate-100"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <header className="shrink-0 border-b border-white/10 bg-[#04070f]/95 px-3 pb-2.5 pt-2.5 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
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

        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {en ? "Section" : "메뉴"}
            </span>
            <select
              value={tab}
              onChange={(e) => selectTab(e.target.value as MobileTab)}
              className="tap-target w-full rounded-lg border border-white/15 bg-[#0a1428] px-2.5 py-2 text-[13px] font-semibold text-slate-100"
              aria-label={en ? "Select section" : "메뉴 선택"}
            >
              <option value="conflict">{en ? "Geopolitics" : "지정학"}</option>
              <option value="markets">{en ? "Markets" : "증시"}</option>
              <option value="economy">{en ? "Geo-economics" : "지경학"}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {en ? "Category" : "카테고리"}
            </span>
            <select
              value={theaterFilter}
              onChange={(e) => setTheaterFilter(e.target.value as NewsTheater | "all")}
              className="tap-target w-full rounded-lg border border-white/15 bg-[#0a1428] px-2.5 py-2 text-[13px] font-semibold text-slate-100"
              aria-label={en ? "Filter by theater" : "전장 카테고리"}
              disabled={tab === "markets"}
            >
              {THEATER_FILTERS.map((id) => (
                <option key={id} value={id}>
                  {id === "all"
                    ? en
                      ? "All theaters"
                      : "전체 전장"
                    : theaterLabel(id, lang)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="intel-scroll-y min-h-0 flex-1 px-3 pb-6">
        {/* 히어로 — 탭별 안내 */}
        {tab === "markets" ? (
          <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] px-3 py-2.5">
            <p className="text-[12.5px] font-semibold text-emerald-100">
              {en ? "Major equity indices" : "주요 주가지수"}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/70">
              {en
                ? "Prices refresh about every 15 minutes (Yahoo delayed quotes)."
                : "주가는 약 15분마다 갱신됩니다 (Yahoo 지연 시세)."}
            </p>
          </div>
        ) : (
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
              <span className="font-semibold text-sky-100/90">{tabLabel}</span>
              {" · "}
              {groups.length === 0
                ? en
                  ? "No recent alerts."
                  : "최근 속보 없음."
                : isLive
                  ? en
                    ? `LIVE — ${liveCount} in ${LIVE_AGE_MIN} min`
                    : `실시간 — ${LIVE_AGE_MIN}분 내 ${liveCount}건`
                  : en
                    ? `Latest ${agoLabel(freshest, lang)}`
                    : `최신 ${agoLabel(freshest, lang)}`}
            </p>
          </div>
        )}

        {/* —— 지정학 —— */}
        {tab === "conflict" ? (
          <div className="mt-3 space-y-2.5">
            {wti ? (
              <div className="rounded-xl border border-orange-400/30 bg-orange-500/[0.08] px-3 py-2.5">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-200/80">
                      {en ? "GTI · Global tension" : "GTI · 글로벌 긴장지수"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {band ? gtiBandLabel(band, !en) : null}
                      {wti.asOf
                        ? ` · ${new Date(wti.asOf).toISOString().slice(11, 16)}Z`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold tabular-nums text-orange-50">
                      {wti.score.toFixed(1)}
                    </p>
                    {wti.delta != null ? (
                      <p
                        className={`text-[11px] tabular-nums ${
                          wti.delta > 0
                            ? "text-rose-300"
                            : wti.delta < 0
                              ? "text-emerald-300"
                              : "text-slate-500"
                        }`}
                      >
                        {wti.delta > 0 ? "+" : ""}
                        {wti.delta.toFixed(1)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {airRaids.length > 0 ? (
              <div className="rounded-xl border border-rose-400/35 bg-rose-500/[0.08] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-200/85">
                  {en ? "Air-raid alerts" : "공습 경보"}
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {airRaids.slice(0, 6).map((hit) => (
                    <li key={hit.id} className="flex items-start justify-between gap-2 text-[12.5px]">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-rose-50">{hit.place}</p>
                        <p className="truncate text-[10.5px] text-slate-500">
                          {hit.source === "ukraine"
                            ? en
                              ? "Ukraine"
                              : "우크라이나"
                            : en
                              ? "Israel"
                              : "이스라엘"}
                          {" · "}
                          {hit.detail}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] tabular-nums text-rose-200/70">
                        {agoLabel(
                          Math.max(0, (Date.now() - new Date(hit.when).getTime()) / 60_000),
                          lang,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {frontTotals.length > 0 ? (
              <div className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                  {en ? "Frontline casualties" : "전선 사상자"}
                </p>
                <p className="mt-0.5 text-[9.5px] text-slate-600">
                  {en
                    ? "Reported fatalities by theater (ACLED via HDX HAPI)"
                    : "전선별 보고 사망 합계 (ACLED · HDX HAPI)"}
                </p>
                <ul className="mt-2 divide-y divide-white/5">
                  {frontTotals.slice(0, 8).map((row) => (
                    <li
                      key={row.theaterId}
                      className="flex items-center justify-between gap-2 py-1.5 text-[12.5px]"
                    >
                      <span className="min-w-0 truncate text-slate-200">
                        {theaterLabel(row.theaterId, lang)}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-50">
                        {formatKilled(row.killed, lang)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* —— 증시 —— */}
        {tab === "markets" ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-emerald-300/20 bg-[#071225]/85">
            <div className="border-b border-white/10 px-3 py-2">
              <p className="text-xs font-semibold text-emerald-50">
                {en ? "Global indices" : "글로벌 지수"}
              </p>
            </div>
            {indexTickers.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12px] text-slate-500">
                {en ? "Loading market data…" : "증시 데이터 불러오는 중…"}
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {indexTickers.map((item) => {
                  const tone = tickerChangeTone(item.changePercent);
                  return (
                    <li
                      key={item.symbol}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-100">
                          {tickerDisplayName(item.symbol, lang)}
                        </p>
                        <p className="text-[10px] text-slate-600">{item.symbol}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold tabular-nums text-slate-50">
                          {formatTickerPrice(item.price)}
                        </p>
                        <p className={`text-[11px] tabular-nums ${TONE_CLASS[tone]}`}>
                          {formatTickerChangePercent(item.changePercent)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}

        {/* —— 지경학 —— */}
        {tab === "economy" ? (
          <div className="mt-3 space-y-2.5">
            <GscpiGaugeFromData lang={lang} />
            <FinintTicker />
            {economyRelated.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-sky-300/15 bg-[#071225]/85">
                <div className="border-b border-white/10 px-3 py-2">
                  <p className="text-xs font-semibold text-sky-50">
                    {en ? "Related markets" : "연관 증시"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {en
                      ? "Tickers linked to the selected theater · ~15 min refresh"
                      : "선택한 전장과 연관된 종목 · 약 15분 갱신"}
                  </p>
                </div>
                <ul className="divide-y divide-white/[0.06]">
                  {economyRelated.slice(0, 8).map((item) => {
                    const tone = tickerChangeTone(item.changePercent);
                    return (
                      <li
                        key={item.symbol}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <span className="truncate text-[12.5px] font-medium text-slate-200">
                          {tickerDisplayName(item.symbol, lang)}
                        </span>
                        <span className={`text-[12px] tabular-nums ${TONE_CLASS[tone]}`}>
                          {formatTickerChangePercent(item.changePercent)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
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
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 뉴스 피드 — 증시 탭 제외 */}
        {tab !== "markets" ? (
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

                <EventMarketReactionCard
                  theater={group.theater}
                  ageMinutes={group.ageMinutes}
                  prominent={index === 0}
                />

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
        ) : null}

        <p className="mt-5 text-center text-[10px] leading-4 text-slate-600">
          {en
            ? "Times follow each source. Open on desktop for the 3D map."
            : "시각은 각 출처 기준. 3D 지도는 데스크톱에서 볼 수 있어요."}
        </p>
      </div>
    </div>
  );
}
