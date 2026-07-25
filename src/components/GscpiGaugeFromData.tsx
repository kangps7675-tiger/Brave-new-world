"use client";

import { useEffect, useState } from "react";
import { GscpiGauge } from "@/components/GscpiGauge";
import {
  latestGscpiReading,
  type GscpiPoint,
  type GscpiReading,
} from "@/lib/gscpi";
import type { LabelLanguage } from "@/lib/layerPrefs";

type GscpiGaugeFromDataProps = {
  lang: LabelLanguage;
  compact?: boolean;
  className?: string;
};

/**
 * public/data/gscpi.json → latestGscpiReading → GscpiGauge.
 * 데이터 없으면 null (게이지 숨김).
 */
export function GscpiGaugeFromData({
  lang,
  compact = false,
  className,
}: GscpiGaugeFromDataProps) {
  const [reading, setReading] = useState<GscpiReading | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/data/gscpi.json", {
          cache: "force-cache",
          headers: { Accept: "application/json" },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as GscpiPoint[];
        if (!Array.isArray(data) || cancelled) return;
        setReading(latestGscpiReading(data));
      } catch {
        if (!cancelled) setReading(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <GscpiGauge reading={reading} lang={lang} compact={compact} className={className} />;
}
