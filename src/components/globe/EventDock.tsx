"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { AisVessel } from "@/data/geoTypes";
import { stackSourceName, type StackItem } from "@/lib/incidentStack/build";
import { pickDockEntries } from "@/lib/eventDockQueue";
import { isMajorConfirmedStrike, type MajorStrike } from "@/lib/liveuamap/majorStrike";
import { splitLiveuaTitleBody } from "@/lib/liveuamap/peelTitleUrls";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import { ShipIncidentCard } from "@/components/globe/ShipIncidentCard";
import { IncidentVesselPanel } from "@/components/globe/IncidentVesselPanel";

const STORAGE_KEY = "geowatch-event-dock-dismissed";
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
  | { kind: "strike"; id: string; at: number; event: LiveuamapEvent; strike: MajorStrike };

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

type Props = {
  lang: LabelLanguage;
  /** 선박 피격 사건(UKMTO·NGA·내 케이스·해역 안 선박 속보) */
  shipItems: StackItem[];
  liveuaEvents: LiveuamapEvent[];
  onGoToLocation: (lat: number, lng: number) => void;
  onFocusVessel: (vessel: AisVessel) => void;
};

/**
 * 우측 이벤트 도크 — 고정 패널이 아니라 사건이 뜰 때마다 관련 상세 창이 뜬다.
 * - 선박 피격 → 피격 상세 + 후보 선박 패널
 * - 확인된 큰 드론·미사일 타격(시설·인프라·인명 피해) → 속보 상세
 * 닫으면 사라지고 다시 뜨지 않는다(브라우저에 기억). 접속 시 3시간 넘은 건 띄우지 않는다.
 */
export function EventDock({ lang, shipItems, liveuaEvents, onGoToLocation, onFocusVessel }: Props) {
  const en = lang === "en";
  const [dismissed, setDismissed] = useState<Set<string> | null>(null);
  useEffect(() => setDismissed(loadDismissed()), []);

  const candidates = useMemo<Entry[]>(() => {
    const out: Entry[] = shipItems.map((item) => ({ kind: "ship", id: item.id, at: item.at, item }));
    const shipIds = new Set(shipItems.map((i) => i.id));
    for (const event of liveuaEvents) {
      if (shipIds.has(event.id)) continue;
      const strike = isMajorConfirmedStrike(event);
      if (!strike) continue;
      const at = Date.parse(event.publishedAt);
      if (!Number.isFinite(at)) continue;
      out.push({ kind: "strike", id: event.id, at, event, strike });
    }
    return out;
  }, [shipItems, liveuaEvents]);

  const open = useMemo(
    () => (dismissed ? pickDockEntries(candidates, dismissed, Date.now()) : []),
    [candidates, dismissed],
  );

  const close = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev ?? []);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  if (open.length === 0) return null;
  const btn =
    "rounded-sm border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-micro text-amber-50 hover:bg-amber-500/20";

  return (
    <div className="pointer-events-auto flex w-[min(20rem,84vw)] flex-col gap-2" data-event-dock>
      {open.map((e) =>
        e.kind === "ship" ? (
          <section
            key={e.id}
            className="overflow-hidden rounded-md border border-amber-600/35 bg-[#120e08]/92 shadow-lg backdrop-blur-md"
            aria-label={en ? "Ship incident detail" : "선박 피격 상세"}
          >
            <header className="flex items-center justify-between gap-2 border-b border-amber-600/25 px-2.5 py-1.5 text-micro text-amber-100/90">
              <span className="font-medium">
                {en ? "Vessel incident" : "선박 피격"} · {stackSourceName(e.item)}
              </span>
              <button type="button" aria-label={en ? "Close" : "닫기"} className={btn} onClick={() => close(e.id)}>
                ×
              </button>
            </header>
            <ShipIncidentCard lang={lang} item={e.item} />
            {e.item.source === "ukmto" ? (
              <IncidentVesselPanel lang={lang} item={e.item} onFocusVessel={onFocusVessel} />
            ) : null}
            <div className="flex gap-1.5 px-2.5 py-1.5">
              <button type="button" className={btn} onClick={() => onGoToLocation(e.item.lat, e.item.lng)}>
                {en ? "Go to location" : "위치로 가기"}
              </button>
            </div>
          </section>
        ) : (
          <StrikeWindow
            key={e.id}
            en={en}
            entry={e}
            btn={btn}
            onClose={() => close(e.id)}
            onGo={() => onGoToLocation(e.event.lat, e.event.lng)}
          />
        ),
      )}
    </div>
  );
}

function StrikeWindow({
  en,
  entry,
  btn,
  onClose,
  onGo,
}: {
  en: boolean;
  entry: Extract<Entry, { kind: "strike" }>;
  btn: string;
  onClose: () => void;
  onGo: () => void;
}) {
  const { event, strike } = entry;
  const peeled = splitLiveuaTitleBody(
    en ? event.title : event.titleKo?.trim() || event.title,
    en ? event.body : event.bodyKo?.trim() || event.body,
    event.sourceUrl,
  );
  return (
    <section
      className="overflow-hidden rounded-md border border-rose-500/40 bg-[#160c0c]/92 shadow-lg backdrop-blur-md"
      aria-label={en ? "Confirmed strike detail" : "확인된 타격 상세"}
    >
      <header className="flex items-center justify-between gap-2 border-b border-rose-500/25 px-2.5 py-1.5 text-micro text-rose-100/90">
        <span className="font-medium">
          {en ? KIND_LABEL[strike.kind].en : KIND_LABEL[strike.kind].ko} ·{" "}
          {en ? REASON_LABEL[strike.reason].en : REASON_LABEL[strike.reason].ko}
        </span>
        <button type="button" aria-label={en ? "Close" : "닫기"} className={btn} onClick={onClose}>
          ×
        </button>
      </header>
      {event.imageUrl || event.videoUrl ? (
        <div className="aspect-[16/9] max-h-36 w-full bg-black/50">
          {event.videoUrl ? (
            <video
              className="h-full w-full object-cover"
              src={event.videoUrl}
              poster={event.imageUrl}
              controls
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
      ) : null}
      <div className="space-y-1.5 px-2.5 py-2">
        <p className="text-micro uppercase tracking-[0.12em] text-rose-200/70">Liveuamap · {event.regionId}</p>
        <h3 className="text-meta font-semibold leading-snug text-rose-50">{peeled.title}</h3>
        {peeled.body ? (
          <p className="line-clamp-4 text-micro leading-snug text-rose-100/75">{peeled.body}</p>
        ) : null}
        <p className="text-micro tabular-nums text-rose-200/50">
          {event.lat.toFixed(3)}, {event.lng.toFixed(3)}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={btn} onClick={onGo}>
            {en ? "Go to location" : "위치로 가기"}
          </button>
          {event.sourceUrl ? (
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className={btn}>
              {en ? "Source" : "원문"}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
