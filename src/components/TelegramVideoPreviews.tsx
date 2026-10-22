"use client";

import { useEffect, useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { formatUtcFull, parseTime } from "@/lib/provenance";
import { telegramEmbedUrl, type TelegramVideoPost } from "@/lib/telegramVideo";
import { localizedDisplayText, useLocalizedTextMap } from "@/hooks/useLocalizedTextMap";

const HIDE_KEY = "straitdesk.tgVideo.blur";
const FIRST_BATCH = 4;

function readBlur(): boolean {
  try {
    return window.localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * 뉴스 동영상 탭 — 텔레그램 채널 영상을 원본 게시물 임베드로 바로 보여 준다.
 * 영상은 텔레그램 서버에서 재생되고 우리는 내려받지 않는다. 채널명·시각·원문 링크를 같이 둔다.
 * 전쟁 영상이 섞일 수 있어 "가리기" 스위치를 둔다 (켜면 눌러서 본다).
 */
export function TelegramVideoPreviews({ active, labelLanguage }: { active: boolean; labelLanguage: LabelLanguage }) {
  const en = labelLanguage === "en";
  const [videos, setVideos] = useState<TelegramVideoPost[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [blur, setBlur] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setBlur(readBlur());
  }, []);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const pull = () =>
      fetch("/api/telegram-videos", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<{ videos?: TelegramVideoPost[] }>) : { videos: [] }))
        .then((d) => {
          if (alive) setVideos(Array.isArray(d.videos) ? d.videos : []);
        })
        .catch(() => alive && setVideos((prev) => prev ?? []));
    void pull();
    const timer = window.setInterval(pull, 5 * 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [active]);

  const shown = useMemo(() => (videos ?? []).slice(0, showAll ? 24 : FIRST_BATCH), [videos, showAll]);
  const entries = useMemo(
    () =>
      en
        ? []
        : shown.filter((v) => v.caption).map((v) => ({ key: `c:${v.id}`, text: v.caption })),
    [shown, en],
  );
  const localized = useLocalizedTextMap(entries, "ko");

  function toggleBlur(next: boolean) {
    setBlur(next);
    try {
      window.localStorage.setItem(HIDE_KEY, next ? "1" : "0");
    } catch {
      /* 저장 불가 환경 — 이번 화면에서만 적용 */
    }
  }

  if (videos !== null && videos.length === 0) return null; // 영상 게시물이 없으면 칸 자체를 숨긴다

  return (
    <section aria-label={en ? "Telegram videos" : "텔레그램 영상"} className="mb-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold text-slate-100">
          {en ? "Telegram channel videos" : "텔레그램 채널 영상"}
        </h3>
        <label className="flex items-center gap-1.5 text-micro text-slate-400">
          <input
            type="checkbox"
            checked={blur}
            onChange={(e) => toggleBlur(e.target.checked)}
            className="accent-sky-400"
          />
          {en ? "Hide graphic videos until I click" : "민감한 영상은 눌러서 보기"}
        </label>
      </div>
      <p className="mb-2 px-1 text-micro leading-snug text-slate-500">
        {en
          ? "Original posts embedded from Telegram — played on Telegram's servers, not copied. Unverified channel content."
          : "텔레그램 원본 게시물을 그대로 임베드합니다. 영상은 텔레그램에서 재생되며 복사하지 않습니다. 채널 주장은 검증되지 않았습니다."}
      </p>

      {videos === null ? (
        <p className="py-6 text-center text-sm text-slate-500">{en ? "Loading…" : "불러오는 중…"}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shown.map((v) => {
            const src = telegramEmbedUrl(v.channel, v.postId);
            if (!src) return null;
            const at = parseTime(v.receivedAt);
            const hidden = blur && !revealed.has(v.id);
            const caption = en ? v.caption : localizedDisplayText(localized, `c:${v.id}`, v.caption);
            return (
              <article key={v.id} className="overflow-hidden rounded-xl border border-sky-400/20 bg-sky-950/40">
                <header className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-3 pt-2">
                  <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-micro font-medium text-sky-100/90">
                    {v.channelTitle ?? v.channel}
                  </span>
                  <span className="text-micro tabular-nums text-slate-500">
                    {at != null ? formatUtcFull(at, labelLanguage) : ""}
                  </span>
                </header>
                {caption ? <p className="line-clamp-2 px-3 pt-1 text-meta leading-snug text-slate-200">{caption}</p> : null}
                <div className="relative mt-2 h-[26rem] w-full bg-black/40">
                  {hidden ? (
                    <button
                      type="button"
                      onClick={() => setRevealed((prev) => new Set(prev).add(v.id))}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-950/90 text-center text-meta text-slate-300 hover:bg-slate-900"
                    >
                      <span className="text-lg" aria-hidden>
                        ▶
                      </span>
                      {en ? "May contain graphic content — click to view" : "민감한 내용일 수 있습니다 · 눌러서 보기"}
                    </button>
                  ) : (
                    <iframe
                      title={`${v.channelTitle ?? v.channel} #${v.postId}`}
                      src={src}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                      className="h-full w-full border-0"
                    />
                  )}
                </div>
                <a
                  href={v.messageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-1.5 text-micro text-sky-300/80 underline-offset-2 hover:underline"
                >
                  {en ? "Open on Telegram" : "텔레그램에서 열기"}
                </a>
              </article>
            );
          })}
        </div>
      )}

      {videos !== null && videos.length > FIRST_BATCH && !showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 w-full rounded-lg border border-slate-600/60 py-1.5 text-meta text-slate-300 hover:bg-slate-800/60"
        >
          {en ? `Show ${videos.length - FIRST_BATCH} more` : `영상 ${videos.length - FIRST_BATCH}개 더 보기`}
        </button>
      ) : null}
    </section>
  );
}
