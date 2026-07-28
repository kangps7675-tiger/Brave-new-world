"use client";

import { useEffect, useState } from "react";
import { activeBasemapTone, type BasemapTone } from "@/lib/basemapTone";

/** html[data-basemap-tone] 변경을 구독 — 지형/인텔 전환 시 크롬 클래스 재계산 */
export function useBasemapTone(): BasemapTone {
  const [tone, setTone] = useState<BasemapTone>(() =>
    typeof document !== "undefined" ? activeBasemapTone() : "dark",
  );

  useEffect(() => {
    const sync = () => setTone(activeBasemapTone());
    sync();
    const root = document.documentElement;
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ["data-basemap-tone"] });
    return () => mo.disconnect();
  }, []);

  return tone;
}
