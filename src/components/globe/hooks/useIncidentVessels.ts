"use client";

import { useEffect, useState } from "react";
import { loadIncidentVessels, type IncidentVessel } from "@/lib/incidentVesselsClient";

export type { IncidentVessel };

const REFRESH_MS = 10 * 60_000;

/** 사건에 걸린 선박(확인·유력/후보)의 마지막 위치 — 지도에서 튀어나오게 하는 용도. 실패하면 빈 배열. */
export function useIncidentVessels(enabled: boolean): IncidentVessel[] {
  const [vessels, setVessels] = useState<IncidentVessel[]>([]);
  useEffect(() => {
    if (!enabled) {
      setVessels([]);
      return;
    }
    let alive = true;
    const load = (force: boolean) =>
      void loadIncidentVessels(force).then((v) => {
        if (alive) setVessels(v);
      });
    load(false);
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled]);
  return vessels;
}
