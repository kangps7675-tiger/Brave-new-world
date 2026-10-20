"use client";

import type { NeptunPayload } from "@/lib/neptun";

let cache: NeptunPayload | null = null;
let inflight: Promise<NeptunPayload | null> | null = null;

export function readNeptunCache(): NeptunPayload | null {
  return cache;
}

/** REST 응답으로 캐시 갱신 — 빈 alerts도 그대로 저장해 해제 잔상을 막는다. */
export function writeNeptunCache(payload: NeptunPayload | null) {
  cache = payload;
}

export function clearNeptunCache() {
  cache = null;
}

export function prefetchNeptun(): Promise<NeptunPayload | null> {
  if (inflight) return inflight;

  inflight = fetch("/api/neptun", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return null;
      const isStub = res.headers.get("X-Neptun-Stub") === "true";
      const payload = (await res.json()) as NeptunPayload;
      const next: NeptunPayload = {
        ...payload,
        live: isStub ? false : payload.live,
        stub: isStub || payload.stub,
        alerts: payload.alerts ?? { raions: [], oblasts: [] },
      };
      cache = next;
      return cache;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
