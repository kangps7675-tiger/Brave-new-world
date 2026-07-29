"use client";

import { useEffect, useMemo, useState } from "react";
import { useNewsStreamContext } from "@/components/BottomIntelStack";
import { EventMarketReactionCard } from "@/components/EventMarketReactionCard";
import { CounterfactualInvestCard } from "@/components/CounterfactualInvestCard";
import { DailyPredictPanel } from "@/components/DailyPredictPanel";
import { useLocale } from "@/contexts/LocaleContext";
import { theaterLabel } from "@/lib/uiStrings";
import type { NewsStreamItem, NewsTheater } from "@/lib/news/types";
import type { ViewerMode } from "@/lib/viewPackages";
import { viewerModeFromPackages } from "@/lib/viewPackages";

type MobileAlertFeedProps = {
  onClose: () => void;
  viewerMode?: ViewerMode;
};

/** 화면에 한 번에 보여줄 최대 기사 수 (오래된 건 굳이 다 안 당겨옴) */
const MAX_ITEMS = 14;
/** 전장 그룹당 표시할 기사 수 */
const MAX_ITEMS_PER_THEATER = 4;

function ageMinutesOf(item: NewsStreamItem): number {
  const ts = new Date(item.pubDate).getTime();
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, (Date.now() - ts) / 60_000);
}

/**
 * 모바일 전용 속보+반응 바텀시트 — 지구본을 가리지 않고 "같이" 볼 수 있도록,
 * 화면을 다 덮지 않고 하단에서 절반 정도만 올라오는 시트로 뜬다(지구본은 위쪽에 계속 보임).
 * 최근 검증 기사를 전장별로 묶어서, 각 전장 헤더에 "이 사건 이후" 종목 반응
 * (EventMarketReactionCard)을 같이 보여준다. 데이터는 이미 떠 있는 NewsStreamContext를
 * 그대로 읽으므로 추가 폴링·호출이 없다.
 */
export function MobileAlertFeed({ onClose, viewerMode: viewerModeProp }: MobileAlertFeedProps) {
  const { payload, viewPackages, preferEconomyNews } = useNewsStreamContext();
  const { lang } = useLocale();
  const viewerMode: ViewerMode =
    viewerModeProp ??
    (preferEconomyNews ? "economy" : viewerModeFromPackages(viewPackages));
  const isEconomy = viewerMode === "economy";
  /** 어제 정답률 — "나 말고도 하고 있다"는 사회적 신호라 예측 참여율에 영향이 큼 */
  const [yesterdayCorrectPct, setYesterdayCorrectPct] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/daily-ranks?limit=1", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { yesterdayCorrectPct?: number | null };
        if (!cancelled) setYesterdayCorrectPct(data.yesterdayCorrectPct ?? null);
      } catch {
        /* 실패해도 패널은 "집계 중"으로 표시됨 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    const items = (payload?.verified ?? [])
      .slice()
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, MAX_ITEMS);

    const byTheater = new Map<NewsTheater, NewsStreamItem[]>();
    for (const item of items) {
      const list = byTheater.get(item.theater) ?? [];
      list.push(item);
      byTheater.set(item.theater, list);
    }
    return Array.from(byTheater.entries()).map(([theater, list]) => ({
      theater,
      items: list,
      ageMinutes: ageMinutesOf(list[0]),
    }));
  }, [payload]);

  return (
    <div
      className="cv-compact-only pointer-events-auto fixed inset-x-0 bottom-0 z-[600] flex max-h-[55vh] flex-col rounded-t-2xl border-t border-sky-300/20 bg-[#050b18]/97 shadow-2xl backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      role="dialog"
      aria-modal="false"
      aria-label={lang === "en" ? "Alerts" : "알림"}
    >
      <div className="flex shrink-0 justify-center pt-2">
        <span className="h-1 w-9 rounded-full bg-white/15" aria-hidden />
      </div>

      <div className="flex shrink-0 items-center justify-between border-b border-sky-200/10 px-3.5 py-2.5">
        <p className="text-meta font-semibold uppercase tracking-[0.16em] text-sky-100/85">
          {lang === "en" ? "Alerts" : "알림"}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={lang === "en" ? "Close" : "닫기"}
          className="tap-target flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-body text-sky-200/70 transition hover:bg-white/5 hover:text-sky-50"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/*
          오늘의 UP/DOWN 예측 — 모바일 유저가 63%인데 이 리텐션 엔진이 데스크톱 전용이라
          대부분이 접근을 못 하던 상태였다. 시트 최상단에 둬서 열면 바로 보이게 한다.
          (프롬프트가 없으면 컴포넌트가 스스로 null을 반환해 자리를 안 차지함)
        */}
        <div className="px-2.5 pt-2.5">
          <DailyPredictPanel lang={lang} yesterdayCorrectPct={yesterdayCorrectPct} />
        </div>

        {payload?.hero ? (
          <div
            className={`border-b px-0 pb-1 ${
              isEconomy ? "border-emerald-400/15" : "border-amber-400/15"
            }`}
          >
            <div className="px-3 pb-1 pt-1">
              <span
                className={`text-micro font-semibold uppercase tracking-[0.14em] ${
                  isEconomy ? "text-emerald-200/80" : "text-amber-200/80"
                }`}
              >
                {isEconomy
                  ? lang === "en"
                    ? "Markets ↔ Timeline"
                    : "시장 ↔ 타임테이블"
                  : lang === "en"
                    ? "War ↔ Markets"
                    : "전쟁 ↔ 이익"}
              </span>
            </div>
            {!isEconomy ? (
              <EventMarketReactionCard
                theater={payload.hero.theater}
                ageMinutes={payload.hero.ageMinutes}
                prominent
              />
            ) : null}
            <CounterfactualInvestCard
              theater={payload.hero.theater}
              ageMinutes={payload.hero.ageMinutes}
              viewerMode={viewerMode}
              prominent
            />
          </div>
        ) : null}

        {groups.length === 0 ? (
          <p className="px-3 py-8 text-center text-caption text-slate-500">
            {lang === "en" ? "No recent alerts." : "최근 알림이 없습니다."}
          </p>
        ) : (
          groups.map((group, index) => (
            <div key={group.theater} className="border-b border-white/5 last:border-b-0">
              <div className="px-3 pb-1 pt-2.5">
                <span className="text-meta font-semibold text-sky-200/80">
                  {theaterLabel(group.theater, lang)}
                </span>
              </div>
              {!isEconomy ? (
                <EventMarketReactionCard
                  theater={group.theater}
                  ageMinutes={group.ageMinutes}
                  prominent={index === 0}
                />
              ) : null}
              <ul className="px-2 py-1.5">
                {group.items.slice(0, MAX_ITEMS_PER_THEATER).map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg px-1.5 py-1.5 text-caption leading-snug text-slate-200 transition hover:bg-white/5"
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
