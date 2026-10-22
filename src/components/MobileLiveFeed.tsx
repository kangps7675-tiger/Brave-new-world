"use client";

import { useEffect, useMemo, useState } from "react";
import { IncidentMiniMap } from "@/components/globe/IncidentMiniMap";
import { deskCategory, type DeskCategory } from "@/components/globe/LiveFlashDesk";
import { useLocalizedTextMap } from "@/hooks/useLocalizedTextMap";
import { useTr } from "@/hooks/useTr";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { stackSourceName, type StackItem } from "@/lib/incidentStack/build";
import { isMajorConfirmedStrike } from "@/lib/liveuamap/majorStrike";
import { classifyRegionalPosture } from "@/lib/liveuamap/regionalPosture";
import { splitLiveuaTitleBody } from "@/lib/liveuamap/peelTitleUrls";
import { findRelatedPhoto } from "@/lib/news/relatedPhoto";
import { newsAboutVessel, type NewsRef } from "@/lib/news/vesselNews";
import type { NewsStreamItem } from "@/lib/news/types";
import { fetchShipPhotos } from "@/lib/shipPhoto";

const CAT: Record<DeskCategory, { ko: string; en: string; cls: string }> = {
  ship: { ko: "선박", en: "Ship", cls: "bg-orange-500/25 text-orange-100" },
  strike: { ko: "타격", en: "Strike", cls: "bg-rose-500/30 text-rose-100" },
  posture: { ko: "정세", en: "Posture", cls: "bg-sky-500/25 text-sky-100" },
  front: { ko: "전선", en: "Front", cls: "bg-amber-500/25 text-amber-100" },
};
type Filter = "all" | DeskCategory;

