"use client";

import type { UkraineControlData } from "@/data/geoTypes";

let cache: UkraineControlData | null = null;
let inflight: Promise<UkraineControlData | null> | null = null;
let sessionReady: Promise<boolean> | null = null;

/** 동일 출처 세션 쿠키 발급 — 렌더 API 게이트 통과용 */
export function ensureViinaRenderSession(): Promise<boolean> {
  if (sessionReady) return sessionReady;
  sessionReady = fetch("/api/render/viina-session", {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then((res) => res.ok)
    .catch(() => false);
  return sessionReady;
}

export function readUkraineControlCache(): UkraineControlData | null {
  return cache;
}

export function prefetchUkraineControl(): Promise<UkraineControlData | null> {
  if (cache?.features?.length) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = ensureViinaRenderSession()
    .then(async (ok) => {
      if (!ok) return null;
      const res = await fetch("/api/render/ukraine-control?light=1", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const full = await fetch("/api/render/ukraine-control", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!full.ok) return null;
        const payload = (await full.json()) as UkraineControlData;
        if (payload?.features?.length) {
          cache = payload;
          return payload;
        }
        return null;
      }
      const payload = (await res.json()) as UkraineControlData;
      if (payload?.features?.length) {
        cache = payload;
        return payload;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function storeUkraineControlCache(payload: UkraineControlData) {
  if (payload?.features?.length) {
    cache = payload;
  }
}
