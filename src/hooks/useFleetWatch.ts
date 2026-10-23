"use client";

import { useEffect, useMemo, useState } from "react";
import type { AisVessel } from "@/data/geoTypes";
import { fleetNearIncidents, loadFleet, matchFleet, saveFleet, type FleetAlert, type FleetEntry, type FleetStatus } from "@/lib/myFleet";
import type { SeaIncident } from "@/lib/seaBrief";

const NOTIFIED_KEY = "straitdesk-fleet-notified";

function readNotified(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function writeNotified(s: Set<string>) {
  try {
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...s].slice(-200)));
  } catch {
    /* ignore */
  }
}

/**
 * 내 배 목록을 들고, 5분마다 UKMTO를 받아 사건 50해리 안에 든 배를 찾는다.
 * 브라우저 알림 권한이 있으면 새로 걸린 건을 한 번만 알린다 (탭이 열려 있을 때만 동작).
 */
export function useFleetWatch(vessels: readonly AisVessel[]) {
  const [fleet, setFleetState] = useState<FleetEntry[]>([]);
  const [incidents, setIncidents] = useState<SeaIncident[]>([]);

  useEffect(() => setFleetState(loadFleet()), []);

  const setFleet = (next: FleetEntry[]) => {
    setFleetState(next);
    saveFleet(next);
  };

  useEffect(() => {
    if (fleet.length === 0) return;
    let alive = true;
    const run = async () => {
      try {
        const r = await fetch("/api/ukmto");
        if (!r.ok) return;
        const j = (await r.json()) as { incidents?: SeaIncident[] };
        if (alive) setIncidents(j.incidents ?? []);
      } catch {
        /* 다음 주기에 다시 */
      }
    };
    void run();
    const t = window.setInterval(run, 5 * 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [fleet.length]);

  const statuses: FleetStatus[] = useMemo(() => matchFleet(fleet, vessels), [fleet, vessels]);
  const alerts: FleetAlert[] = useMemo(() => fleetNearIncidents(statuses, incidents), [statuses, incidents]);

  useEffect(() => {
    if (alerts.length === 0 || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const done = readNotified();
    for (const a of alerts) {
      const key = `${a.entry.value}:${a.incident.id}`;
      if (done.has(key)) continue;
      done.add(key);
      new Notification("Strait Desk · 내 배 근처 사건", {
        body: `${a.vesselName ?? a.entry.value} — ${a.incident.place ?? "사건 지점"}에서 ${a.distanceNm}해리 (${a.incident.incidentTypeName})`,
      });
    }
    writeNotified(done);
  }, [alerts]);

  return { fleet, setFleet, statuses, alerts };
}
