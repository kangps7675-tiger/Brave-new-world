"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NkMissileArcGraphic } from "@/components/missile/NkMissileArcGraphic";
import {
  buildNkMissileHistoryCards,
  type NkMissileHistoryCard,
} from "@/lib/nkMissileHistory";
import { zc } from "@/lib/uiStack";

function openReference(card: NkMissileHistoryCard) {
  if (!card.sourceUrl) return;
  window.open(card.sourceUrl, "_blank", "noopener,noreferrer");
}

export function NkMissileHistoryDock({ lang }: { lang: "ko" | "en" }) {
  const ko = lang !== "en";
  const cards = useMemo(() => buildNkMissileHistoryCards(), []);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(cards[0]?.id ?? "");
  const selected = cards.find((card) => card.id === selectedId) ?? cards[0];

  function choose(card: NkMissileHistoryCard) {
    setSelectedId(card.id);
    openReference(card);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          if (!selectedId && cards[0]) setSelectedId(cards[0].id);
        }}
        className="rounded-md border border-orange-400/40 bg-orange-950/50 px-2.5 py-1.5 text-left text-micro font-medium text-orange-100 hover:bg-orange-950/70"
      >
        {ko ? "북한 미사일 과거 내역" : "DPRK missile archive"}
      </button>
      {open && selected && typeof document !== "undefined"
        ? createPortal(
        <div
          className={`pointer-events-auto fixed left-1/2 top-[12vh] ${zc("panel")} flex max-h-[min(72vh,680px)] w-[min(560px,94vw)] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-orange-400/35 bg-[#0c141d]/95 shadow-2xl backdrop-blur-md`}
          role="dialog"
          aria-label={ko ? "북한 미사일 과거 내역" : "DPRK missile archive"}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
            <p className="text-xs font-semibold tracking-wide text-orange-100">
              {ko ? "과거 내역" : "Archive"}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-slate-600 px-2 py-1 text-micro text-slate-200"
            >
              {ko ? "닫기" : "Close"}
            </button>
          </div>
          <div className="min-h-[240px] border-b border-white/10">
            <NkMissileArcGraphic card={selected} lang={lang} />
            {selected.sourceUrl ? (
              <div className="flex justify-end px-3 pb-2">
                <a
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-micro text-sky-300 underline underline-offset-2"
                >
                  {ko ? "참고 기사" : "Reference"}
                </a>
              </div>
            ) : null}
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {cards.map((card) => {
              const active = card.id === selected.id;
              return (
                <li key={card.id} className="border-b border-white/5">
                  <button
                    type="button"
                    onClick={() => choose(card)}
                    aria-pressed={active}
                    className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left ${
                      active ? "bg-orange-500/15" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="text-micro text-slate-400">{card.date}</span>
                    <span className="text-sm font-medium text-slate-50">
                      {ko ? card.titleKo : card.titleEn}
                    </span>
                    <span className="line-clamp-2 text-micro text-slate-400">
                      {ko ? card.bodyKo : card.bodyEn}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )
        : null}
    </>
  );
}
