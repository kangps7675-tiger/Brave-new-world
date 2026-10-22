"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { AisVessel } from "@/data/geoTypes";
import { stackSourceName, type StackItem } from "@/lib/incidentStack/build";
import { pickDockEntries } from "@/lib/eventDockQueue";
import { isMajorConfirmedStrike, type MajorStrike } from "@/lib/liveuamap/majorStrike";
import { classifyRegionalPosture, type RegionalPosture } from "@/lib/liveuamap/regionalPosture";
import { splitLiveuaTitleBody } from "@/lib/liveuamap/peelTitleUrls";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import { useTr } from "@/hooks/useTr";
import { findRelatedPhoto } from "@/lib/news/relatedPhoto";
import type { NewsStreamItem } from "@/lib/news/types";
import { ShipIncidentCard } from "@/components/globe/ShipIncidentCard";
import { IncidentVesselPanel } from "@/components/globe/IncidentVesselPanel";

const STORAGE_KEY = "straitdesk-event-dock-dismissed";
const KEEP = 300;

function loadDismissed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids].slice(-KEEP)));
  } catch {
    /* 저장 실패해도 화면은 동작 */
  }
}

type Entry =
  | { kind: "ship"; id: string; at: number; item: StackItem }
  | { kind: "strike"; id: string; at: number; event: LiveuamapEvent; strike: MajorStrike }
  | { kind: "posture"; id: string; at: number; event: LiveuamapEvent; posture: RegionalPosture };

const KIND_LABEL = {
  drone: { ko: "드론", en: "Drone" },
  missile: { ko: "미사일", en: "Missile" },
  bomb: { ko: "유도폭탄", en: "Guided bomb" },
} as const;
const REASON_LABEL = {
  facility: { ko: "감시 시설 피격", en: "Monitored facility hit" },
  infrastructure: { ko: "인프라 피해", en: "Infrastructure damage" },
  casualty: { ko: "인명 피해 보도", en: "Casualties reported" },
  heavy: { ko: "대형 타격", en: "Heavy strike" },
} as const;
const POSTURE_LABEL = {
  diplomacy: { ko: "외교 움직임", en: "Diplomatic move" },
  rhetoric: { ko: "공격적 언사", en: "Hostile rhetoric" },
} as const;

type Props = {
  lang: LabelLanguage;
  /** 선박 피격 사건(UKMTO·NGA·내 케이스·해역 안 선박 속보) */
  shipItems: StackItem[];
  liveuaEvents: LiveuamapEvent[];
  onGoToLocation: (lat: number, lng: number) => void;
  onFocusVessel: (vessel: AisVessel) => void;
  newsPool?: readonly NewsStreamItem[];
};

/**
 * 우측 이벤트 도크 — 고정 패널이 아니라 사건이 뜰 때마다 상세 창이 뜬다. 창은 하나, 여러 건이면 창 안에서 이전/다음.
 * - 선박 피격 → 그 사건의 피격 상세 + 후보 선박
 * - 확인된 큰 드론·미사일 타격 → 타격 상세(판정 근거 포함)
 * - 예민한 지역의 외교 움직임·공격적 언사 → 정세 상세(걸린 표현 포함)
 * 닫으면 그 건은 사라지고 다시 뜨지 않는다(브라우저에 기억). 접속 시 3시간 넘은 건 띄우지 않는다.
 */
