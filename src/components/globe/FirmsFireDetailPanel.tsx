"use client";

import type { ReactNode } from "react";
import type { FirmsFire } from "@/data/geoTypes";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  fire: FirmsFire;
  lang: LabelLanguage;
  onClose?: () => void;
  footer?: ReactNode;
};

/** FIRMS 열점 선택 카드 */
export function FirmsFireDetailPanel({ fire, lang, onClose, footer }: Props) {
  const en = lang === "en";
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-orange-200/75">
            NASA FIRMS
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-100">
            {en ? "Thermal hotspot" : "열점·화재 후보"}
          </h2>
          <p className="mt-1 font-mono text-xs text-slate-400">{fire.id}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        ) : null}
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500">{en ? "Coords" : "좌표"}</dt>
          <dd className="text-slate-200">
            {fire.lat.toFixed(4)}, {fire.lng.toFixed(4)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">FRP</dt>
          <dd className="text-slate-200">
            {fire.frp != null ? fire.frp.toFixed(1) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{en ? "Acquired" : "관측"}</dt>
          <dd className="text-slate-200">
            {[fire.acqDate, fire.acqTime].filter(Boolean).join(" ") || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{en ? "Confidence" : "신뢰"}</dt>
          <dd className="text-slate-200">{fire.confidence || "—"}</dd>
        </div>
      </dl>

      <p className="text-xs leading-5 text-slate-400">
        {en
          ? "Shows a thermal anomaly only — not actor or weapon type."
          : "열원·화재 후보만 보여 줍니다. 주체·수단은 확인하지 않습니다."}
      </p>

      {footer}
    </div>
  );
}
