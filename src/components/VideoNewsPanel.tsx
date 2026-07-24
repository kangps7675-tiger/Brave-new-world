"use client";

import { useCallback, useEffect, useState } from "react";
import type { VideoNewsItem, VideoNewsPayload } from "@/lib/news/videoTypes";
import { liveVideoNewsFetchMax, liveVideoNewsPollMs } from "@/lib/liveRenderGuard";
import type { ViewPackageId } from "@/lib/viewPackages";
import type { LabelLanguage } from "@/lib/layerPrefs";

function formatAge(publishedAt: string): string {
  const ts = Date.parse(publishedAt);
  if (!Number.isFinite(ts)) return "";
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}시간 전`;
  return `${Math.round(hours / 24)}일 전`;
}

type VideoNewsPanelProps = {
  active: boolean;
  viewPackages?: ViewPackageId[];
  labelLanguage?: LabelLanguage;
  economyMode?: boolean;
};

export function VideoNewsPanel({
  active,
  viewPackages = [],
  labelLanguage = "ko",
  economyMode = false,
}: VideoNewsPanelProps) {
  const [payload, setPayload] = useState<VideoNewsPayload | null>(null);
  const [playing, setPlaying] = useState<VideoNewsItem | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (viewPackages.length > 0) params.set("packages", viewPackages.join(","));
      if (labelLanguage === "en") params.set("lang", "en");
      params.set("max", String(liveVideoNewsFetchMax()));
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/video-news${qs}`, { cache: "no-store" });
      const data = (await res.json()) as VideoNewsPayload;
      setPayload(data);
    } catch {
      setPayload((prev) => prev);
    } finally {
      setLoading(false);
    }
  }, [labelLanguage, viewPackages]);

  useEffect(() => {
    if (!active) {
      setPlaying(null);
      return;
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), liveVideoNewsPollMs());
    return () => window.clearInterval(timer);
  }, [active, refresh]);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlaying(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  const accent = economyMode
    ? "border-emerald-400/20 bg-emerald-950/40"
    : "border-sky-400/20 bg-sky-950/40";
  const chip = economyMode
    ? "bg-emerald-400/15 text-emerald-100/90"
    : "bg-sky-400/15 text-sky-100/90";

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <p className="mb-3 px-1 text-[11px] leading-relaxed text-slate-400">
          {economyMode
            ? labelLanguage === "en"
              ? "Bloomberg · CNBC International · FT · Reuters — live market video only. Metadata polls; play on click. Historical docs are not polled."
              : "Bloomberg · CNBC International · FT · Reuters — 시장·매크로 현실 영상만. 메타만 폴링, 재생은 클릭 시."
            : labelLanguage === "en"
              ? "BBC · Reuters · AP · Al Jazeera · DW — live geopolitics video only. Metadata polls; play on click. Anti-west conflict docs stay curated (no poll)."
              : "BBC · Reuters · AP · Al Jazeera · DW — 지정학 현실 뉴스만. 메타만 폴링, 재생은 클릭 시. 반서방 충돌사 다큐는 스토리 큐레이션(폴링 없음)."}
        </p>

        {loading && !payload ? (
          <p className="py-12 text-center text-sm text-slate-500">동영상 뉴스 동기화 중…</p>
        ) : !payload || payload.items.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            {payload?.error || "표시할 동영상 뉴스가 없습니다. (warm/D1 대기 가능)"}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {payload.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPlaying(item)}
                className={`group overflow-hidden rounded-xl border text-left transition hover:brightness-110 ${accent}`}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-black/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25">
                      ▶ 재생
                    </span>
                  </span>
                </div>
                <div className="space-y-1.5 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${chip}`}>
                      {item.source}
                    </span>
                    <span className="text-[10px] text-slate-500">{formatAge(item.publishedAt)}</span>
                  </div>
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-50">
                    {item.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {payload && payload.items.length > 0 ? (
          <p className="mt-4 px-1 text-[10px] text-slate-500">
            {payload.stats.total}클립 · {payload.stats.sources}채널
            {payload.source ? ` · ${payload.source}` : ""}
          </p>
        ) : null}
      </div>

      {playing ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-label={playing.title}
          onClick={() => setPlaying(null)}
        >
          <div
            className="flex w-full max-w-3xl flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400">{playing.source}</p>
                <p className="text-sm font-semibold text-slate-50">{playing.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setPlaying(null)}
                className="shrink-0 rounded-lg border border-slate-500 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800"
              >
                닫기
              </button>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/15">
              <iframe
                title={playing.title}
                src={`https://www.youtube.com/embed/${encodeURIComponent(playing.videoId)}?autoplay=1&rel=0`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <a
              href={playing.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-[11px] text-sky-300/80 underline-offset-2 hover:underline"
            >
              YouTube에서 열기
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
