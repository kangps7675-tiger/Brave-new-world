"use client";

import { useEffect, useState } from "react";
import type { AisVessel } from "@/data/geoTypes";

export type IncidentVessel = AisVessel & {
  incident: 1 | 2;
  incidentCaseId?: string | null;
  incidentType?: string | null;
};

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
    const load = () =>
      fetch("/api/incident-vessels")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (alive && j && Array.isArray(j.vessels)) setVessels(j.vessels as IncidentVessel[]);
        })
        .catch(() => {});
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled]);
  return vessels;
}
