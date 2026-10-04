"use client";

import { useState } from "react";
import type { CesiumAlertItem, CesiumAlertKind } from "@/lib/cesiumAlerts";
import type { LabelLanguage } from "@/lib/layerPrefs";

const KIND_LABEL: Record<CesiumAlertKind, { ko: string; en: string }> = {
  ukmto: { ko: "UKMTO", en: "UKMTO" },
  navarea: { ko: "NAVAREA", en: "NAVAREA" },
  portwatch: { ko: "초크·PortWatch", en: "Choke · PortWatch" },
  exercise: { ko: "훈련", en: "Exercise" },
  "ais-gate": { ko: "AIS 게이트", en: "AIS gate" },
  "dark-fleet": { ko: "다크플릿", en: "Dark fleet" },
  route: { ko: "항로", en: "Route" },
};

type Props = {
  lang: LabelLanguage;
  items: CesiumAlertItem[];
  onOpen: (item: CesiumAlertItem) => void;
  /** 책갈피 레일 안에서는 헤더·접기를 숨긴다 */
  chrome?: "full" | "bare";
};

export function CesiumAlertDock({ lang, items, onOpen, chrome = "full" }: Props) {
  const en = lang === "en";
  const bare = chrome === "bare";
  const [open, setOpen] = useState(true);
  const expanded = bare || open;

  return (
    <section
      className={
        bare
          ? "pointer-events-auto flex flex-col overflow-hidden"
          : "pointer-events-auto flex flex-col overflow-hidden rounded-md border border-teal-400/30 bg-[#041018]/90"
      }
      aria-label={en ? "Cesium alerts" : "세슘 알림"}
    >
      {!bare ? (
        <button
          type="button"
          className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-micro text-teal-100/90 transition hover:bg-teal-400/10 ${
            expanded ? "border-b border-teal-400/20" : ""
          }`}
          aria-expanded={expanded}
          aria-controls="cesium-alert-dock-panel"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="font-medium tracking-wide">{en ? "Alerts" : "알림"}</span>
          <span className="flex items-center gap-1.5 tabular-nums text-teal-200/60">
            {items.length}
            <span className="text-teal-300/70" aria-hidden>
              {expanded ? "▾" : "▴"}
            </span>
          </span>
        </button>
      ) : null}
      <div
        id="cesium-alert-dock-panel"
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
        aria-hidden={!expanded}
      >
        <div className={`min-h-0 overflow-hidden ${expanded ? "" : "pointer-events-none"}`}>
          {items.length === 0 ? (
            <p className="px-2.5 py-2 text-micro text-teal-200/55">
              {en ? "No maritime alerts in this snapshot." : "이 스냅샷에는 해상 알림이 없습니다."}
            </p>
          ) : (
            <ul className="intel-scroll-y max-h-56 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    tabIndex={expanded ? 0 : -1}
                    className="flex w-full flex-col items-start gap-0.5 px-2.5 py-1.5 text-left hover:bg-teal-400/10"
                    onClick={() => onOpen(item)}
                  >
                    <span className="text-micro text-teal-300/80">
                      {KIND_LABEL[item.kind][en ? "en" : "ko"]}
                    </span>
                    <span className="line-clamp-1 text-meta text-teal-50">{item.title}</span>
                    {item.detail ? (
                      <span className="line-clamp-1 text-micro text-teal-100/55">{item.detail}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
