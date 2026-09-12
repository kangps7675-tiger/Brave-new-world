"use client";

import type { GevContactRow, GevHudLines } from "@/lib/gevLiveTrack";
import { GEV_AWARENESS_RADIUS_M } from "@/lib/gevLiveTrack";

type Props = {
  hud: GevHudLines;
  contacts: GevContactRow[];
  followCamera: boolean;
  onToggleFollow: () => void;
  onStop: () => void;
  onSelectContact: (row: GevContactRow) => void;
  lang?: "ko" | "en";
};

/**
 * GEV식 미니 텔레메트리 HUD + 250 km Contacts 로스터.
 * 우측 AnalysisPanel과 별도로, 추적 중 좌하단에 고정 표시.
 */
export function GevTrackHud({
  hud,
  contacts,
  followCamera,
  onToggleFollow,
  onStop,
  onSelectContact,
  lang = "ko",
}: Props) {
  const radiusKm = Math.round(GEV_AWARENESS_RADIUS_M / 1000);
  const followLabel = lang === "en" ? (followCamera ? "TRACK ON" : "TRACK OFF") : followCamera ? "추적 ON" : "추적 OFF";
  const stopLabel = lang === "en" ? "Release" : "해제";
  const contactsLabel = lang === "en" ? `CONTACTS · ${radiusKm} km` : `컨택트 · ${radiusKm} km`;

  return (
    <div
      className="pointer-events-auto absolute bottom-24 left-3 z-[550] flex w-[min(100vw-1.5rem,22rem)] flex-col gap-2 font-mono text-[11px] leading-snug sm:bottom-28 sm:left-4"
      style={{ color: "rgba(226, 232, 240, 0.95)" }}
    >
      <div
        className="rounded-md border px-3 py-2 shadow-lg backdrop-blur-md"
        style={{
          borderColor: `${hud.accent}55`,
          background: "rgba(2, 6, 14, 0.82)",
          boxShadow: `0 0 0 1px ${hud.accent}22, 0 12px 40px rgba(0,0,0,0.45)`,
        }}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span
            className="text-[10px] uppercase tracking-[0.22em]"
            style={{ color: hud.accent }}
          >
            {hud.kind === "ais" ? "AIS TRACK" : "AIR TRACK"}
            {hud.stale ? " · STALE" : ""}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onToggleFollow}
              className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider transition hover:bg-white/10"
              style={{
                color: followCamera ? hud.accent : "rgba(148,163,184,0.9)",
                border: `1px solid ${followCamera ? hud.accent : "rgba(148,163,184,0.35)"}`,
              }}
            >
              {followLabel}
            </button>
            <button
              type="button"
              onClick={onStop}
              className="rounded border border-slate-600/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-400 transition hover:border-slate-400 hover:text-slate-200"
            >
              {stopLabel}
            </button>
          </div>
        </div>
        <p className="whitespace-pre-wrap break-words text-[12px] font-semibold" style={{ color: hud.accent }}>
          {hud.lines[0]}
        </p>
        <p className="mt-0.5 text-slate-300">{hud.lines[1]}</p>
        <p className="mt-0.5 text-slate-500">{hud.lines[2]}</p>
      </div>

      {contacts.length > 0 ? (
        <div className="max-h-44 overflow-y-auto rounded-md border border-slate-700/70 bg-black/75 px-2 py-1.5 backdrop-blur-md">
          <p className="mb-1 px-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            {contactsLabel} · {contacts.length}
          </p>
          <ul className="space-y-0.5">
            {contacts.slice(0, 12).map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelectContact(row)}
                  className="flex w-full items-baseline justify-between gap-2 rounded px-1 py-0.5 text-left transition hover:bg-white/5"
                >
                  <span className="min-w-0 truncate text-slate-200">
                    <span
                      className="mr-1.5 inline-block w-7 shrink-0 text-[9px] uppercase tracking-wider"
                      style={{
                        color:
                          row.kind === "ais"
                            ? "#39ffd5"
                            : row.kind === "civil"
                              ? "#39d0ff"
                              : "#ffd166",
                      }}
                    >
                      {row.kind === "ais" ? "AIS" : row.kind === "civil" ? "CIV" : "MIL"}
                    </span>
                    {row.label}
                    <span className="ml-1 text-slate-500">{row.detail}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500">
                    {row.rangeKm < 10 ? row.rangeKm.toFixed(1) : Math.round(row.rangeKm)}
                    km
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
