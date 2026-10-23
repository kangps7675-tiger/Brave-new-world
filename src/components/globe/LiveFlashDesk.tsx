"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { stackSourceName, type StackItem } from "@/lib/incidentStack/build";
import { isMajorConfirmedStrike } from "@/lib/liveuamap/majorStrike";
import { classifyRegionalPosture } from "@/lib/liveuamap/regionalPosture";
import { splitLiveuaTitleBody } from "@/lib/liveuamap/peelTitleUrls";
import { fetchShipPhotos } from "@/lib/shipPhoto";
import { findRelatedPhoto } from "@/lib/news/relatedPhoto";
import type { NewsStreamItem } from "@/lib/news/types";
import { useLocalizedTextMap } from "@/hooks/useLocalizedTextMap";
import { useTr } from "@/hooks/useTr";
import { IncidentMiniMap } from "@/components/globe/IncidentMiniMap";
import { zc } from "@/lib/uiStack";

export type DeskCategory = "ship" | "strike" | "posture" | "front";

export function deskCategory(item: StackItem, isShip: boolean): DeskCategory {
  if (isShip) return "ship";
  const ev = item.liveua;
  if (ev && isMajorConfirmedStrike(ev)) return "strike";
  if (ev && classifyRegionalPosture(ev)) return "posture";
  return "front";
}

export const DESK_CATEGORY_ORDER: readonly DeskCategory[] = ["strike", "ship", "posture", "front"];

const CAT_LABEL: Record<DeskCategory, { ko: string; en: string; cls: string }> = {
  ship: { ko: "선박", en: "Ship", cls: "bg-orange-500/25 text-orange-100" },
  strike: { ko: "타격", en: "Strike", cls: "bg-rose-500/30 text-rose-100" },
  posture: { ko: "정세", en: "Posture", cls: "bg-sky-500/25 text-sky-100" },
  front: { ko: "전선", en: "Front", cls: "bg-amber-500/25 text-amber-100" },
};

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
  /** 최신순으로 합친 전 사건 (선박 + 전선 + 정세) */
  items: StackItem[];
  shipIds: ReadonlySet<string>;
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onGoToLocation: (item: StackItem) => void;
  onViewSatellite: (item: StackItem) => void;
  /** RSS 뉴스 풀 — 속보에 사진이 없을 때 같은 사건 기사의 사진을 레퍼런스와 함께 붙인다 */
  newsPool?: readonly NewsStreamItem[];
  /** 위성 모드에서는 지구본이 보이도록 좁게 */
  narrow?: boolean;
  /** 폰: 위치로 가기·위성으로 보기 뒤에 창을 접어 지도를 보여 준다 */
  collapseOnAction?: boolean;
};

/**
 * 실시간 속보창 — 옛 양피지 편지가 아니라 최신순 라이브 데스크.
 * 왼쪽 사이드바는 항상 보이고(최신이 위, 새로 들어온 건 NEW), 오른쪽에 선택한 사건의 사진·본문·근거를 보여 준다.
 */
