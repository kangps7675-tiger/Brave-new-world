"use client";

import { useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  OBSERVE_CONTROL_FILL,
  OBSERVE_CONTROL_OUTLINE,
  OBSERVE_GRADE_RING,
  OBSERVE_LEGEND,
} from "@/lib/observeSensorStyle";

type Props = {
  lang: LabelLanguage;
  tracksOn: boolean;
  frontlineOn: boolean;
  hazardsOn: boolean;
  neptunOn: boolean;
  eventsOn: boolean;
};

type LegendRow = {
  id: string;
  swatch: string;
  shape: "dot" | "ring" | "fill" | "line";
  label: string;
  detail: string;
  active: boolean;
};

/**
 * 관측(Cesium) 레이어 범례 — 센서 칩과 같은 묶음 단위로 색·형태를 설명한다.
 */
export function ObserveLayerLegend({
  lang,
  tracksOn,
  frontlineOn,
  hazardsOn,
  neptunOn,
  eventsOn,
}: Props) {
  const en = lang === "en";
  const [open, setOpen] = useState(true);

  const rows: LegendRow[] = [
    {
      id: "tracks",
      swatch: OBSERVE_LEGEND.tracks,
      shape: "dot",
      label: en ? "Tracks" : "항적",
      detail: en
        ? "AIS ships · ADS-B aircraft · disguised hulls"
        : "AIS 함선·ADS-B 항공기·위장 선박",
      active: tracksOn,
    },
    {
      id: "frontline",
      swatch: OBSERVE_CONTROL_OUTLINE,
      shape: "fill",
      label: en ? "Control areas" : "통제면·전선",
      detail: en
        ? "LiveUA occupied fill (UA · IR · YE · LB · IL/PS)"
        : "LiveUA 점령/통제 면 (우크라·이란·예멘·레바논·이스라엘/팔)",
      active: frontlineOn,
    },
    {
      id: "hazards-fire",
      swatch: OBSERVE_LEGEND.firms,
      shape: "dot",
      label: en ? "Fires" : "화재",
      detail: en ? "NASA FIRMS hotspots near theaters" : "NASA FIRMS 전장 화재점",
      active: hazardsOn,
    },
    {
      id: "hazards-missile",
      swatch: OBSERVE_LEGEND.missile,
      shape: "dot",
      label: en ? "Missiles" : "미사일",
      detail: en ? "North Korea launch markers" : "북한 발사·시험 마커",
      active: hazardsOn,
    },
    {
      id: "neptun",
      swatch: OBSERVE_LEGEND.neptun,
      shape: "line",
      label: en ? "Air threats" : "공중 위협",
      detail: en
        ? "NEPTUN UAV/missile tracks · air-raid zones"
        : "NEPTUN UAV·미사일 궤적·공습경보 존",
      active: neptunOn,
    },
    {
      id: "events",
      swatch: OBSERVE_GRADE_RING.std.stroke,
      shape: "ring",
      label: en ? "Conflict events" : "전장 사건",
      detail: en
        ? "Gated clusters · ring = confidence grade"
        : "게이트된 클러스터 · 링 = 신뢰도 등급",
      active: eventsOn,
    },
    {
      id: "liveua-pin",
      swatch: OBSERVE_LEGEND.liveuaPin,
      shape: "dot",
      label: en ? "LiveUA pins" : "LiveUA 핀",
      detail: en
        ? "Flash points · strikes · ground assaults"
        : "속보 핀·확인 타격·지상 공격",
      active: true,
    },
    {
      id: "ocean",
      swatch: "#0a0a0a",
      shape: "dot",
      label: en ? "Oceans" : "바다",
      detail: en
        ? "Satellite / photoreal only · waterMask off"
        : "위성·실사만 · 워터마스크 끔",
      active: true,
    },
    {
      id: "clouds",
      swatch: "#e2e8f0",
      shape: "ring",
      label: en ? "Clouds" : "구름",
      detail: en
        ? "Global: white clouds · clear air · NRT refresh · fades on descent"
        : "전역: 흰 구름·투명 대기 · NRT 갱신 · 하강 시 소거",
      active: true,
    },
  ];

  return (
    <div
      className="rounded-md border border-teal-500/30 bg-[#041018]/88 shadow-lg backdrop-blur-sm"
      role="region"
      aria-label={en ? "Layer legend" : "레이어 범례"}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-meta text-teal-100/90"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium tracking-wide">
          {en ? "Legend · what am I looking at?" : "범례 · 지금 보이는 것"}
        </span>
        <span className="text-micro text-teal-200/70">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <ul className="space-y-1.5 border-t border-teal-500/20 px-3 py-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`flex items-start gap-2 text-micro leading-snug ${
                row.active ? "text-teal-50/90" : "text-teal-100/35"
              }`}
            >
              <LegendSwatch
                color={row.swatch}
                shape={row.shape}
                fill={OBSERVE_CONTROL_FILL}
                muted={!row.active}
              />
              <span className="min-w-0">
                <span className="font-semibold">{row.label}</span>
                <span className="mt-0.5 block text-teal-100/55">{row.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LegendSwatch({
  color,
  shape,
  fill,
  muted,
}: {
  color: string;
  shape: LegendRow["shape"];
  fill: string;
  muted: boolean;
}) {
  const opacity = muted ? 0.35 : 1;
  if (shape === "fill") {
    return (
      <span
        className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-[2px] border"
        style={{
          backgroundColor: fill,
          borderColor: color,
          opacity,
        }}
        aria-hidden
      />
    );
  }
  if (shape === "ring") {
    return (
      <span
        className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full border-2 bg-transparent"
        style={{ borderColor: color, opacity }}
        aria-hidden
      />
    );
  }
  if (shape === "line") {
    return (
      <span
        className="mt-1.5 inline-block h-0.5 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color, opacity }}
        aria-hidden
      />
    );
  }
  return (
    <span
      className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color, opacity }}
      aria-hidden
    />
  );
}
