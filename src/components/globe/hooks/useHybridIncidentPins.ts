"use client";

import { useEffect, useMemo, useState } from "react";
import {
  hybridPinsFromLiveua,
  hybridPinsFromNews,
  mergeHybridPins,
  type HybridIncidentPin,
} from "@/lib/hybridIncidentPins";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import { resolveNewsCoords } from "@/lib/news/newsStreamMapTags";
import type { NewsStreamItem, NewsStreamPayload } from "@/lib/news/types";

type Options = {
  liveuaEvents: readonly LiveuamapEvent[];
  newsStreamPayload: NewsStreamPayload | null;
  lang: "ko" | "en";
  /** 관측(Cesium)이 아니면 계산하지 않는다 */
  enabled: boolean;
};

/**
 * 세슘 하이브리드전 핀 — Liveuamap 태그 사건 + RSS 뉴스 사건을 합친다.
 * 세계 도시 사전(≈66KB)은 뉴스 핀을 처음 만들 때만 동적으로 불러온다.
 */
export function useHybridIncidentPins({
  liveuaEvents,
  newsStreamPayload,
  lang,
  enabled,
}: Options): HybridIncidentPin[] {
  const liveuaPins = useMemo(
    () => (enabled ? hybridPinsFromLiveua(liveuaEvents, lang) : []),
    [enabled, liveuaEvents, lang],
  );

  const [newsPins, setNewsPins] = useState<HybridIncidentPin[]>([]);

  useEffect(() => {
    if (!enabled || !newsStreamPayload) {
      setNewsPins([]);
      return;
    }
    const byId = new Map<string, NewsStreamItem>();
    const add = (item: NewsStreamItem | null | undefined) => {
      if (item?.id && !byId.has(item.id)) byId.set(item.id, item);
    };
    add(newsStreamPayload.hero);
    for (const h of newsStreamPayload.flashHeroes ?? []) add(h);
    for (const item of newsStreamPayload.verified) add(item);
    for (const item of newsStreamPayload.stateMedia) add(item);
    const pool = [...byId.values()];
    if (pool.length === 0) {
      setNewsPins([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { resolveWorldPlace } = await import("@/lib/geo/worldPlaceMatch");
        const resolve = (item: NewsStreamItem) => {
          const near = resolveNewsCoords(item);
          if (near) return { lat: near.lat, lng: near.lng };
          const hit = resolveWorldPlace([item.title, item.imageCaption, item.summary]);
          // 나라만 나온 기사(대표 도시 추정)는 지도에 찍지 않는다
          return hit && hit.precision === "city" ? { lat: hit.lat, lng: hit.lng } : null;
        };
        if (!cancelled) setNewsPins(hybridPinsFromNews(pool, resolve, lang));
      } catch {
        if (!cancelled) setNewsPins([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, newsStreamPayload, lang]);

  return useMemo(
    () => (enabled ? mergeHybridPins([liveuaPins, newsPins]) : []),
    [enabled, liveuaPins, newsPins],
  );
}
