"use client";

import { useEffect, useState } from "react";
import type { DeskFocus } from "@/lib/intelContract/deskFocus";
import { DeskPinStructure } from "@/components/globe/DeskPinStructure";
import {
  DESK_HUD_SLOT_ORDER,
  MODALITY_RING_COLOR,
  deskVerifyPhase,
  litChannelCount,
  modalityHudLabel,
} from "@/lib/intelContract/deskVerifySequence";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ObservationModality } from "@/lib/intelContract/types";

type Props = {
  lang: LabelLanguage;
  focus: DeskFocus;
  onDismiss?: () => void;
};

/**
 * 검증 HUD — 문구 대신 슬롯 on/off + 핀 구조.
 * 꺼진 슬롯 = 아직 없음. 점등 = 확보. 반증이면 핀이 식음.
 */
export function DeskVerifyHud({ lang, focus, onDismiss }: Props) {
  const en = lang === "en";
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 80);
    return () => window.clearInterval(id);
  }, [focus.sequenceStartedAt, focus.itemId]);

  const elapsed = now - focus.sequenceStartedAt;
  const slots = uniqueSlots(focus.pirRequired, focus.modalitiesPresent);
  const lit = litChannelCount(elapsed, slots.length);
  const ringCount =
    focus.independenceCount >= 2 ? focus.independenceCount : 0;
  const phase = deskVerifyPhase(elapsed, slots.length, ringCount);
  const gradeOn = phase === "locked" || phase === "done";

  return (
    <div
      className="pointer-events-auto w-[min(15rem,76vw)] rounded-md border border-teal-400/35 bg-[#041018]/92 px-2.5 py-2 shadow-lg backdrop-blur-sm"
      data-desk-verify-hud
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <DeskPinStructure
          lang={lang}
          grade={focus.grade}
          independenceCount={focus.independenceCount}
          modalities={focus.modalitiesPresent}
          disconfirmHitCount={focus.disconfirmHitCount}
          promoting={focus.promoteFromHold && gradeOn}
        />
        {onDismiss ? (
          <button
            type="button"
            className="shrink-0 rounded-sm border border-white/15 px-1 text-micro text-white/70"
            onClick={onDismiss}
            aria-label={en ? "Dismiss" : "닫기"}
          >
            ×
          </button>
        ) : null}
      </div>

      {/* PIR 슬롯 — 라벨은 접근성만, 시각은 점등/소등 */}
      <ul className="mt-2.5 flex items-center gap-2" aria-label={en ? "Channels" : "채널"}>
        {slots.map((m, i) => {
          const revealed = i < lit;
          const have = focus.modalitiesPresent.includes(m);
          const on = revealed && have;
          const color = MODALITY_RING_COLOR[m];
          return (
            <li key={m} className="flex flex-col items-center gap-0.5">
              <span
                className={`block h-3 w-3 rounded-full border transition-all duration-300 ${
                  on
                    ? "scale-110 border-transparent"
                    : revealed && !have
                      ? "scale-95 border-white/20 bg-transparent opacity-30"
                      : "scale-90 border-white/15 bg-transparent opacity-25"
                }`}
                style={
                  on
                    ? {
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}`,
                      }
                    : undefined
                }
                title={modalityHudLabel(m, en ? "en" : "ko")}
                aria-label={`${modalityHudLabel(m, en ? "en" : "ko")}: ${
                  on ? (en ? "on" : "켜짐") : en ? "off" : "꺼짐"
                }`}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function uniqueSlots(
  required: ObservationModality[],
  present: ObservationModality[],
): ObservationModality[] {
  const set = new Set<ObservationModality>();
  for (const m of DESK_HUD_SLOT_ORDER) {
    if (required.includes(m) || present.includes(m)) set.add(m);
  }
  // 필요 채널은 없어도 슬롯으로 보여 “꺼짐”을 드러냄
  for (const m of required) {
    if (m === "sensor" || m === "alert" || m === "media" || m === "stat") {
      set.add(m);
    }
  }
  if (set.size === 0) {
    set.add("sensor");
    set.add("media");
  }
  return DESK_HUD_SLOT_ORDER.filter((m) => set.has(m));
}
