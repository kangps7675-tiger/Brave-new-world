"use client";

import { useMemo, useState } from "react";
import type { NewsStreamItem } from "@/lib/news/types";
import { resolveEconomyArticleFlyTarget } from "@/lib/news/economyMapFly";
import type { MapFlyTarget } from "@/lib/news/theaterMap";

const THEATER_LABELS: Record<NewsStreamItem["theater"], string> = {
  "middle-east": "중동",
  "russia-ukraine": "러·우",
  "china-taiwan": "중·대",
  korea: "한반도",
  japan: "일본",
  "south-asia": "남아시아",
  "southeast-asia": "동남아",
  "south-america": "남미",
  africa: "아프리카",
  arctic: "북극",
  atlantic: "대서양",
  global: "글로벌",
};

const THEATER_GRADIENT: Record<NewsStreamItem["theater"], string> = {
  "middle-east": "from-rose-950/80 via-orange-950/60 to-amber-950/40",
  "russia-ukraine": "from-sky-950/80 via-indigo-950/60 to-slate-900/40",
  "china-taiwan": "from-red-950/80 via-rose-950/60 to-orange-950/40",
  korea: "from-blue-950/80 via-indigo-950/60 to-slate-900/40",
  japan: "from-violet-950/80 via-indigo-950/60 to-slate-900/40",
  "south-asia": "from-amber-950/80 via-orange-950/60 to-red-950/40",
  "southeast-asia": "from-teal-950/80 via-emerald-950/60 to-slate-900/40",
  "south-america": "from-yellow-950/80 via-amber-950/60 to-orange-950/40",
  africa: "from-orange-950/80 via-amber-950/60 to-stone-900/40",
  arctic: "from-cyan-950/80 via-sky-950/60 to-slate-900/40",
  atlantic: "from-indigo-950/80 via-blue-950/60 to-slate-900/40",
  global: "from-slate-900/80 via-sky-950/60 to-slate-800/40",
};

function formatAge(pubDate: string): string {
  const ts = Date.parse(pubDate);
  if (!Number.isFinite(ts)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function tierBadgeClass(tier: NewsStreamItem["trustTier"], tier3?: boolean): string {
  if (tier === 1) return "border-emerald-400/35 bg-emerald-500/15 text-emerald-100";
  if (tier3 || tier === 3) return "border-amber-400/40 bg-amber-500/15 text-amber-100";
  return "border-sky-400/30 bg-sky-500/15 text-sky-100";
}

type NewsArticleCardProps = {
  item: NewsStreamItem;
  tier3?: boolean;
  economyMode?: boolean;
  /** CRINK 허브 카드 — 큰 썸네일 + 크레딧 */
  hubMode?: boolean;
  thumbCredit?: string;
  titleOverride?: string;
  summaryOverride?: string;
  onFlyToMap?: (target: MapFlyTarget) => void;
  /** 우측 뉴스 인사이트 패널 열기 (클릭/탭만) */
  onOpenInsight?: (item: NewsStreamItem) => void;
};

export function NewsArticleCard({
  item,
  tier3,
  economyMode,
  hubMode,
  thumbCredit,
  titleOverride,
  summaryOverride,
  onFlyToMap,
  onOpenInsight,
}: NewsArticleCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isEconomy = economyMode || item.feedTopic === "economy";
  const showImage = item.imageUrl && !imageFailed;
  const tierLabel = item.trustTier === 1 ? "T1" : item.trustTier === 2 ? "T2" : "T3";
  const displayTitle = titleOverride ?? item.title;
  const displaySummary = summaryOverride ?? item.summary;

  const flyTarget = useMemo(() => {
    if (!isEconomy || !onFlyToMap) return null;
    return resolveEconomyArticleFlyTarget(displayTitle, displaySummary);
  }, [displaySummary, displayTitle, isEconomy, onFlyToMap]);

  return (
    <article
      className={`news-article-card group flex shrink-0 flex-col overflow-hidden rounded-xl border bg-[#0a1428]/90 shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-xl ${
        hubMode ? "w-[min(92vw,280px)]" : "w-[min(72vw,220px)]"
      } ${
        tier3
          ? "border-amber-400/25 hover:border-amber-300/45"
          : hubMode
            ? "border-rose-400/25 hover:border-rose-300/45"
            : isEconomy
              ? "border-emerald-400/20 hover:border-emerald-300/40"
              : "border-sky-300/15 hover:border-sky-200/35"
      }`}
    >
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-0 flex-1 flex-col"
      >
        <div
          className={`relative w-full overflow-hidden bg-slate-900/80 ${
            hubMode ? "h-[132px]" : "h-[104px]"
          }`}
        >
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div
              className={`flex h-full w-full flex-col justify-end bg-gradient-to-br p-3 ${THEATER_GRADIENT[item.theater]}`}
            >
              <span className="text-micro font-semibold uppercase tracking-[0.2em] text-white/55">
                {THEATER_LABELS[item.theater]}
              </span>
              <span className="mt-1 line-clamp-2 text-xs font-medium leading-4 text-white/85">
                {item.source}
              </span>
            </div>
          )}
          <div className="absolute left-2 top-2 flex items-center gap-1.5">
            <span
              className={`rounded-full border px-1.5 py-0.5 text-micro font-bold backdrop-blur-sm ${tierBadgeClass(item.trustTier, tier3)}`}
            >
              {tierLabel}
            </span>
            {tier3 ? (
              <span className="rounded-full border border-amber-400/35 bg-black/45 px-1.5 py-0.5 text-micro text-amber-100 backdrop-blur-sm">
                미확인
              </span>
            ) : null}
          </div>
          {hubMode && thumbCredit ? (
            <span className="absolute bottom-1.5 right-2 max-w-[70%] truncate rounded bg-black/50 px-1.5 py-0.5 text-micro text-slate-300">
              {thumbCredit}
            </span>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3">
          <h3 className="line-clamp-2 text-caption font-semibold leading-4 text-slate-50 group-hover:text-white">
            {displayTitle}
          </h3>
          {displaySummary ? (
            <p className="line-clamp-2 text-micro leading-4 text-slate-400">{displaySummary}</p>
          ) : (
            <p className="line-clamp-2 text-micro leading-4 text-slate-500">
              {item.source} · {isEconomy ? "경제·시장" : `${THEATER_LABELS[item.theater]} 분쟁·안보`}{" "}
              관련 보도
            </p>
          )}
          <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-micro text-slate-500">
            <span className="truncate">{item.source}</span>
            <span className="shrink-0">{formatAge(item.pubDate)}</span>
          </div>
        </div>
      </a>
      {onOpenInsight || (flyTarget && onFlyToMap) ? (
        <div className="flex flex-col gap-1.5 border-t border-slate-500/20 px-3 py-2">
          {onOpenInsight ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenInsight(item);
              }}
              className="w-full rounded-lg border border-amber-400/35 bg-amber-500/10 px-2 py-1.5 text-meta font-semibold text-amber-100 transition hover:border-amber-300/50 hover:bg-amber-500/20"
            >
              인사이트
            </button>
          ) : null}
          {flyTarget && onFlyToMap ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFlyToMap(flyTarget);
              }}
              className="w-full rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-1.5 text-meta font-semibold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-500/20"
            >
              지도보러가기
              <span className="ml-1 font-normal text-emerald-200/55">· {flyTarget.label}</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
