"use client";

import { useEffect, useState } from "react";
import { getOrCreatePredictionDeviceId } from "@/lib/predictionDeviceId";
import type { NewsReaction, ReactionCounts } from "@/lib/newsArticleReactions";

const BUTTONS: Array<{ id: NewsReaction; emoji: string; ko: string; en: string }> = [
  { id: "surprised", emoji: "😮", ko: "놀랐어요", en: "Surprised" },
  { id: "interested", emoji: "✨", ko: "흥미로워요", en: "Interesting" },
  { id: "more", emoji: "🔎", ko: "더 보고 싶어요", en: "See more" },
];

const ZERO: ReactionCounts = { surprised: 0, interested: 0, more: 0 };

type Snap = { counts: Record<string, ReactionCounts>; mine: Record<string, NewsReaction[]> };

const waiters = new Map<string, Array<(snap: Snap) => void>>();
let flushTimer: number | null = null;

function queueRead(articleId: string, deviceId: string): Promise<Snap> {
  return new Promise((resolve) => {
    const list = waiters.get(articleId) ?? [];
    list.push(resolve);
    waiters.set(articleId, list);
    if (flushTimer != null) window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => {
      flushTimer = null;
      const ids = [...waiters.keys()];
      const pending = new Map(waiters);
      waiters.clear();
      const qs = `ids=${encodeURIComponent(ids.join(","))}&deviceId=${encodeURIComponent(deviceId)}`;
      void fetch(`/api/news-reactions?${qs}`, { cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<Snap>) : Promise.reject(new Error("bad"))))
        .then((snap) => {
          for (const fns of pending.values()) for (const fn of fns) fn(snap);
        })
        .catch(() => {
          for (const fns of pending.values()) for (const fn of fns) fn({ counts: {}, mine: {} });
        });
    }, 40);
  });
}

type Props = {
  articleId: string;
  lang: "ko" | "en";
};

/** 기사 아래 반응. 숫자는 감정이고, 맞음·얇음을 바꾸지 않는다. */
export function ArticleReactions({ articleId, lang }: Props) {
  const en = lang === "en";
  const [counts, setCounts] = useState<ReactionCounts>(ZERO);
  const [mine, setMine] = useState<NewsReaction[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const deviceId = getOrCreatePredictionDeviceId();
    let gone = false;
    void queueRead(articleId, deviceId).then((snap) => {
      if (gone) return;
      setCounts(snap.counts[articleId] ?? ZERO);
      setMine(snap.mine[articleId] ?? []);
    });
    return () => {
      gone = true;
    };
  }, [articleId]);

  async function toggle(reaction: NewsReaction) {
    if (busy) return;
    const deviceId = getOrCreatePredictionDeviceId();
    const had = mine.includes(reaction);
    setMine(had ? mine.filter((id) => id !== reaction) : [...mine, reaction]);
    setCounts({ ...counts, [reaction]: Math.max(0, counts[reaction] + (had ? -1 : 1)) });
    setBusy(true);
    try {
      const res = await fetch("/api/news-reactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ articleId, deviceId, reaction }),
      });
      if (!res.ok) throw new Error("bad");
      const snap = (await res.json()) as { counts?: ReactionCounts; mine?: NewsReaction[] };
      if (snap.counts) setCounts(snap.counts);
      if (snap.mine) setMine(snap.mine);
    } catch {
      setMine(had ? [...mine, reaction] : mine.filter((id) => id !== reaction));
      setCounts(counts);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1" data-article-reactions>
      {BUTTONS.map((button) => {
        const on = mine.includes(button.id);
        return (
          <button
            key={button.id}
            type="button"
            aria-pressed={on}
            disabled={busy}
            onClick={() => void toggle(button.id)}
            className={`rounded-full border px-1.5 py-0.5 text-micro ${
              on
                ? "border-amber-200/70 bg-amber-400/20 text-amber-50"
                : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            <span aria-hidden>{button.emoji}</span> {en ? button.en : button.ko}
            <span className="ml-1 tabular-nums">{counts[button.id]}</span>
          </button>
        );
      })}
    </div>
  );
}