function ago(at: number, now: number, en: boolean): string {
  const m = Math.max(0, Math.round((now - at) / 60_000));
  if (m < 1) return en ? "just now" : "방금";
  if (m < 60) return en ? `${m}m ago` : `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 48) return en ? `${h}h ago` : `${h}시간 전`;
  return en ? `${Math.round(h / 24)}d ago` : `${Math.round(h / 24)}일 전`;
}

function photosOf(item: StackItem): string[] {
  const ev = item.liveua;
  return ev?.imageUrls?.length ? ev.imageUrls : ev?.imageUrl ? [ev.imageUrl] : [];
}

type Props = {
  lang: LabelLanguage;
  items: StackItem[];
  shipIds: ReadonlySet<string>;
  newsPool: readonly NewsStreamItem[];
  newsRefs: readonly NewsRef[];
};

/** 폰 첫 화면 — 실시간 속보 피드(최신순·사진·분류) + 사건 상세(근거·관련 기사·2D 위치 지도). 3D 지구본은 쓰지 않는다. */
export function MobileLiveFeed({ lang, items, shipIds, newsPool, newsRefs }: Props) {
  const en = lang === "en";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(() => [...items].sort((a, b) => b.at - a.at), [items]);
  const rows = useMemo(
    () => sorted.map((it) => ({ it, cat: deskCategory(it, shipIds.has(it.id)) })),
    [sorted, shipIds],
  );
  const shown = filter === "all" ? rows : rows.filter((r) => r.cat === filter);
  const tr = useTr(shown.map((r) => r.it.title), lang);
  const open = openId ? rows.find((r) => r.it.id === openId) : null;

  if (open) {
    return (
      <FeedDetail
        lang={lang}
        item={open.it}
        cat={open.cat}
        all={sorted}
        newsPool={newsPool}
        newsRefs={newsRefs}
        now={now}
        onBack={() => setOpenId(null)}
      />
    );
  }

  const chip = (id: Filter, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setFilter(id)}
      aria-pressed={filter === id}
      className={`shrink-0 rounded-full border px-3 py-1 text-meta ${
        filter === id ? "border-sky-300/60 bg-sky-500/20 text-sky-50" : "border-white/15 text-slate-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-400" aria-hidden />
        <p className="text-[12.5px] text-slate-200">
          <span className="font-semibold text-rose-100">{en ? "LIVE" : "실시간 속보"}</span>
          {" · "}
          {en ? `${rows.length} incidents, newest first` : `${rows.length}건 · 최신순`}
        </p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {chip("all", en ? "All" : "전체")}
        {(Object.keys(CAT) as DeskCategory[]).map((c) => chip(c, en ? CAT[c].en : CAT[c].ko))}
      </div>
      {shown.length === 0 ? (
        <p className="py-8 text-center text-meta text-slate-500">{en ? "No incidents yet." : "아직 속보가 없습니다."}</p>
      ) : (
        <ul className="space-y-2">
          {shown.map(({ it, cat }) => {
            const thumb = photosOf(it)[0];
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(it.id)}
                  className="flex w-full gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-left active:bg-white/[0.08]"
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-16 w-20 shrink-0 rounded-md object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-16 w-20 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-micro text-slate-500">
                      {en ? "no photo" : "사진 없음"}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-micro">
                      <span className={`rounded px-1.5 py-0.5 ${CAT[cat].cls}`}>{en ? CAT[cat].en : CAT[cat].ko}</span>
                      <span className="tabular-nums text-slate-400">{ago(it.at, now, en)}</span>
                      <span className="truncate text-slate-500">{it.place}</span>
                    </span>
                    <span className="mt-1 line-clamp-3 block text-caption font-medium leading-snug text-slate-100">
                      {tr(it.title)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FeedDetail({
  lang,
  item,
  cat,
  all,
  newsPool,
  newsRefs,
  now,
  onBack,
}: {
  lang: LabelLanguage;
  item: StackItem;
  cat: DeskCategory;
  all: StackItem[];
  newsPool: readonly NewsStreamItem[];
  newsRefs: readonly NewsRef[];
  now: number;
  onBack: () => void;
}) {
  const en = lang === "en";
  const ev = item.liveua;
  const own = photosOf(item);
  const [shipPhotos, setShipPhotos] = useState<string[]>([]);
  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => {
    setShipPhotos([]);
    setPhotoIdx(0);
    const name = item.vesselName?.trim();
    if (own.length > 0 || !name) return;
    const ac = new AbortController();
    void fetchShipPhotos(name, ac.signal).then((p) => {
      if (!ac.signal.aborted) setShipPhotos(p.map((x) => x.url));
    });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const related = useMemo(
    () =>
      own.length === 0
        ? findRelatedPhoto(
            { text: `${item.title} ${ev?.title ?? ""} ${ev?.body ?? ""} ${item.detail ?? ""}`, at: item.at },
            newsPool,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.id, own.length, newsPool],
  );
  const photos = own.length > 0 ? own : related ? [related.imageUrl] : shipPhotos;

  const peeled = ev
    ? splitLiveuaTitleBody(
        en ? ev.title : ev.titleKo?.trim() || ev.title,
        en ? ev.body : ev.bodyKo?.trim() || ev.body,
        ev.sourceUrl,
      )
    : null;
  const strike = ev ? isMajorConfirmedStrike(ev) : null;
  const posture = ev ? classifyRegionalPosture(ev) : null;
  const basis = strike
    ? strike.facilityName
      ? [en ? strike.facilityName.en : strike.facilityName.ko]
      : strike.evidence
    : (posture?.evidence ?? []);
  const detailMap = useLocalizedTextMap(
    !ev && item.detail ? [{ key: item.id, text: item.detail }] : [],
    en ? "en" : "ko",
  );
  const rawBody = peeled ? peeled.body : (detailMap.get(item.id) ?? item.detail ?? "").trim();
  const news = useMemo(
    () => newsAboutVessel([item.vesselName], newsRefs),
    [item.vesselName, newsRefs],
  );
  const tr = useTr([item.title, peeled?.title, rawBody, related?.articleTitle, ...basis, ...news.map((n) => n.title)], lang);
  const title = tr(peeled ? peeled.title : item.title);
  const body = tr(rawBody);
  const shown = photos[Math.min(photoIdx, Math.max(0, photos.length - 1))];
  const kindLabel = en ? CAT[cat].en : CAT[cat].ko;

  return (
    <div className="mt-3 space-y-3 pb-4">
      <button
        type="button"
        onClick={onBack}
        className="tap-target rounded-lg border border-white/15 px-3 py-1.5 text-meta text-slate-200"
      >
        ← {en ? "Back to feed" : "속보 목록"}
      </button>
      <p className="flex items-center gap-2 text-micro">
        <span className={`rounded px-1.5 py-0.5 ${CAT[cat].cls}`}>{kindLabel}</span>
        <span className="tabular-nums text-slate-400">{ago(item.at, now, en)}</span>
        <span className="text-slate-500">{item.place}</span>
      </p>

      {ev?.videoUrl ? (
        <video
          className="aspect-video w-full rounded-lg bg-black object-contain"
          src={ev.videoUrl}
          poster={photos[0]}
          controls
          muted
          playsInline
          preload="metadata"
        />
      ) : shown ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="" className="max-h-64 w-full rounded-lg bg-black object-contain" />
          {photos.length > 1 ? (
            <div className="mt-1 flex gap-1 overflow-x-auto">
              {photos.map((src, i) => (
                <button key={src} type="button" onClick={() => setPhotoIdx(i)} aria-label={`${i + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className={`h-12 w-16 rounded object-cover ${i === photoIdx ? "ring-2 ring-sky-300" : "opacity-60"}`}
                  />
                </button>
              ))}
            </div>
          ) : null}
          <p className="mt-1 text-micro text-slate-500">
            {own.length === 0 && related ? (
              <>
                {en ? "Related photo · " : "연관 사진 · "}
                <a href={related.articleUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  {related.outlet}: {tr(related.articleTitle)}
                </a>
                {en ? " (not from the scene itself)" : " (현장 사진이 아닐 수 있음)"}
              </>
            ) : ev ? (
              en ? "Photos come from the original posts cited by Liveuamap." : "사진은 Liveuamap이 인용한 원 게시물의 것입니다."
            ) : en ? (
              "Reference photo of the named vessel (Wikimedia Commons)."
            ) : (
              "선박명으로 찾은 참고 사진(위키미디어) — 사건 현장 사진이 아닙니다."
            )}
          </p>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-white/15 px-3 py-5 text-center text-meta text-slate-500">
          {en ? "No photo attached to the original report." : "원 보도에 첨부된 사진이 없습니다."}
        </p>
      )}

      <h2 className="text-[15px] font-semibold leading-snug text-slate-50">{title}</h2>
      {body ? <p className="whitespace-pre-line text-caption leading-relaxed text-slate-300">{body}</p> : null}

      {basis.length > 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
          <p className="text-micro font-semibold text-slate-400">
            {strike ? (en ? "Why it's flagged" : "큰 타격으로 본 근거") : en ? "Matched wording" : "걸린 표현"}
          </p>
          <p className="text-meta text-slate-200">{basis.map(tr).join(" · ")}</p>
        </div>
      ) : null}

      <IncidentMiniMap item={item} others={all} lang={en ? "en" : "ko"} kindLabel={kindLabel} />

      {news.length > 0 ? (
        <div className="rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2">
          <p className="text-micro font-semibold text-amber-200/80">{en ? "Related reports" : "관련 기사"}</p>
          <ul className="mt-1 space-y-1.5">
            {news.map((n) => (
              <li key={n.link} className="text-meta text-slate-200">
                <a href={n.link} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                  {tr(n.title)}
                </a>
                <span className="ml-1 text-micro text-slate-500">{n.source}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-micro tabular-nums text-slate-500">
        {en ? "Source" : "출처"}: {stackSourceName(item)} · {new Date(item.at).toISOString().slice(0, 16).replace("T", " ")} UTC ·{" "}
        {item.lat.toFixed(3)}, {item.lng.toFixed(3)}
        {item.url && /^https?:\/\//i.test(item.url) ? (
          <>
            {" · "}
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline">
              {en ? "original" : "원문"}
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}
