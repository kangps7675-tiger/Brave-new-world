"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { CesiumGlobeHandle } from "@/components/globe/CesiumSatelliteGlobe";
import { StraitReplayPanel } from "@/components/globe/replay/StraitReplayPanel";
import { useStraitReplay } from "@/components/globe/replay/useStraitReplay";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { sr } from "@/lib/straitReplay/i18n";
import { STRAIT_ANCHORS } from "@/lib/straitReplay/straitBbox";
import type { StraitId } from "@/lib/straitReplay/types";
import {
  getStraitReplayEnabled,
  setStraitReplayEnabled,
  subscribeStraitReplayEnabled,
} from "@/lib/straitReplay/uiBridge";
import { observeStraitPreset, type ObserveStraitId } from "@/lib/cesiumStraitScene";

function toObserveStraitId(id: StraitId): ObserveStraitId {
  if (id === "red_sea_suez") return "red-sea-suez";
  return id;
}

type Props = {
  lang: LabelLanguage;
  cesiumRef?: { current: CesiumGlobeHandle | null } | null;
};

const STRAITS: StraitId[] = ["hormuz", "red_sea_suez", "malacca"];

function straitLabel(id: StraitId, lang: LabelLanguage): string {
  if (id === "hormuz") return sr("straitHormuz", lang);
  if (id === "red_sea_suez") return sr("straitRedSea", lang);
  return sr("straitMalacca", lang);
}

export function StraitReplayHost({ lang, cesiumRef }: Props) {
  const enabled = useSyncExternalStore(
    subscribeStraitReplayEnabled,
    getStraitReplayEnabled,
    () => false,
  );
  const [straitId, setStraitId] = useState<StraitId>("hormuz");
  const [eventId, setEventId] = useState<string | null>(null);
  const state = useStraitReplay(straitId, eventId, enabled);

  useEffect(() => {
    if (!enabled) return;
    const handle = cesiumRef?.current;
    const data =
      state.status === "ready" || state.status === "empty" ? state.data : null;
    const focus = data?.event;
    const anchor = STRAIT_ANCHORS[straitId];
    const livePreset = observeStraitPreset(toObserveStraitId(straitId));
    if (focus) {
      handle?.flyTo(focus.lat, focus.lng, livePreset.altitude, 1200, {
        pitch: livePreset.pitch,
        bearing: livePreset.bearing,
      });
    } else {
      handle?.flyTo(livePreset.lat, livePreset.lng, livePreset.altitude, 1200, {
        pitch: livePreset.pitch,
        bearing: livePreset.bearing,
      });
    }
    handle?.setStraitReplayScene?.({
      straitId,
      focusId: focus?.id ?? null,
      markers: [
        {
          id: `anchor:${straitId}`,
          lat: anchor.lat,
          lng: anchor.lng,
          label: lang === "en" ? anchor.labelEn : anchor.labelKo,
          dim: true,
          kind: "anchor",
        },
        ...(data?.similarEvents ?? []).map((e) => ({
          id: e.id,
          lat: e.lat,
          lng: e.lng,
          label: lang === "en" ? e.titleEn : e.titleKo,
          dim: true,
          kind: "similar" as const,
        })),
        ...(focus
          ? [
              {
                id: focus.id,
                lat: focus.lat,
                lng: focus.lng,
                label: lang === "en" ? focus.titleEn : focus.titleKo,
                dim: false,
                kind: "focus" as const,
              },
            ]
          : []),
      ],
      onSelectEventId: (id: string) => {
        if (id.startsWith("anchor:")) return;
        setEventId(id);
      },
    });
    return () => {
      handle?.setStraitReplayScene?.(null);
    };
  }, [enabled, straitId, state, lang, cesiumRef]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-auto flex flex-col gap-1.5">
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label={sr("selectEvent", lang)}
      >
        {STRAITS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={straitId === id}
            onClick={() => {
              setStraitId(id);
              setEventId(null);
            }}
            className={`rounded border px-2 py-0.5 text-micro font-semibold ${
              straitId === id
                ? "border-teal-400/55 bg-teal-500/25 text-teal-50"
                : "border-white/15 bg-[#041018]/75 text-teal-100/55"
            }`}
          >
            {straitLabel(id, lang)}
          </button>
        ))}
      </div>

      {state.status === "loading" ? (
        <p className="rounded border border-white/10 bg-[#041018]/9 px-2 py-1 text-micro text-teal-100/70">
          {sr("loading", lang)}
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className="rounded border border-rose-400/30 bg-[#041018]/9 px-2 py-1 text-micro text-rose-100/80">
          {sr("error", lang)}
        </p>
      ) : null}
      {state.status === "empty" || state.status === "ready" ? (
        <StraitReplayPanel
          lang={lang}
          data={state.data}
          onClose={() => setStraitReplayEnabled(false)}
          onSelectEvent={(id) => setEventId(id)}
        />
      ) : null}
    </div>
  );
}
