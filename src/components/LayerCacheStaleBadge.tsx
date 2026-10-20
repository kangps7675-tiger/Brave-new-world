"use client";

import { useEffect, useState } from "react";
import { ageLabel } from "@/lib/clientCache";
import {
  LAYER_CACHE_META_EVENT,
  type LayerCacheMetaDetail,
} from "@/lib/layerCacheMeta";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { Z_ABOVE_NAV } from "@/lib/uiStack";

/**
 * 낡은 레이어 캐시본 배지 (P1-6).
 * 캐시로 먼저 그린 뒤 네트워크가 느릴 때 "N분 전"을 잠깐 보여준다.
 */
export function LayerCacheStaleBadge({ lang }: { lang: LabelLanguage }) {
  const [meta, setMeta] = useState<LayerCacheMetaDetail | null>(null);

  useEffect(() => {
    const onMeta = (event: Event) => {
      const detail = (event as CustomEvent<LayerCacheMetaDetail>).detail;
      if (!detail) return;
      setMeta(detail);
    };
    window.addEventListener(LAYER_CACHE_META_EVENT, onMeta);
    return () => window.removeEventListener(LAYER_CACHE_META_EVENT, onMeta);
  }, []);

  useEffect(() => {
    if (!meta) return;
    const id = window.setTimeout(() => setMeta(null), 6_000);
    return () => window.clearTimeout(id);
  }, [meta]);

  if (!meta?.fromCache && !meta?.softTimeout) return null;
  const age = ageLabel(meta.fetchedAt, lang);
  const text = meta.softTimeout
    ? lang === "en"
      ? `Slow network — showing cache (${age})`
      : `느립니다 — 캐시본 표시 중 (${age})`
    : lang === "en"
      ? `Cached ${age}`
      : `캐시 ${age}`;

  return (
    <div
      role="status"
      className={`pointer-events-none fixed bottom-[calc(var(--bottom-intel-stack-clearance,3.25rem)+0.35rem+env(safe-area-inset-bottom,0px))] right-3 ${Z_ABOVE_NAV}`}
    >
      <span className="rounded border border-white/15 bg-black/70 px-2 py-1 text-meta text-white/70 backdrop-blur-sm">
        {text}
      </span>
    </div>
  );
}