export function LiveFlashDesk({
  lang,
  items,
  shipIds,
  selectedId,
  onSelect,
  onClose,
  onGoToLocation,
  onViewSatellite,
  newsPool = [],
  narrow = false,
  collapseOnAction = false,
}: Props) {
  const en = lang === "en";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  // 카테고리별로 묶고(타격 → 선박 → 정세 → 전선), 각 묶음 안은 최신순. 이전/다음·방향키도 이 순서를 따른다.
  const { sorted, groups } = useMemo(() => {
    const byTime = [...items].sort((a, b) => b.at - a.at);
    const gs = DESK_CATEGORY_ORDER.map((cat) => ({
      cat,
      items: byTime.filter((i) => deskCategory(i, shipIds.has(i.id)) === cat),
    })).filter((g) => g.items.length > 0);
    return { sorted: gs.flatMap((g) => g.items), groups: gs };
  }, [items, shipIds]);
  // 창을 연 시점에 이미 있던 건은 NEW가 아니다
  const baseline = useRef<Set<string> | null>(null);
  if (baseline.current === null) baseline.current = new Set(items.map((i) => i.id));
  const idx = Math.max(0, sorted.findIndex((i) => i.id === selectedId));
  const item = sorted[idx];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" && sorted[idx + 1]) onSelect(sorted[idx + 1]!.id);
      if (e.key === "ArrowUp" && sorted[idx - 1]) onSelect(sorted[idx - 1]!.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, sorted, onClose, onSelect]);

  const [minimized, setMinimized] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [shipPhotos, setShipPhotos] = useState<string[]>([]);
  const own = item ? photosOf(item) : [];
  useEffect(() => {
    setPhotoIdx(0);
    setShipPhotos([]);
    if (!item || own.length > 0) return;
    const name = item.vesselName?.trim();
    if (!name) return;
    const ac = new AbortController();
    void fetchShipPhotos(name, ac.signal).then((p) => {
      if (!ac.signal.aborted) setShipPhotos(p.map((x) => x.url));
    });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const related = useMemo(
    () =>
      item && own.length === 0
        ? findRelatedPhoto(
            { text: `${item.title} ${item.liveua?.title ?? ""} ${item.liveua?.body ?? ""} ${item.detail ?? ""}`, at: item.at },
            newsPool,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item?.id, own.length, newsPool],
  );
  const translated = useLocalizedTextMap(
    item && !item.liveua && item.detail ? [{ key: item.id, text: item.detail }] : [],
    en ? "en" : "ko",
  );
  const trEv = item?.liveua;
  const trSrc = trEv ? splitLiveuaTitleBody(trEv.titleKo?.trim() || trEv.title, trEv.bodyKo?.trim() || trEv.body, trEv.sourceUrl) : null;
  const trBasis = trEv
    ? [...(isMajorConfirmedStrike(trEv)?.evidence ?? []), ...(classifyRegionalPosture(trEv)?.evidence ?? [])]
    : [];
  const tr = useTr(
    [...sorted.map((i) => i.title), trSrc?.title, trSrc?.body, related?.articleTitle, ...trBasis],
    lang,
  );
  if (!item) return null;

  const ev = item.liveua;
  let title = item.title;
  let body = "";
  if (ev) {
    const p = splitLiveuaTitleBody(
      en ? ev.title : ev.titleKo?.trim() || ev.title,
      en ? ev.body : ev.bodyKo?.trim() || ev.body,
      ev.sourceUrl,
    );
    title = tr(p.title);
    body = tr(p.body);
  } else {
    body = (translated.get(item.id) ?? item.detail ?? "").trim();
    title = tr(title);
  }
  const photos = own.length > 0 ? own : related ? [related.imageUrl] : shipPhotos;
  const cat = deskCategory(item, shipIds.has(item.id));
  const strike = ev ? isMajorConfirmedStrike(ev) : null;
  const posture = ev ? classifyRegionalPosture(ev) : null;
  const basis = strike
    ? strike.facilityName
      ? [en ? strike.facilityName.en : strike.facilityName.ko]
      : strike.evidence
    : (posture?.evidence ?? []);
  const when = new Date(item.at).toISOString().slice(0, 16).replace("T", " ");
  const btn =
    "rounded-sm border border-[#6b4a22]/40 bg-[#efe0bc]/95 px-2.5 py-0.5 text-micro text-[#3d2a12] hover:bg-[#e8d6a8] disabled:opacity-40";
  const shownPhoto = photos[Math.min(photoIdx, Math.max(0, photos.length - 1))];

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className={`pointer-events-auto fixed inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-md border border-[#6b4a22]/60 bg-[#f3e6c8] px-3 py-2 text-left text-micro font-semibold text-[#2a1c0a] shadow-2xl sm:left-auto sm:right-3 sm:w-80 ${zc("alert")}`}
        aria-label={en ? "Open flash desk" : "속보창 열기"}
      >
        <span className="min-w-0 truncate">
          <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-rose-600" aria-hidden />
          {title}
        </span>
        <span aria-hidden>▴</span>
      </button>
    );
  }

  return (
    <aside
      className={`pointer-events-auto fixed inset-x-2 bottom-2 top-16 flex flex-col overflow-hidden rounded-md border border-[#6b4a22]/55 bg-[#f3e6c8] text-[#2a1c0a] shadow-2xl sm:left-auto sm:right-3 ${narrow ? "sm:w-[min(40rem,60vw)]" : "sm:w-[min(56rem,calc(100vw-1.5rem))]"} sm:flex-row ${zc("alert")}`}
      aria-label={en ? "Live flash desk" : "실시간 속보창"}
      data-live-flash-desk
    >
      <nav
        className="flex max-h-32 shrink-0 gap-1 overflow-auto border-b border-[#6b4a22]/30 bg-[#e9d9b4] p-1.5 sm:max-h-none sm:w-64 sm:flex-col sm:border-b-0 sm:border-r"
        aria-label={en ? "Latest flashes" : "최신 속보 목록"}
      >
        <p className="hidden items-center gap-1.5 px-1 pb-1 text-micro font-semibold sm:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" aria-hidden />
          {en ? "LIVE · by category" : "실시간 · 분류별"}
          <span className="ml-auto tabular-nums text-[#5c4020]/75">{sorted.length}</span>
        </p>
        {groups.map((g) => (
          <div key={g.cat} className="flex shrink-0 gap-1 sm:flex-col">
            <p className="flex shrink-0 items-center gap-1 px-1 pt-1 text-micro font-semibold sm:sticky sm:top-0 sm:z-10 sm:bg-[#e9d9b4]">
              <span className={`rounded-sm px-1 ${CAT_LABEL[g.cat].cls} bg-[#2a1c0a]`}>
                {en ? CAT_LABEL[g.cat].en : CAT_LABEL[g.cat].ko}
              </span>
              <span className="tabular-nums text-[#5c4020]/75">{g.items.length}</span>
            </p>
          {g.items.map((it) => {
            const c = g.cat;
            const thumb = photosOf(it)[0];
            const isNew = !baseline.current!.has(it.id);
            const on = it.id === item.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onSelect(it.id)}
                aria-current={on}
                className={`flex w-44 shrink-0 gap-1.5 rounded-sm border p-1 text-left sm:w-full ${
                  on ? "border-[#6b4a22] bg-[#f8eed4]" : "border-transparent hover:bg-[#f3e6c8]"
                }`}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="h-12 w-12 shrink-0 rounded-sm object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-[#d8c79c] text-micro text-[#5c4020]/60">
                    {en ? "no photo" : "사진 없음"}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-micro">
                    <span className={`rounded-sm px-1 ${CAT_LABEL[c].cls} bg-[#2a1c0a]`}>
                      {en ? CAT_LABEL[c].en : CAT_LABEL[c].ko}
                    </span>
                    {isNew ? <span className="rounded-sm bg-rose-600 px-1 text-white">NEW</span> : null}
                    <span className="ml-auto tabular-nums text-[#5c4020]/75">{ago(it.at, now, en)}</span>
                  </span>
                  <span className="line-clamp-2 text-micro font-medium leading-snug">{tr(it.title)}</span>
                </span>
              </button>
            );
          })}
          </div>
        ))}
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-[#6b4a22]/30 px-3 py-1.5 text-micro">
          <span className="font-semibold">
            {en ? CAT_LABEL[cat].en : CAT_LABEL[cat].ko} · {item.place} · {ago(item.at, now, en)}
          </span>
          <span className="flex gap-1">
            <button type="button" className={`${btn} sm:hidden`} aria-label={en ? "Minimize" : "접기"} onClick={() => setMinimized(true)}>
              ▾
            </button>
            <button type="button" className={btn} aria-label={en ? "Close" : "닫기"} onClick={onClose}>
              ×
            </button>
          </span>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {ev?.videoUrl ? (
            <video
              className="aspect-[16/9] w-full rounded-sm bg-black object-contain"
              src={ev.videoUrl}
              poster={photos[0]}
              controls
              muted
              playsInline
              preload="metadata"
            />
          ) : shownPhoto ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shownPhoto} alt="" className="max-h-72 w-full rounded-sm bg-black/80 object-contain" />
              {photos.length > 1 ? (
                <div className="mt-1 flex gap-1 overflow-x-auto">
                  {photos.map((src, i) => (
                    <button key={src} type="button" onClick={() => setPhotoIdx(i)} aria-label={`${i + 1}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className={`h-12 w-16 rounded-sm object-cover ${i === photoIdx ? "ring-2 ring-[#6b4a22]" : "opacity-70"}`}
                      />
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="mt-1 text-micro text-[#5c4020]/70">
                {own.length === 0 && related ? (
                  <>
                    {en ? "Related photo · " : "연관 사진 · "}
                    <a href={related.articleUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      {related.outlet}: {tr(related.articleTitle)}
                    </a>
                    {en ? " (not from the scene itself)" : " (사건 현장 사진이 아닐 수 있음)"}
                  </>
                ) : ev
                  ? en
                    ? "Photos come from the original posts cited by Liveuamap; rights belong to their owners."
                    : "사진은 Liveuamap이 인용한 원 게시물의 것으로, 권리는 원 소유자에게 있습니다."
                  : en
                    ? "Reference photo of the named vessel (Wikimedia Commons), not from the incident."
                    : "선박명으로 찾은 참고 사진(위키미디어)이며 사건 현장 사진이 아닙니다."}
              </p>
            </div>
          ) : (
            <p className="rounded-sm border border-dashed border-[#6b4a22]/40 px-2 py-6 text-center text-micro text-[#5c4020]/70">
              {en ? "No photo attached to the original report." : "원 보도에 첨부된 사진이 없습니다."}
            </p>
          )}
          <IncidentMiniMap
            item={item}
            others={sorted}
            lang={en ? "en" : "ko"}
            kindLabel={en ? CAT_LABEL[cat].en : CAT_LABEL[cat].ko}
            heightClass="h-40"
          />
          <h2 className="text-base font-semibold leading-snug">{title}</h2>
          {body ? <p className="whitespace-pre-line text-meta leading-relaxed text-[#3d2a12]">{body}</p> : null}
          {basis.length > 0 ? (
            <div className="rounded-sm border border-[#6b4a22]/30 bg-[#efe0bc]/60 px-2 py-1.5">
              <p className="text-micro font-semibold text-[#5c4020]/90">
                {strike ? (en ? "Why it's flagged" : "큰 타격으로 본 근거") : en ? "Matched wording" : "걸린 표현"}
              </p>
              <p className="text-micro">{basis.map(tr).join(" · ")}</p>
            </div>
          ) : null}
          <p className="text-micro tabular-nums text-[#5c4020]/80">
            {en ? "Source" : "출처"}: {stackSourceName(item)} · {when} UTC · {item.lat.toFixed(3)},{" "}
            {item.lng.toFixed(3)}
          </p>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#6b4a22]/30 px-3 py-1.5">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className={btn}
              onClick={() => {
                onGoToLocation(item);
                if (collapseOnAction) setMinimized(true);
              }}
            >
              {en ? "Go to location" : "위치로 가기"}
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                onViewSatellite(item);
                if (collapseOnAction) setMinimized(true);
              }}
            >
              {en ? "View in satellite" : "위성으로 보기"}
            </button>
            {item.url && /^https?:\/\//i.test(item.url) ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className={btn}>
                {en ? "Source" : "원문"}
              </a>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" className={btn} disabled={idx <= 0} onClick={() => onSelect(sorted[idx - 1]!.id)}>
              {en ? "Newer" : "더 최신"}
            </button>
            <span className="text-micro tabular-nums">
              {idx + 1}/{sorted.length}
            </span>
            <button
              type="button"
              className={btn}
              disabled={idx >= sorted.length - 1}
              onClick={() => onSelect(sorted[idx + 1]!.id)}
            >
              {en ? "Older" : "이전"}
            </button>
          </div>
        </footer>
      </div>
    </aside>
  );
}
