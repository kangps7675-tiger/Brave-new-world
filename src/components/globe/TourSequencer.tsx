"use client";

import { useEffect, useRef, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

export type TourScene = {
  id: string;
  title: string;
  body?: string;
  lat: number;
  lng: number;
  altitude: number;
  /** 카메라 도착 후 머무는 시간 */
  holdMs: number;
};

type TourSequencerProps = {
  scenes: TourScene[];
  active: boolean;
  lang: LabelLanguage;
  flyMs?: number;
  flyTo: (lat: number, lng: number, altitude: number, durationMs: number) => void;
  onStop: () => void;
};

/**
 * 오늘의 투어 — 장면 배열을 순서대로 재생 (fly → 카드 → 대기 → 다음).
 * 데일리 리플레이의 1단계 뼈대. 사운드·양피지 연출은 후속 확장.
 */
export function TourSequencer({
  scenes,
  active,
  lang,
  flyMs = 2200,
  flyTo,
  onStop,
}: TourSequencerProps) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const flyToRef = useRef(flyTo);
  flyToRef.current = flyTo;
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    if (scenes.length === 0) {
      onStopRef.current();
      return;
    }
    let cancelled = false;
    let i = 0;

    const playScene = () => {
      if (cancelled) return;
      if (i >= scenes.length) {
        onStopRef.current();
        return;
      }
      const scene = scenes[i];
      setIndex(i);
      flyToRef.current(scene.lat, scene.lng, scene.altitude, flyMs);
      timerRef.current = window.setTimeout(() => {
        i += 1;
        playScene();
      }, flyMs + scene.holdMs);
    };

    playScene();
    return () => {
      cancelled = true;
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // scenes 배열은 시작 시점 고정 — 재생 중 재계산으로 점프하지 않게 active만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active || scenes.length === 0) return null;
  const scene = scenes[Math.min(index, scenes.length - 1)];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[9600] flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-amber-200/25 bg-[#0b1020]/90 px-5 py-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold tracking-[0.3em] text-amber-200/70">
            {lang === "en" ? "TODAY'S TOUR" : "오늘의 투어"} · {index + 1}/{scenes.length}
          </p>
          <button
            type="button"
            onClick={() => onStopRef.current()}
            className="rounded-lg border border-slate-500/40 px-2 py-0.5 text-[11px] text-slate-300 transition hover:border-slate-300/60 hover:text-slate-100"
          >
            {lang === "en" ? "Exit" : "종료"}
          </button>
        </div>
        <h3 className="mt-2 text-[15px] font-semibold leading-snug text-slate-50">
          {scene.title}
        </h3>
        {scene.body ? (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300/90">{scene.body}</p>
        ) : null}
        <div className="mt-3 flex gap-1.5">
          {scenes.map((s, i) => (
            <span
              key={s.id}
              className={`h-1 flex-1 rounded-full transition ${
                i <= index ? "bg-amber-300/80" : "bg-slate-600/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
