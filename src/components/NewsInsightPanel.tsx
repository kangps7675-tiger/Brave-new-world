"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { NewsInsightSelectionItem } from "@/lib/news/newsInsightTypes";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { getUserAnthropicApiKey } from "@/lib/llm/userAnthropicKey";
import {
  labelForCatalogId,
  type NewsInsightMode,
} from "@/data/newsInsightCatalog";
import type {
  NewsInsightExcerpt,
  NewsInsightMapAction,
  NewsInsightPayload,
} from "@/lib/llm/newsInsightPrompt";

export type { NewsInsightSelectionItem } from "@/lib/news/newsInsightTypes";

export type NewsInsightApplyPayload = {
  layerIds: string[];
  bundleId?: string;
  center?: { lat: number; lng: number };
  altitude?: number;
  calloutTitle: string;
};

type NewsInsightPanelProps = {
  item: NewsInsightSelectionItem;
  mode: NewsInsightMode;
  lang: LabelLanguage;
  onClose: () => void;
  onApplyMap: (payload: NewsInsightApplyPayload) => void;
};

type ApiResponse = Partial<NewsInsightPayload> & {
  ok?: boolean;
  error?: string;
  note?: string;
  mode?: string;
  billing?: string;
};

function formatAge(pubDate: string, lang: LabelLanguage): string {
  const ts = Date.parse(pubDate);
  if (!Number.isFinite(ts)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  const en = lang === "en";
  if (minutes < 1) return en ? "just now" : "방금";
  if (minutes < 60) return en ? `${minutes}m ago` : `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return en ? `${hours}h ago` : `${hours}시간 전`;
  return en ? `${Math.floor(hours / 24)}d ago` : `${Math.floor(hours / 24)}일 전`;
}

function ExcerptView({
  excerpt,
  lang,
  activeKey,
  onHighlightClick,
}: {
  excerpt: NewsInsightExcerpt;
  lang: LabelLanguage;
  activeKey: string | null;
  onHighlightClick: (key: string, layerIds: string[], bundleId?: string) => void;
}) {
  const nodes: ReactNode[] = [];
  const sorted = [...excerpt.highlights].sort((a, b) => a.start - b.start);
  let cursor = 0;
  sorted.forEach((h, i) => {
    if (h.start > cursor) {
      nodes.push(
        <span key={`t-${cursor}`}>{excerpt.text.slice(cursor, h.start)}</span>,
      );
    }
    const key = `${h.start}-${h.end}-${i}`;
    const active = activeKey === key;
    nodes.push(
      <button
        key={key}
        type="button"
        onClick={() => onHighlightClick(key, h.layerIds, h.bundleId)}
        className={`rounded px-0.5 transition ${
          active
            ? "bg-amber-400/45 text-amber-50 ring-1 ring-amber-300/60"
            : "bg-amber-400/20 text-amber-100 hover:bg-amber-400/35"
        }`}
        title={
          lang === "en"
            ? "Show related map layers"
            : "관련 지도 레이어 보기"
        }
      >
        {excerpt.text.slice(h.start, h.end)}
      </button>,
    );
    cursor = h.end;
  });
  if (cursor < excerpt.text.length) {
    nodes.push(<span key={`t-end`}>{excerpt.text.slice(cursor)}</span>);
  }
  return (
    <p className="text-sm leading-6 text-slate-200/95 whitespace-pre-wrap">{nodes}</p>
  );
}

function chipLabel(
  layerIds: string[],
  bundleId: string | undefined,
  lang: LabelLanguage,
): string[] {
  const L = lang === "en" ? "en" : "ko";
  if (bundleId) return [labelForCatalogId(bundleId, L)];
  return layerIds.map((id) => labelForCatalogId(id, L));
}

export function NewsInsightPanel({
  item,
  mode,
  lang,
  onClose,
  onApplyMap,
}: NewsInsightPanelProps) {
  const en = lang === "en";
  const article = item.article;
  const title = item.displayTitle ?? article.title;
  const summary = item.displaySummary ?? article.summary;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<NewsInsightPayload | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<NewsInsightMapAction | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    setPayload(null);
    setActiveHighlight(null);
    setSelectedAction(null);

    const userKey = getUserAnthropicApiKey();
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (userKey) headers["x-anthropic-api-key"] = userKey;

    void (async () => {
      try {
        const res = await fetch("/api/claude/news-insight", {
          method: "POST",
          cache: "no-store",
          headers,
          signal: ac.signal,
          body: JSON.stringify({
            url: article.link,
            title: article.title,
            source: article.source,
            publishedAt: article.pubDate,
            bodyOrSnippet: summary ?? article.summary ?? null,
            mode,
            lang: en ? "en" : "ko",
          }),
        });
        const data = (await res.json()) as ApiResponse;
        if (cancelled) return;
        const next: NewsInsightPayload = {
          excerpts: Array.isArray(data.excerpts) ? data.excerpts : [],
          insight: typeof data.insight === "string" ? data.insight : "",
          mapActions: Array.isArray(data.mapActions) ? data.mapActions : [],
        };
        if (!next.excerpts.length && (summary || article.title)) {
          next.excerpts = [
            {
              text: (summary || article.title).slice(0, 220),
              highlights: [],
            },
          ];
        }
        setPayload(next);
        if (next.mapActions[0]) setSelectedAction(next.mapActions[0]);
        if (!res.ok && data.error) setError(data.error);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setError(
          en ? "Could not load insight." : "인사이트를 불러오지 못했습니다.",
        );
        setPayload({
          excerpts: [
            {
              text: (summary || article.title).slice(0, 220),
              highlights: [],
            },
          ],
          insight: en
            ? "Insight unavailable. The excerpt and source link remain available."
            : "인사이트를 가져오지 못했습니다. 발췌와 원문 링크는 확인할 수 있습니다.",
          mapActions: [],
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [article.link, article.title, article.source, article.pubDate, article.summary, summary, mode, en]);

  const previewChips = useMemo(() => {
    if (!selectedAction) return [] as string[];
    return chipLabel(selectedAction.layerIds, selectedAction.bundleId, lang);
  }, [selectedAction, lang]);

  const otherActions = payload?.mapActions ?? [];

  const handleShowOnMap = () => {
    if (!selectedAction) return;
    onApplyMap({
      layerIds: selectedAction.layerIds,
      bundleId: selectedAction.bundleId,
      center: selectedAction.center,
      altitude: selectedAction.altitude,
      calloutTitle: title.slice(0, 80),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-2 border-b border-slate-600/30 pb-3">
        <div className="min-w-0">
          <p className="text-micro uppercase tracking-[0.22em] text-amber-200/70">
            {en ? "News insight" : "뉴스 인사이트"}
          </p>
          <h2 className="mt-1 text-base font-semibold leading-snug text-slate-50">
            {title}
          </h2>
          <p className="mt-1 text-meta text-slate-400">
            {article.source}
            {article.pubDate ? ` · ${formatAge(article.pubDate, lang)}` : ""}
          </p>
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-caption text-sky-300/90 underline-offset-2 hover:underline"
          >
            {en ? "Open original" : "원문 보기"}
          </a>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-slate-500/30 px-2 py-1 text-meta text-slate-300 transition hover:border-slate-300/50 hover:text-slate-100"
          aria-label={en ? "Close" : "닫기"}
        >
          {en ? "Close" : "닫기"}
        </button>
      </div>

      <section className="space-y-2">
        <h3 className="text-micro font-semibold uppercase tracking-wider text-slate-400">
          {en ? "Excerpt" : "발췌"}
        </h3>
        {loading && !payload ? (
          <div className="space-y-2" aria-busy>
            <div className="h-4 animate-pulse rounded bg-slate-700/50" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-700/40" />
          </div>
        ) : (
          (payload?.excerpts ?? []).map((ex, i) => (
            <ExcerptView
              key={`ex-${i}`}
              excerpt={ex}
              lang={lang}
              activeKey={activeHighlight}
              onHighlightClick={(key, layerIds, bundleId) => {
                setActiveHighlight(key);
                setSelectedAction({ layerIds, bundleId });
              }}
            />
          ))
        )}
      </section>

      <section className="space-y-2 rounded-lg border border-amber-400/20 bg-amber-950/20 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!selectedAction}
            onClick={handleShowOnMap}
            className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-caption font-semibold text-amber-50 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {en ? "Show on map" : "지도에서 보기"}
          </button>
          {previewChips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-micro text-amber-100/90"
            >
              {c}
            </span>
          ))}
        </div>
        {otherActions.length > 1 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="w-full text-micro text-slate-500">
              {en ? "Other highlights" : "같은 기사 다른 하이라이트"}
            </span>
            {otherActions.map((a, i) => {
              const labels = chipLabel(a.layerIds, a.bundleId, lang);
              const selected =
                selectedAction === a ||
                (selectedAction?.bundleId &&
                  selectedAction.bundleId === a.bundleId);
              return (
                <button
                  key={`act-${i}`}
                  type="button"
                  onClick={() => setSelectedAction(a)}
                  className={`rounded-full border px-2 py-0.5 text-micro transition ${
                    selected
                      ? "border-amber-300/50 bg-amber-400/20 text-amber-50"
                      : "border-slate-500/30 bg-slate-800/40 text-slate-300 hover:border-slate-400/40"
                  }`}
                >
                  {labels[0] ?? `Map ${i + 1}`}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="mt-auto space-y-2 border-t border-slate-600/25 pt-3">
        <h3 className="text-micro font-semibold uppercase tracking-wider text-slate-400">
          {en ? "Insight" : "인사이트"}
        </h3>
        {loading ? (
          <div className="space-y-2" aria-busy>
            <div className="h-3 animate-pulse rounded bg-slate-700/45" />
            <div className="h-3 w-[92%] animate-pulse rounded bg-slate-700/35" />
            <div className="h-3 w-[80%] animate-pulse rounded bg-slate-700/30" />
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-200/90 whitespace-pre-wrap">
            {payload?.insight ||
              (en
                ? "No insight yet."
                : "인사이트가 아직 없습니다.")}
          </p>
        )}
        {error ? (
          <p className="text-meta text-rose-300/80">{error}</p>
        ) : null}
      </section>
    </div>
  );
}
