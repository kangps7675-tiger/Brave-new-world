"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  swpcBandColor,
  swpcBandLabel,
  type SwpcSnapshot,
} from "@/lib/swpc";

type Props = {
  lang: LabelLanguage;
  className?: string;
};

/**
 * NOAA SWPC space-weather chip — planetary Kp + R/S/G scales.
 */
export function SwpcStatusChip({ lang, className = "" }: Props) {
  const en = lang === "en";
  const [data, setData] = useState<SwpcSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/swpc", { cache: "force-cache" });
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as SwpcSnapshot;
        if (!cancelled) setData(payload);
      } catch {
        /* keep previous / empty */
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border border-sky-200/20 bg-[#0a1520]/85 px-2.5 py-1 text-[11px] font-medium text-sky-100/70 ${className}`}
        title={en ? "NOAA SWPC" : "NOAA 우주기상"}
      >
        <span className="opacity-80">{en ? "Space weather" : "우주기상"}</span>
        <span className="tabular-nums opacity-60">{en ? "loading…" : "불러오는 중…"}</span>
      </div>
    );
  }

  const color = swpcBandColor(data.band);
  const g = data.scales.G;
  const title = en ? "Space weather" : "우주기상";
  const detail = `G${g} · Kp ${data.kp == null ? "—" : data.kp.toFixed(1)}`;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${className}`}
      style={{
        borderColor: `${color}55`,
        color,
        background: "rgba(8, 18, 32, 0.88)",
      }}
      title={en ? data.summaryEn : data.summaryKo}
    >
      <span className="opacity-80">{title}</span>
      <span className="font-bold tabular-nums">{detail}</span>
      <span className="opacity-70">{swpcBandLabel(data.band, !en)}</span>
    </div>
  );
}