export function EventDock({ lang, shipItems, liveuaEvents, onGoToLocation, onFocusVessel, newsPool = [] }: Props) {
  const en = lang === "en";
  const [dismissed, setDismissed] = useState<Set<string> | null>(null);
  const [cursor, setCursor] = useState(0);
  useEffect(() => setDismissed(loadDismissed()), []);

  const candidates = useMemo<Entry[]>(() => {
    const out: Entry[] = shipItems.map((item) => ({ kind: "ship", id: item.id, at: item.at, item }));
    const shipIds = new Set(shipItems.map((i) => i.id));
    for (const event of liveuaEvents) {
      if (shipIds.has(event.id)) continue;
      const at = Date.parse(event.publishedAt);
      if (!Number.isFinite(at)) continue;
      const strike = isMajorConfirmedStrike(event);
      if (strike) {
        out.push({ kind: "strike", id: event.id, at, event, strike });
        continue;
      }
      const posture = classifyRegionalPosture(event);
      if (posture) out.push({ kind: "posture", id: event.id, at, event, posture });
    }
    return out;
  }, [shipItems, liveuaEvents]);

  const open = useMemo(
    () => (dismissed ? pickDockEntries(candidates, dismissed, Date.now()) : []),
    [candidates, dismissed],
  );

  const idx = Math.min(cursor, Math.max(0, open.length - 1));
  const cur = open[idx];

  const close = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev ?? []);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  if (!cur) return null;
  const btn =
    "rounded-sm border border-[#6b4a22]/40 bg-[#efe0bc]/95 px-2 py-0.5 text-micro text-[#3d2a12] hover:bg-[#e8d6a8] disabled:opacity-40";
  const headLabel =
    cur.kind === "ship"
      ? `${en ? "Vessel incident" : "선박 피격"} · ${stackSourceName(cur.item)}`
      : cur.kind === "strike"
        ? `${en ? KIND_LABEL[cur.strike.kind].en : KIND_LABEL[cur.strike.kind].ko} · ${en ? REASON_LABEL[cur.strike.reason].en : REASON_LABEL[cur.strike.reason].ko}`
        : en
          ? POSTURE_LABEL[cur.posture.kind].en
          : POSTURE_LABEL[cur.posture.kind].ko;

  return (
    <section
      className="pointer-events-auto flex w-[min(20rem,84vw)] flex-col overflow-hidden rounded-md border border-[#6b4a22]/50 bg-[#f3e6c8] text-[#2a1c0a] shadow-lg"
      aria-label={en ? "Event detail" : "사건 상세"}
      data-event-dock
    >
      <header className="flex items-center justify-between gap-2 border-b border-[#6b4a22]/30 px-2.5 py-1.5 text-micro">
        <span className="font-semibold">{headLabel}</span>
        <button type="button" aria-label={en ? "Close" : "닫기"} className={btn} onClick={() => close(cur.id)}>
          ×
        </button>
      </header>

      {cur.kind === "ship" ? (
        <>
          <ShipIncidentCard lang={lang} item={cur.item} />
          {cur.item.source === "ukmto" ? (
            <IncidentVesselPanel lang={lang} item={cur.item} onFocusVessel={onFocusVessel} />
          ) : null}
        </>
      ) : (
        <EventBody en={en} entry={cur} newsPool={newsPool} />
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#6b4a22]/30 px-2.5 py-1.5">
        <div className="flex gap-1.5">
          <button
            type="button"
            className={btn}
            onClick={() => {
              const lat = cur.kind === "ship" ? cur.item.lat : cur.event.lat;
              const lng = cur.kind === "ship" ? cur.item.lng : cur.event.lng;
              onGoToLocation(lat, lng);
            }}
          >
            {en ? "Go to location" : "위치로 가기"}
          </button>
        </div>
        {open.length > 1 ? (
          <div className="flex items-center gap-1.5">
            <button type="button" className={btn} disabled={idx <= 0} onClick={() => setCursor(idx - 1)}>
              {en ? "Prev" : "이전"}
            </button>
            <span className="text-micro tabular-nums text-[#5c4020]/85">
              {idx + 1}/{open.length}
            </span>
            <button
              type="button"
              className={btn}
              disabled={idx >= open.length - 1}
              onClick={() => setCursor(idx + 1)}
            >
              {en ? "Next" : "다음"}
            </button>
          </div>
        ) : null}
      </footer>
    </section>
  );
}

function EventBody({
  en,
  entry,
  newsPool,
}: {
  en: boolean;
  entry: Extract<Entry, { kind: "strike" | "posture" }>;
  newsPool: readonly NewsStreamItem[];
}) {
  const { event } = entry;
  const peeled = splitLiveuaTitleBody(
    en ? event.title : event.titleKo?.trim() || event.title,
    en ? event.body : event.bodyKo?.trim() || event.body,
    event.sourceUrl,
  );
  const own = event.imageUrls?.length ? event.imageUrls : event.imageUrl ? [event.imageUrl] : [];
  const related = useMemo(
    () =>
      own.length === 0
        ? findRelatedPhoto({ text: `${event.title} ${event.body ?? ""}`, at: Date.parse(event.publishedAt) }, newsPool)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event.id, own.length, newsPool],
  );
  const photos = own.length > 0 ? own : related ? [related.imageUrl] : [];
  const basisRaw =
    entry.kind === "strike" ? (entry.strike.facilityName ? [] : entry.strike.evidence) : entry.posture.evidence;
  const tr = useTr([peeled.title, peeled.body, related?.articleTitle, ...basisRaw], en ? "en" : "ko");
  const when = new Date(Date.parse(event.publishedAt)).toISOString().slice(0, 16).replace("T", " ");
  const basis =
    entry.kind === "strike"
      ? entry.strike.facilityName
        ? [(en ? "Monitored facility: " : "감시 시설: ") + (en ? entry.strike.facilityName.en : entry.strike.facilityName.ko)]
        : entry.strike.evidence
      : entry.posture.evidence;
  const basisTitle =
    entry.kind === "strike" ? (en ? "Why it's flagged" : "큰 타격으로 본 근거") : en ? "Matched wording" : "걸린 표현";
  return (
    <div className="space-y-2 px-2.5 py-2">
      {event.videoUrl ? (
        <video
          className="aspect-[16/9] w-full rounded-sm bg-black object-cover"
          src={event.videoUrl}
          poster={photos[0]}
          controls
          muted
          playsInline
          preload="metadata"
        />
      ) : photos.length > 0 ? (
        <div className="flex gap-1 overflow-x-auto">
          {photos.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-28 w-auto shrink-0 rounded-sm object-cover" />
          ))}
        </div>
      ) : null}
      {related ? (
        <p className="text-micro text-[#5c4020]/80">
          {en ? "Related photo · " : "연관 사진 · "}
          <a href={related.articleUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {related.outlet}: {tr(related.articleTitle)}
          </a>
          {en ? " (may not be from the scene)" : " (현장 사진이 아닐 수 있음)"}
        </p>
      ) : null}
      <p className="text-micro tabular-nums text-[#5c4020]/85">
        {event.regionId} · {when} UTC
      </p>
      <h3 className="text-meta font-semibold leading-snug">{tr(peeled.title)}</h3>
      {peeled.body ? <p className="text-micro leading-snug text-[#3d2a12]">{tr(peeled.body)}</p> : null}
      {basis.length > 0 ? (
        <div className="rounded-sm border border-[#6b4a22]/30 bg-[#efe0bc]/60 px-2 py-1">
          <p className="text-micro font-semibold text-[#5c4020]/90">{basisTitle}</p>
          <p className="text-micro text-[#3d2a12]">{basis.map(tr).join(" · ")}</p>
        </div>
      ) : null}
      <p className="text-micro tabular-nums text-[#5c4020]/75">
        {event.lat.toFixed(3)}, {event.lng.toFixed(3)} · {en ? "Source: Liveuamap" : "출처: Liveuamap"}
        {event.sourceUrl ? (
          <>
            {" · "}
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {en ? "original" : "원문"}
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}
