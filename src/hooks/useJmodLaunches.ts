"use client";

import { useEffect, useState } from "react";
import type { JmodReport } from "@/lib/jmodLaunch";

/** 일본 방위성 발사 발표를 한 번 받아 모든 속보 카드가 나눠 쓴다(15분 캐시). 실패하면 빈 목록. */
const TTL_MS = 15 * 60_000;
let cache: { at: number; reports: JmodReport[] } | null = null;
let inflight: Promise<JmodReport[]> | null = null;
const EMPTY: JmodReport[] = [];

function load(): Promise<JmodReport[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.reports);
  inflight ??= fetch("/api/jmod-launches")
    .then((res) => (res.ok ? (res.json() as Promise<{ reports?: JmodReport[] }>) : { reports: [] }))
    .then((json) => {
      const reports = Array.isArray(json.reports) ? json.reports : [];
      cache = { at: Date.now(), reports };
      return reports;
    })
    .catch(() => EMPTY)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useJmodLaunches(enabled = true): JmodReport[] {
  const [reports, setReports] = useState<JmodReport[]>(() => cache?.reports ?? EMPTY);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void load().then((rows) => {
      if (alive) setReports(rows);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return reports;
}
